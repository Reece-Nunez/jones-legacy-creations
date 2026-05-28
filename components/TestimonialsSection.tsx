"use client";

/**
 * Public testimonials section — renders published testimonials for a
 * given service. Client-side fetch via the public anon Supabase
 * client; the RLS policy allows anon SELECT on rows with
 * status='published'.
 *
 * Why client-side instead of server: the existing service pages are
 * all `"use client"` (form pages with React Hook Form), and
 * server-components can't be imported from client-components. Doing
 * a client fetch lets this drop into any page with one line. SEO
 * impact is negligible since the page is already client-hydrated
 * anyway.
 *
 * Returns null while loading or if there are no testimonials, so the
 * section doesn't render an empty card on a fresh deploy. As soon as
 * Blake publishes his first quote it appears here automatically.
 */

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Testimonial {
  id: string;
  author_name: string;
  author_role: string | null;
  rating: number | null;
  quote: string;
  source: string | null;
  source_url: string | null;
  author_photo_url: string | null;
}

interface Props {
  /** Which service page is rendering this. Pulls testimonials tagged
   *  with this service plus any tagged 'general'. */
  service: "construction" | "real_estate" | "interior_design";
  /** Optional intro line shown above the testimonials grid. */
  heading?: string;
  subheading?: string;
}

export function TestimonialsSection({
  service,
  heading = "What our clients say",
  subheading,
}: Props) {
  const [items, setItems] = useState<Testimonial[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchTestimonials() {
      const supabase = createClient();
      const { data } = await supabase
        .from("testimonials")
        .select(
          "id, author_name, author_role, rating, quote, source, source_url, author_photo_url",
        )
        .in("service", [service, "general"])
        .eq("status", "published")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(6);
      if (!cancelled) setItems(data ?? []);
    }
    fetchTestimonials();
    return () => {
      cancelled = true;
    };
  }, [service]);

  // Hide entirely until we know whether there are any to show — avoids
  // a flash of empty section on first paint.
  if (items === null || items.length === 0) return null;

  return (
    <section
      aria-label="Client testimonials"
      style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}
      className="border-t border-black/10"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mb-10 sm:mb-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60 mb-2">
            Testimonials
          </p>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-serif italic"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {heading}
          </h2>
          {subheading && (
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-black/70">
              {subheading}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {items.map((t) => (
            <article
              key={t.id}
              className="flex flex-col gap-4 border-t border-black pt-6"
            >
              {t.rating != null && (
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: t.rating }, (_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              )}
              <blockquote
                className="text-base sm:text-lg leading-relaxed italic"
                style={{ fontFamily: "Georgia, serif" }}
              >
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <footer className="mt-auto">
                <div className="flex items-start gap-3">
                  {t.author_photo_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={t.author_photo_url}
                      alt={t.author_name}
                      className="h-10 w-10 rounded-full object-cover border border-black/10"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{t.author_name}</p>
                    {t.author_role && (
                      <p className="text-xs text-black/60">{t.author_role}</p>
                    )}
                    {t.source_url && (
                      <a
                        href={t.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-600 hover:text-indigo-500 mt-0.5 inline-block"
                      >
                        Read original{t.source ? ` on ${t.source}` : ""}
                      </a>
                    )}
                  </div>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
