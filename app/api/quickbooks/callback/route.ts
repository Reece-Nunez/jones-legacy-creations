import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, saveTokens } from "@/lib/quickbooks/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsUrl = new URL("/admin/settings?tab=integrations", request.url);

  if (error) {
    settingsUrl.searchParams.set("qbo_error", error);
    return NextResponse.redirect(settingsUrl);
  }

  // Validate state
  const storedState = request.cookies.get("qbo_state")?.value;
  if (!state || state !== storedState) {
    settingsUrl.searchParams.set("qbo_error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !realmId) {
    settingsUrl.searchParams.set("qbo_error", "missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeCode(code, realmId);
    await saveTokens(tokens, realmId);
  } catch (err) {
    console.error("QBO callback error:", err);
    settingsUrl.searchParams.set("qbo_error", "token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  settingsUrl.searchParams.set("qbo_connected", "1");

  const response = NextResponse.redirect(settingsUrl);
  // Clear the state cookie
  response.cookies.delete("qbo_state");
  return response;
}
