import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { Resend } from "resend";
import { BRAND_FROM, buildBidRequestEmail } from "@/lib/email/approvalEmails";
import { canRespond, type BidStatus } from "@/lib/bids/status";

/**
 * Resend a single bid request's link. The token already lives on the row, so the
 * admin UI can also just copy the link — this route emails it and (re)flips the
 * status to "sent" for a draft. Mirrors the change-order send route.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  const { id, bidId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data: bid, error } = await supabase
    .from("bid_requests")
    .select("*, projects(name)")
    .eq("id", bidId)
    .eq("project_id", id)
    .single();

  if (error || !bid) {
    return NextResponse.json({ error: "Bid request not found" }, { status: 404 });
  }
  // Only resend while it's still awaiting a response (draft/sent/viewed).
  if (bid.status !== "draft" && !canRespond(bid.status as BidStatus)) {
    return NextResponse.json(
      { error: "This bid request has already been responded to." },
      { status: 409 }
    );
  }
  if (!bid.token) {
    return NextResponse.json({ error: "Bid request has no link token" }, { status: 500 });
  }
  if (!bid.contractor_email) {
    return NextResponse.json({ error: "This recipient has no email on file" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const link = `${origin}/respond-bid/${bid.token}`;
  const projectName = (bid.projects as { name?: string } | null)?.name ?? "your project";

  let emailed = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { subject, html } = buildBidRequestEmail({
        link,
        projectName,
        contractorName: bid.contractor_name,
        title: bid.title,
        customMessage: bid.custom_message,
      });
      await resend.emails.send({ from: BRAND_FROM, to: bid.contractor_email, subject, html });
      emailed = true;
    } catch (err) {
      console.error("Bid-request resend failed:", err);
    }
  }

  // Draft → sent once dispatched; leave sent/viewed as-is.
  if (bid.status === "draft") {
    await supabase
      .from("bid_requests")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", bidId)
      .eq("project_id", id);
  }

  return NextResponse.json({ link, emailed });
}
