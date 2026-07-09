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

export function buildBidRequestEmail(opts: {
  link: string;
  projectName: string;
  contractorName?: string | null;
  title: string;
  customMessage?: string | null;
}): { subject: string; html: string } {
  const greeting = opts.contractorName ? `Hi ${escapeHtml(opts.contractorName)},` : "Hi,";
  const note = opts.customMessage?.trim()
    ? `<p style="margin:0 0 10px;white-space:pre-line;">${escapeHtml(opts.customMessage.trim())}</p>`
    : "";
  const body = `
    <p style="margin:0 0 10px;">${greeting}</p>
    <p style="margin:0 0 10px;">Jones Legacy Creations is requesting a bid for the project
      <strong>${escapeHtml(opts.projectName)}</strong>:</p>
    <p style="margin:0 0 10px;"><strong>${escapeHtml(opts.title)}</strong></p>
    ${note}
    <p style="margin:0 0 10px;">Please review the scope and let us know if you can take it on.</p>
  `;
  return {
    subject: `Bid request — ${opts.projectName}`,
    html: shell("You've been invited to bid", body, opts.link, "Review & Respond"),
  };
}

// Confirmation sent to the contractor the moment they accept. Body wording is
// Blake's requested line: "Your bid has been accepted, we will contact you for
// scheduling." No link/CTA — this is a plain acknowledgement.
export function buildBidAcceptedEmail(opts: {
  projectName: string;
  contractorName?: string | null;
  title: string;
}): { subject: string; html: string } {
  const greeting = opts.contractorName ? `Hi ${escapeHtml(opts.contractorName)},` : "Hi,";
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; color:#111; line-height:1.5;">
      <h2 style="margin:0 0 14px;">Your bid has been accepted</h2>
      <p style="margin:0 0 10px;">${greeting}</p>
      <p style="margin:0 0 10px;">Your bid has been accepted for the project
        <strong>${escapeHtml(opts.projectName)}</strong>
        (<strong>${escapeHtml(opts.title)}</strong>). We will contact you for scheduling.</p>
      <p style="margin:0 0 10px;">Thank you,<br>Jones Legacy Creations</p>
    </div>
  `;
  return { subject: `Your bid has been accepted — ${opts.projectName}`, html };
}

// Sent when Blake marks an accepted bid completed — nudges the contractor to
// submit their invoice through the existing invoice-upload flow. Payment itself
// runs through the draw/lender process, not this email.
export function buildInvoiceRequestEmail(opts: {
  link: string;
  projectName: string;
  contractorName?: string | null;
  title: string;
}): { subject: string; html: string } {
  const greeting = opts.contractorName ? `Hi ${escapeHtml(opts.contractorName)},` : "Hi,";
  const body = `
    <p style="margin:0 0 10px;">${greeting}</p>
    <p style="margin:0 0 10px;">Your work on <strong>${escapeHtml(opts.projectName)}</strong>
      (<strong>${escapeHtml(opts.title)}</strong>) is marked complete. Please send us your
      invoice so we can process payment.</p>
    <p style="margin:0 0 10px;">Use the secure link below to upload it.</p>
  `;
  return {
    subject: `Please send your invoice — ${opts.projectName}`,
    html: shell("Your invoice is requested", body, opts.link, "Upload Invoice"),
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
