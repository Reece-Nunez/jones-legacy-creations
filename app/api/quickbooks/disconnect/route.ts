import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/quickbooks/auth";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await clearTokens();
  return NextResponse.json({ success: true });
}
