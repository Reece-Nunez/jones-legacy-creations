/**
 * POST /api/quickbooks/sync/w9
 * Body: { contractorId: string }
 * Uploads the contractor's W9 from Supabase storage to their QBO vendor record.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/quickbooks/auth";
import { uploadVendorAttachment } from "@/lib/quickbooks/client";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contractorId } = await request.json();
  if (!contractorId) {
    return NextResponse.json({ error: "contractorId required" }, { status: 400 });
  }

  // Fetch contractor with W9 details
  const { data: contractor, error } = await supabase
    .from("contractors")
    .select("id, name, w9_file_url, w9_file_name")
    .eq("id", contractorId)
    .single();

  if (error || !contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }
  if (!contractor.w9_file_url) {
    return NextResponse.json({ error: "No W9 on file for this contractor" }, { status: 400 });
  }

  // Look up QBO vendor ID
  const { realmId } = await getValidAccessToken();
  const { data: vendorMap } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id")
    .eq("entity_type", "vendor")
    .eq("local_id", contractorId)
    .eq("realm_id", realmId)
    .maybeSingle();

  if (!vendorMap) {
    return NextResponse.json(
      { error: "Contractor is not yet synced to QuickBooks. Sync them first." },
      { status: 400 }
    );
  }

  try {
    await uploadVendorAttachment(
      vendorMap.qbo_id,
      contractor.w9_file_url,
      contractor.w9_file_name ?? `W9_${contractor.name.replace(/\s+/g, "_")}.pdf`
    );

    // Record that the W9 was uploaded to QBO
    await supabase
      .from("contractors")
      .update({ w9_qbo_uploaded_at: new Date().toISOString() })
      .eq("id", contractorId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("QBO W9 upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
