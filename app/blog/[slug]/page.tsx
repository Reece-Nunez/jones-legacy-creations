/* Hallmark · genre: editorial · macrostructure: Long Document
 * design-system: design.md · designed-as-app
 * theme: House · anchor hue: none (monochrome)
 *
 * Blog family (see design.md § Macrostructure family · Blog pages):
 * single column, generous 62-ch measure, mono-caps eyebrow over an
 * article-level H1 (--hm-text-display-s, NOT the marquee --hm-text-
 * display — an article shouldn't shout louder than the homepage).
 * One post-end NewsletterSignup is the only marketing apparatus
 * permitted in this family.
 *
 * Server-rendered: markdown body parsed via marked to HTML at request
 * time and emitted as static HTML so Google indexes the rendered
 * content directly. JSON-LD BlogPosting schema embedded for rich
 * results.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderMarkdown } from "@/lib/blog/markdown";
import { formatDate } from "@/lib/formatters";

const BASE_URL = "https://www.joneslegacycreations.com";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("title, excerpt, meta_description, cover_image_url, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) {
    return { title: "Post not found" };
  }

  const description = data.meta_description || data.excerpt || undefined;
  const url = `${BASE_URL}/blog/${slug}`;

  return {
    title: data.title,
    description,
    openGraph: {
      title: data.title,
      description,
      url,
      type: "article",
      ...(data.published_at && { publishedTime: data.published_at }),
      ...(data.cover_image_url && { images: [{ url: data.cover_image_url }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description,
      ...(data.cover_image_url && { images: [data.cover_image_url] }),
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) notFound();

  const html = renderMarkdown(post.content_md);
  const url = `${BASE_URL}/blog/${slug}`;

  // JSON-LD BlogPosting schema — gives Google enough structured data
  // to surface the post in Top Stories / News One Box / etc.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description || post.excerpt || undefined,
    image: post.cover_image_url || undefined,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: post.author_name
      ? {
          "@type": "Person",
          name: post.author_name,
        }
      : {
          "@type": "Organization",
          name: "Jones Legacy Creations",
        },
    publisher: {
      "@type": "Organization",
      name: "Jones Legacy Creations",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo-transparent.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <>
      <Navigation />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main
        style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}
        className="pt-28 lg:pt-36"
      >
        <article className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 pb-24">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 mb-10 font-mono uppercase transition-colors hover:text-[var(--hm-accent)]"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.18em",
              color: "var(--hm-ink-3)",
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to the journal
          </Link>

          <header className="mb-12">
            <p
              className="font-mono uppercase mb-4"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.22em",
                color: "var(--hm-ink-3)",
              }}
            >
              {[
                post.published_at && formatDate(post.published_at),
                post.reading_time_minutes
                  ? `${post.reading_time_minutes} min read`
                  : null,
                Array.isArray(post.tags) && post.tags[0],
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <h1
              className="font-serif font-bold"
              style={{
                fontSize: "var(--hm-text-display-s)",
                lineHeight: 1.02,
                color: "var(--hm-ink)",
                letterSpacing: "-0.02em",
              }}
            >
              {post.title}
            </h1>
            {post.excerpt && (
              <p
                className="mt-6 font-sans"
                style={{
                  fontSize: "var(--hm-text-lede)",
                  color: "var(--hm-ink-2)",
                  lineHeight: 1.55,
                  maxWidth: "62ch",
                }}
              >
                {post.excerpt}
              </p>
            )}
            {post.author_name && (
              <p
                className="mt-8 pb-6 font-mono uppercase border-b border-black/10"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.18em",
                  color: "var(--hm-ink-3)",
                }}
              >
                {post.author_name}
              </p>
            )}
          </header>

          {post.cover_image_url && (
            <div className="relative aspect-[16/9] overflow-hidden mb-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover_image_url}
                alt={post.cover_image_alt ?? post.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          )}

          {/* Rendered markdown body. `prose` would be ideal but the
            * site doesn't ship Tailwind Typography — we use plain
            * styling that respects the Hallmark voice. */}
          <div
            className="blog-content font-sans"
            style={{
              fontSize: "var(--hm-text-lede)",
              color: "var(--hm-ink-2)",
              lineHeight: 1.7,
              maxWidth: "62ch",
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Inline CSS for headings / lists / links inside the rendered
            * markdown. Scoped via the .blog-content wrapper above so it
            * doesn't leak. Token-by-name throughout per design.md. */}
          <style>{`
            .blog-content h2 {
              font-family: var(--font-display);
              font-weight: 700;
              font-size: var(--hm-text-h2);
              line-height: 1.15;
              letter-spacing: -0.015em;
              color: var(--hm-ink);
              margin: var(--hm-space-xl) 0 var(--hm-space-sm);
            }
            .blog-content h3 {
              font-family: var(--font-display);
              font-weight: 700;
              font-size: var(--hm-text-h3);
              line-height: 1.2;
              color: var(--hm-ink);
              margin: var(--hm-space-lg) 0 var(--hm-space-xs);
            }
            .blog-content p { margin: 0 0 var(--hm-space-sm); }
            .blog-content a {
              color: var(--hm-ink);
              text-decoration: underline;
              text-underline-offset: 3px;
              transition: color var(--hm-dur-short) var(--hm-ease-out);
            }
            .blog-content a:hover { color: var(--hm-accent); }
            .blog-content ul, .blog-content ol {
              margin: 0 0 var(--hm-space-md) 1.25rem;
              padding: 0;
            }
            .blog-content li { margin: 0 0 var(--hm-space-2xs); }
            .blog-content blockquote {
              border-left: 3px solid var(--hm-rule-thick);
              padding: var(--hm-space-3xs) var(--hm-space-sm);
              margin: var(--hm-space-md) 0;
              color: var(--hm-ink);
            }
            .blog-content img {
              max-width: 100%;
              height: auto;
              margin: var(--hm-space-md) 0;
            }
            .blog-content code {
              background: var(--hm-paper-2);
              padding: 0.125rem 0.375rem;
              font-size: 0.9em;
            }
            .blog-content pre {
              background: var(--hm-paper-2);
              border: 1px solid var(--hm-rule);
              padding: var(--hm-space-sm);
              overflow-x: auto;
              margin: var(--hm-space-md) 0;
            }
            .blog-content pre code {
              background: transparent;
              padding: 0;
              border: 0;
            }
            .blog-content hr {
              border: 0;
              border-top: 1px solid var(--hm-rule);
              margin: var(--hm-space-lg) 0;
            }
            .blog-content table {
              width: 100%;
              border-collapse: collapse;
              margin: var(--hm-space-md) 0;
              font-size: var(--hm-text-body);
            }
            .blog-content th, .blog-content td {
              border: 1px solid var(--hm-rule);
              padding: var(--hm-space-2xs) var(--hm-space-xs);
              text-align: left;
            }
            .blog-content th {
              background: var(--hm-paper-2);
              font-weight: 600;
            }
          `}</style>
        </article>

        {/* Newsletter capture below every post — readers who finish a
         *  post are higher-intent than random footer visitors. */}
        <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 pb-24">
          <NewsletterSignup
            source="blog"
            heading="Like this? Get the next one."
            subheading="Cost guides, market updates, and the occasional behind-the-scenes look. Once or twice a month — no spam."
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
