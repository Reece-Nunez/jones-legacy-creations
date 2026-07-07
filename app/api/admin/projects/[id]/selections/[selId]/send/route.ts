import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { Resend } from "resend";
import { BRAND_FROM, buildSelectionEmail } from "@/lib/email/approvalEmails";

/**
 * Mark a selection as sent and (optionally) email the client the review link.
 * The token already lives on the row, so the admin UI can also just copy the
 * link — this route handles emailing + flipping the status to "sent".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; selId: string }> }
) {
  const { id, selId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const sendEmail = body.email !== false;

  const { data: sel, error } = await supabase
    .from("selection_approvals")
    .select("*, projects(name)")
    .eq("id", selId)
    .eq("project_id", id)
    .single();

  if (error || !sel) {
    return NextResponse.json({ error: "Selection not found" }, { status: 404 });
  }
  if (sel.status === "approved" || sel.status === "declined") {
    return NextResponse.json({ error: "This selection has already been decided" }, { status: 409 });
  }
  if (!sel.token) {
    return NextResponse.json({ error: "Selection has no link token" }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const link = `${origin}/review-selection/${sel.token}`;
  const projectName = (sel.projects as { name?: string } | null)?.name ?? "your project";

  let emailed = false;
  if (sendEmail && sel.client_email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { subject, html } = buildSelectionEmail({
        link,
        projectName,
        clientName: sel.client_name,
        title: sel.title,
      });
      await resend.emails.send({ from: BRAND_FROM, to: sel.client_email, subject, html });
      emailed = true;
    } catch (err) {
      console.error("Selection email failed:", err);
    }
  }

  await supabase
    .from("selection_approvals")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", selId)
    .eq("project_id", id);

  return NextResponse.json({ link, emailed });
}
