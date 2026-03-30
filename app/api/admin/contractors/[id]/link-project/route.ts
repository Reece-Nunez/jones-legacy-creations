import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Words too common/short to match on reliably
const SKIP_WORDS = new Set([
  "the", "and", "inc", "llc", "co", "corp", "ltd", "of", "for", "a", "an",
]);

/**
 * Extract meaningful search words from a name/company string.
 * "Peak Air HVAC LLC" → ["Peak", "Air", "HVAC"]
 */
function getSearchWords(text: string): string[] {
  return text
    .split(/[\s,.\-/&]+/)
    .filter((w) => w.length >= 3 && !SKIP_WORDS.has(w.toLowerCase()));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractorId } = await params;
  const supabase = await createClient();
  const { project_id } = await request.json();

  if (!project_id) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  // Get contractor details for name matching
  const { data: contractor } = await supabase
    .from("contractors")
    .select("name, company")
    .eq("id", contractorId)
    .single();

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  // Build search words from both name and company
  const fullTerms = [contractor.name, contractor.company].filter(Boolean) as string[];
  const words = fullTerms.flatMap(getSearchWords);
  // Deduplicate (case-insensitive)
  const uniqueWords = [...new Set(words.map((w) => w.toLowerCase()))];

  // Get all unlinked payments on this project
  const { data: unlinkPayments } = await supabase
    .from("contractor_payments")
    .select("id, contractor_name")
    .eq("project_id", project_id)
    .is("contractor_id", null);

  // Get all unlinked documents on this project
  const { data: unlinkDocs } = await supabase
    .from("documents")
    .select("id, vendor")
    .eq("project_id", project_id)
    .is("contractor_id", null);

  // Match payments: if any word from the contractor name appears in the payment name
  const matchedPaymentIds: string[] = [];
  for (const payment of unlinkPayments || []) {
    if (!payment.contractor_name) continue;
    const paymentName = payment.contractor_name.toLowerCase();
    // Check full terms first (e.g., "Peak Air HVAC" in "Peak Air HVAC Services")
    const fullMatch = fullTerms.some((t) => paymentName.includes(t.toLowerCase()));
    // Then check individual words (e.g., "Peak" in "Peak")
    const wordMatch = uniqueWords.some((w) => paymentName.includes(w));
    if (fullMatch || wordMatch) {
      matchedPaymentIds.push(payment.id);
    }
  }

  // Match documents: same logic on vendor field
  const matchedDocIds: string[] = [];
  for (const doc of unlinkDocs || []) {
    if (!doc.vendor) continue;
    const vendorName = doc.vendor.toLowerCase();
    const fullMatch = fullTerms.some((t) => vendorName.includes(t.toLowerCase()));
    const wordMatch = uniqueWords.some((w) => vendorName.includes(w));
    if (fullMatch || wordMatch) {
      matchedDocIds.push(doc.id);
    }
  }

  // Update matched records
  if (matchedPaymentIds.length > 0) {
    await supabase
      .from("contractor_payments")
      .update({ contractor_id: contractorId })
      .in("id", matchedPaymentIds);
  }

  if (matchedDocIds.length > 0) {
    await supabase
      .from("documents")
      .update({ contractor_id: contractorId })
      .in("id", matchedDocIds);
  }

  return NextResponse.json({
    success: true,
    linked_payments: matchedPaymentIds.length,
    linked_documents: matchedDocIds.length,
  });
}
