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

/* Hallmark · genre: editorial · macrostructure: listing detail
 * design-system: design.md · designed-as-app
 * theme: House · anchor hue: none (monochrome) */

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
      `${location}. Listed by Blake Jones Realty.`,
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
      <main
        className="min-h-screen pt-28 pb-20 lg:pt-36 lg:pb-28"
        style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <Link
            href="/services/real-estate"
            className="inline-flex items-center gap-1.5 mb-10 font-mono uppercase transition-colors hover:text-[var(--hm-accent)]"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.18em",
              color: "var(--hm-ink-3)",
            }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to listings
          </Link>
          <ListingDetail listing={listing} photos={photos} />
        </div>
      </main>
      <Footer />
    </>
  );
}
