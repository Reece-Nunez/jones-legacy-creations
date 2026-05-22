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
import { formatCurrencyWhole } from "@/lib/formatters";
import {
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type RealEstateListing,
  type RealEstateListingPhoto,
} from "@/lib/types/real-estate";

/* Hallmark · genre: editorial · component: listing detail
 * design-system: design.md · designed-as-app
 * theme: House · anchor hue: none (monochrome)
 *
 * Editorial listing detail in Linen voice. Generous breathing room per
 * Hilari's "less compact" direction — wide measure on the description,
 * roomy gallery cards, lots of hairline rules and negative space. */

interface Props {
  listing: RealEstateListing;
  photos: RealEstateListingPhoto[];
}

export default function ListingDetail({ listing, photos }: Props) {
  // Always include the cover (if it isn't already part of the gallery) at
  // the front of the visible photo set.
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
      {/* Hero — cover photo big, with all the listing meta in a column
          to the right on desktop, stacked below on mobile. Generous
          spacing. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start"
      >
        <div>
          {visiblePhotos.length > 0 ? (
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="group relative aspect-[4/3] w-full overflow-hidden block"
              style={{
                background: "var(--hm-paper-3)",
                border: "1px solid var(--hm-rule)",
              }}
              aria-label="Open photo viewer"
            >
              <Image
                src={visiblePhotos[0].url}
                alt={`${listing.address} cover photo`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
                unoptimized
              />
              {isPending && (
                <span
                  className="absolute top-4 left-4 inline-flex items-center px-3 py-1.5 font-mono uppercase tracking-[0.18em]"
                  style={{
                    fontSize: "11px",
                    background: "var(--hm-accent)",
                    color: "var(--hm-accent-ink)",
                  }}
                >
                  {LISTING_STATUS_LABELS.pending}
                </span>
              )}
              {visiblePhotos.length > 1 && (
                <span
                  className="absolute bottom-4 right-4 inline-flex items-center px-3 py-1.5 font-mono uppercase tracking-[0.15em]"
                  style={{
                    fontSize: "10px",
                    background: "rgba(0, 0, 0, 0.65)",
                    color: "var(--hm-paper)",
                  }}
                >
                  {visiblePhotos.length} photos
                </span>
              )}
            </button>
          ) : (
            <div
              className="aspect-[4/3] w-full flex items-center justify-center"
              style={{
                background: "var(--hm-paper-3)",
                border: "1px solid var(--hm-rule)",
              }}
            >
              <Home
                aria-hidden="true"
                className="h-12 w-12"
                style={{ color: "var(--hm-ink-3)" }}
              />
            </div>
          )}
        </div>

        <div className="lg:pt-2">
          <p
            className="font-mono uppercase mb-5"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.22em",
              color: "var(--hm-ink-3)",
            }}
          >
            {cityLine}
          </p>
          <h1
            className="font-serif font-bold"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              lineHeight: 1.05,
              color: "var(--hm-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            {listing.address}
          </h1>
          {listing.price !== null && (
            <p
              className="mt-6 font-serif tabular-nums"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                fontWeight: 500,
                color: "var(--hm-ink)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {formatCurrencyWhole(listing.price)}
            </p>
          )}

          {/* Stats — tabular row */}
          <dl
            className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6 pt-6"
            style={{ borderTop: "1px solid var(--hm-rule)" }}
          >
            {listing.bedrooms !== null && (
              <StatTile icon={<Bed className="h-3.5 w-3.5" />} label="Bedrooms">
                {listing.bedrooms}
              </StatTile>
            )}
            {listing.bathrooms !== null && (
              <StatTile
                icon={<Bath className="h-3.5 w-3.5" />}
                label="Bathrooms"
              >
                {listing.bathrooms}
              </StatTile>
            )}
            {listing.square_footage !== null && (
              <StatTile
                icon={<Maximize className="h-3.5 w-3.5" />}
                label="Sq ft"
              >
                {listing.square_footage.toLocaleString()}
              </StatTile>
            )}
            {listing.lot_size && (
              <StatTile icon={<Home className="h-3.5 w-3.5" />} label="Lot">
                {listing.lot_size}
              </StatTile>
            )}
          </dl>
          {listing.property_type && (
            <p
              className="mt-6 font-mono uppercase"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.18em",
                color: "var(--hm-ink-3)",
              }}
            >
              Property type · {PROPERTY_TYPE_LABELS[listing.property_type]}
            </p>
          )}

          {/* CTAs */}
          <div className="mt-12 flex flex-wrap gap-3">
            {listing.mls_url ? (
              <a
                href={listing.mls_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 font-mono uppercase border bg-[var(--hm-ink)] text-[var(--hm-paper)] border-[var(--hm-ink)] hover:bg-[var(--hm-accent)] hover:border-[var(--hm-accent)] transition-colors duration-200 whitespace-nowrap"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.15em",
                  padding: "0.875rem 1.25rem",
                  minHeight: 44,
                }}
              >
                View on MLS
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <a
              href="tel:+14352889807"
              className="inline-flex items-center justify-center font-mono uppercase border border-[var(--hm-ink)] text-[var(--hm-ink)] hover:text-[var(--hm-accent)] hover:border-[var(--hm-accent)] transition-colors duration-200 whitespace-nowrap"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.15em",
                padding: "0.875rem 1.25rem",
                minHeight: 44,
              }}
            >
              Call (435) 288-9807
            </a>
          </div>
        </div>
      </motion.div>

      {/* Description prose — single column at generous measure */}
      {listing.description && (
        <section
          className="mt-20 lg:mt-28 pt-12"
          style={{ borderTop: "1px solid var(--hm-rule)" }}
        >
          <h2
            className="font-serif font-bold mb-8"
            style={{
              fontSize: "var(--hm-text-h2)",
              color: "var(--hm-ink)",
              letterSpacing: "-0.015em",
            }}
          >
            About this home.
          </h2>
          <div
            className="font-sans whitespace-pre-line"
            style={{
              fontSize: "var(--hm-text-lede)",
              color: "var(--hm-ink-2)",
              lineHeight: 1.7,
              maxWidth: "62ch",
            }}
          >
            {listing.description}
          </div>
        </section>
      )}

      {/* Gallery — large hairline-framed tiles, click to open lightbox */}
      {visiblePhotos.length > 0 && (
        <section
          className="mt-20 lg:mt-28 pt-12"
          style={{ borderTop: "1px solid var(--hm-rule)" }}
        >
          <div className="mb-10 flex items-baseline justify-between flex-wrap gap-4">
            <h2
              className="font-serif font-bold"
              style={{
                fontSize: "var(--hm-text-h2)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              The gallery.
            </h2>
            <span
              className="font-mono uppercase"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.18em",
                color: "var(--hm-ink-3)",
              }}
            >
              {visiblePhotos.length}{" "}
              {visiblePhotos.length === 1 ? "photo" : "photos"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {visiblePhotos.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openLightbox(idx)}
                className="group relative aspect-[4/3] block overflow-hidden"
                style={{
                  background: "var(--hm-paper-3)",
                  border: "1px solid var(--hm-rule)",
                  transition: "border-color var(--hm-dur-short) var(--hm-ease-out)",
                }}
                aria-label={`Open photo ${idx + 1}`}
              >
                <Image
                  src={p.url}
                  alt={p.alt ?? `${listing.address} photo ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox — full-screen image viewer with keyboard nav */}
      {lightboxIndex !== null && visiblePhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Listing photo viewer"
          style={{ background: "rgba(15, 12, 10, 0.95)" }}
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 h-11 w-11 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              color: "var(--hm-paper)",
            }}
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
                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "var(--hm-paper)",
                }}
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
                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "var(--hm-paper)",
                }}
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div
            className="relative w-full h-full max-w-7xl max-h-[90vh] mx-4 flex items-center justify-center"
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
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono uppercase tracking-[0.18em]"
            style={{
              fontSize: "var(--hm-text-meta)",
              color: "var(--hm-paper)",
              background: "rgba(0, 0, 0, 0.4)",
              padding: "0.4rem 0.875rem",
            }}
          >
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
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt
        className="flex items-center gap-1.5 font-mono uppercase"
        style={{
          fontSize: "10px",
          letterSpacing: "0.22em",
          color: "var(--hm-ink-3)",
        }}
      >
        {icon}
        {label}
      </dt>
      <dd
        className="mt-2 font-serif tabular-nums"
        style={{
          fontSize: "1.625rem",
          fontWeight: 500,
          color: "var(--hm-ink)",
          letterSpacing: "-0.015em",
          lineHeight: 1,
        }}
      >
        {children}
      </dd>
    </div>
  );
}
