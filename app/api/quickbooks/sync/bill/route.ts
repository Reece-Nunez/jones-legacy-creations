/**
 * POST /api/quickbooks/sync/bill
 * Body: { contractorPaymentId: string }
 * Syncs a contractor payment as a QBO Bill (accounts payable).
 * Auto-syncs the vendor first if not mapped.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBill, createOrUpdateVendor, createBillPayment, qboQuery, uploadBillAttachment } from "@/lib/quickbooks/client";
import { getValidAccessToken } from "@/lib/quickbooks/auth";
import { categorizeBill } from "@/lib/quickbooks/ai-categorize";

async function getFirstBankAccountId(): Promise<string | null> {
  try {
    const result = await qboQuery(
      "SELECT Id FROM Account WHERE AccountType = 'Bank' AND Active = true MAXRESULTS 1"
    );
    const accounts: Array<{ Id: string }> = result?.QueryResponse?.Account ?? [];
    return accounts[0]?.Id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contractorPaymentId, force } = await request.json();
  if (!contractorPaymentId) {
    return NextResponse.json({ error: "contractorPaymentId required" }, { status: 400 });
  }

  const { data: payment, error } = await supabase
    .from("contractor_payments")
    .select("id, project_id, contractor_id, contractor_name, description, amount, status, paid_date, created_at, invoice_file_url, invoice_file_name, contractors(id, name, company, email, phone, trade, type), projects(id, name)")
    .eq("id", contractorPaymentId)
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const { realmId } = await getValidAccessToken();

  // Ensure vendor is synced (if we have a linked contractor)
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
          displayName: contractor.company || contractor.name,
          email: contractor.email,
          phone: contractor.phone,
          vendor1099: (contractor as { type?: string }).type === "contractor",
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

  // If no linked contractor, create an ad-hoc vendor by name
  if (!vendorQboId) {
    const qboVendor = await createOrUpdateVendor({
      displayName: payment.contractor_name,
    });
    vendorQboId = qboVendor.Id;
  }

  // Check if already synced
  const { data: existingBill } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id")
    .eq("entity_type", "bill")
    .eq("local_id", contractorPaymentId)
    .eq("realm_id", realmId)
    .maybeSingle();

  if (existingBill && !force) {
    // Bill exists — but if it's paid and has no BillPayment yet, create one now
    if (payment.status !== "pending") {
      const { data: existingBillPayment } = await supabase
        .from("quickbooks_entity_map")
        .select("qbo_id")
        .eq("entity_type", "bill_payment")
        .eq("local_id", contractorPaymentId)
        .eq("realm_id", realmId)
        .maybeSingle();

      if (!existingBillPayment) {
        const bankAccountId = await getFirstBankAccountId();
        if (!bankAccountId) {
          return NextResponse.json({
            success: true,
            qbo_id: existingBill.qbo_id,
            needs_bank_account: true,
          });
        }
        try {
          const qboPayment = await createBillPayment({
            vendorQboId: vendorQboId!,
            billQboId: existingBill.qbo_id,
            amount: payment.amount,
            bankAccountQboId: bankAccountId,
            txnDate: payment.paid_date?.split("T")[0] ?? new Date().toISOString().split("T")[0],
          });
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
        } catch (payErr) {
          console.error("Auto bill payment failed:", payErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      qbo_id: existingBill.qbo_id,
      note: "Already synced",
    });
  }

  // Force re-sync: clear the existing entity map entry so we create a fresh bill
  if (existingBill && force) {
    await supabase
      .from("quickbooks_entity_map")
      .delete()
      .eq("entity_type", "bill")
      .eq("local_id", contractorPaymentId)
      .eq("realm_id", realmId);
  }

  try {
    const contractor = Array.isArray(payment.contractors) ? payment.contractors[0] : payment.contractors;
    const project = Array.isArray(payment.projects) ? payment.projects[0] : payment.projects;

    // AI-enhanced categorization
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

    // Upload invoice PDF as attachment for QBO Autofill
    if (payment.invoice_file_url) {
      try {
        const fileName = payment.invoice_file_name ?? `invoice-${contractorPaymentId}.pdf`;
        await uploadBillAttachment(qboBill.Id, payment.invoice_file_url, fileName);
      } catch (attachErr) {
        console.error("Invoice attachment upload failed (non-fatal):", attachErr);
      }
    }

    // If already paid, also create a BillPayment so it shows as closed in QBO
    if (payment.status !== "pending") {
      const { data: existingBillPayment } = await supabase
        .from("quickbooks_entity_map")
        .select("qbo_id")
        .eq("entity_type", "bill_payment")
        .eq("local_id", contractorPaymentId)
        .eq("realm_id", realmId)
        .maybeSingle();

      if (!existingBillPayment) {
        const bankAccountId = await getFirstBankAccountId();
        if (!bankAccountId) {
          return NextResponse.json({ success: true, qbo_id: qboBill.Id, needs_bank_account: true });
        }
        try {
          const qboPayment = await createBillPayment({
            vendorQboId,
            billQboId: qboBill.Id,
            amount: payment.amount,
            bankAccountQboId: bankAccountId,
            txnDate: payment.paid_date?.split("T")[0] ?? new Date().toISOString().split("T")[0],
          });
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
        } catch (payErr) {
          console.error("Auto bill payment failed:", payErr);
        }
      }
    }

    return NextResponse.json({ success: true, qbo_id: qboBill.Id });
  } catch (err) {
    console.error("QBO bill sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
