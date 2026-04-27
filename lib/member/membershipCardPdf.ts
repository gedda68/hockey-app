import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { membershipCardQrPayload } from "@/lib/member/membershipCard";

type MemberCardInput = {
  memberId: string;
  displayName: string;
  clubName?: string | null;
  roleLabel?: string | null;
  seasonYear: string;
  photoUrl?: string | null;
};

function mmCard(): { w: number; h: number } {
  // ISO/IEC 7810 ID-1 format (credit-card size)
  return { w: 85.6, h: 53.98 };
}

async function fetchAsDataUrl(url: string): Promise<{ dataUrl: string; kind: "PNG" | "JPEG" } | null> {
  const u = String(url ?? "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) return null;

  try {
    const res = await fetch(u);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (ct.includes("png")) {
      return { dataUrl: `data:image/png;base64,${buf.toString("base64")}`, kind: "PNG" };
    }
    if (ct.includes("jpeg") || ct.includes("jpg")) {
      return { dataUrl: `data:image/jpeg;base64,${buf.toString("base64")}`, kind: "JPEG" };
    }
    // Fallback: try to treat unknown as PNG (some CDNs omit content-type)
    return { dataUrl: `data:image/png;base64,${buf.toString("base64")}`, kind: "PNG" };
  } catch {
    return null;
  }
}

export async function generateMembershipCardPdf(input: MemberCardInput): Promise<{
  bytes: Uint8Array;
  filename: string;
}> {
  const { w, h } = mmCard();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [w, h] });

  const memberId = String(input.memberId ?? "").trim();
  const seasonYear = String(input.seasonYear ?? "").trim();
  const displayName = String(input.displayName ?? "").trim() || memberId;
  const clubName = (input.clubName ?? "").trim();
  const roleLabel = (input.roleLabel ?? "").trim();

  // Background
  doc.setFillColor(6, 5, 78); // #06054e
  doc.roundedRect(2, 2, w - 4, h - 4, 4, 4, "F");
  doc.setFillColor(255, 215, 0); // gold accent
  doc.roundedRect(2, 2, w - 4, 10, 4, 4, "F");

  // Title
  doc.setTextColor(6, 5, 78);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("HOCKEY APP", 6, 9);

  // Main content area
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(displayName, 6, 20, { maxWidth: 52 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (clubName) doc.text(clubName, 6, 26, { maxWidth: 52 });
  if (roleLabel || seasonYear) {
    const line = [roleLabel || null, seasonYear ? `${seasonYear} season` : null].filter(Boolean).join(" · ");
    if (line) doc.text(line, 6, 31, { maxWidth: 52 });
  }

  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Member ID: ${memberId}`, 6, h - 7);

  // QR code (right side)
  const payload = membershipCardQrPayload({ memberId, seasonYear });
  const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(w - 26, 14, 22, 22, 2, 2, "F");
  doc.addImage(qrDataUrl, "PNG", w - 25, 15, 20, 20);

  // Optional photo (left side)
  const photo = input.photoUrl ? await fetchAsDataUrl(input.photoUrl) : null;
  if (photo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(56, 14, 16, 20, 2, 2, "F");
    doc.addImage(photo.dataUrl, photo.kind, 56.7, 14.7, 14.6, 18.6);
  }

  const ab = doc.output("arraybuffer");
  const bytes = new Uint8Array(ab);
  return {
    bytes,
    filename: `membership-card-${memberId}-${seasonYear}.pdf`,
  };
}

