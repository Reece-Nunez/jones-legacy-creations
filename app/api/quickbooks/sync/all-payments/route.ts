import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/quickbooks/auth";
import { createBill } from "@/lib/quickbooks/client";
import { categorizeBill } from "@/lib/quickbooks/ai-categorize";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("contractor_payments")
    .select(
      "id, project_id, contractor_id, contractor_name, description, amount, created_at, contractors(id, name, company, trade), projects(id, name)"
    );

  if (paymentsError) {
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }

  const { realmId } = await getValidAccessToken();

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const payment of payments ?? []) {
    try {
      // Skip if already synced as a bill in this realm
      const { data: existingBill } = await supabase
        .from("quickbooks_entity_map")
        .select("qbo_id")
        .eq("entity_type", "bill")
        .eq("local_id", payment.id)
        .eq("realm_id", realmId)
        .maybeSingle();

      if (existingBill) {
        skipped++;
        continue;
      }

      // Look up vendor QBO ID — vendor must be synced first
      const { data: vendorMap } = await supabase
        .from("quickbooks_entity_map")
        .select("qbo_id")
        .eq("entity_type", "vendor")
        .eq("local_id", payment.contractor_id)
        .eq("realm_id", realmId)
        .maybeSingle();

      if (!vendorMap) {
        skipped++;
        continue;
      }

      // Supabase returns joined relations as objects, not arrays
      const contractor = Array.isArray(payment.contractors)
        ? payment.contractors[0]
        : payment.contractors;
      const project = Array.isArray(payment.projects)
        ? payment.projects[0]
        : payment.projects;

      const categorized = await categorizeBill({
        contractorName: payment.contractor_name,
        trade: contractor?.trade ?? "General",
        description: payment.description,
        amount: payment.amount,
        projectName: project?.name,
      });

      const bill = await createBill({
        vendorQboId: vendorMap.qbo_id,
        amount: payment.amount,
        description: categorized.description,
        account: categorized.account,
        memo: categorized.memo,
        txnDate: payment.created_at?.split("T")[0],
        docNumber: `B-${payment.id.slice(0, 8)}`,
      });

      await supabase.from("quickbooks_entity_map").upsert(
        {
          entity_type: "bill",
          local_id: payment.id,
          qbo_id: bill.Id,
          realm_id: realmId,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,local_id,realm_id" }
      );

      succeeded++;
    } catch (err) {
      console.error(`[QBO] Failed to sync bill for payment ${payment.id}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  return NextResponse.json({
    succeeded,
    skipped,
    failed,
    total: payments?.length ?? 0,
  });
}
