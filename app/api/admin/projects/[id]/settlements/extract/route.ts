/**
 * POST /api/admin/projects/[id]/settlements/extract
 *
 * Upload an ALTA Settlement Statement (PDF or image) and Claude returns
 * the itemized breakdown for review. Same review-before-persist pattern
 * as the loan-ledger extractor: the model can misread small print, so
 * the UI shows the suggestion with editable fields and only saves when
 * the user confirms.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const EXTRACTION_TOOL: Anthropic.Messages.Tool = {
  name: "submit_settlement",
  description:
    "Submit the ALTA Settlement Statement extracted from the document.",
  input_schema: {
    type: "object",
    properties: {
      settlement_date: {
        type: "string",
        description:
          "Closing/disbursement date in YYYY-MM-DD format. Usually labeled 'Settlement Date' or 'Closing Date' on the statement.",
      },
      settlement_type: {
        type: "string",
        enum: ["purchase", "sale"],
        description:
          "'purchase' if Blake's company is the BUYER (construction loan close, lot purchase). 'sale' if Blake's company is the SELLER (final sale to homebuyer).",
      },
      sale_price: {
        type: ["number", "null"],
        description: "Sale price of the property for a sale settlement, else null.",
      },
      seller_concessions: {
        type: ["number", "null"],
        description:
          "Credits the seller gave the buyer (rate buy-downs, repair credits, contract addenda concessions). Sums multiple concession lines if applicable.",
      },
      title_insurance: {
        type: ["number", "null"],
        description: "Owner's or lender's title insurance premium. Null if not listed.",
      },
      escrow_fee: {
        type: ["number", "null"],
        description: "Escrow / settlement fee paid to the title company.",
      },
      recording_fees: {
        type: ["number", "null"],
        description:
          "Sum of all government / title recording-type fees: document preparation, e-filing, reconveyance fees, SCR filing, recording. Group these together — they're typically small individually.",
      },
      prorated_taxes: {
        type: ["number", "null"],
        description: "County taxes prorated through the settlement date.",
      },
      other_fees: {
        type: "array",
        description:
          "Any other seller-side debits that don't fit the typed columns above (HOA dues, home warranty, transfer tax, special inspections, etc.). Empty array if none.",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            amount: { type: "number" },
          },
          required: ["label", "amount"],
        },
      },
      loan_payoff: {
        type: ["number", "null"],
        description:
          "Amount paid to the seller's lender to retire the construction loan (sale-side only).",
      },
      net_to_seller: {
        type: ["number", "null"],
        description:
          "The wire/check amount the seller actually receives. Usually labeled 'Due To Seller' or 'Cash To Seller'.",
      },
      purchase_price: {
        type: ["number", "null"],
        description: "Purchase price (purchase settlement only).",
      },
      earnest_money: {
        type: ["number", "null"],
        description: "Earnest money already deposited (purchase settlement only).",
      },
      loan_amount: {
        type: ["number", "null"],
        description: "New loan amount funded at closing (purchase settlement only).",
      },
      cash_to_close: {
        type: ["number", "null"],
        description:
          "Cash the buyer brings to closing (purchase settlement only). Usually labeled 'Cash to Close' or 'Due From Borrower'.",
      },
      notes: {
        type: ["string", "null"],
        description:
          "Anything notable or unusual — concession structure, unusual fees, parties involved. 1-2 sentences max.",
      },
    },
    required: [
      "settlement_date",
      "settlement_type",
      "sale_price",
      "seller_concessions",
      "title_insurance",
      "escrow_fee",
      "recording_fees",
      "prorated_taxes",
      "other_fees",
      "loan_payoff",
      "net_to_seller",
      "purchase_price",
      "earnest_money",
      "loan_amount",
      "cash_to_close",
      "notes",
    ],
  },
};

const SYSTEM_PROMPT = `You are extracting structured data from an ALTA Settlement Statement so a custom-home builder can reconcile his books.

Identify whether this is a sale or purchase settlement: if the document says "ALTA Settlement Statement - Seller" or shows Blake's company in the Seller field, it's a sale. If "Buyer" / "Borrower" / "Purchase", it's a purchase.

Use the typed columns for common line items. Roll smaller recording-type fees (doc prep, e-filing, reconveyance, SCR, recording) into recording_fees as a sum. Anything that doesn't fit the typed columns goes into other_fees with a clear label.

Return everything via the submit_settlement tool. Do not include conversational text. If a field isn't present on the statement, use null (not 0).`;

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
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: "submit_settlement" },
      messages: [
        {
          role: "user",
          content: [
            fileContent,
            {
              type: "text",
              text: `This is an ALTA Settlement Statement for project ${id}. Extract the line items via the submit_settlement tool.`,
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

  return NextResponse.json(toolUse.input);
}
