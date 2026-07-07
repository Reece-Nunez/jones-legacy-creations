import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildChangeOrderPdf } from "@/lib/pdf/changeOrderPdf";
import { uploadGeneratedDoc } from "@/lib/documents/uploadGeneratedDoc";

// Public endpoint — uses the service-role client to bypass RLS. The random
// token on the change_orders row is the trust boundary (mirrors submit-invoice).
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
  const signerName = typeof body?.signer_name === "string" ? body.signer_name.trim() : "";
  const consent = body?.consent === true;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }
  if (!signerName) {
    return NextResponse.json({ error: "Please type your full name to sign." }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "You must agree before signing." }, { status: 400 });
  }

  // Rate limit: prevent double-tap (same token within 60 seconds)
  const now = Date.now();
  const last = recentSubmissions.get(token);
  if (last && now - last < 60_000) {
    return NextResponse.json({ error: "Please wait before submitting again." }, { status: 429 });
  }

  const { data: co, error } = await supabase
    .from("change_orders")
    .select("*, projects(name)")
    .eq("token", token)
    .single();

  if (error || !co) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 403 });
  }
  if (co.status === "void") {
    return NextResponse.json({ error: "This change order has been cancelled." }, { status: 409 });
  }
  if (co.status === "signed") {
    return NextResponse.json({ error: "This change order has already been signed." }, { status: 409 });
  }

  recentSubmissions.set(token, now);

  const signedAt = new Date();
  const projectName = (co.projects as { name?: string } | null)?.name ?? "Project";

  // Generate the signed PDF and file it under the project's documents.
  const pdf = await buildChangeOrderPdf({
    projectName,
    title: co.title,
    description: co.description,
    reason: co.reason,
    costDelta: Number(co.cost_delta) || 0,
    scheduleImpactDays: Number(co.schedule_impact_days) || 0,
    consentText: co.consent_text ?? "",
    signerName,
    signedAt,
    signerIp: clientIp(request),
  });

  let documentId: string | null = null;
  try {
    const doc = await uploadGeneratedDoc(supabase, {
      projectId: co.project_id,
      name: `Change Order — ${co.title}.pdf`,
      bytes: pdf,
      category: "change_order",
    });
    documentId = doc.id;
  } catch (err) {
    console.error("Failed to file signed change order:", err);
    return NextResponse.json(
      { error: "We couldn't save your signature. Please try again." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("change_orders")
    .update({
      status: "signed",
      signed_at: signedAt.toISOString(),
      signer_name: signerName,
      signer_ip: clientIp(request),
      signer_user_agent: request.headers.get("user-agent"),
      document_id: documentId,
      updated_at: signedAt.toISOString(),
    })
    .eq("id", co.id);

  if (updateError) {
    console.error("Failed to update change order after signing:", updateError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    project_id: co.project_id,
    action: "change_order_signed",
    description: `Change order "${co.title}" signed by ${signerName}`,
  });

  return NextResponse.json({ success: true });
}
