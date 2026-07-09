import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildBidAcceptancePdf } from "@/lib/pdf/bidRequestPdf";
import { uploadGeneratedDoc } from "@/lib/documents/uploadGeneratedDoc";
import { BRAND_FROM, buildBidAcceptedEmail } from "@/lib/email/approvalEmails";
import { canRespond, type BidStatus } from "@/lib/bids/status";

// Public endpoint — uses the service-role client to bypass RLS. The random token
// on the bid_requests row is the trust boundary (mirrors change-orders/sign).
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
  const decision = body?.decision === "declined" ? "declined" : body?.decision === "accepted" ? "accepted" : null;
  const responderName = typeof body?.responder_name === "string" ? body.responder_name.trim() : "";
  const declineReason =
    typeof body?.decline_reason === "string" && body.decline_reason.trim()
      ? body.decline_reason.trim()
      : null;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }
  if (!decision) {
    return NextResponse.json({ error: "A decision is required." }, { status: 400 });
  }
  if (!responderName) {
    return NextResponse.json({ error: "Please type your full name." }, { status: 400 });
  }
  if (decision === "accepted" && body?.consent !== true) {
    return NextResponse.json({ error: "You must agree before accepting." }, { status: 400 });
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
    // Already accepted/declined/completed/paid, or still a draft never sent.
    return NextResponse.json(
      { error: "This bid request has already been responded to." },
      { status: 409 }
    );
  }

  recentSubmissions.set(token, now);

  const decidedAt = new Date();
  const projectName = (bid.projects as { name?: string } | null)?.name ?? "Project";
  const ip = clientIp(request);

  // Decline is a simple record — no filed document.
  if (decision === "declined") {
    const { error: updateError } = await supabase
      .from("bid_requests")
      .update({
        status: "declined",
        decided_at: decidedAt.toISOString(),
        responder_name: responderName,
        responder_ip: ip,
        responder_user_agent: request.headers.get("user-agent"),
        decline_reason: declineReason,
        updated_at: decidedAt.toISOString(),
      })
      .eq("id", bid.id);

    if (updateError) {
      console.error("Failed to record bid decline:", updateError);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    await supabase.from("activity_log").insert({
      project_id: bid.project_id,
      action: "bid_declined",
      description: `Bid "${bid.title}" declined by ${responderName}`,
    });

    return NextResponse.json({ success: true, decision });
  }

  // Accept — file a PDF acceptance record under the project's documents.
  const pdf = await buildBidAcceptancePdf({
    projectName,
    title: bid.title,
    scopeDescription: bid.scope_description,
    contractorName: bid.contractor_name,
    termsText: bid.terms_text ?? "",
    responderName,
    acceptedAt: decidedAt,
    responderIp: ip,
  });

  let documentId: string | null = null;
  try {
    const doc = await uploadGeneratedDoc(supabase, {
      projectId: bid.project_id,
      name: `Bid Acceptance — ${bid.title}.pdf`,
      bytes: pdf,
      category: "bid_request",
    });
    documentId = doc.id;
  } catch (err) {
    console.error("Failed to file bid acceptance:", err);
    return NextResponse.json(
      { error: "We couldn't save your acceptance. Please try again." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("bid_requests")
    .update({
      status: "accepted",
      decided_at: decidedAt.toISOString(),
      responder_name: responderName,
      responder_ip: ip,
      responder_user_agent: request.headers.get("user-agent"),
      document_id: documentId,
      updated_at: decidedAt.toISOString(),
    })
    .eq("id", bid.id);

  if (updateError) {
    console.error("Failed to update bid after acceptance:", updateError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    project_id: bid.project_id,
    action: "bid_accepted",
    description: `Bid "${bid.title}" accepted by ${responderName}`,
  });

  // Auto-reply confirming acceptance (best-effort; failure doesn't block).
  if (bid.contractor_email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { subject, html } = buildBidAcceptedEmail({
        projectName,
        contractorName: bid.contractor_name,
        title: bid.title,
      });
      await resend.emails.send({ from: BRAND_FROM, to: bid.contractor_email, subject, html });
    } catch (err) {
      console.error("Bid-accepted email failed:", err);
    }
  }

  return NextResponse.json({ success: true, decision });
}
