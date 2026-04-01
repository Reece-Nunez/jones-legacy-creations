import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { ESTIMATE_STAGE_LABELS } from "@/lib/types/quotes";

const resend = new Resend(process.env.RESEND_API_KEY);

function fmt(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

interface EmailItem {
  trade: string;
  cost: number;
  isOwnerPurchase: boolean;
}

interface SendEmailBody {
  to: string;
  cc?: string;
  items: EmailItem[];
  includeOwnerPurchases?: boolean;
  notes?: string;
}

function buildEmailHtml(
  quote: {
    quote_number: string;
    client_name: string;
    project_name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    estimate_stage: string;
    created_at: string;
  },
  items: EmailItem[],
  includeOwnerPurchases: boolean,
  notes?: string
): string {
  const tradeItems = items.filter((i) => !i.isOwnerPurchase);
  const ownerItems = items.filter((i) => i.isOwnerPurchase);
  const tradeCostTotal = tradeItems.reduce((s, i) => s + i.cost, 0);
  const ownerTotal = ownerItems.reduce((s, i) => s + i.cost, 0);
  const grandTotal = tradeCostTotal + ownerTotal;

  const stageLabel =
    ESTIMATE_STAGE_LABELS[quote.estimate_stage as keyof typeof ESTIMATE_STAGE_LABELS] ||
    quote.estimate_stage;

  const stageBadgeColor =
    quote.estimate_stage === "ballpark"
      ? "#f59e0b"
      : quote.estimate_stage === "final"
        ? "#10b981"
        : "#6366f1";

  const addressParts = [quote.address, quote.city, quote.state, quote.zip]
    .filter(Boolean)
    .join(", ");

  const createdDate = new Date(quote.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function buildTable(rows: EmailItem[], label: string, total: number): string {
    let html = `
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td colspan="2" style="padding:8px 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">
            ${label}
          </td>
        </tr>`;

    rows.forEach((item, i) => {
      const bgColor = i % 2 === 0 ? "#ffffff" : "#f9fafb";
      html += `
        <tr style="background-color:${bgColor};">
          <td style="padding:10px 12px;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">
            ${escapeHtml(item.trade)}
          </td>
          <td style="padding:10px 12px;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;white-space:nowrap;">
            ${fmt(item.cost)}
          </td>
        </tr>`;
    });

    html += `
        <tr>
          <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#111827;border-top:2px solid #d1d5db;">
            ${label} Total
          </td>
          <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#111827;text-align:right;border-top:2px solid #d1d5db;white-space:nowrap;">
            ${fmt(total)}
          </td>
        </tr>
      </table>`;

    return html;
  }

  let tablesHtml = "";

  if (includeOwnerPurchases && ownerItems.length > 0) {
    tablesHtml += buildTable(tradeItems, "Trade Costs", tradeCostTotal);
    tablesHtml += buildTable(ownerItems, "Owner Purchases", ownerTotal);
    tablesHtml += `
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
        <tr style="background-color:#f9fafb;">
          <td style="padding:12px;font-size:16px;font-weight:700;color:#111827;border-top:3px solid #111827;">
            Combined Total
          </td>
          <td style="padding:12px;font-size:16px;font-weight:700;color:#111827;text-align:right;border-top:3px solid #111827;white-space:nowrap;">
            ${fmt(grandTotal)}
          </td>
        </tr>
      </table>`;
  } else {
    tablesHtml += buildTable(
      items.filter((i) => i.cost > 0),
      "Estimate Breakdown",
      grandTotal
    );
  }

  const notesHtml = notes
    ? `<div style="margin-bottom:24px;padding:12px 16px;background:#f9fafb;border-left:3px solid #6366f1;border-radius:4px;">
        <p style="margin:0;font-size:14px;color:#374151;font-weight:600;margin-bottom:4px;">Notes</p>
        <p style="margin:0;font-size:14px;color:#4b5563;">${escapeHtml(notes)}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background-color:#0f172a;padding:32px 24px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.025em;">
              Jones Legacy Creations
            </h1>
            <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">
              Construction Estimate
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px;">

            <!-- Project info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#6b7280;width:120px;">Client</td>
                <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(quote.client_name)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#6b7280;">Project</td>
                <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(quote.project_name)}</td>
              </tr>
              ${addressParts ? `<tr>
                <td style="padding:4px 0;font-size:14px;color:#6b7280;">Address</td>
                <td style="padding:4px 0;font-size:14px;color:#111827;">${escapeHtml(addressParts)}</td>
              </tr>` : ""}
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#6b7280;">Quote #</td>
                <td style="padding:4px 0;font-size:14px;color:#111827;">${escapeHtml(quote.quote_number)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#6b7280;">Date</td>
                <td style="padding:4px 0;font-size:14px;color:#111827;">${createdDate}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#6b7280;">Stage</td>
                <td style="padding:4px 0;">
                  <span style="display:inline-block;padding:2px 10px;font-size:12px;font-weight:600;color:#ffffff;background-color:${stageBadgeColor};border-radius:12px;">
                    ${stageLabel}
                  </span>
                </td>
              </tr>
            </table>

            ${notesHtml}

            <!-- Cost tables -->
            ${tablesHtml}

            <!-- Validity notice -->
            <p style="margin:24px 0 0;font-size:13px;color:#6b7280;font-style:italic;">
              This estimate is valid for 30 days from the date shown above.
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f9fafb;padding:20px 24px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 4px;font-size:13px;color:#374151;">
              Questions? Contact Blake Jones at <strong>(435) 705-0327</strong> or reply to this email.
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Jones Legacy Creations &bull; Southern Utah &bull; Licensed &amp; Insured
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: SendEmailBody = await request.json();

    if (!body.to || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: to, items" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the quote
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    const includeOwnerPurchases = body.includeOwnerPurchases ?? true;

    const html = buildEmailHtml(quote, body.items, includeOwnerPurchases, body.notes);

    const emailPayload: {
      from: string;
      to: string;
      cc?: string;
      subject: string;
      html: string;
    } = {
      from: "Jones Legacy Creations <noreply@joneslegacycreations.com>",
      to: body.to,
      subject: `Estimate: ${quote.project_name} (${quote.quote_number})`,
      html,
    };

    if (body.cc) {
      emailPayload.cc = body.cc;
    }

    const { data: emailResult, error: emailError } = await resend.emails.send(emailPayload);

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json(
        { error: "Failed to send email", details: emailError.message },
        { status: 500 }
      );
    }

    // Update status to 'sent' if currently draft or review
    if (quote.status === "draft" || quote.status === "review") {
      await supabase
        .from("quotes")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult?.id,
    });
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
