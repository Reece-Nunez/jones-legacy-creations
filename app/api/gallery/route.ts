import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Get all public photos with their project info
  const { data, error } = await supabase
    .from("documents")
    .select("id, file_url, name, project_id, created_at, projects(id, name, city, state, description)")
    .eq("category", "photo")
    .eq("is_public", true)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by project
  const projectMap = new Map<string, {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    description: string | null;
    photos: { id: string; file_url: string; name: string }[];
  }>();

  for (const doc of data ?? []) {
    const project = doc.projects as { id: string; name: string; city: string | null; state: string | null; description: string | null } | null;
    if (!project) continue;
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
      file_url: doc.file_url,
      name: doc.name,
    });
  }

  // Only return projects that have at least 1 public photo
  const projects = Array.from(projectMap.values()).filter(p => p.photos.length > 0);

  return NextResponse.json(projects);
}
