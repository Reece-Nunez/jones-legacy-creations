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

  const { data, error } = await supabase
    .from("contractors")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
