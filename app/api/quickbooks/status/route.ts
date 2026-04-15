import { NextResponse } from "next/server";
import { getStoredTokens } from "@/lib/quickbooks/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await getStoredTokens();

  if (!tokens) {
    return NextResponse.json({ connected: false });
  }

  const now = new Date();
  const refreshExpires = new Date(tokens.refresh_token_expires_at);
  const accessExpires = new Date(tokens.expires_at);

  if (now >= refreshExpires) {
    return NextResponse.json({ connected: false, reason: "refresh_token_expired" });
  }

  return NextResponse.json({
    connected: true,
    realm_id: tokens.realm_id,
    access_token_expires_at: accessExpires.toISOString(),
    refresh_token_expires_at: refreshExpires.toISOString(),
  });
}
