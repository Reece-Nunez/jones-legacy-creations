import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GalleryContent } from "@/components/GalleryContent";

export const metadata = {
  title: "Project Gallery | Jones Legacy Creations",
  description: "Browse completed construction projects by Jones Legacy Creations in Southern Utah.",
};

export default async function GalleryPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select("id, file_url, name, project_id, created_at, projects(id, name, city, state, description)")
    .eq("category", "photo")
    .eq("is_public", true)
    .order("created_at", { ascending: true });

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

  const projects = Array.from(projectMap.values()).filter(p => p.photos.length > 0);

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 pt-20">
        <GalleryContent projects={projects} />
      </main>
      <Footer />
    </>
  );
}
