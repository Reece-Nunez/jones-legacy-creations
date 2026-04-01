import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quote_revisions")
    .select("*")
    .eq("quote_id", id)
    .order("revision_number", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));

  // Fetch current quote with all related data for the snapshot
  const [
    { data: quote, error: quoteError },
    { data: sections },
    { data: items },
    { data: exclusions },
    { data: allowances },
    { data: riskFlags },
    { data: vendorQuotes },
  ] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).single(),
    supabase.from("quote_sections").select("*").eq("quote_id", id).order("sort_order"),
    supabase.from("quote_items").select("*").eq("quote_id", id).order("sort_order"),
    supabase.from("quote_exclusions").select("*").eq("quote_id", id).order("sort_order"),
    supabase.from("quote_allowances").select("*").eq("quote_id", id).order("sort_order"),
    supabase.from("quote_risk_flags").select("*").eq("quote_id", id),
    supabase.from("quote_vendor_quotes").select("*").eq("quote_id", id),
  ]);

  if (quoteError) {
    return NextResponse.json(
      { error: quoteError.message },
      { status: quoteError.code === "PGRST116" ? 404 : 500 }
    );
  }

  const currentRevision = quote.revision_number || 1;

  // Build snapshot
  const snapshot = {
    quote,
    sections: sections || [],
    items: items || [],
    exclusions: exclusions || [],
    allowances: allowances || [],
    risk_flags: riskFlags || [],
    vendor_quotes: vendorQuotes || [],
  };

  // Create revision record
  const { data: revision, error: revisionError } = await supabase
    .from("quote_revisions")
    .insert({
      quote_id: id,
      revision_number: currentRevision,
      changed_by: body.changed_by || null,
      change_summary: body.change_summary || null,
      snapshot,
    })
    .select()
    .single();

  if (revisionError) {
    return NextResponse.json({ error: revisionError.message }, { status: 400 });
  }

  // Increment quote revision number
  await supabase
    .from("quotes")
    .update({
      revision_number: currentRevision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json(revision, { status: 201 });
}
