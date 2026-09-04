import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

/**
 * Blake's standard per-square-foot rates, one row per trade.
 *
 * These seed a new quote's cost breakdown; they are never charged to anyone
 * directly, so there is no client-facing surface here.
 */

const MAX_TRADE_LENGTH = 120;

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("standard_trade_rates")
    .select("*, contractor:contractors(id, name, company)")
    .order("trade_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

type RateInput = {
  trade_name?: unknown;
  rate_per_sqft?: unknown;
  contractor_id?: unknown;
  contractor_note?: unknown;
  notes?: unknown;
  active?: unknown;
};

/** Shared validation: a rate is money, so a bad number must not reach the table. */
function readRate(body: RateInput): { values: Record<string, unknown> } | { error: string } {
  const tradeName = typeof body.trade_name === "string" ? body.trade_name.trim() : "";
  if (!tradeName) return { error: "Trade name is required" };
  if (tradeName.length > MAX_TRADE_LENGTH) {
    return { error: `Trade name is too long (max ${MAX_TRADE_LENGTH} characters)` };
  }

  const raw = body.rate_per_sqft;
  const rate =
    typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(rate)) return { error: "Rate must be a number" };
  if (rate < 0) return { error: "Rate cannot be negative" };

  return {
    values: {
      trade_name: tradeName,
      rate_per_sqft: rate,
      contractor_id: typeof body.contractor_id === "string" && body.contractor_id ? body.contractor_id : null,
      contractor_note:
        typeof body.contractor_note === "string" && body.contractor_note.trim()
          ? body.contractor_note.trim()
          : null,
      notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
      active: body.active === undefined ? true : body.active !== false,
    },
  };
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const parsed = readRate(await request.json().catch(() => ({})));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("standard_trade_rates")
    .insert(parsed.values)
    .select()
    .single();

  if (error) {
    // The unique index on lower(trade_name) is what enforces one rate per
    // trade; turn its error into something readable.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `There is already a rate for "${parsed.values.trade_name}"` },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const parsed = readRate(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("standard_trade_rates")
    .update({ ...parsed.values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `There is already a rate for "${parsed.values.trade_name}"` },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("standard_trade_rates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
