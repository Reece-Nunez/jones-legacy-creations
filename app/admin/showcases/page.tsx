import Link from "next/link";
import { Plus, Hammer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ShowcasesTable from "@/components/admin/showcases/ShowcasesTable";
import type { ConstructionShowcase } from "@/lib/types/construction-showcase";

export const dynamic = "force-dynamic";

export default async function ShowcasesAdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("construction_showcases")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const showcases: ConstructionShowcase[] = data ?? [];
  const activeCount = showcases.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <Hammer className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Showcase Projects</h1>
            <p className="text-sm text-gray-500">
              {showcases.length} project{showcases.length === 1 ? "" : "s"} ·
              {" "}
              {activeCount} live on the website
            </p>
          </div>
        </div>
        <Link
          href="/admin/showcases/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          style={{ minHeight: 44 }}
        >
          <Plus className="h-4 w-4" />
          Add Showcase Project
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Failed to load showcases: {error.message}
        </div>
      ) : (
        <ShowcasesTable showcases={showcases} />
      )}
    </div>
  );
}
