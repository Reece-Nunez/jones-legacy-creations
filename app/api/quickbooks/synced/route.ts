/**
 * GET /api/quickbooks/synced?type=bill&id=xxx
 * Returns whether a local entity has been synced to QBO.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStoredTokens } from "@/lib/quickbooks/auth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json({ error: "type and id required" }, { status: 400 });
  }

  const tokens = await getStoredTokens();
  if (!tokens) {
    return NextResponse.json({ connected: false, synced: false });
  }

  const { data } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id, synced_at")
    .eq("entity_type", type)
    .eq("local_id", id)
    .eq("realm_id", tokens.realm_id)
    .maybeSingle();

  return NextResponse.json({
    connected: true,
    synced: !!data,
    qbo_id: data?.qbo_id ?? null,
    synced_at: data?.synced_at ?? null,
  });
}
