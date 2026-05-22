"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ConstructionShowcase,
  ShowcasePhoto,
} from "@/lib/types/construction-showcase";

/* Hallmark · genre: editorial · component: showcase detail
 * design-system: design.md · designed-as-app
 * theme: House · anchor hue: none (monochrome)
 *
 * Mirrors the listing detail layout but for construction / interior
 * design showcases: hairline-framed cover photo on the left, italic
 * Playfair title and description on the right, hairline-divided
 * features as a vertical list, gallery grid below, lightbox. */

interface Props {
  showcase: ConstructionShowcase;
  photos: ShowcasePhoto[];
}

export default function ShowcaseDetail({ showcase, photos }: Props) {
  const cover = showcase.cover_image_url;
  const visiblePhotos = useMemo<ShowcasePhoto[]>(() => {
    const out: ShowcasePhoto[] = [];
    if (cover && !photos.some((p) => p.url === cover)) {
      out.push({
        id: "cover",
        showcase_id: showcase.id,
        url: cover,
        alt: null,
        sort_order: -1,
        created_at: "",
      });
    }
    out.push(...photos);
    return out;
  }, [cover, photos, showcase.id]);

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

  return (
    <article>
      {/* Hero */}
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
                alt={`${showcase.title} cover photo`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
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
              className="aspect-[4/3] w-full"
              style={{
                background: "var(--hm-paper-3)",
                border: "1px solid var(--hm-rule)",
              }}
            />
          )}
        </div>

        <div className="lg:pt-2">
          {showcase.location && (
            <p
              className="font-mono uppercase mb-5"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.22em",
                color: "var(--hm-ink-3)",
              }}
            >
              {showcase.location}
            </p>
          )}
          <h1
            className="font-serif font-bold"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
              lineHeight: 1.05,
              color: "var(--hm-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            {showcase.title}
          </h1>
          {showcase.description && (
            <p
              className="mt-8 font-sans whitespace-pre-line"
              style={{
                fontSize: "var(--hm-text-lede)",
                color: "var(--hm-ink-2)",
                lineHeight: 1.7,
                maxWidth: "55ch",
              }}
            >
              {showcase.description}
            </p>
          )}

          {showcase.features.length > 0 && (
            <div className="mt-12">
              <p
                className="font-mono uppercase mb-5"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.22em",
                  color: "var(--hm-ink-3)",
                }}
              >
                Highlights
              </p>
              <ul
                className="space-y-0"
                style={{ borderTop: "1px solid var(--hm-rule)" }}
              >
                {showcase.features.map((f) => (
                  <li
                    key={f}
                    className="font-sans py-3"
                    style={{
                      fontSize: "var(--hm-text-body)",
                      color: "var(--hm-ink-2)",
                      borderBottom: "1px solid var(--hm-rule)",
                    }}
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>

      {/* Gallery */}
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
                }}
                aria-label={`Open photo ${idx + 1}`}
              >
                <Image
                  src={p.url}
                  alt={p.alt ?? `${showcase.title} photo ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && visiblePhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Project photo viewer"
          style={{ background: "rgba(15, 12, 10, 0.95)" }}
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 h-11 w-11 rounded-full flex items-center justify-center"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full flex items-center justify-center"
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
                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full flex items-center justify-center"
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
            className={cn(
              "relative w-full h-full max-w-7xl max-h-[90vh] mx-4",
              "flex items-center justify-center"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={visiblePhotos[lightboxIndex].url}
              alt={
                visiblePhotos[lightboxIndex].alt ??
                `${showcase.title} photo ${lightboxIndex + 1}`
              }
              fill
              sizes="100vw"
              className="object-contain"
              priority
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
