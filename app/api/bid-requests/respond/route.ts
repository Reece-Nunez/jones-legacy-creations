import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildBidSubmissionPdf } from "@/lib/pdf/bidRequestPdf";
import { uploadGeneratedDoc } from "@/lib/documents/uploadGeneratedDoc";
import { canRespond, type BidStatus } from "@/lib/bids/status";

// Public endpoint — uses the service-role client to bypass RLS. The random token
// on the bid_requests row is the trust boundary (mirrors change-orders/sign).
//
// The contractor either SUBMITS a bid (optional amount + note) → status
// `submitted` (pending Blake's decision), or PASSES → `passed`. Blake's later
// accept/decline happens on the admin lifecycle route.
const recentSubmissions = new Map<string, number>();

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  const decision =
    body?.decision === "passed" ? "passed" : body?.decision === "submitted" ? "submitted" : null;
  const responderName = typeof body?.responder_name === "string" ? body.responder_name.trim() : "";
  const declineReason =
    typeof body?.decline_reason === "string" && body.decline_reason.trim()
      ? body.decline_reason.trim()
      : null;
  const bidNote =
    typeof body?.bid_note === "string" && body.bid_note.trim() ? body.bid_note.trim() : null;
  // Optional amount — accept a positive number, otherwise treat as unspecified.
  const rawAmount = Number(body?.bid_amount);
  const bidAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : null;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }
  if (!decision) {
    return NextResponse.json({ error: "A response is required." }, { status: 400 });
  }
  if (!responderName) {
    return NextResponse.json({ error: "Please type your full name." }, { status: 400 });
  }
  if (decision === "submitted" && body?.consent !== true) {
    return NextResponse.json({ error: "You must agree before submitting." }, { status: 400 });
  }

  // Rate limit: prevent double-tap (same token within 60 seconds)
  const now = Date.now();
  const last = recentSubmissions.get(token);
  if (last && now - last < 60_000) {
    return NextResponse.json({ error: "Please wait before submitting again." }, { status: 429 });
  }

  const { data: bid, error } = await supabase
    .from("bid_requests")
    .select("*, projects(name)")
    .eq("token", token)
    .single();

  if (error || !bid) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 403 });
  }
  if (bid.status === "void") {
    return NextResponse.json({ error: "This bid request has been cancelled." }, { status: 409 });
  }
  if (!canRespond(bid.status as BidStatus)) {
    return NextResponse.json(
      { error: "This bid request has already been responded to." },
      { status: 409 }
    );
  }

  recentSubmissions.set(token, now);

  const decidedAt = new Date();
  const projectName = (bid.projects as { name?: string } | null)?.name ?? "Project";
  const ip = clientIp(request);

  // Pass is a simple record — no filed document.
  if (decision === "passed") {
    const { error: updateError } = await supabase
      .from("bid_requests")
      .update({
        status: "passed",
        decided_at: decidedAt.toISOString(),
        responder_name: responderName,
        responder_ip: ip,
        responder_user_agent: request.headers.get("user-agent"),
        decline_reason: declineReason,
        updated_at: decidedAt.toISOString(),
      })
      .eq("id", bid.id);

    if (updateError) {
      console.error("Failed to record bid pass:", updateError);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    await supabase.from("activity_log").insert({
      project_id: bid.project_id,
      action: "bid_passed",
      description: `Bid "${bid.title}" passed on by ${responderName}`,
    });

    return NextResponse.json({ success: true, decision });
  }

  // Submit — file a PDF record of the contractor's bid (amount + terms).
  const pdf = await buildBidSubmissionPdf({
    projectName,
    title: bid.title,
    scopeDescription: bid.scope_description,
    contractorName: bid.contractor_name,
    bidAmount,
    bidNote,
    termsText: bid.terms_text ?? "",
    submitterName: responderName,
    submittedAt: decidedAt,
    submitterIp: ip,
  });

  let documentId: string | null = null;
  try {
    const doc = await uploadGeneratedDoc(supabase, {
      projectId: bid.project_id,
      name: `Bid Submission — ${bid.title}.pdf`,
      bytes: pdf,
      category: "bid_request",
    });
    documentId = doc.id;
  } catch (err) {
    console.error("Failed to file bid submission:", err);
    return NextResponse.json(
      { error: "We couldn't save your bid. Please try again." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("bid_requests")
    .update({
      status: "submitted",
      bid_amount: bidAmount,
      bid_note: bidNote,
      decided_at: decidedAt.toISOString(),
      responder_name: responderName,
      responder_ip: ip,
      responder_user_agent: request.headers.get("user-agent"),
      document_id: documentId,
      updated_at: decidedAt.toISOString(),
    })
    .eq("id", bid.id);

  if (updateError) {
    console.error("Failed to update bid after submission:", updateError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    project_id: bid.project_id,
    action: "bid_submitted",
    description:
      `Bid "${bid.title}" submitted by ${responderName}` +
      (bidAmount ? ` — $${bidAmount.toLocaleString("en-US")}` : ""),
  });

  return NextResponse.json({ success: true, decision });
}
