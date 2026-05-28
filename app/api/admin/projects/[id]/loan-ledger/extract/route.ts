/**
 * POST /api/admin/projects/[id]/loan-ledger/extract
 *
 * Accepts a lender statement (PDF or image) as multipart form data,
 * sends it to Claude with a strict tool_use schema, and returns the
 * extracted ledger entries for the user to review. Entries are NOT
 * persisted by this endpoint — the UI bulk-POSTs them to
 * /api/admin/projects/[id]/loan-ledger after the user confirms.
 *
 * Returning suggestions (not direct writes) is deliberate: Claude
 * occasionally misreads handwritten dates, splits one transaction into
 * two, or labels a fee as interest. The cost of a wrong row in the loan
 * ledger is high (Blake's projected profit depends on it), so we surface
 * everything for human review with ai_extracted=true and require
 * user_verified=true before the helper trusts ledger numbers
 * unconditionally.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface ExtractedEntry {
  entry_date: string;
  entry_type:
    | "disbursement"
    | "interest_accrual"
    | "interest_payment"
    | "principal_payment"
    | "fee"
    | "payoff";
  description: string | null;
  amount: number;
  running_balance: number | null;
  payment_method: string | null;
  notes: string | null;
}

interface ExtractResult {
  entries: ExtractedEntry[];
  summary: string;
  loan_start_date: string | null;
  interest_rate_apr: number | null;
  origination_fee_amount: number | null;
}

const EXTRACTION_TOOL: Anthropic.Messages.Tool = {
  name: "submit_loan_ledger",
  description:
    "Submit the loan ledger entries extracted from this lender statement.",
  input_schema: {
    type: "object",
    properties: {
      entries: {
        type: "array",
        description:
          "Every transaction row on the statement, in chronological order. Include disbursements, monthly interest accruals, interest payments, principal payments, fees, and payoffs. One row per event.",
        items: {
          type: "object",
          properties: {
            entry_date: {
              type: "string",
              description:
                "The date the event occurred in YYYY-MM-DD format. For accruals, this is usually the period-end date shown on the statement.",
            },
            entry_type: {
              type: "string",
              enum: [
                "disbursement",
                "interest_accrual",
                "interest_payment",
                "principal_payment",
                "fee",
                "payoff",
              ],
              description:
                "What kind of event this is. Use 'disbursement' for draws/advances the lender funded. 'interest_accrual' for interest accumulated during a period (no cash moved). 'interest_payment' for interest paid in cash. 'principal_payment' for principal paid down. 'fee' for one-time charges like origination, late fees, or doc-prep. 'payoff' for the final payoff at sale.",
            },
            description: {
              type: ["string", "null"],
              description:
                "Short human description, e.g. 'Draw #2', 'Interest accrued Jan 2026', 'Origination fee'. Pull from the statement when possible.",
            },
            amount: {
              type: "number",
              description:
                "Always positive. The sign is implied by entry_type (disbursements/accruals/fees add to balance, payments/payoffs reduce it).",
            },
            running_balance: {
              type: ["number", "null"],
              description:
                "The lender's stated balance immediately AFTER this entry, if printed on the statement. Helps us verify our running total matches the lender's. null if not shown.",
            },
            payment_method: {
              type: ["string", "null"],
              description:
                "For payments only: 'escrow', 'DD' (direct debit), 'check #1234', 'bill_pay', 'wire', etc. null for accruals/disbursements/fees.",
            },
            notes: {
              type: ["string", "null"],
              description:
                "Any extra context worth keeping — e.g. 'paid by escrow at closing', 'covers Feb–Mar interest'.",
            },
          },
          required: [
            "entry_date",
            "entry_type",
            "description",
            "amount",
            "running_balance",
            "payment_method",
            "notes",
          ],
        },
      },
      summary: {
        type: "string",
        description:
          "1-2 sentence summary of what this statement covers (e.g. date range, ending balance, who the lender is).",
      },
      loan_start_date: {
        type: ["string", "null"],
        description:
          "If the statement shows the loan origination date, return it as YYYY-MM-DD. Else null.",
      },
      interest_rate_apr: {
        type: ["number", "null"],
        description:
          "The interest rate as a percent (e.g. 8.75 for 8.75% APR). null if not shown.",
      },
      origination_fee_amount: {
        type: ["number", "null"],
        description:
          "The origination fee dollar amount if shown anywhere on the statement. null otherwise.",
      },
    },
    required: [
      "entries",
      "summary",
      "loan_start_date",
      "interest_rate_apr",
      "origination_fee_amount",
    ],
  },
};

const SYSTEM_PROMPT = `You are extracting structured data from a construction-loan statement so a builder can reconcile his books to the lender's numbers.

The statement may be a formal lender printout, a spreadsheet screenshot, or a hand-marked PDF. Read every row. Be conservative: only include events that are actually shown. If a row is ambiguous (e.g. "accrued interest" with no clear period), describe what you saw in the notes field.

Critical conventions:
- amount is ALWAYS positive. Direction is implied by entry_type.
- Use YYYY-MM-DD for dates. If the year isn't shown on a row but is clear from context, infer it.
- "Down payment" on a construction loan often appears as the first disbursement and the lender accrues interest on it from day one. Treat it as a disbursement, not a separate concept.
- An interest accrual and the cash payment of that accrual are TWO rows: one interest_accrual on the period-end date, one interest_payment on the date paid (with payment_method).
- If the lender shows running balances, capture them. The user will reconcile.

Return everything via the submit_loan_ledger tool. Do not include conversational text.`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file field is required (multipart/form-data)" },
      { status: 400 },
    );
  }

  const fileBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(fileBuffer).toString("base64");
  const mimeType = file.type || "application/pdf";
  const isImage = mimeType.startsWith("image/");

  const fileContent = isImage
    ? ({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: base64,
        },
      } as const)
    : ({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf" as const,
          data: base64,
        },
      } as const);

  let response: Anthropic.Messages.Message;
  try {
    response = await anthropic.messages.create({
      // Sonnet for accuracy on document parsing — these statements have
      // small numeric details that matter. Haiku misreads digits often
      // enough to hurt us here, and the volume is low (a few PDFs per
      // project), so the cost difference is negligible.
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: "submit_loan_ledger" },
      messages: [
        {
          role: "user",
          content: [
            fileContent,
            {
              type: "text",
              text: `This is a lender statement for project ${id}. Extract every loan event you can see and return them via the submit_loan_ledger tool.`,
            },
          ],
        },
      ],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI extraction failed" },
      { status: 502 },
    );
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    return NextResponse.json(
      { error: "Model did not return structured output" },
      { status: 502 },
    );
  }

  const result = toolUse.input as ExtractResult;
  return NextResponse.json(result);
}
