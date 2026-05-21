"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Bed,
  Bath,
  Maximize,
  Home,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyWhole } from "@/lib/formatters";
import {
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type RealEstateListing,
  type RealEstateListingPhoto,
} from "@/lib/types/real-estate";

interface Props {
  listing: RealEstateListing;
  photos: RealEstateListingPhoto[];
}

export default function ListingDetail({ listing, photos }: Props) {
  // Always include the cover (if it isn't already part of the gallery) at the
  // front of the visible photo set, so the hero matches the strip.
  const visiblePhotos = useMemo<
    Array<Pick<RealEstateListingPhoto, "id" | "url" | "alt">>
  >(() => {
    const out: Array<Pick<RealEstateListingPhoto, "id" | "url" | "alt">> = [];
    if (
      listing.cover_photo_url &&
      !photos.some((p) => p.url === listing.cover_photo_url)
    ) {
      out.push({ id: "cover", url: listing.cover_photo_url, alt: null });
    }
    out.push(...photos);
    return out;
  }, [listing.cover_photo_url, photos]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? null : (i - 1 + visiblePhotos.length) % visiblePhotos.length
    );
  }, [visiblePhotos.length]);
  const next = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? null : (i + 1) % visiblePhotos.length
    );
  }, [visiblePhotos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, closeLightbox, prev, next]);

  const cityLine = `${listing.city}, ${listing.state}${
    listing.zip ? " " + listing.zip : ""
  }`;
  const isPending = listing.status === "pending";

  return (
    <article>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid md:grid-cols-2 gap-8 items-start"
      >
        <div>
          {visiblePhotos.length > 0 ? (
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="group relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-100 shadow-md"
              aria-label="Open photo viewer"
            >
              <Image
                src={visiblePhotos[0].url}
                alt={`${listing.address} cover photo`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                priority
                unoptimized
              />
              {isPending && (
                <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-amber-500/95 px-3 py-1 text-xs font-semibold text-white shadow">
                  {LISTING_STATUS_LABELS.pending}
                </span>
              )}
              {visiblePhotos.length > 1 && (
                <span className="absolute bottom-3 right-3 inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                  {visiblePhotos.length} photos
                </span>
              )}
            </button>
          ) : (
            <div className="aspect-[4/3] w-full rounded-2xl bg-gray-100 flex items-center justify-center">
              <Home className="h-12 w-12 text-gray-300" />
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
            {cityLine}
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-gray-900">
            {listing.address}
          </h1>
          {listing.price !== null && (
            <p className="mt-4 text-4xl md:text-5xl font-bold text-gray-900">
              {formatCurrencyWhole(listing.price)}
            </p>
          )}

          {/* Quick stats */}
          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {listing.bedrooms !== null && (
              <StatTile icon={<Bed className="h-4 w-4" />} label="Bedrooms">
                {listing.bedrooms}
              </StatTile>
            )}
            {listing.bathrooms !== null && (
              <StatTile icon={<Bath className="h-4 w-4" />} label="Bathrooms">
                {listing.bathrooms}
              </StatTile>
            )}
            {listing.square_footage !== null && (
              <StatTile icon={<Maximize className="h-4 w-4" />} label="Sq ft">
                {listing.square_footage.toLocaleString()}
              </StatTile>
            )}
            {listing.lot_size && (
              <StatTile icon={<Home className="h-4 w-4" />} label="Lot">
                {listing.lot_size}
              </StatTile>
            )}
            {listing.property_type && (
              <StatTile
                icon={<Home className="h-4 w-4" />}
                label="Property type"
                wide
              >
                {PROPERTY_TYPE_LABELS[listing.property_type]}
              </StatTile>
            )}
          </dl>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            {listing.mls_url ? (
              <a
                href={listing.mls_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                style={{ minHeight: 44 }}
              >
                View on MLS
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            <a
              href="tel:+14352889807"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              style={{ minHeight: 44 }}
            >
              Call (435) 288-9807
            </a>
          </div>
        </div>
      </motion.div>

      {/* Description */}
      {listing.description && (
        <section className="mt-14">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-4">
            About this home
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
            {listing.description}
          </p>
        </section>
      )}

      {/* Gallery */}
      {visiblePhotos.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-6">
            Photo gallery
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {visiblePhotos.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openLightbox(idx)}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 hover:shadow-md transition-shadow"
                aria-label={`Open photo ${idx + 1}`}
              >
                <Image
                  src={p.url}
                  alt={p.alt ?? `${listing.address} photo ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && visiblePhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Listing photo viewer"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {visiblePhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div
            className={cn(
              "relative w-full h-full max-w-6xl max-h-[90vh] mx-4",
              "flex items-center justify-center"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={visiblePhotos[lightboxIndex].url}
              alt={
                visiblePhotos[lightboxIndex].alt ??
                `${listing.address} photo ${lightboxIndex + 1}`
              }
              fill
              sizes="100vw"
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {visiblePhotos.length}
          </div>
        </div>
      )}
    </article>
  );
}

function StatTile({
  icon,
  label,
  children,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5",
        wide && "col-span-2"
      )}
    >
      <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-gray-900">{children}</dd>
    </div>
  );
}
