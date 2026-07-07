import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStoragePath } from "@/lib/supabase/signedUrl";
import { buildSelectionPdf } from "@/lib/pdf/selectionPdf";
import { uploadGeneratedDoc } from "@/lib/documents/uploadGeneratedDoc";

// Public endpoint — service-role client, token-gated (mirrors submit-invoice).
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
  const decision = body?.decision === "approved" || body?.decision === "declined" ? body.decision : null;
  const deciderName = typeof body?.decider_name === "string" ? body.decider_name.trim() : "";
  const declineReason =
    typeof body?.decline_reason === "string" ? body.decline_reason.trim() || null : null;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }
  if (!decision) {
    return NextResponse.json({ error: "Please choose approve or decline." }, { status: 400 });
  }
  if (!deciderName) {
    return NextResponse.json({ error: "Please type your full name." }, { status: 400 });
  }

  const now = Date.now();
  const last = recentSubmissions.get(token);
  if (last && now - last < 60_000) {
    return NextResponse.json({ error: "Please wait before submitting again." }, { status: 429 });
  }

  const { data: sel, error } = await supabase
    .from("selection_approvals")
    .select("*, projects(name)")
    .eq("token", token)
    .single();

  if (error || !sel) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 403 });
  }
  if (sel.status === "approved" || sel.status === "declined") {
    return NextResponse.json({ error: "This selection has already been decided." }, { status: 409 });
  }

  recentSubmissions.set(token, now);

  const decidedAt = new Date();
  const projectName = (sel.projects as { name?: string } | null)?.name ?? "Project";

  // Fetch the selection photo (private bucket) to embed in the PDF, if any.
  let imageBytes: Uint8Array | null = null;
  let imageType: string | null = null;
  if (sel.image_url) {
    const path = parseStoragePath(sel.image_url, "project-documents");
    if (path) {
      const { data: blob } = await supabase.storage.from("project-documents").download(path);
      if (blob) {
        imageBytes = new Uint8Array(await blob.arrayBuffer());
        imageType = blob.type || null;
      }
    }
  }

  const pdf = await buildSelectionPdf({
    projectName,
    title: sel.title,
    selectionName: sel.selection_name,
    description: sel.description,
    location: sel.location,
    costImpact: sel.cost_impact != null ? Number(sel.cost_impact) : null,
    disclaimerText: sel.disclaimer_text ?? "",
    decision,
    deciderName,
    decidedAt,
    deciderIp: clientIp(request),
    declineReason,
    imageBytes,
    imageType,
  });

  let documentId: string | null = null;
  try {
    const doc = await uploadGeneratedDoc(supabase, {
      projectId: sel.project_id,
      name: `Selection ${decision === "approved" ? "Approval" : "Decline"} — ${sel.title}.pdf`,
      bytes: pdf,
      category: "selection",
    });
    documentId = doc.id;
  } catch (err) {
    console.error("Failed to file selection decision:", err);
    return NextResponse.json(
      { error: "We couldn't save your decision. Please try again." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("selection_approvals")
    .update({
      status: decision,
      decision,
      decided_at: decidedAt.toISOString(),
      decider_name: deciderName,
      decider_ip: clientIp(request),
      decider_user_agent: request.headers.get("user-agent"),
      decline_reason: declineReason,
      document_id: documentId,
      updated_at: decidedAt.toISOString(),
    })
    .eq("id", sel.id);

  if (updateError) {
    console.error("Failed to update selection after decision:", updateError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    project_id: sel.project_id,
    action: "selection_decided",
    description: `Selection "${sel.title}" ${decision} by ${deciderName}`,
  });

  return NextResponse.json({ success: true });
}
