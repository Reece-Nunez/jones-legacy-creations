import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the chromium binary out of the lambda tracing/bundling step — it's
  // resolved at runtime by @sparticuz/chromium and would otherwise blow up
  // the bundle size for unrelated routes.
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  // playwright-core reads browsers.json at runtime and sparticuz extracts a
  // bundled chromium archive from its own package dir — neither is picked
  // up by Next's static tracer. Force-include both packages for the MLS
  // import route only, so this overhead doesn't hit any other lambdas.
  outputFileTracingIncludes: {
    "/api/admin/real-estate-listings/import-mls": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
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
