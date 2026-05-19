import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ShowcaseForm from "@/components/admin/showcases/ShowcaseForm";
import type {
  ConstructionShowcase,
  ShowcasePhoto,
} from "@/lib/types/construction-showcase";

export default async function EditShowcasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: showcase } = await supabase
    .from("construction_showcases")
    .select("*")
    .eq("id", id)
    .single<ConstructionShowcase>();

  if (!showcase) notFound();

  const { data: photos } = await supabase
    .from("construction_showcase_photos")
    .select("*")
    .eq("showcase_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/showcases"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" /> Back to showcases
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{showcase.title}</h1>
          {showcase.location && (
            <p className="text-sm text-gray-500">{showcase.location}</p>
          )}
        </div>
        {showcase.status === "active" && (
          <a
            href={`/services/construction/projects/${showcase.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            View on site <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <ShowcaseForm
        showcase={{
          ...showcase,
          photos: (photos as ShowcasePhoto[] | null) ?? [],
        }}
      />
    </div>
  );
}
