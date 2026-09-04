import type { NextConfig } from "next";

/* Content-Security-Policy.
 *
 * Allowlist is derived from the origins the browser actually loads — not a
 * generic template — so it can ship enforcing without breaking the live site:
 *   - 'unsafe-inline' (script/style): required because the Next App Router
 *     emits inline hydration/streaming scripts and the UI uses inline style
 *     attributes throughout; there is no nonce middleware. This weakens XSS
 *     protection but the other directives (object-src, base-uri, frame-
 *     ancestors, form-action) still close off the cheap attack vectors.
 *   - googletagmanager / google-analytics  → GoogleAnalytics.tsx (GA4)
 *   - connect.facebook.net / www.facebook.com → MetaPixel.tsx (fbevents + tr)
 *   - www.google.com / www.gstatic.com → ReCaptchaProvider.tsx (Enterprise
 *     loads enterprise.js, pulls assets from gstatic, opens a google.com
 *     frame). Missing these would break every public lead form.
 *   - <project>.supabase.co (https + wss) → browser Supabase client + storage
 *   - jones-legacy-creations.s3…amazonaws.com → project/listing photos
 *   - lh3.googleusercontent.com → Google OAuth profile photos (user avatars)
 * If a third party misbehaves after deploy, switch the header key below to
 * "Content-Security-Policy-Report-Only" to observe violations without
 * enforcing.
 */
const SUPABASE_ORIGIN = "https://rvyummgsvggjqtjbtqfw.supabase.co";
// Staff sign in with Google and their profile photo URL is copied into
// user_profiles.avatar_url. lib/avatar.ts now discards those (they are
// generated monograms, not chosen photos) so we normally render initials
// instead — but the host stays allowlisted so any Google URL that does reach
// an <Image> renders rather than failing as a blocked, broken image.
const GOOGLE_AVATAR_ORIGIN = "https://lh3.googleusercontent.com";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://jones-legacy-creations.s3.us-east-1.amazonaws.com ${SUPABASE_ORIGIN} ${GOOGLE_AVATAR_ORIGIN} https://www.googletagmanager.com https://www.google-analytics.com https://www.facebook.com https://www.google.com`,
  "font-src 'self' data:",
  `connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://connect.facebook.net https://www.facebook.com https://www.google.com ${SUPABASE_ORIGIN} wss://rvyummgsvggjqtjbtqfw.supabase.co`,
  // Supabase origin is required because /api/admin/files/download 302-redirects
  // the iframe to a short-lived signed storage URL; frame-src is enforced
  // against the *redirect target*, so without it Chrome blocks every PDF
  // preview with "This content is blocked. Contact the site owner."
  `frame-src 'self' https://www.google.com https://www.facebook.com ${SUPABASE_ORIGIN}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // Testimonial video is served from the public testimonial-videos bucket,
  // so <video src> points at Supabase rather than our own origin. img-src
  // already allowlists it, which is why the poster frame rendered fine while
  // the mp4 itself was blocked — the two are separate directives and only
  // media-src governs <video>/<audio>.
  `media-src 'self' ${SUPABASE_ORIGIN}`,
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jones-legacy-creations.s3.us-east-1.amazonaws.com",
        pathname: "/interior/**",
      },
      {
        protocol: "https",
        hostname: "jones-legacy-creations.s3.us-east-1.amazonaws.com",
        pathname: "/construction/**",
      },
      {
        protocol: "https",
        hostname: "jones-legacy-creations.s3.us-east-1.amazonaws.com",
        pathname: "/about-us/**",
      },
      {
        // Google OAuth profile photos, stored on user_profiles.avatar_url when
        // staff sign in with Google.
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/a/**",
      },
      {
        // Public avatars bucket
        protocol: "https",
        hostname: "rvyummgsvggjqtjbtqfw.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
      {
        // Public real-estate listing photos
        protocol: "https",
        hostname: "rvyummgsvggjqtjbtqfw.supabase.co",
        pathname: "/storage/v1/object/public/real-estate-photos/**",
      },
      {
        // Public construction-showcase photos
        protocol: "https",
        hostname: "rvyummgsvggjqtjbtqfw.supabase.co",
        pathname: "/storage/v1/object/public/construction-photos/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
