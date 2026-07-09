import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { nextStatusFor, type BidStatus } from "@/lib/bids/status";

// Staff lifecycle actions on a bid request. Acceptance/decline happen only via
// the public token route; here staff advance an accepted bid to completed → paid,
// or void a request that hasn't reached a terminal state.
const ACTIONS = new Set(["complete", "paid", "void"]);

const ACTION_LOG: Record<string, string> = {
  complete: "bid_completed",
  paid: "bid_paid",
  void: "bid_voided",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  const { id, bidId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data: bid, error: readError } = await supabase
    .from("bid_requests")
    .select("id, status, title")
    .eq("id", bidId)
    .eq("project_id", id)
    .single();

  if (readError || !bid) {
    return NextResponse.json({ error: "Bid request not found" }, { status: 404 });
  }

  const next = nextStatusFor(action as "complete" | "paid" | "void", bid.status as BidStatus);
  if (!next) {
    return NextResponse.json(
      { error: `Can't ${action} a bid that is "${bid.status}".` },
      { status: 409 }
    );
  }

  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = { status: next, updated_at: nowIso };
  if (next === "completed") updates.completed_at = nowIso;
  if (next === "paid") updates.paid_at = nowIso;

  const { data, error } = await supabase
    .from("bid_requests")
    .update(updates)
    .eq("id", bidId)
    .eq("project_id", id)
    .select("*, document:documents(file_url, name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    project_id: id,
    action: ACTION_LOG[action],
    description: `Bid "${bid.title}" marked ${next}`,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  const { id, bidId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { error } = await supabase
    .from("bid_requests")
    .delete()
    .eq("id", bidId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
