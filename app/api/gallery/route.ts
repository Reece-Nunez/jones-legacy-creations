import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStoragePath } from "@/lib/supabase/signedUrl";

// Public gallery photos live in the now-private project-documents bucket.
// We mint a signed URL per photo with a long enough expiry that the page
// (CDN-cached or not) keeps working for typical browsing sessions.
const PHOTO_URL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .select("id, file_url, name, project_id, created_at, projects(id, name, city, state, description)")
    .eq("category", "photo")
    .eq("is_public", true)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve each stored file_url into a signed URL. Batch into one
  // createSignedUrls() call per N paths to minimize round-trips.
  const paths: string[] = [];
  const pathByDocId = new Map<string, string>();
  for (const doc of data ?? []) {
    const path = parseStoragePath(doc.file_url, "project-documents");
    if (path) {
      paths.push(path);
      pathByDocId.set(doc.id, path);
    }
  }
  const signedUrlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("project-documents")
      .createSignedUrls(paths, PHOTO_URL_TTL_SECONDS);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedUrlByPath.set(s.path, s.signedUrl);
    }
  }

  const projectMap = new Map<string, {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    description: string | null;
    photos: { id: string; file_url: string; name: string }[];
  }>();

  for (const doc of data ?? []) {
    const raw = doc.projects;
    const project = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string; city: string | null; state: string | null; description: string | null } | null;
    if (!project) continue;
    const path = pathByDocId.get(doc.id);
    const signedUrl = path ? signedUrlByPath.get(path) : undefined;
    if (!signedUrl) continue; // skip photos we couldn't sign
    if (!projectMap.has(project.id)) {
      projectMap.set(project.id, {
        id: project.id,
        name: project.name,
        city: project.city,
        state: project.state,
        description: project.description,
        photos: [],
      });
    }
    projectMap.get(project.id)!.photos.push({
      id: doc.id,
      file_url: signedUrl,
      name: doc.name,
    });
  }

  const projects = Array.from(projectMap.values()).filter(p => p.photos.length > 0);

  return NextResponse.json(projects);
}
