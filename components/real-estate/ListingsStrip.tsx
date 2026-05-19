"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Bed, Bath, Maximize, ExternalLink, Home } from "lucide-react";
import {
  type RealEstateListing,
  LISTING_STATUS_LABELS,
} from "@/lib/types/real-estate";
import { formatCurrencyWhole } from "@/lib/formatters";

export default function ListingsStrip() {
  const [listings, setListings] = useState<RealEstateListing[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/real-estate-listings")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: RealEstateListing[]) => {
        if (!cancelled) setListings(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn("Failed to load listings", err);
        if (!cancelled) setListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide entirely while loading OR when there are no active listings — the
  // strip sits at the top of the real-estate page, and an empty "check back
  // soon" placeholder there would push the hero down for no reason.
  if (listings === null || listings.length === 0) return null;

  return (
    <section
      aria-label="Current real estate listings"
      className="py-12 sm:py-16 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 sm:mb-10 flex items-end justify-between flex-wrap gap-4"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">
              View Our Current Listings
            </h2>
            <p className="mt-2 text-gray-600 max-w-2xl">
              Swipe through our active listings. Tap any home to see the full
              MLS details.
            </p>
          </div>
        </motion.div>

        <div className="relative">
          <div
            className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: "thin" }}
          >
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ListingCard({ listing: l }: { listing: RealEstateListing }) {
  const cityState = `${l.city}, ${l.state}${l.zip ? " " + l.zip : ""}`;
  const isPending = l.status === "pending";

  return (
    <article className="snap-start shrink-0 w-72 sm:w-80 bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 flex flex-col transition-shadow hover:shadow-lg">
      <div className="relative w-full aspect-[4/3] bg-gray-100">
        {l.cover_photo_url ? (
          <Image
            src={l.cover_photo_url}
            alt={l.address}
            fill
            sizes="(max-width: 640px) 288px, 320px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Home className="h-10 w-10 text-gray-300" />
          </div>
        )}
        {isPending && (
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-amber-500/95 px-3 py-1 text-xs font-semibold text-white shadow">
            {LISTING_STATUS_LABELS.pending}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1">
        {l.price !== null && (
          <p className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatCurrencyWhole(l.price)}
          </p>
        )}

        <div>
          <p className="text-sm font-medium text-gray-900 leading-tight">
            {l.address}
          </p>
          <p className="text-xs text-gray-500">{cityState}</p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-600 mt-1">
          {l.bedrooms !== null && (
            <span className="inline-flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" /> {l.bedrooms} bd
            </span>
          )}
          {l.bathrooms !== null && (
            <span className="inline-flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" /> {l.bathrooms} ba
            </span>
          )}
          {l.square_footage !== null && (
            <span className="inline-flex items-center gap-1">
              <Maximize className="h-3.5 w-3.5" />{" "}
              {l.square_footage.toLocaleString()} sf
            </span>
          )}
        </div>

        <div className="mt-auto pt-3">
          {l.mls_url ? (
            <a
              href={l.mls_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              style={{ minHeight: 44 }}
            >
              View MLS Listing
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="inline-flex w-full items-center justify-center rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-400">
              MLS link coming soon
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
