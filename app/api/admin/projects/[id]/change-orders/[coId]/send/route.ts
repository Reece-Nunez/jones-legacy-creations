import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { Resend } from "resend";
import { BRAND_FROM, buildChangeOrderEmail } from "@/lib/email/approvalEmails";

/**
 * Mark a change order as sent and (optionally) email the client the signing
 * link. The token already lives on the row, so the admin UI can also just copy
 * the link — this route is for emailing + flipping the status to "sent".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> }
) {
  const { id, coId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const sendEmail = body.email !== false; // default: send the email

  const { data: co, error } = await supabase
    .from("change_orders")
    .select("*, projects(name)")
    .eq("id", coId)
    .eq("project_id", id)
    .single();

  if (error || !co) {
    return NextResponse.json({ error: "Change order not found" }, { status: 404 });
  }
  if (co.status === "signed") {
    return NextResponse.json({ error: "This change order is already signed" }, { status: 409 });
  }
  if (!co.token) {
    return NextResponse.json({ error: "Change order has no link token" }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const link = `${origin}/sign-change-order/${co.token}`;
  const projectName = (co.projects as { name?: string } | null)?.name ?? "your project";

  let emailed = false;
  if (sendEmail && co.client_email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { subject, html } = buildChangeOrderEmail({
        link,
        projectName,
        clientName: co.client_name,
        title: co.title,
      });
      await resend.emails.send({ from: BRAND_FROM, to: co.client_email, subject, html });
      emailed = true;
    } catch (err) {
      console.error("Change-order email failed:", err);
    }
  }

  await supabase
    .from("change_orders")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", coId)
    .eq("project_id", id);

  return NextResponse.json({ link, emailed });
}
