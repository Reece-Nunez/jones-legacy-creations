import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import ListingDetail from "@/components/services/ListingDetail";
import type {
  RealEstateListing,
  RealEstateListingPhoto,
} from "@/lib/types/real-estate";

interface ListingPageProps {
  params: Promise<{ slug: string }>;
}

const PUBLIC_STATUSES = ["active", "pending"] as const;

export async function generateMetadata({ params }: ListingPageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("real_estate_listings")
    .select("address, city, state, description, price")
    .eq("slug", slug)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle();

  if (!data) return { title: "Listing | Blake Jones Realty" };

  const location = `${data.address}, ${data.city}, ${data.state}`;
  return {
    title: `${data.address} | Blake Jones Realty`,
    description:
      data.description?.slice(0, 160) ??
      `${location}${data.price ? " · listed by Blake Jones Realty" : ""}.`,
  };
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("real_estate_listings")
    .select("*")
    .eq("slug", slug)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle<RealEstateListing>();

  if (!listing) notFound();

  const { data: photoRows } = await supabase
    .from("real_estate_listing_photos")
    .select("*")
    .eq("listing_id", listing.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<RealEstateListingPhoto[]>();

  const photos = photoRows ?? [];

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20 bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/services/real-estate"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Blake Jones Realty
          </Link>
          <ListingDetail listing={listing} photos={photos} />
        </div>
      </main>
      <Footer />
    </>
  );
}
