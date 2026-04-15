/**
 * POST /api/quickbooks/sync/invoice
 * Body: { invoiceId: string }
 * Syncs a project invoice to QBO. Auto-syncs the customer first if not mapped.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createInvoice, createOrUpdateCustomer } from "@/lib/quickbooks/client";
import { getValidAccessToken } from "@/lib/quickbooks/auth";
import { categorizeInvoice } from "@/lib/quickbooks/ai-categorize";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoiceId, force } = await request.json();
  if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

  // Fetch invoice + project
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .select("id, project_id, invoice_number, description, amount, due_date, projects(id, name, client_name, client_email, client_phone, project_type)")
    .eq("id", invoiceId)
    .single();

  if (invError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const project = Array.isArray(invoice.projects) ? invoice.projects[0] : invoice.projects;
  if (!project) {
    return NextResponse.json({ error: "Associated project not found" }, { status: 404 });
  }

  const { realmId } = await getValidAccessToken();

  // Ensure customer is synced
  let { data: customerMap } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id")
    .eq("entity_type", "customer")
    .eq("local_id", invoice.project_id)
    .eq("realm_id", realmId)
    .maybeSingle();

  if (!customerMap) {
    const qboCustomer = await createOrUpdateCustomer({
      displayName: project.client_name,
      email: project.client_email,
      phone: project.client_phone,
    });

    await supabase.from("quickbooks_entity_map").upsert(
      {
        entity_type: "customer",
        local_id: invoice.project_id,
        qbo_id: qboCustomer.Id,
        realm_id: realmId,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,local_id,realm_id" }
    );

    customerMap = { qbo_id: qboCustomer.Id };
  }

  // Check if invoice already synced
  const { data: existingInv } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id")
    .eq("entity_type", "invoice")
    .eq("local_id", invoiceId)
    .eq("realm_id", realmId)
    .maybeSingle();

  if (existingInv && !force) {
    return NextResponse.json({
      success: true,
      qbo_id: existingInv.qbo_id,
      note: "Already synced",
    });
  }

  if (existingInv && force) {
    await supabase
      .from("quickbooks_entity_map")
      .delete()
      .eq("entity_type", "invoice")
      .eq("local_id", invoiceId)
      .eq("realm_id", realmId);
  }

  try {
    const proj = Array.isArray(invoice.projects) ? invoice.projects[0] : invoice.projects;

    // AI-enhanced invoice line description
    const aiLine = await categorizeInvoice({
      clientName: project.client_name,
      projectName: (proj as { name?: string } | null)?.name,
      projectType: (proj as { project_type?: string } | null)?.project_type,
      description: invoice.description,
      amount: invoice.amount,
      invoiceNumber: invoice.invoice_number,
    });

    const qboInvoice = await createInvoice({
      customerQboId: customerMap.qbo_id,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      description: aiLine.description,
      memo: aiLine.memo,
      dueDate: invoice.due_date,
    });

    await supabase.from("quickbooks_entity_map").upsert(
      {
        entity_type: "invoice",
        local_id: invoiceId,
        qbo_id: qboInvoice.Id,
        realm_id: realmId,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,local_id,realm_id" }
    );

    return NextResponse.json({ success: true, qbo_id: qboInvoice.Id });
  } catch (err) {
    console.error("QBO invoice sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
