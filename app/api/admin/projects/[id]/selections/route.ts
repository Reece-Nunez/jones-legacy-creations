import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { generateToken } from "@/lib/tokens";
import { DEFAULT_SELECTION_DISCLAIMER } from "@/lib/legal/approvalText";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function sanitizeFilename(name: string): string {
  const base = name.replace(/[\\/]/g, "_").replace(/\.{2,}/g, ".");
  return base.length > 120 ? base.slice(-120) : base;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin("projects:view");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("selection_approvals")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase, profile } = gate;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const title = (form.get("title") as string | null)?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Optional selection photo → private project-documents bucket.
  let imageUrl: string | null = null;
  const image = form.get("image") as File | null;
  if (image && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 15 MB)." }, { status: 413 });
    }
    if (!IMAGE_TYPES.has(image.type)) {
      return NextResponse.json({ error: "Unsupported image type." }, { status: 415 });
    }
    const path = `${id}/selections/${Date.now()}-${sanitizeFilename(image.name)}`;
    const { error: upErr } = await supabase.storage
      .from("project-documents")
      .upload(path, image, { contentType: image.type });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    const { data: urlData } = supabase.storage.from("project-documents").getPublicUrl(path);
    imageUrl = urlData.publicUrl;
  }

  const costImpactRaw = form.get("cost_impact") as string | null;
  const costImpact =
    costImpactRaw && Number.isFinite(Number(costImpactRaw)) ? Number(costImpactRaw) : null;
  const disclaimer = (form.get("disclaimer_text") as string | null)?.trim();

  const { data, error } = await supabase
    .from("selection_approvals")
    .insert({
      project_id: id,
      title,
      selection_name: (form.get("selection_name") as string | null) ?? null,
      description: (form.get("description") as string | null) ?? null,
      location: (form.get("location") as string | null) ?? null,
      cost_impact: costImpact,
      image_url: imageUrl,
      disclaimer_text: disclaimer || DEFAULT_SELECTION_DISCLAIMER,
      client_name: (form.get("client_name") as string | null) ?? null,
      client_email: (form.get("client_email") as string | null) ?? null,
      client_phone: (form.get("client_phone") as string | null) ?? null,
      token: generateToken(),
      status: "draft",
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
