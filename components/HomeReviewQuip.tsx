"use client";

/**
 * Homepage review teaser — one featured quote, a thumbnail if the
 * review is filmed, and a link into /reviews.
 *
 * Client-fetched via the anon Supabase client (RLS allows anon SELECT
 * on status='published'), for the same reason TestimonialsSection is:
 * it keeps app/page.tsx a fully static server component. Fetching this
 * server-side would push the whole homepage onto an ISR revalidate
 * cycle to keep one quote fresh, which is a bad trade for the most
 * visited page on the site.
 *
 * Renders null until it knows there's something to show, so the
 * homepage never flashes an empty band.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pickFeaturedReview, type ReviewRow } from "@/lib/testimonials/reviews";
import { formatDuration } from "@/lib/testimonials/video";

export function HomeReviewQuip() {
  const [featured, setFeatured] = useState<ReviewRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      // Pull a small window rather than one row: the "prefer video"
      // rule can't be expressed in the order-by, so it's applied here.
      const { data } = await supabase
        .from("testimonials")
        .select(
          `id, author_name, author_role, service, rating, quote, source, source_url,
           author_photo_url, video_url, video_poster_url, video_duration_seconds,
           display_order, created_at`,
        )
        .eq("status", "published")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(12);
      if (!cancelled) setFeatured(pickFeaturedReview((data ?? []) as ReviewRow[]));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!featured) return null;

  const runtime = formatDuration(featured.video_duration_seconds);
  const hasFilm = Boolean(featured.video_url);

  return (
    <section
      aria-label="Client reviews"
      style={{ background: "var(--hm-paper)" }}
      className="border-t border-black/10"
    >
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
        <p
          className="font-mono uppercase mb-8"
          style={{
            fontSize: "var(--hm-text-meta)",
            letterSpacing: "0.22em",
            color: "var(--hm-ink-3)",
          }}
        >
          From our clients
        </p>

        <div className="flex flex-col sm:flex-row sm:items-start gap-8 sm:gap-10">
          {/* Poster thumbnail, only when the featured review is filmed.
              Links rather than plays — the player lives on /reviews, and
              a second <video> on the homepage would be dead weight for
              everyone who never clicks. */}
          {hasFilm && featured.video_poster_url && (
            <Link
              href="/reviews"
              aria-label={`Watch the video review from ${featured.author_name}`}
              className="group relative block w-full sm:w-56 md:w-64 shrink-0 aspect-video overflow-hidden bg-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured.video_poster_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/10"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-md transition-transform duration-300 group-hover:scale-110">
                  <Play className="ml-0.5 h-4 w-4 fill-black text-black" />
                </span>
              </span>
            </Link>
          )}

          <div className="min-w-0">
            <blockquote
              className="font-serif italic text-xl sm:text-2xl lg:text-3xl leading-snug"
              style={{ color: "var(--hm-ink)" }}
            >
              &ldquo;{featured.quote}&rdquo;
            </blockquote>

            <p className="mt-5 text-sm font-semibold" style={{ color: "var(--hm-ink)" }}>
              {featured.author_name}
            </p>
            {featured.author_role && (
              <p className="text-xs" style={{ color: "var(--hm-ink-3)" }}>
                {featured.author_role}
              </p>
            )}

            <Link
              href="/reviews"
              className="mt-7 inline-block font-mono uppercase underline underline-offset-4 hover:opacity-60"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.15em",
                color: "var(--hm-ink)",
              }}
            >
              {hasFilm && runtime
                ? `Watch the ${runtime} walkthrough →`
                : "Read all client reviews →"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
