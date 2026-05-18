import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "@/components/admin/listings/ListingForm";
import type { RealEstateListing } from "@/lib/types/real-estate";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("real_estate_listings")
    .select("*")
    .eq("id", id)
    .single<RealEstateListing>();

  if (!listing) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/listings"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" /> Back to listings
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{listing.address}</h1>
        <p className="text-sm text-gray-500">
          {listing.city}, {listing.state} {listing.zip ?? ""}
        </p>
      </div>
      <ListingForm listing={listing} />
    </div>
  );
}
