"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ConstructionShowcase,
  ShowcasePhoto,
} from "@/lib/types/construction-showcase";

interface Props {
  showcase: ConstructionShowcase;
  photos: ShowcasePhoto[];
}

export default function ShowcaseDetail({ showcase, photos }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);
  const next = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);

  // Keyboard nav for the lightbox
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

  const cover =
    showcase.cover_image_url ||
    photos[0]?.url ||
    null;

  return (
    <article>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid md:grid-cols-2 gap-8 items-start"
      >
        {cover && (
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-md">
            <Image
              src={cover}
              alt={`${showcase.title} cover photo`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
        )}
        <div>
          {showcase.location && (
            <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
              {showcase.location}
            </p>
          )}
          <h1 className="mt-2 text-4xl md:text-5xl font-serif font-bold text-gray-900">
            {showcase.title}
          </h1>
          {showcase.description && (
            <p className="mt-6 text-lg text-gray-700 leading-relaxed whitespace-pre-line">
              {showcase.description}
            </p>
          )}
          {showcase.features.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Project highlights
              </h2>
              <div className="flex flex-wrap gap-2">
                {showcase.features.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-800"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-6">
            Gallery
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {photos.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openLightbox(idx)}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 hover:shadow-md transition-shadow"
                aria-label={`Open photo ${idx + 1}`}
              >
                <Image
                  src={p.url}
                  alt={p.alt ?? `${showcase.title} photo ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Project photo viewer"
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
          {photos.length > 1 && (
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
              src={photos[lightboxIndex].url}
              alt={
                photos[lightboxIndex].alt ??
                `${showcase.title} photo ${lightboxIndex + 1}`
              }
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </article>
  );
}
