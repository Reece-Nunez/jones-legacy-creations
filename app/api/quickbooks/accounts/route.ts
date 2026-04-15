/**
 * GET /api/quickbooks/accounts
 * Returns Blake's active bank accounts from QBO for the pay-from selector.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { qboQuery } from "@/lib/quickbooks/client";

export interface QBOBankAccount {
  Id: string;
  Name: string;
  AccountType: string;
  CurrentBalance: number;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await qboQuery(
      "SELECT Id, Name, AccountType, CurrentBalance FROM Account WHERE AccountType = 'Bank' AND Active = true MAXRESULTS 20"
    );

    const accounts: QBOBankAccount[] =
      result?.QueryResponse?.Account ?? [];

    return NextResponse.json(accounts);
  } catch (err) {
    console.error("QBO accounts fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
