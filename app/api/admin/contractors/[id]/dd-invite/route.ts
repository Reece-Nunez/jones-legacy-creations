/**
 * POST /api/admin/contractors/[id]/dd-invite
 *   Creates a 24-hour invite token and sends branded email to contractor.
 *
 * GET  /api/admin/contractors/[id]/dd-invite?preview=true
 *   Returns rendered HTML email for the preview modal — does NOT send.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { buildDDInviteEmail } from "@/lib/quickbooks/dd-email";

const resend = new Resend(process.env.RESEND_API_KEY);

async function getContractorAndSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractorId: string
) {
  const [{ data: contractor }, { data: settings }] = await Promise.all([
    supabase
      .from("contractors")
      .select("id, name, email, company")
      .eq("id", contractorId)
      .single(),
    supabase
      .from("company_settings")
      .select("company_name, email_reply_to")
      .single(),
  ]);
  return { contractor, settings };
}

// ─── GET — email preview ──────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contractor, settings } = await getContractorAndSettings(supabase, id);
  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  if (!contractor.email) {
    return NextResponse.json({ error: "Contractor has no email address on file" }, { status: 400 });
  }

  const companyName = settings?.company_name ?? "Jones Legacy Creations";
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const previewUrl = `${appOrigin}/submit-dd/PREVIEW_TOKEN`;

  const html = buildDDInviteEmail({
    contractorName: contractor.name,
    companyName,
    inviteUrl: previewUrl,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// ─── POST — create token + send email ────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contractor, settings } = await getContractorAndSettings(supabase, id);
  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  if (!contractor.email) {
    return NextResponse.json(
      { error: "This contractor has no email address on file. Add one before sending an invite." },
      { status: 400 }
    );
  }

  // Deactivate any existing unused tokens for this contractor
  await supabase
    .from("dd_invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("contractor_id", id)
    .is("used_at", null);

  // Create a fresh 24-hour token
  const { data: tokenRow, error: tokenError } = await supabase
    .from("dd_invite_tokens")
    .insert({
      contractor_id: id,
      contractor_name: contractor.name,
      contractor_email: contractor.email,
    })
    .select("token")
    .single();

  if (tokenError || !tokenRow) {
    return NextResponse.json({ error: "Failed to create invite token" }, { status: 500 });
  }

  const companyName = settings?.company_name ?? "Jones Legacy Creations";
  const replyTo = settings?.email_reply_to ?? "office@joneslegacycreations.com";
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const inviteUrl = `${appOrigin}/submit-dd/${tokenRow.token}`;

  const html = buildDDInviteEmail({
    contractorName: contractor.name,
    companyName,
    inviteUrl,
  });

  const { error: emailError } = await resend.emails.send({
    from: "Jones Legacy Creations <noreply@joneslegacycreations.com>",
    replyTo,
    to: contractor.email,
    subject: `${companyName} — Set Up Your Direct Deposit`,
    html,
  });

  if (emailError) {
    console.error("DD invite email error:", emailError);
    return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, expires_in_hours: 24 });
}
