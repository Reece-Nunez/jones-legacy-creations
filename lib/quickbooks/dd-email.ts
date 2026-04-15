/**
 * Branded HTML email template for direct deposit setup invitations.
 * Jones Legacy Creations — professional contractor-facing email.
 */

export const NACHA_AUTHORIZATION_TEXT =
  "By submitting this form, I authorize Jones Legacy Creations to initiate ACH credit " +
  "entries (direct deposits) to the bank account I have provided. This authorization " +
  "remains in effect until I notify Jones Legacy Creations in writing that I wish to " +
  "revoke it, providing reasonable time to act on the revocation before the next scheduled " +
  "payment. I confirm that I am an authorized signer on the provided bank account. My bank " +
  "account information will be transmitted using TLS encryption and will not be stored by " +
  "this application. I understand this authorization complies with the NACHA Operating Rules " +
  "and the Electronic Signatures in Global and National Commerce Act (E-Sign Act).";

export function buildDDInviteEmail({
  contractorName,
  companyName,
  inviteUrl,
  expiresHours = 24,
}: {
  contractorName: string;
  companyName: string;
  inviteUrl: string;
  expiresHours?: number;
}): string {
  const firstName = contractorName.split(" ")[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Set Up Direct Deposit — ${companyName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#111827;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <img
                src="https://joneslegacycreations.com/logo-transparent.png"
                alt="Jones Legacy Creations"
                width="180"
                style="display:block;margin:0 auto;max-width:180px;height:auto;filter:brightness(0) invert(1);"
              />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;">
                Direct Deposit Setup
              </p>
              <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
                Hi ${firstName}, you're invited to set up direct deposit
              </h1>
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
                <strong>${companyName}</strong> would like to pay you via ACH direct deposit
                for your work. This is faster and more reliable than checks — funds go
                directly to your bank account on payment day.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.6;">
                Click the button below to securely enter your bank account information.
                The process takes less than 2 minutes.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a
                      href="${inviteUrl}"
                      style="display:inline-block;background-color:#111827;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.01em;"
                    >
                      Set Up Direct Deposit
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 28px;" />

              <!-- Security info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#111827;">
                      🔒 Your security is our priority
                    </p>
                    <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#6b7280;line-height:1.8;">
                      <li>Bank information is encrypted in transit using TLS 1.2+</li>
                      <li>Your account numbers are never stored in our system</li>
                      <li>Data is transmitted directly to QuickBooks' secure servers</li>
                      <li>This link expires in <strong>${expiresHours} hours</strong> and can only be used once</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;color:#4f46e5;word-break:break-all;">
                ${inviteUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:0 0 12px 12px;border-top:none;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">
                This invitation was sent by <strong>${companyName}</strong> via Jones Legacy Creations project management.
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">
                If you did not expect this email, you can safely ignore it — no action is required.
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db;">
                © ${new Date().getFullYear()} Jones Legacy Creations. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
