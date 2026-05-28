/* Hallmark · genre: editorial · macrostructure: Blog index
 * design-system: design.md · designed-as-app
 * theme: House · anchor hue: none (monochrome)
 *
 * Blog family (see design.md § Macrostructure family): hero-then-cards
 * rhythm — one full-width hero card for the latest post, three-column
 * grid below for the rest. The hero headline ("Notes from the build.")
 * uses the marquee hero token; per-post cards step down through h2 →
 * h3. Token-by-name throughout — no inline clamps, no raw colors,
 * no hardcoded easings.
 */

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Blog — Notes on Building & Real Estate in Southern Utah",
  description:
    "Insight from Jones Legacy Creations — cost guides, neighborhood breakdowns, and behind-the-scenes notes on building and buying in Hurricane, St. George, and Washington County.",
  openGraph: {
    title: "Blog — Jones Legacy Creations",
    description:
      "Notes on building and buying in Southern Utah from the JLC team.",
    url: "https://www.joneslegacycreations.com/blog",
    type: "website",
  },
  alternates: {
    canonical: "https://www.joneslegacycreations.com/blog",
  },
};

// Force the index to re-render on each request so newly-published
// posts appear immediately without a redeploy.
export const revalidate = 60;

export default async function BlogIndexPage() {
  const supabase = createAdminClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select(
      "slug, title, excerpt, cover_image_url, cover_image_alt, author_name, published_at, reading_time_minutes, tags",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const items = posts ?? [];
  const [hero, ...rest] = items;

  return (
    <>
      <Navigation />
      <main style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}>
        {/* Hero — editorial display, mono-caps dateline */}
        <section
          aria-label="Blog index"
          className="border-b border-black/10"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-12 lg:pt-40 lg:pb-16">
            <p
              className="font-mono uppercase mb-6"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.22em",
                color: "var(--hm-ink-3)",
              }}
            >
              The Journal · Southern Utah
            </p>
            <h1
              className="font-serif font-bold"
              style={{
                fontSize: "var(--hm-text-display)",
                lineHeight: 0.95,
                color: "var(--hm-ink)",
                letterSpacing: "-0.02em",
              }}
            >
              Notes from the build.
            </h1>
            <p
              className="mt-6 font-sans"
              style={{
                fontSize: "var(--hm-text-lede)",
                color: "var(--hm-ink-2)",
                lineHeight: 1.55,
                maxWidth: "55ch",
              }}
            >
              Cost guides, neighborhood breakdowns, and behind-the-scenes
              notes on building and buying in Hurricane, St. George, and
              Washington County.
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-24">
          {items.length === 0 ? (
            <p
              className="text-center font-sans"
              style={{
                fontSize: "var(--hm-text-body)",
                color: "var(--hm-ink-3)",
              }}
            >
              First post coming soon.
            </p>
          ) : (
            <>
              {/* Hero card — first published post, full-width with cover */}
              {hero && <HeroCard post={hero} />}

              {/* Grid for the rest */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 mt-16 lg:mt-20">
                  {rest.map((p) => (
                    <PostCard key={p.slug} post={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────

interface PostSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author_name: string | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  tags: string[] | null;
}

function HeroCard({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block border-t pt-8 lg:pt-12"
      style={{ borderColor: "var(--hm-rule-thick)" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-16">
        <div className="order-2 lg:order-1">
          <MetaRow
            date={post.published_at}
            readingTime={post.reading_time_minutes}
            tags={post.tags}
          />
          <h2
            className="font-serif font-bold mt-3"
            style={{
              fontSize: "var(--hm-text-display-s)",
              lineHeight: 1.05,
              color: "var(--hm-ink)",
              letterSpacing: "-0.015em",
              transition: "color var(--hm-dur-short) var(--hm-ease-out)",
            }}
          >
            <span
              className="group-hover:text-[var(--hm-accent)]"
              style={{ transition: "color var(--hm-dur-short) var(--hm-ease-out)" }}
            >
              {post.title}
            </span>
          </h2>
          {post.excerpt && (
            <p
              className="mt-4 font-sans"
              style={{
                fontSize: "var(--hm-text-lede)",
                color: "var(--hm-ink-2)",
                lineHeight: 1.55,
                maxWidth: "55ch",
              }}
            >
              {post.excerpt}
            </p>
          )}
          {post.author_name && (
            <p
              className="mt-6 font-mono uppercase"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.18em",
                color: "var(--hm-ink-3)",
              }}
            >
              {post.author_name}
            </p>
          )}
        </div>
        {post.cover_image_url && (
          <div className="order-1 lg:order-2 relative aspect-[4/3] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image_url}
              alt={post.cover_image_alt ?? post.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block border-t pt-6"
      style={{ borderColor: "var(--hm-rule-thick)" }}
    >
      {post.cover_image_url && (
        <div className="relative aspect-[4/3] overflow-hidden mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? post.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      )}
      <MetaRow
        date={post.published_at}
        readingTime={post.reading_time_minutes}
        tags={post.tags}
      />
      <h3
        className="font-serif font-bold mt-2 group-hover:text-[var(--hm-accent)]"
        style={{
          fontSize: "var(--hm-text-h3)",
          color: "var(--hm-ink)",
          letterSpacing: "-0.01em",
          lineHeight: 1.15,
          transition: "color var(--hm-dur-short) var(--hm-ease-out)",
        }}
      >
        {post.title}
      </h3>
      {post.excerpt && (
        <p
          className="mt-2 font-sans"
          style={{
            fontSize: "var(--hm-text-body)",
            color: "var(--hm-ink-2)",
            lineHeight: 1.55,
          }}
        >
          {post.excerpt}
        </p>
      )}
    </Link>
  );
}

function MetaRow({
  date,
  readingTime,
  tags,
}: {
  date: string | null;
  readingTime: number | null;
  tags: string[] | null;
}) {
  const parts: string[] = [];
  if (date) {
    const d = formatDate(date);
    if (d) parts.push(d);
  }
  if (readingTime) parts.push(`${readingTime} min read`);
  if (tags && tags.length > 0) parts.push(tags[0]);

  if (parts.length === 0) return null;
  return (
    <p
      className="font-mono uppercase"
      style={{
        fontSize: "10px",
        letterSpacing: "0.22em",
        color: "var(--hm-ink-3)",
      }}
    >
      {parts.join(" · ")}
    </p>
  );
}
