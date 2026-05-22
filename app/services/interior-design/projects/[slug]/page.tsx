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
    .eq("category", "interior_design")
    .maybeSingle();
  if (!data) return { title: "Project | Jones Legacy Creations" };
  return {
    title: `${data.title} | Jones Legacy Creations`,
    description:
      data.description?.slice(0, 160) ??
      `Interior design by Jones Legacy Creations${data.location ? ` in ${data.location}` : ""}.`,
  };
}

export default async function InteriorDesignShowcasePage({
  params,
}: ShowcasePageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: showcase } = await supabase
    .from("construction_showcases")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .eq("category", "interior_design")
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
      <main
        className="min-h-screen pt-28 pb-20 lg:pt-36 lg:pb-28"
        style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <Link
            href="/services/interior-design"
            className="inline-flex items-center gap-1.5 mb-10 font-mono uppercase transition-colors hover:text-[var(--hm-accent)]"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.18em",
              color: "var(--hm-ink-3)",
            }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to interior design
          </Link>
          <ShowcaseDetail showcase={showcase} photos={photos} />
        </div>
      </main>
      <Footer />
    </>
  );
}
