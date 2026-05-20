import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const SHOWCASE_BUCKET = "construction-photos";

// Pull "/<bucket>/<path>" out of a Supabase storage public URL into the
// storage path so we can call storage.remove() on it.
function storagePathFromUrl(url: string | null, bucket: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const marker = "/storage/v1/object/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    let rest = u.pathname.slice(i + marker.length);
    if (rest.startsWith("public/")) rest = rest.slice("public/".length);
    if (rest.startsWith("sign/")) rest = rest.slice("sign/".length);
    if (!rest.startsWith(`${bucket}/`)) return null;
    return decodeURIComponent(rest.slice(bucket.length + 1));
  } catch {
    return null;
  }
}

const ALLOWED_FIELDS = [
  "title",
  "slug",
  "location",
  "description",
  "features",
  "cover_image_url",
  "sort_order",
  "status",
  "project_phase",
  "category",
] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data: showcase, error } = await supabase
    .from("construction_showcases")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 500 }
    );
  }

  const { data: photos } = await supabase
    .from("construction_showcase_photos")
    .select("*")
    .eq("showcase_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return NextResponse.json({ ...showcase, photos: photos ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key] === "" ? null : body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("construction_showcases")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A showcase with that slug already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  // Collect every storage path tied to this showcase before we delete
  // the row, so we can clean them up after.
  const [{ data: showcase }, { data: photos }] = await Promise.all([
    supabase
      .from("construction_showcases")
      .select("cover_image_url")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("construction_showcase_photos")
      .select("url")
      .eq("showcase_id", id),
  ]);

  const paths = new Set<string>();
  const coverPath = storagePathFromUrl(
    showcase?.cover_image_url ?? null,
    SHOWCASE_BUCKET
  );
  if (coverPath) paths.add(coverPath);
  for (const p of photos ?? []) {
    const path = storagePathFromUrl(p.url, SHOWCASE_BUCKET);
    if (path) paths.add(path);
  }

  // Photo rows cascade via the FK; we just delete the parent.
  const { error } = await supabase
    .from("construction_showcases")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort storage cleanup. Don't fail the API if a file is already
  // gone or storage hiccups — the DB row is what mattered.
  if (paths.size > 0) {
    try {
      const admin = createAdminClient();
      await admin.storage.from(SHOWCASE_BUCKET).remove(Array.from(paths));
    } catch (err) {
      console.warn("Showcase delete: storage cleanup failed", err);
    }
  }

  return NextResponse.json({ success: true });
}
