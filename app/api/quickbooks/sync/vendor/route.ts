/**
 * POST /api/quickbooks/sync/vendor
 * Body: { contractorId: string }
 * Syncs a contractor as a QBO Vendor.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrUpdateVendor, createBill } from "@/lib/quickbooks/client";
import { getValidAccessToken } from "@/lib/quickbooks/auth";
import { categorizeBill } from "@/lib/quickbooks/ai-categorize";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contractorId, force } = await request.json();
  if (!contractorId) return NextResponse.json({ error: "contractorId required" }, { status: 400 });

  const { data: contractor, error } = await supabase
    .from("contractors")
    .select("id, name, company, email, phone, type, trade")
    .eq("id", contractorId)
    .single();

  if (error || !contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const { realmId } = await getValidAccessToken();
  const { data: existing } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id")
    .eq("entity_type", "vendor")
    .eq("local_id", contractorId)
    .eq("realm_id", realmId)
    .maybeSingle();

  try {
    const displayName = contractor.company || contractor.name;

    const qboVendor = await createOrUpdateVendor(
      {
        displayName,
        email: contractor.email,
        phone: contractor.phone,
        vendor1099: contractor.type === "contractor",
      },
      existing?.qbo_id
    );

    await supabase.from("quickbooks_entity_map").upsert(
      {
        entity_type: "vendor",
        local_id: contractorId,
        qbo_id: qboVendor.Id,
        realm_id: realmId,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,local_id,realm_id" }
    );

    // On force re-sync, also push any unsynced payments for this contractor
    if (force) {
      const { data: payments } = await supabase
        .from("contractor_payments")
        .select("id, contractor_name, description, amount, created_at, projects(id, name)")
        .eq("contractor_id", contractorId);

      if (payments?.length) {
        for (const payment of payments) {
          // Skip if already in entity map
          const { data: existingBill } = await supabase
            .from("quickbooks_entity_map")
            .select("qbo_id")
            .eq("entity_type", "bill")
            .eq("local_id", payment.id)
            .eq("realm_id", realmId)
            .maybeSingle();

          if (existingBill) continue;

          try {
            const project = Array.isArray(payment.projects) ? payment.projects[0] : payment.projects;
            const categorized = await categorizeBill({
              contractorName: payment.contractor_name,
              trade: contractor.trade ?? "General",
              description: payment.description,
              amount: payment.amount,
              projectName: (project as { name?: string } | null)?.name,
            });

            const qboBill = await createBill({
              vendorQboId: qboVendor.Id,
              amount: payment.amount,
              description: categorized.description,
              account: categorized.account,
              memo: categorized.memo,
              txnDate: payment.created_at?.split("T")[0],
            });

            await supabase.from("quickbooks_entity_map").upsert(
              {
                entity_type: "bill",
                local_id: payment.id,
                qbo_id: qboBill.Id,
                realm_id: realmId,
                synced_at: new Date().toISOString(),
              },
              { onConflict: "entity_type,local_id,realm_id" }
            );
          } catch (billErr) {
            console.error(`Failed to sync bill for payment ${payment.id}:`, billErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true, qbo_id: qboVendor.Id });
  } catch (err) {
    console.error("QBO vendor sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
