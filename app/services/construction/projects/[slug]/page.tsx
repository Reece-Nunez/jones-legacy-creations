import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import ShowcaseDetail from "@/components/services/ShowcaseDetail";
import type {
  ConstructionShowcase,
  ShowcasePhoto,
} from "@/lib/types/construction-showcase";

interface ShowcasePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ShowcasePageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("construction_showcases")
    .select("title, location, description")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return { title: "Project | Jones Legacy Creations" };
  return {
    title: `${data.title} | Jones Legacy Creations`,
    description:
      data.description?.slice(0, 160) ??
      `Custom build by Jones Legacy Creations${data.location ? ` in ${data.location}` : ""}.`,
  };
}

export default async function ShowcaseProjectPage({ params }: ShowcasePageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: showcase } = await supabase
    .from("construction_showcases")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle<ConstructionShowcase>();

  if (!showcase) notFound();

  const { data: photoRows } = await supabase
    .from("construction_showcase_photos")
    .select("*")
    .eq("showcase_id", showcase.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const photos: ShowcasePhoto[] = photoRows ?? [];

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20 bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/services/construction"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Construction
          </Link>
          <ShowcaseDetail showcase={showcase} photos={photos} />
        </div>
      </main>
      <Footer />
    </>
  );
}
