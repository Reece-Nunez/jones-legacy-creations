/**
 * POST /api/quickbooks/pay/contractor
 * Body: { contractorPaymentId: string, bankAccountQboId: string }
 *
 * Creates a QBO BillPayment against the synced bill.
 * Auto-syncs vendor + bill first if not already done.
 * Updates local contractor_payment status to "paid" on success.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createBillPayment,
  createOrUpdateVendor,
  createBill,
} from "@/lib/quickbooks/client";
import { getValidAccessToken } from "@/lib/quickbooks/auth";
import { categorizeBill } from "@/lib/quickbooks/ai-categorize";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contractorPaymentId, bankAccountQboId } = await request.json();
  if (!contractorPaymentId || !bankAccountQboId) {
    return NextResponse.json(
      { error: "contractorPaymentId and bankAccountQboId required" },
      { status: 400 }
    );
  }

  // Fetch payment with related data
  const { data: payment, error } = await supabase
    .from("contractor_payments")
    .select(
      "id, project_id, contractor_id, contractor_name, description, amount, created_at, contractors(id, name, company, email, phone, trade, type, w9_required, w9_file_url), projects(id, name)"
    )
    .eq("id", contractorPaymentId)
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // ── W9 check ─────────────────────────────────────────────────────────────
  const contractor = Array.isArray(payment.contractors)
    ? payment.contractors[0]
    : payment.contractors;
  if (
    (contractor as { type?: string } | null)?.type !== "vendor" &&
    (contractor as { w9_required?: boolean } | null)?.w9_required &&
    !(contractor as { w9_file_url?: string | null } | null)?.w9_file_url
  ) {
    return NextResponse.json(
      { error: "A W9 is required for this contractor before payment can be processed." },
      { status: 422 }
    );
  }

  const { realmId } = await getValidAccessToken();

  // ── Step 1: Ensure vendor is synced ─────────────────────────────
  let vendorQboId: string | null = null;

  if (payment.contractor_id) {
    const { data: vendorMap } = await supabase
      .from("quickbooks_entity_map")
      .select("qbo_id")
      .eq("entity_type", "vendor")
      .eq("local_id", payment.contractor_id)
      .eq("realm_id", realmId)
      .maybeSingle();

    if (vendorMap) {
      vendorQboId = vendorMap.qbo_id;
    } else {
      const contractor = Array.isArray(payment.contractors)
        ? payment.contractors[0]
        : payment.contractors;

      if (contractor) {
        const qboVendor = await createOrUpdateVendor({
          displayName: (contractor as { company?: string; name: string }).company
            || (contractor as { name: string }).name,
          email: (contractor as { email?: string }).email,
          phone: (contractor as { phone?: string }).phone,
        });
        await supabase.from("quickbooks_entity_map").upsert(
          {
            entity_type: "vendor",
            local_id: payment.contractor_id,
            qbo_id: qboVendor.Id,
            realm_id: realmId,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "entity_type,local_id,realm_id" }
        );
        vendorQboId = qboVendor.Id;
      }
    }
  }

  if (!vendorQboId) {
    const qboVendor = await createOrUpdateVendor({
      displayName: payment.contractor_name,
    });
    vendorQboId = qboVendor.Id;
  }

  // ── Step 2: Ensure bill is synced ────────────────────────────────
  let billQboId: string | null = null;

  const { data: existingBill } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id")
    .eq("entity_type", "bill")
    .eq("local_id", contractorPaymentId)
    .eq("realm_id", realmId)
    .maybeSingle();

  if (existingBill) {
    billQboId = existingBill.qbo_id;
  } else {
    const contractor = Array.isArray(payment.contractors)
      ? payment.contractors[0]
      : payment.contractors;
    const project = Array.isArray(payment.projects)
      ? payment.projects[0]
      : payment.projects;

    const categorized = await categorizeBill({
      contractorName: payment.contractor_name,
      trade: (contractor as { trade?: string } | null)?.trade ?? "General",
      description: payment.description,
      amount: payment.amount,
      projectName: (project as { name?: string } | null)?.name,
    });

    const qboBill = await createBill({
      vendorQboId,
      amount: payment.amount,
      description: categorized.description,
      account: categorized.account,
      memo: categorized.memo,
      txnDate: payment.created_at?.split("T")[0],
      docNumber: `B-${contractorPaymentId.slice(0, 8)}`,
    });

    await supabase.from("quickbooks_entity_map").upsert(
      {
        entity_type: "bill",
        local_id: contractorPaymentId,
        qbo_id: qboBill.Id,
        realm_id: realmId,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,local_id,realm_id" }
    );

    billQboId = qboBill.Id;
  }

  // ── Step 3: Check if already paid in QBO ─────────────────────────
  const { data: existingPayment } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id")
    .eq("entity_type", "bill_payment")
    .eq("local_id", contractorPaymentId)
    .eq("realm_id", realmId)
    .maybeSingle();

  if (existingPayment) {
    // Sync local status to paid in case it fell out of sync
    await supabase
      .from("contractor_payments")
      .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] })
      .eq("id", contractorPaymentId)
      .eq("status", "pending");
    return NextResponse.json({
      success: true,
      qbo_id: existingPayment.qbo_id,
      note: "Already paid in QuickBooks",
    });
  }

  // ── Step 4: Create the BillPayment ───────────────────────────────
  try {
    const project = Array.isArray(payment.projects)
      ? payment.projects[0]
      : payment.projects;

    const qboPayment = await createBillPayment({
      vendorQboId: vendorQboId!,
      billQboId: billQboId!,
      amount: payment.amount,
      bankAccountQboId,
      memo: (project as { name?: string } | null)?.name
        ? `Payment — ${(project as { name: string }).name}`
        : `Payment to ${payment.contractor_name}`,
      txnDate: new Date().toISOString().split("T")[0],
      docNumber: `P-${contractorPaymentId.slice(0, 8)}`,
    });

    // Store bill_payment in entity map
    await supabase.from("quickbooks_entity_map").upsert(
      {
        entity_type: "bill_payment",
        local_id: contractorPaymentId,
        qbo_id: qboPayment.Id,
        realm_id: realmId,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,local_id,realm_id" }
    );

    // Mark payment as paid and clear any previous sync error
    await supabase
      .from("contractor_payments")
      .update({ status: "paid", qbo_sync_error: null })
      .eq("id", contractorPaymentId);

    return NextResponse.json({ success: true, qbo_id: qboPayment.Id });
  } catch (err) {
    console.error("QBO bill payment error:", err);
    const errorMessage = err instanceof Error ? err.message : "Payment failed";

    // Persist the error so the UI can surface a retry button
    await supabase
      .from("contractor_payments")
      .update({ qbo_sync_error: errorMessage })
      .eq("id", contractorPaymentId);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
