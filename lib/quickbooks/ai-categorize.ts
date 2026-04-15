/**
 * AI-powered categorization for QuickBooks line items.
 * Uses Claude Haiku to enrich descriptions and pick the right expense account.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Expense accounts that exist in this QBO company's chart of accounts
const QBO_EXPENSE_ACCOUNTS = [
  "Cost of Labor",      // subcontractor labor (framing, electrical, plumbing, HVAC, etc.)
  "Job Materials",      // materials and supplies purchased for the job
  "Job Expenses",       // general job-related costs
  "Equipment Rental",   // rented equipment or machinery
  "Installation",       // installation work
  "Permits",            // permits, inspections, fees
  "Supplies",           // general supplies
  "Cost of Goods Sold", // fallback catch-all
] as const;

export type QBOExpenseAccount = (typeof QBO_EXPENSE_ACCOUNTS)[number];

export interface BillCategorization {
  /** Enhanced, professional description for the QBO bill line item */
  description: string;
  /** Best matching QBO expense account */
  account: QBOExpenseAccount;
  /** Short memo — appears on QBO bill header */
  memo: string;
}

export interface InvoiceLineItem {
  /** Professional service description for the QBO invoice */
  description: string;
  /** Memo/note for the invoice */
  memo: string;
}

/**
 * Uses Claude Haiku to categorize a contractor payment for QuickBooks.
 * Falls back to safe defaults if AI fails.
 */
export async function categorizeBill(params: {
  contractorName: string;
  trade: string;
  description: string | null;
  amount: number;
  projectName?: string;
}): Promise<BillCategorization> {
  const { contractorName, trade, description, amount, projectName } = params;

  const fallback: BillCategorization = {
    description: description ?? `Payment to ${contractorName}`,
    account: "Cost of Labor",
    memo: projectName ? `${projectName} — ${trade}` : trade,
  };

  try {
    const prompt = `You are a QuickBooks accounting assistant for a general contractor.

Categorize this contractor payment for QuickBooks:
- Contractor: ${contractorName}
- Trade: ${trade}
- Description: ${description ?? "Not provided"}
- Amount: $${amount.toFixed(2)}
${projectName ? `- Project: ${projectName}` : ""}

Available QBO expense accounts: ${QBO_EXPENSE_ACCOUNTS.join(", ")}

Respond with a JSON object only, no markdown:
{
  "description": "<clear 1-sentence line item description for QBO>",
  "account": "<exact account name from the list above>",
  "memo": "<short memo for the bill header, max 10 words>"
}

Rules:
- Cost of Labor: any subcontractor labor/installation work (framing, electrical, plumbing, HVAC, drywall, roofing, painting, flooring, concrete, masonry, etc.)
- Job Materials: materials/supplies purchased for the job (lumber, windows, doors, hardware, concrete mix, pipe, wire, etc.)
- Job Expenses: general job costs that don't fit other categories
- Equipment Rental: rented equipment or machinery
- Installation: installation-only work where materials aren't the primary cost
- Permits: permits, inspections, utility connection fees, licenses
- Supplies: small consumable supplies
- Cost of Goods Sold: catch-all if nothing else fits`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(text) as BillCategorization;

    // Validate account is in our list
    if (!QBO_EXPENSE_ACCOUNTS.includes(parsed.account as QBOExpenseAccount)) {
      parsed.account = "Cost of Goods Sold";
    }

    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Uses Claude Haiku to generate a professional invoice line description for QBO.
 */
export async function categorizeInvoice(params: {
  clientName: string;
  projectName?: string;
  projectType?: string;
  description: string | null;
  amount: number;
  invoiceNumber: string;
}): Promise<InvoiceLineItem> {
  const { clientName, projectName, projectType, description, amount, invoiceNumber } = params;

  const fallback: InvoiceLineItem = {
    description: description ?? `Construction services — ${projectName ?? "Project"}`,
    memo: `Invoice ${invoiceNumber} for ${clientName}`,
  };

  try {
    const prompt = `You are a professional contractor writing a QuickBooks invoice line item.

Generate a clear, professional line item description for this invoice:
- Client: ${clientName}
- Project: ${projectName ?? "Residential Construction"}
- Project Type: ${projectType ?? "Construction"}
- Description: ${description ?? "Construction services"}
- Amount: $${amount.toFixed(2)}
- Invoice #: ${invoiceNumber}

Respond with a JSON object only, no markdown:
{
  "description": "<professional 1-2 sentence service description for QBO invoice>",
  "memo": "<brief memo, max 10 words>"
}

Keep the description professional, specific, and suitable for a client-facing document.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return JSON.parse(text) as InvoiceLineItem;
  } catch {
    return fallback;
  }
}
