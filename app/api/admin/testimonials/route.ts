import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("status", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  if (!body.author_name || !body.quote || !body.service) {
    return NextResponse.json(
      { error: "author_name, quote, and service are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("testimonials")
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
