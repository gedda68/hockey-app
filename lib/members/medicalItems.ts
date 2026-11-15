// lib/members/medicalItems.ts
// Medical details as related items: each condition or allergy carries its own prescribed medication(s).
// Stored as medical.items; the legacy flat strings (conditions / medications / allergies, one per line)
// are kept in sync so older screens and exports keep working.

export interface MedicationEntry { name: string; dose: string }
export interface MedicalItem { id: string; kind: "condition" | "allergy"; name: string; medications: MedicationEntry[] }

const t = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const lines = (v: unknown) => String(v ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

export const MAX_MEDICAL_ITEMS = 30;
export const MAX_MEDICATIONS_PER_ITEM = 10;
export const UNASSIGNED_LABEL = "Medication not yet linked to a condition";

/** Clean client input: trims, drops empty rows, caps sizes, keeps stable ids. */
export function sanitizeMedicalItems(raw: unknown): MedicalItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MedicalItem[] = [];
  raw.slice(0, MAX_MEDICAL_ITEMS).forEach((r: any, i: number) => {
    const name = t(r?.name, 150);
    const meds: MedicationEntry[] = (Array.isArray(r?.medications) ? r.medications : [])
      .slice(0, MAX_MEDICATIONS_PER_ITEM)
      .map((m: any) => ({ name: t(m?.name, 150), dose: t(m?.dose, 150) }))
      .filter((m: MedicationEntry) => m.name);
    if (!name && meds.length === 0) return;
    out.push({
      id: t(r?.id, 60) || `MED-${Date.now().toString(36)}-${i + 1}`,
      kind: r?.kind === "allergy" ? "allergy" : "condition",
      name: name || UNASSIGNED_LABEL,
      medications: meds,
    });
  });
  return out;
}

/** Flat strings (one entry per line) derived from the items, for legacy readers. */
export function legacyFromItems(items: MedicalItem[]) {
  const names = (kind: MedicalItem["kind"]) => [...new Set(items.filter((i) => i.kind === kind).map((i) => i.name))].join("\n");
  const medications = items.flatMap((i) => i.medications.map((m) => `${m.name}${m.dose ? ` (${m.dose})` : ""} — for ${i.name}`)).join("\n");
  return { conditions: names("condition"), allergies: names("allergy"), medications };
}

/** Existing records: use items when present, otherwise build them from the old flat strings. */
export function itemsFromMedical(medical: any): MedicalItem[] {
  if (Array.isArray(medical?.items)) return sanitizeMedicalItems(medical.items);
  const conditions = lines(medical?.conditions);
  const allergies = lines(medical?.allergies);
  const meds = lines(medical?.medications).map((name) => ({ name, dose: "" }));
  const items: MedicalItem[] = [
    ...conditions.map((name, i) => ({ id: `LEG-C${i + 1}`, kind: "condition" as const, name, medications: [] as MedicationEntry[] })),
    ...allergies.map((name, i) => ({ id: `LEG-A${i + 1}`, kind: "allergy" as const, name, medications: [] as MedicationEntry[] })),
  ];
  if (meds.length) {
    // A single condition can take them; otherwise park them in a clearly-labelled item to be linked.
    if (conditions.length === 1) items[0].medications = meds;
    else items.push({ id: "LEG-M", kind: "condition", name: UNASSIGNED_LABEL, medications: meds });
  }
  return items;
}
