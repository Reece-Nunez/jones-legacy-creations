/**
 * POST /api/quickbooks/sync/customer
 * Body: { projectId: string }
 * Syncs the project's client as a QBO Customer.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrUpdateCustomer } from "@/lib/quickbooks/client";
import { getValidAccessToken } from "@/lib/quickbooks/auth";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await request.json();
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, client_name, client_email, client_phone")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check existing mapping
  const { realmId } = await getValidAccessToken();
  const { data: existing } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id")
    .eq("entity_type", "customer")
    .eq("local_id", projectId)
    .eq("realm_id", realmId)
    .maybeSingle();

  try {
    const qboCustomer = await createOrUpdateCustomer(
      {
        displayName: project.client_name,
        email: project.client_email,
        phone: project.client_phone,
      },
      existing?.qbo_id
    );

    // Upsert entity map
    await supabase.from("quickbooks_entity_map").upsert(
      {
        entity_type: "customer",
        local_id: projectId,
        qbo_id: qboCustomer.Id,
        realm_id: realmId,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,local_id,realm_id" }
    );

    return NextResponse.json({ success: true, qbo_id: qboCustomer.Id });
  } catch (err) {
    console.error("QBO customer sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
