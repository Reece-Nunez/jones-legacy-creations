import Link from "next/link";
import { Plus, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ListingsTable from "@/components/admin/listings/ListingsTable";
import type { RealEstateListing } from "@/lib/types/real-estate";

export const dynamic = "force-dynamic";

export default async function ListingsAdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("real_estate_listings")
    .select("*")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const listings: RealEstateListing[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <Home className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Real Estate Listings</h1>
            <p className="text-sm text-gray-500">
              {listings.length} listing{listings.length === 1 ? "" : "s"} ·
              {" "}
              {listings.filter((l) => l.status === "active" || l.status === "pending").length}
              {" "}
              shown on the public site
            </p>
          </div>
        </div>
        <Link
          href="/admin/listings/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          style={{ minHeight: 44 }}
        >
          <Plus className="h-4 w-4" />
          Add Listing
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Failed to load listings: {error.message}
        </div>
      ) : (
        <ListingsTable listings={listings} />
      )}
    </div>
  );
}
