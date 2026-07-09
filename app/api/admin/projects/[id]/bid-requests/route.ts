import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { Resend } from "resend";
import { generateToken } from "@/lib/tokens";
import { DEFAULT_BID_ACCEPTANCE_TERMS } from "@/lib/legal/approvalText";
import { BRAND_FROM, buildBidRequestEmail } from "@/lib/email/approvalEmails";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin("projects:view");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("bid_requests")
    .select("*, document:documents(file_url, name)")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

interface Recipient {
  contractor_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * Create a bid request for one or more recipients ("blast"). One row is inserted
 * per recipient sharing the same title / scope / message, each with its own
 * token. When `send` is true (default) and a recipient has an email + RESEND is
 * configured, the request is emailed and the row lands as "sent"; otherwise it
 * stays "draft" and staff can copy the link manually.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase, profile } = gate;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const recipients: Recipient[] = Array.isArray(body?.recipients) ? body.recipients : [];
  const cleaned = recipients
    .map((r) => ({
      contractor_id: r.contractor_id ?? null,
      name: typeof r.name === "string" ? r.name.trim() || null : null,
      email: typeof r.email === "string" ? r.email.trim() || null : null,
      phone: typeof r.phone === "string" ? r.phone.trim() || null : null,
    }))
    .filter((r) => r.name || r.email || r.contractor_id);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: "Add at least one recipient" }, { status: 400 });
  }

  const scopeDescription =
    typeof body?.scope_description === "string" && body.scope_description.trim()
      ? body.scope_description.trim()
      : null;
  const customMessage =
    typeof body?.custom_message === "string" && body.custom_message.trim()
      ? body.custom_message.trim()
      : null;
  const termsText =
    typeof body?.terms_text === "string" && body.terms_text.trim()
      ? body.terms_text
      : DEFAULT_BID_ACCEPTANCE_TERMS;
  const send = body?.send !== false; // default: send

  const rows = cleaned.map((r) => ({
    project_id: id,
    title,
    scope_description: scopeDescription,
    custom_message: customMessage,
    contractor_id: r.contractor_id,
    contractor_name: r.name,
    contractor_email: r.email,
    contractor_phone: r.phone,
    terms_text: termsText,
    token: generateToken(),
    status: "draft",
    created_by: profile.id,
  }));

  const { data: inserted, error } = await supabase
    .from("bid_requests")
    .insert(rows)
    .select("*");

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Failed to create" }, { status: 400 });
  }

  let emailed = 0;
  if (send) {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const { data: proj } = await supabase.from("projects").select("name").eq("id", id).single();
    const projectName = proj?.name ?? "your project";
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    const sentIds: string[] = [];
    for (const row of inserted) {
      // A live link exists regardless of email, so mark "sent" once dispatched.
      let didEmail = false;
      if (resend && row.contractor_email) {
        try {
          const { subject, html } = buildBidRequestEmail({
            link: `${origin}/respond-bid/${row.token}`,
            projectName,
            contractorName: row.contractor_name,
            title: row.title,
            customMessage: row.custom_message,
          });
          await resend.emails.send({ from: BRAND_FROM, to: row.contractor_email, subject, html });
          didEmail = true;
        } catch (err) {
          console.error("Bid-request email failed:", err);
        }
      }
      if (didEmail) emailed += 1;
      sentIds.push(row.id);
    }

    if (sentIds.length > 0) {
      await supabase
        .from("bid_requests")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .in("id", sentIds);
    }

    await supabase.from("activity_log").insert({
      project_id: id,
      action: "bid_requests_sent",
      description: `Sent ${inserted.length} bid request${inserted.length === 1 ? "" : "s"} — "${title}"`,
    });
  }

  return NextResponse.json(
    { created: inserted.length, emailed },
    { status: 201 }
  );
}
