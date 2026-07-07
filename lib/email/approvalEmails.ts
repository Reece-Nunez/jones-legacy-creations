// Branded emails for the client-facing approval links. Mirrors the styling of
// the existing Resend emails (submit-invoice / DD invite). The routes own the
// actual Resend send; these just build { subject, html }.

export const BRAND_FROM =
  "Jones Legacy Creations <noreply@joneslegacycreations.com>";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(heading: string, bodyHtml: string, link: string, cta: string): string {
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; color:#111; line-height:1.5;">
      <h2 style="margin:0 0 14px;">${escapeHtml(heading)}</h2>
      ${bodyHtml}
      <p style="margin:22px 0 0;">
        <a href="${link}" style="background:#111;color:#fff;padding:12px 20px;border-radius:9999px;text-decoration:none;display:inline-block;font-weight:600;">
          ${escapeHtml(cta)}
        </a>
      </p>
      <p style="margin:22px 0 0;font-size:13px;color:#888;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="word-break:break-all;">${link}</span>
      </p>
    </div>
  `;
}

export function buildChangeOrderEmail(opts: {
  link: string;
  projectName: string;
  clientName?: string | null;
  title: string;
}): { subject: string; html: string } {
  const greeting = opts.clientName ? `Hi ${escapeHtml(opts.clientName)},` : "Hi,";
  const body = `
    <p style="margin:0 0 10px;">${greeting}</p>
    <p style="margin:0 0 10px;">Jones Legacy Creations has prepared a change order for your project
      <strong>${escapeHtml(opts.projectName)}</strong>:</p>
    <p style="margin:0 0 10px;"><strong>${escapeHtml(opts.title)}</strong></p>
    <p style="margin:0 0 10px;">Please review the details and sign electronically to approve.</p>
  `;
  return {
    subject: `Change order to review — ${opts.projectName}`,
    html: shell("Change order ready for your signature", body, opts.link, "Review & Sign"),
  };
}

export function buildSelectionEmail(opts: {
  link: string;
  projectName: string;
  clientName?: string | null;
  title: string;
}): { subject: string; html: string } {
  const greeting = opts.clientName ? `Hi ${escapeHtml(opts.clientName)},` : "Hi,";
  const body = `
    <p style="margin:0 0 10px;">${greeting}</p>
    <p style="margin:0 0 10px;">Jones Legacy Creations needs your approval on a selection for your project
      <strong>${escapeHtml(opts.projectName)}</strong>:</p>
    <p style="margin:0 0 10px;"><strong>${escapeHtml(opts.title)}</strong></p>
    <p style="margin:0 0 10px;">Please review the selection and approve or decline.</p>
  `;
  return {
    subject: `Selection to approve — ${opts.projectName}`,
    html: shell("A selection needs your approval", body, opts.link, "Review Selection"),
  };
}
