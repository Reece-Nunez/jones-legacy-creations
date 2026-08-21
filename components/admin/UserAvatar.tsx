"use client";

import { useState } from "react";
import Image from "next/image";

/** "Brad Lister" -> "BL". Falls back to "?" for an empty or unusable name. */
export function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

/**
 * A user's badge: their photo when we have a usable one, their initials
 * otherwise.
 *
 * The initials path is not just for users who never set a photo. Avatars here
 * are Google OAuth profile URLs, which can 404 later if the account changes or
 * the photo is removed — and a plain <Image> renders a broken-image icon in
 * that case. onError flips to initials so the badge always shows something
 * that identifies the person.
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
  const showImage = Boolean(avatarUrl) && !failed;

  if (showImage) {
    return (
      <Image
        src={avatarUrl as string}
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
