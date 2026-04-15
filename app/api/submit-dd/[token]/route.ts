/**
 * POST /api/submit-dd/[token]
 *
 * Receives contractor bank info, pushes to QBO Vendor, records NACHA auth.
 * Bank numbers are NEVER written to Supabase — they are forwarded to QBO only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateVendorBankDetails, createOrUpdateVendor } from "@/lib/quickbooks/client";
import { getValidAccessToken } from "@/lib/quickbooks/auth";

function validateRouting(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  const d = routing.split("").map(Number);
  const sum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    1 * (d[2] + d[5] + d[8]);
  return sum !== 0 && sum % 10 === 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Use service-role client for public route (no user session)
  const supabase = await createClient();

  // ── Validate token ────────────────────────────────────────────────
  const { data: invite, error: inviteError } = await supabase
    .from("dd_invite_tokens")
    .select("id, contractor_id, contractor_name, contractor_email, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: "This invite link has already been used." }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired. Please request a new one." }, { status: 410 });
  }

  // ── Parse + validate body ─────────────────────────────────────────
  let body: {
    accountHolderName: string;
    routingNumber: string;
    accountNumber: string;
    accountType: string;
    authorized: boolean;
    authorizationText: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { accountHolderName, routingNumber, accountNumber, accountType, authorized, authorizationText } = body;

  if (!accountHolderName?.trim() || !routingNumber || !accountNumber || !accountType) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!authorized) {
    return NextResponse.json({ error: "Authorization is required." }, { status: 400 });
  }
  if (!validateRouting(routingNumber)) {
    return NextResponse.json({ error: "Invalid routing number." }, { status: 400 });
  }
  if (!/^\d{4,17}$/.test(accountNumber)) {
    return NextResponse.json({ error: "Invalid account number format." }, { status: 400 });
  }

  // ── Ensure vendor exists in QBO ───────────────────────────────────
  let vendorQboId: string | null = null;

  try {
    const { realmId } = await getValidAccessToken();

    if (invite.contractor_id) {
      const { data: vendorMap } = await supabase
        .from("quickbooks_entity_map")
        .select("qbo_id")
        .eq("entity_type", "vendor")
        .eq("local_id", invite.contractor_id)
        .eq("realm_id", realmId)
        .maybeSingle();

      if (vendorMap) {
        vendorQboId = vendorMap.qbo_id;
      } else {
        // Fetch contractor to create vendor
        const { data: contractor } = await supabase
          .from("contractors")
          .select("id, name, company, email, phone")
          .eq("id", invite.contractor_id)
          .single();

        if (contractor) {
          const qboVendor = await createOrUpdateVendor({
            displayName: contractor.company || contractor.name,
            email: contractor.email,
            phone: contractor.phone,
          });
          await supabase.from("quickbooks_entity_map").upsert(
            {
              entity_type: "vendor",
              local_id: invite.contractor_id,
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
      const qboVendor = await createOrUpdateVendor({ displayName: invite.contractor_name });
      vendorQboId = qboVendor.Id;
    }

    // ── Push bank details to QBO — bank numbers never hit our DB ─────
    await updateVendorBankDetails(vendorQboId, {
      routingNumber,
      accountNumber,
      accountHolderName: accountHolderName.trim(),
      accountType,
    });

  } catch (err) {
    console.error("DD submit QBO error:", err);
    return NextResponse.json(
      {
        error:
          "We could not save your bank details to QuickBooks at this time. " +
          "Please contact your project manager.",
      },
      { status: 500 }
    );
  }

  // ── Mark token used ───────────────────────────────────────────────
  await supabase
    .from("dd_invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  // ── Store NACHA auth record (NO bank numbers) ─────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  await supabase.from("dd_authorization_records").insert({
    contractor_id: invite.contractor_id,
    contractor_name: invite.contractor_name,
    contractor_email: invite.contractor_email,
    ip_address: ip,
    user_agent: userAgent,
    authorization_text: authorizationText,
    token_id: invite.id,
    qbo_vendor_id: vendorQboId,
  });

  return NextResponse.json({ success: true });
}
