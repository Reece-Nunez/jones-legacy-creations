"use client";

/**
 * Meta (Facebook/Instagram) Pixel loader.
 *
 * Gated on NEXT_PUBLIC_META_PIXEL_ID — if the env var isn't set the
 * component returns null and zero JS is shipped. This means the
 * scaffolding can live in main without an active pixel; flipping it
 * on later is one env-var change in Vercel, no code edit needed.
 *
 * Why bother installing now: Meta's conversion-optimization algorithm
 * needs ~50 conversion events before it can find similar people
 * efficiently. Installing the pixel today means by the time Blake
 * decides to spend $500 on a campaign in 6 months, there's already
 * months of "people who filled the construction form" data primed
 * for lookalike audiences.
 */

import Script from "next/script";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function MetaPixel() {
  if (!PIXEL_ID) {
    return null;
  }

  return (
    <>
      <Script id="meta-pixel" strategy="lazyOnload">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      {/* noscript fallback for the small slice of users without JS */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
