"use client";

/**
 * Testimonial video player.
 *
 * Deliberately click-to-play rather than an always-mounted <video>:
 * even `preload="metadata"` opens a connection per player, and a
 * reviews page with several testimonials would fire that on every page
 * view for visitors who never press play. The poster is a single image
 * until the visitor opts in; only then does the <video> mount and
 * autoplay.
 *
 * With no poster we render a typographic fallback rather than a black
 * rectangle — a video whose poster upload failed should still look
 * intentional.
 */

import { useState } from "react";
import { Play } from "lucide-react";
import { formatDuration } from "@/lib/testimonials/video";

interface Props {
  videoUrl: string;
  posterUrl: string | null;
  authorName: string;
  durationSeconds: number | null;
  /** Shown in the fallback poster when there's no image. */
  quote: string;
}

export function TestimonialVideo({
  videoUrl,
  posterUrl,
  authorName,
  durationSeconds,
  quote,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const runtime = formatDuration(durationSeconds);

  if (playing) {
    return (
      <video
        src={videoUrl}
        poster={posterUrl ?? undefined}
        controls
        autoPlay
        playsInline
        preload="auto"
        className="w-full aspect-video bg-black object-cover"
      >
        {/* Visible only if the browser can't play the source at all. */}
        <a href={videoUrl}>Download {authorName}&apos;s video review</a>
      </video>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video review from ${authorName}${runtime ? `, ${runtime}` : ""}`}
      className="group relative block w-full aspect-video overflow-hidden bg-black text-left"
    >
      {posterUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center px-8 text-center text-base sm:text-lg italic text-white/70"
          style={{ fontFamily: "Georgia, serif" }}
        >
          &ldquo;{quote.length > 120 ? `${quote.slice(0, 117)}…` : quote}&rdquo;
        </span>
      )}

      {/* Scrim keeps the play affordance legible over a bright poster. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20"
      />

      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform duration-300 group-hover:scale-110">
          <Play className="ml-0.5 h-6 w-6 fill-black text-black" />
        </span>
      </span>

      <span className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4 sm:p-5">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
          {authorName}
        </span>
        {runtime && (
          <span className="rounded-sm bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {runtime}
          </span>
        )}
      </span>
    </button>
  );
}
