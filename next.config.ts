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
 * If a third party misbehaves after deploy, switch the header key below to
 * "Content-Security-Policy-Report-Only" to observe violations without
 * enforcing.
 */
const SUPABASE_ORIGIN = "https://rvyummgsvggjqtjbtqfw.supabase.co";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://jones-legacy-creations.s3.us-east-1.amazonaws.com ${SUPABASE_ORIGIN} https://www.googletagmanager.com https://www.google-analytics.com https://www.facebook.com https://www.google.com`,
  "font-src 'self' data:",
  `connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://connect.facebook.net https://www.facebook.com https://www.google.com ${SUPABASE_ORIGIN} wss://rvyummgsvggjqtjbtqfw.supabase.co`,
  "frame-src 'self' https://www.google.com https://www.facebook.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
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
