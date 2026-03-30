import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Words too common/short to match on reliably
const SKIP_WORDS = new Set([
  "the", "and", "inc", "llc", "co", "corp", "ltd", "of", "for", "a", "an",
]);

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

  // 1. Create the assignment in the junction table (upsert to avoid duplicates)
  await supabase
    .from("project_contractors")
    .upsert(
      { project_id, contractor_id: contractorId },
      { onConflict: "project_id,contractor_id" }
    );

  // 2. Fuzzy-match existing unlinked payments and documents
  const fullTerms = [contractor.name, contractor.company].filter(Boolean) as string[];
  const words = [...new Set(fullTerms.flatMap(getSearchWords).map((w) => w.toLowerCase()))];

  // Get unlinked payments on this project
  const { data: unlinkPayments } = await supabase
    .from("contractor_payments")
    .select("id, contractor_name")
    .eq("project_id", project_id)
    .is("contractor_id", null);

  const matchedPaymentIds: string[] = [];
  for (const payment of unlinkPayments || []) {
    if (!payment.contractor_name) continue;
    const paymentName = payment.contractor_name.toLowerCase();
    const fullMatch = fullTerms.some((t) => paymentName.includes(t.toLowerCase()));
    const wordMatch = words.some((w) => paymentName.includes(w));
    if (fullMatch || wordMatch) {
      matchedPaymentIds.push(payment.id);
    }
  }

  // Get unlinked documents on this project
  const { data: unlinkDocs } = await supabase
    .from("documents")
    .select("id, vendor")
    .eq("project_id", project_id)
    .is("contractor_id", null);

  const matchedDocIds: string[] = [];
  for (const doc of unlinkDocs || []) {
    if (!doc.vendor) continue;
    const vendorName = doc.vendor.toLowerCase();
    const fullMatch = fullTerms.some((t) => vendorName.includes(t.toLowerCase()));
    const wordMatch = words.some((w) => vendorName.includes(w));
    if (fullMatch || wordMatch) {
      matchedDocIds.push(doc.id);
    }
  }

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
