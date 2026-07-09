import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { Resend } from "resend";
import { nextStatusFor, type BidStatus, type StaffAction } from "@/lib/bids/status";
import { generateToken } from "@/lib/tokens";
import { BRAND_FROM, buildBidAcceptedEmail, buildInvoiceRequestEmail } from "@/lib/email/approvalEmails";

// Staff lifecycle actions on a bid request. The contractor's submit/pass happens
// only via the public token route; here Blake accepts or declines a submitted
// bid, marks an accepted bid completed (which reminds the contractor to invoice),
// or voids a request that hasn't reached a terminal state.
const ACTION_LOG: Record<StaffAction, string> = {
  accept: "bid_accepted",
  reject: "bid_rejected",
  complete: "bid_completed",
  void: "bid_voided",
};

function isStaffAction(v: unknown): v is StaffAction {
  return v === "accept" || v === "reject" || v === "complete" || v === "void";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  const { id, bidId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (!isStaffAction(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data: bid, error: readError } = await supabase
    .from("bid_requests")
    .select("*, projects(name)")
    .eq("id", bidId)
    .eq("project_id", id)
    .single();

  if (readError || !bid) {
    return NextResponse.json({ error: "Bid request not found" }, { status: 404 });
  }

  const next = nextStatusFor(action, bid.status as BidStatus);
  if (!next) {
    return NextResponse.json(
      { error: `Can't ${action} a bid that is "${bid.status}".` },
      { status: 409 }
    );
  }

  const nowIso = new Date().toISOString();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const projectName = (bid.projects as { name?: string } | null)?.name ?? "your project";
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  const updates: Record<string, unknown> = { status: next, updated_at: nowIso };
  if (next === "accepted") updates.accepted_at = nowIso;
  if (next === "rejected") updates.rejected_at = nowIso;
  if (next === "completed") {
    updates.completed_at = nowIso;
    updates.invoice_requested_at = nowIso;
  }

  const { data, error } = await supabase
    .from("bid_requests")
    .update(updates)
    .eq("id", bidId)
    .eq("project_id", id)
    .select("*, document:documents(file_url, name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Side effects (best-effort; email failures don't roll back the status change).
  let emailed = false;
  let invoiceLink: string | null = null;

  if (action === "accept" && bid.contractor_email && resend) {
    try {
      const { subject, html } = buildBidAcceptedEmail({
        projectName,
        contractorName: bid.contractor_name,
        title: bid.title,
      });
      await resend.emails.send({ from: BRAND_FROM, to: bid.contractor_email, subject, html });
      emailed = true;
    } catch (err) {
      console.error("Bid-accepted email failed:", err);
    }
  }

  if (action === "complete") {
    // Reuse the existing invoice-upload flow: mint a token so the contractor can
    // submit their invoice, which then feeds the normal draw/lender payment path.
    if (bid.contractor_id) {
      const invToken = generateToken();
      const { error: tokErr } = await supabase.from("invoice_upload_tokens").insert({
        token: invToken,
        project_id: id,
        contractor_id: bid.contractor_id,
        contractor_name: bid.contractor_name ?? "Contractor",
        project_name: projectName,
        active: true,
      });
      if (tokErr) {
        console.error("Failed to mint invoice upload token:", tokErr);
      } else {
        invoiceLink = `${origin}/submit-invoice/${invToken}`;
        if (bid.contractor_email && resend) {
          try {
            const { subject, html } = buildInvoiceRequestEmail({
              link: invoiceLink,
              projectName,
              contractorName: bid.contractor_name,
              title: bid.title,
            });
            await resend.emails.send({ from: BRAND_FROM, to: bid.contractor_email, subject, html });
            emailed = true;
          } catch (err) {
            console.error("Invoice-request email failed:", err);
          }
        }
      }
    }
  }

  await supabase.from("activity_log").insert({
    project_id: id,
    action: ACTION_LOG[action],
    description: `Bid "${bid.title}" marked ${next}`,
  });

  return NextResponse.json({ ...data, emailed, invoiceLink });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  const { id, bidId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { error } = await supabase
    .from("bid_requests")
    .delete()
    .eq("id", bidId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
