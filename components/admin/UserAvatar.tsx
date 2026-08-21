"use client";

import { useState } from "react";
import Image from "next/image";
import { getInitials, resolveAvatarUrl } from "@/lib/avatar";

/**
 * A user's badge: a photo they actually uploaded, or their initials.
 *
 * Initials are the common case, not the fallback. resolveAvatarUrl discards
 * Google's auto-populated monograms, so only an avatar uploaded to our own
 * bucket renders as an image — see lib/avatar.ts.
 *
 * onError covers the rest: a stored URL can 404 later if the file is removed,
 * and a plain <Image> would render a broken-image icon. Flipping to initials
 * keeps the badge identifying the person either way.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  tone = "staff",
  className = "",
}: {
  name: string;
  avatarUrl?: string | null;
  /** Rendered pixel size; also drives the initials text scale. */
  size?: number;
  /** Contractors get a distinct colour so the list stays scannable. */
  tone?: "staff" | "contractor";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Google's auto-populated monograms resolve to null here, so they fall
  // through to our own badge — see resolveAvatarUrl.
  const src = resolveAvatarUrl(avatarUrl);

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={`rounded-full border border-gray-200 object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      // aria-hidden: the surrounding row already names the person, so the
      // initials would just be read out as a second, garbled copy.
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-medium text-white ${
        tone === "contractor" ? "bg-orange-500" : "bg-slate-800"
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
    >
      {getInitials(name)}
    </div>
  );
}
