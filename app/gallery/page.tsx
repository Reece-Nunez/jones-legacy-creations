import { createAdminClient } from "@/lib/supabase/admin";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GalleryContent } from "@/components/GalleryContent";

export const metadata = {
  title: "Project Gallery | Jones Legacy Creations",
  description:
    "Browse completed construction projects by Jones Legacy Creations in Southern Utah.",
};

export const dynamic = "force-dynamic";

interface RawShowcase {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  description: string | null;
  cover_image_url: string | null;
  category: "construction" | "interior_design";
  photos: { id: string; url: string; alt: string | null; sort_order: number }[];
}

export default async function GalleryPage() {
  const supabase = createAdminClient();

  // Pull active showcases (construction + interior design) with their photos.
  // Each card links to its public detail page on the matching service page.
  const { data } = await supabase
    .from("construction_showcases")
    .select(
      `id, slug, title, location, description, cover_image_url, category,
       photos:construction_showcase_photos(id, url, alt, sort_order)`
    )
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const showcases = (data ?? []) as RawShowcase[];

  const projects = showcases
    .map((s) => {
      const sortedPhotos = (s.photos ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order);
      const coverPhotoFile = s.cover_image_url
        ? { id: `cover-${s.id}`, file_url: s.cover_image_url, name: s.title }
        : null;
      // Cover photo always leads if it's not already in the gallery.
      const photos = coverPhotoFile && !sortedPhotos.some((p) => p.url === s.cover_image_url)
        ? [coverPhotoFile, ...sortedPhotos.map((p) => ({
            id: p.id,
            file_url: p.url,
            name: p.alt ?? s.title,
          }))]
        : sortedPhotos.map((p) => ({
            id: p.id,
            file_url: p.url,
            name: p.alt ?? s.title,
          }));

      const basePath =
        s.category === "interior_design"
          ? "/services/interior-design/projects"
          : "/services/construction/projects";
      return {
        id: s.id,
        slug: s.slug,
        detailHref: `${basePath}/${s.slug}`,
        name: s.title,
        // GalleryContent renders city/state inline; put the whole "Hatch, UT"
        // string in city since we store location as free text.
        city: s.location,
        state: null,
        description: s.description,
        photos,
      };
    })
    .filter((p) => p.photos.length > 0);

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
