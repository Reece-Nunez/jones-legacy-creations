import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/quickbooks/auth";
import { createOrUpdateVendor } from "@/lib/quickbooks/client";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: contractors, error: contractorsError } = await supabase
    .from("contractors")
    .select("id, name, company, email, phone, type");

  if (contractorsError) {
    return NextResponse.json(
      { error: "Failed to fetch contractors" },
      { status: 500 }
    );
  }

  const { accessToken: _accessToken, realmId } = await getValidAccessToken();

  let succeeded = 0;
  let failed = 0;

  for (const contractor of contractors ?? []) {
    try {
      // Check for an existing QBO vendor mapping
      const { data: existing } = await supabase
        .from("quickbooks_entity_map")
        .select("qbo_id")
        .eq("entity_type", "vendor")
        .eq("local_id", contractor.id)
        .eq("realm_id", realmId)
        .maybeSingle();

      const existingQboId = existing?.qbo_id ?? undefined;

      const vendor = await createOrUpdateVendor(
        {
          displayName: contractor.company || contractor.name,
          email: contractor.email,
          phone: contractor.phone,
          vendor1099: contractor.type === "contractor",
        },
        existingQboId
      );

      await supabase.from("quickbooks_entity_map").upsert(
        {
          entity_type: "vendor",
          local_id: contractor.id,
          qbo_id: vendor.Id,
          realm_id: realmId,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,local_id,realm_id" }
      );

      succeeded++;
    } catch (err) {
      console.error(`[QBO] Failed to sync vendor ${contractor.id} (${contractor.name}):`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  return NextResponse.json({
    succeeded,
    failed,
    total: contractors?.length ?? 0,
  });
}
