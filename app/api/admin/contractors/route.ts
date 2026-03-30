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
  if (data) {
    const contractors = Array.isArray(data) ? data : [data];
    for (const contractor of contractors) {
      const searchTerms = [contractor.name, contractor.company].filter(Boolean);
      if (searchTerms.length === 0) continue;

      // Build OR conditions for matching
      const orConditions = searchTerms
        .flatMap((term: string) => [
          `contractor_name.ilike.%${term}%`,
        ])
        .join(",");

      const docOrConditions = searchTerms
        .flatMap((term: string) => [
          `vendor.ilike.%${term}%`,
        ])
        .join(",");

      // Link unlinked contractor_payments
      await supabase
        .from("contractor_payments")
        .update({ contractor_id: contractor.id })
        .is("contractor_id", null)
        .or(orConditions);

      // Link unlinked documents
      await supabase
        .from("documents")
        .update({ contractor_id: contractor.id })
        .is("contractor_id", null)
        .or(docOrConditions);
    }
  }

  return NextResponse.json(isBulk ? data : data?.[0], { status: 201 });
}
