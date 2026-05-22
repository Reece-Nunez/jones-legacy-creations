"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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

  // Hide only while the initial fetch is in flight to avoid a flash of the
  // empty state. Once loaded, the section always renders — empty included —
  // because the brand wants the listings section visible at all times.
  if (listings === null) return null;

  const hasListings = listings.length > 0;

  return (
    <section
      aria-label="Current real estate listings"
      style={{ background: "var(--hm-paper)" }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-16 pb-20 sm:pt-20 sm:pb-24">
        <div className="mb-10 sm:mb-12 flex items-baseline justify-between flex-wrap gap-4">
          <div className="max-w-2xl">
            <h2
              className="font-serif font-normal italic"
              style={{
                fontSize: "var(--hm-text-h2)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              Current listings.
            </h2>
            <p
              className="mt-3 font-sans"
              style={{
                fontSize: "var(--hm-text-body)",
                color: "var(--hm-ink-2)",
                lineHeight: 1.6,
              }}
            >
              {hasListings
                ? "Active homes in Southern Utah. Click through for the full MLS file — photos, schools, history, contact."
                : "No active listings at the moment. New homes appear here the day they hit the market — or tell us what you're looking for and we'll reach out the moment one lands."}
            </p>
          </div>
          {hasListings && listings.length > 1 && (
            <span
              className="font-mono uppercase tracking-[0.18em]"
              style={{
                fontSize: "var(--hm-text-meta)",
                color: "var(--hm-ink-3)",
              }}
            >
              {listings.length} active · scroll →
            </span>
          )}
        </div>

        {hasListings ? (
          <div className="relative">
            <div
              className="flex gap-5 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 sm:mx-0 sm:px-0"
              style={{ scrollbarWidth: "thin" }}
            >
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="px-8 py-16 text-left"
            style={{
              background: "var(--hm-paper-2)",
              borderTop: "1px solid var(--hm-rule)",
              borderBottom: "1px solid var(--hm-rule)",
            }}
          >
            <Home
              aria-hidden="true"
              className="h-7 w-7"
              style={{ color: "var(--hm-ink-3)" }}
            />
            <p
              className="mt-5 font-serif italic"
              style={{
                fontSize: "var(--hm-text-h3)",
                color: "var(--hm-ink)",
              }}
            >
              New listings, coming soon.
            </p>
            <p
              className="mt-2 font-sans"
              style={{
                fontSize: "var(--hm-text-body)",
                color: "var(--hm-ink-2)",
                maxWidth: "55ch",
                lineHeight: 1.6,
              }}
            >
              Tell us what you&apos;re looking for and we&apos;ll reach out the
              moment a match comes on the market.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ListingCard({ listing: l }: { listing: RealEstateListing }) {
  const cityState = `${l.city}, ${l.state}${l.zip ? " " + l.zip : ""}`;
  const isPending = l.status === "pending";

  return (
    <article
      className="snap-start shrink-0 w-72 sm:w-80 flex flex-col"
      style={{
        background: "var(--hm-paper-2)",
        border: "1px solid var(--hm-rule)",
      }}
    >
      <div
        className="relative w-full aspect-[4/3]"
        style={{ background: "var(--hm-paper-3)" }}
      >
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
            <Home
              aria-hidden="true"
              className="h-10 w-10"
              style={{ color: "var(--hm-ink-3)" }}
            />
          </div>
        )}
        {isPending && (
          <span
            className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 font-mono uppercase tracking-[0.15em]"
            style={{
              fontSize: "10px",
              background: "var(--hm-accent)",
              color: "var(--hm-accent-ink)",
              letterSpacing: "0.15em",
            }}
          >
            {LISTING_STATUS_LABELS.pending}
          </span>
        )}
      </div>

      <div className="p-5 sm:p-6 flex flex-col gap-3 flex-1">
        {l.price !== null && (
          <p
            className="font-serif tabular-nums"
            style={{
              fontSize: "1.625rem",
              lineHeight: 1.1,
              color: "var(--hm-ink)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {formatCurrencyWhole(l.price)}
          </p>
        )}

        <div>
          <p
            className="font-sans"
            style={{
              fontSize: "var(--hm-text-body)",
              color: "var(--hm-ink)",
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            {l.address}
          </p>
          <p
            className="font-sans mt-0.5"
            style={{
              fontSize: "var(--hm-text-meta)",
              color: "var(--hm-ink-3)",
            }}
          >
            {cityState}
          </p>
        </div>

        <div
          className="flex items-center gap-4 pt-1 font-sans"
          style={{
            fontSize: "var(--hm-text-meta)",
            color: "var(--hm-ink-2)",
            borderTop: "1px solid var(--hm-rule)",
            paddingTop: "0.75rem",
          }}
        >
          {l.bedrooms !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Bed aria-hidden="true" className="h-3.5 w-3.5" /> {l.bedrooms} bd
            </span>
          )}
          {l.bathrooms !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Bath aria-hidden="true" className="h-3.5 w-3.5" /> {l.bathrooms} ba
            </span>
          )}
          {l.square_footage !== null && (
            <span className="inline-flex items-center gap-1.5">
              <Maximize aria-hidden="true" className="h-3.5 w-3.5" />{" "}
              {l.square_footage.toLocaleString()} sf
            </span>
          )}
        </div>

        {l.description && (
          <p
            className="font-sans line-clamp-3"
            style={{
              fontSize: "var(--hm-text-meta)",
              color: "var(--hm-ink-2)",
              lineHeight: 1.55,
            }}
          >
            {l.description}
          </p>
        )}

        <div className="mt-auto pt-3">
          {l.mls_url ? (
            <a
              href={l.mls_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-between font-mono uppercase tracking-[0.15em] border transition-colors duration-200 group"
              style={{
                fontSize: "var(--hm-text-meta)",
                minHeight: 44,
                padding: "0.75rem 1rem",
                borderColor: "var(--hm-ink)",
                background: "var(--hm-ink)",
                color: "var(--hm-paper)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hm-accent)";
                e.currentTarget.style.borderColor = "var(--hm-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--hm-ink)";
                e.currentTarget.style.borderColor = "var(--hm-ink)";
              }}
            >
              View on MLS
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span
              className="inline-flex w-full items-center justify-center font-mono uppercase tracking-[0.15em]"
              style={{
                fontSize: "var(--hm-text-meta)",
                minHeight: 44,
                padding: "0.75rem 1rem",
                border: "1px dashed var(--hm-rule)",
                color: "var(--hm-ink-3)",
              }}
            >
              MLS link coming soon
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
