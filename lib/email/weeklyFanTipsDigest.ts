import { sendEmail, APP_URL } from "@/lib/email/client";

const TIPS_HTML = `
<ul>
  <li>Follow your teams on <strong>My fixtures</strong> so draws and results stay in one place.</li>
  <li>Turn on <strong>fixture change emails</strong> or <strong>push</strong> so venue and time updates reach you before game day.</li>
  <li>Use <strong>This round</strong> with your club filter for a full picture of the weekend.</li>
</ul>
`;

export async function sendWeeklyFanTipsEmail(to: string, displayName: string): Promise<boolean> {
  const r = await sendEmail({
    to,
    subject: "Your weekly hockey tips",
    html: `
      <p>Hi ${escapeHtml(displayName)},</p>
      <p>Here are a few quick tips to get the most from the portal:</p>
      ${TIPS_HTML}
      <p><a href="${APP_URL}/competitions/my-fixtures">Open My fixtures</a> · <a href="${APP_URL}/competitions/this-round">This round</a></p>
      <p style="color:#666;font-size:12px">You are receiving this because weekly tips are enabled on your fan preferences. You can turn this off in My fixtures.</p>
    `,
    text: `Hi ${displayName}. Weekly tips: visit ${APP_URL}/competitions/my-fixtures and ${APP_URL}/competitions/this-round`,
  });
  return r.success;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
