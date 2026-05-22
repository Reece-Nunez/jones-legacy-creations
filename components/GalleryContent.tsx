"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2 } from "lucide-react";

/* Hallmark · genre: editorial · component: gallery grid
 * design-system: design.md · designed-as-app
 * theme: House · anchor hue: none (monochrome)
 *
 * Linen-styled project gallery: left-aligned editorial hero, hairline-
 * framed project tiles, italic-serif titles, mono-caps location eyebrows.
 * Replaces the centered "Our Work" hero + shadow-lg rounded-2xl card
 * template. */

interface GalleryPhoto {
  id: string;
  file_url: string;
  name: string;
}

interface GalleryProject {
  id: string;
  slug?: string;
  /** Where this card should navigate when clicked. */
  detailHref?: string;
  name: string;
  city: string | null;
  state: string | null;
  description: string | null;
  photos: GalleryPhoto[];
}

export function GalleryContent({ projects }: { projects: GalleryProject[] }) {
  return (
    <section style={{ background: "var(--hm-paper)" }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="mb-14 max-w-3xl">
          <p
            className="font-mono uppercase mb-5"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.22em",
              color: "var(--hm-ink-3)",
            }}
          >
            Project gallery · Southern Utah
          </p>
          <h1
            className="font-serif font-bold"
            style={{
              fontSize: "clamp(2.75rem, 7vw, 6rem)",
              lineHeight: 0.97,
              color: "var(--hm-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            The work.
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
            Recent projects across construction and interior design. Tap any
            one for the full set of photos and the story behind it.
          </p>
        </div>

        {projects.length === 0 ? (
          <div
            className="px-8 py-20 max-w-2xl"
            style={{
              background: "var(--hm-paper-2)",
              borderTop: "1px solid var(--hm-rule)",
              borderBottom: "1px solid var(--hm-rule)",
            }}
          >
            <Building2
              aria-hidden="true"
              className="h-8 w-8"
              style={{ color: "var(--hm-ink-3)" }}
            />
            <p
              className="mt-5 font-serif font-bold"
              style={{
                fontSize: "var(--hm-text-h3)",
                color: "var(--hm-ink)",
                lineHeight: 1.3,
              }}
            >
              Photos coming soon. Check back after our next build.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {projects.map((project) => (
              <ProjectTile key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectTile({ project }: { project: GalleryProject }) {
  const photoCount = project.photos.length;
  const location =
    project.city || project.state
      ? [project.city, project.state].filter(Boolean).join(", ")
      : null;

  const card = (
    <article
      className="group flex flex-col h-full"
      style={{
        background: "var(--hm-paper)",
        border: "1px solid var(--hm-rule)",
        transition: "border-color var(--hm-dur-short) var(--hm-ease-out)",
      }}
    >
      <div
        className="relative aspect-[4/3]"
        style={{ background: "var(--hm-paper-3)" }}
      >
        <Image
          src={project.photos[0].file_url}
          alt={`${project.name} cover photo`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-6 sm:p-7 flex flex-col gap-2 flex-1">
        {location && (
          <p
            className="font-mono uppercase"
            style={{
              fontSize: "10px",
              letterSpacing: "0.22em",
              color: "var(--hm-ink-3)",
            }}
          >
            {location}
          </p>
        )}
        <h2
          className="font-serif font-bold"
          style={{
            fontSize: "var(--hm-text-h3)",
            color: "var(--hm-ink)",
            fontWeight: 500,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {project.name}
        </h2>
        {project.description && (
          <p
            className="font-sans line-clamp-2 mt-1"
            style={{
              fontSize: "var(--hm-text-body)",
              color: "var(--hm-ink-2)",
              lineHeight: 1.55,
            }}
          >
            {project.description}
          </p>
        )}
        <div className="mt-auto pt-4 flex items-baseline justify-between gap-3">
          <span
            className="font-mono uppercase transition-colors group-hover:text-[var(--hm-accent)]"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.15em",
              color: "var(--hm-ink)",
            }}
          >
            View project →
          </span>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: "10px",
              letterSpacing: "0.18em",
              color: "var(--hm-ink-3)",
            }}
          >
            {photoCount} {photoCount === 1 ? "photo" : "photos"}
          </span>
        </div>
      </div>
    </article>
  );

  if (project.detailHref) {
    return (
      <Link href={project.detailHref} className="block h-full">
        {card}
      </Link>
    );
  }
  if (project.slug) {
    return (
      <Link
        href={`/services/construction/projects/${project.slug}`}
        className="block h-full"
      >
        {card}
      </Link>
    );
  }
  return card;
}
