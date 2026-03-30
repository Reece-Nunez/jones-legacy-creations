import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const q = request.nextUrl.searchParams.get("q");
  const trade = request.nextUrl.searchParams.get("trade");

  let query = supabase
    .from("contractors")
    .select("*")
    .order("name", { ascending: true });

  if (q) {
    query = query.or(`name.ilike.%${q}%,company.ilike.%${q}%`);
  }

  if (trade) {
    query = query.eq("trade", trade);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  // Support bulk insert (array) or single insert (object)
  const isBulk = Array.isArray(body);

  const { data, error } = await supabase
    .from("contractors")
    .insert(isBulk ? body : body)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Auto-link existing payments and documents that match by name/company
  // Uses word-based fuzzy matching so "Peak" matches "Peak Air HVAC"
  const SKIP_WORDS = new Set(["the", "and", "inc", "llc", "co", "corp", "ltd", "of", "for", "a", "an"]);
  function getSearchWords(text: string): string[] {
    return text.split(/[\s,.\-/&]+/).filter((w) => w.length >= 3 && !SKIP_WORDS.has(w.toLowerCase()));
  }

  if (data) {
    const contractors = Array.isArray(data) ? data : [data];
    for (const contractor of contractors) {
      const fullTerms = [contractor.name, contractor.company].filter(Boolean) as string[];
      const words = [...new Set(fullTerms.flatMap(getSearchWords).map((w: string) => w.toLowerCase()))];
      if (words.length === 0) continue;

      // Build OR conditions using individual words for broader matching
      const paymentConditions = words.map((w: string) => `contractor_name.ilike.%${w}%`).join(",");
      const docConditions = words.map((w: string) => `vendor.ilike.%${w}%`).join(",");

      // Link unlinked contractor_payments
      await supabase
        .from("contractor_payments")
        .update({ contractor_id: contractor.id })
        .is("contractor_id", null)
        .or(paymentConditions);

      // Link unlinked documents
      await supabase
        .from("documents")
        .update({ contractor_id: contractor.id })
        .is("contractor_id", null)
        .or(docConditions);
    }
  }

  return NextResponse.json(isBulk ? data : data?.[0], { status: 201 });
}
