import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

// DELETE removes the DB row and best-effort deletes the storage object too.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id: showcaseId, photoId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  // Fetch URL first so we can also delete the storage object.
  const { data: photo } = await supabase
    .from("construction_showcase_photos")
    .select("url")
    .eq("id", photoId)
    .eq("showcase_id", showcaseId)
    .maybeSingle();

  const { error } = await supabase
    .from("construction_showcase_photos")
    .delete()
    .eq("id", photoId)
    .eq("showcase_id", showcaseId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort storage cleanup. Don't fail the API if storage delete hiccups.
  if (photo?.url) {
    try {
      const url = new URL(photo.url);
      const marker = "/storage/v1/object/";
      const i = url.pathname.indexOf(marker);
      if (i !== -1) {
        let rest = url.pathname.slice(i + marker.length);
        if (rest.startsWith("public/")) rest = rest.slice("public/".length);
        const slash = rest.indexOf("/");
        if (slash !== -1) {
          const bucket = rest.slice(0, slash);
          const path = decodeURIComponent(rest.slice(slash + 1));
          if (bucket === "construction-photos") {
            const admin = createAdminClient();
            await admin.storage.from("construction-photos").remove([path]);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to delete construction-photos object:", err);
    }
  }

  return NextResponse.json({ success: true });
}
