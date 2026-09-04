import Link from "next/link";
import { Star } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { TestimonialVideo } from "@/components/TestimonialVideo";
import {
  partitionReviews,
  averageRating,
  serviceLabel,
  type ReviewRow,
} from "@/lib/testimonials/reviews";

/* Hallmark · genre: editorial · component: reviews index
 * Video reviews lead as a two-up reel, written reviews follow as a
 * grid. Deliberately not a carousel — a carousel hides most of the
 * proof behind an interaction nobody performs.
 */

export const metadata = {
  // Bare title — the root layout's template appends
  // " | Jones Legacy Creations".
  title: "Client Reviews",
  description:
    "Video and written reviews from Jones Legacy Creations clients across Hurricane, St. George, and Washington County — custom home builds, real estate, and interior design.",
  alternates: { canonical: "https://www.joneslegacycreations.com/reviews" },
};

// Reviews change only when Blake publishes one; a 5-minute window keeps
// the page static-fast without needing a redeploy to go live.
export const revalidate = 300;

export default async function ReviewsPage() {
  const supabase = createAdminClient();
  // Column list stays a single literal rather than a concatenated
  // constant — supabase-js infers the row type from the literal, and
  // splitting it degrades `data` to GenericStringError[].
  const { data } = await supabase
    .from("testimonials")
    .select(
      `id, author_name, author_role, service, rating, quote, source, source_url,
       author_photo_url, video_url, video_poster_url, video_duration_seconds,
       display_order, created_at`,
    )
    .eq("status", "published")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as ReviewRow[];
  const { videos, written } = partitionReviews(rows);
  const avg = averageRating(rows);

  return (
    <div style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}>
      <Navigation />

      <main>
        {/* ── Masthead ───────────────────────────────────────────── */}
        <section className="border-b border-black/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60 mb-3">
              Client reviews
            </p>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-serif italic max-w-3xl"
              style={{ fontFamily: "Georgia, serif" }}
            >
              In our clients&apos; own words
            </h1>
            <p className="mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-black/70">
              Homes built, listings closed, and rooms designed across Hurricane,
              St.&nbsp;George, and Washington County. Some of these were filmed on
              site after the final walkthrough; the rest were written by the
              people who lived through the build.
            </p>

            {rows.length > 0 && (
              <dl className="mt-10 flex flex-wrap items-end gap-x-12 gap-y-6 border-t border-black pt-6">
                {avg != null && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">
                      Average rating
                    </dt>
                    <dd className="mt-1.5 flex items-center gap-2">
                      <span
                        className="text-3xl font-serif italic tabular-nums"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {avg.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: Math.round(avg) }, (_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </span>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">
                    Reviews published
                  </dt>
                  <dd
                    className="mt-1.5 text-3xl font-serif italic tabular-nums"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {rows.length}
                  </dd>
                </div>
                {videos.length > 0 && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">
                      On camera
                    </dt>
                    <dd
                      className="mt-1.5 text-3xl font-serif italic tabular-nums"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {videos.length}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </section>

        {/* ── Video reel ─────────────────────────────────────────── */}
        {videos.length > 0 && (
          <section
            aria-label="Video reviews"
            className="border-b border-black/10"
            style={{ background: "var(--hm-paper-2)" }}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
              <h2
                className="text-2xl sm:text-3xl font-serif italic mb-10"
                style={{ fontFamily: "Georgia, serif" }}
              >
                On camera
              </h2>
              <div
                className={
                  videos.length === 1
                    ? "grid grid-cols-1 max-w-3xl gap-10"
                    : "grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12"
                }
              >
                {videos.map((v) => (
                  <article key={v.id} className="flex flex-col">
                    <TestimonialVideo
                      videoUrl={v.video_url as string}
                      posterUrl={v.video_poster_url}
                      authorName={v.author_name}
                      durationSeconds={v.video_duration_seconds}
                      quote={v.quote}
                    />
                    <div className="border-t border-black pt-5 mt-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60 mb-2">
                        {serviceLabel(v.service)}
                      </p>
                      <blockquote
                        className="text-lg sm:text-xl leading-relaxed italic"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        &ldquo;{v.quote}&rdquo;
                      </blockquote>
                      <p className="mt-4 text-sm font-semibold">{v.author_name}</p>
                      {v.author_role && (
                        <p className="text-xs text-black/60">{v.author_role}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Written reviews ────────────────────────────────────── */}
        {written.length > 0 && (
          <section aria-label="Written reviews">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
              <h2
                className="text-2xl sm:text-3xl font-serif italic mb-10"
                style={{ fontFamily: "Georgia, serif" }}
              >
                In writing
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {written.map((t) => (
                  <article
                    key={t.id}
                    className="flex flex-col gap-4 border-t border-black pt-6"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">
                        {serviceLabel(t.service)}
                      </p>
                      {t.rating != null && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: t.rating }, (_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </span>
                      )}
                    </div>
                    <blockquote
                      className="text-base sm:text-lg leading-relaxed italic"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <footer className="mt-auto flex items-start gap-3">
                      {t.author_photo_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={t.author_photo_url}
                          alt=""
                          className="h-10 w-10 rounded-full border border-black/10 object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold">{t.author_name}</p>
                        {t.author_role && (
                          <p className="text-xs text-black/60">{t.author_role}</p>
                        )}
                        {t.source_url && (
                          <a
                            href={t.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-block text-[11px] text-indigo-600 hover:text-indigo-500"
                          >
                            Read original{t.source ? ` on ${t.source}` : ""}
                          </a>
                        )}
                      </div>
                    </footer>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Empty state — only reachable before the first review is
            published. Better than a heading with nothing under it. */}
        {rows.length === 0 && (
          <section>
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 text-center">
              <p className="text-sm text-black/60">
                Reviews are being collected and will appear here shortly.
              </p>
            </div>
          </section>
        )}

        {/* ── CTA ────────────────────────────────────────────────── */}
        <section
          className="border-t border-black/10"
          style={{ background: "var(--hm-paper-2)" }}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-serif italic max-w-2xl"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Ready to start your own project?
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/estimate"
                className="inline-flex items-center bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-black/80"
              >
                Get a free estimate
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center border border-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-black hover:text-white"
              >
                See the work
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
