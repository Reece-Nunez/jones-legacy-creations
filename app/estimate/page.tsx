import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import EstimateForm from "@/components/EstimateForm";
import type { Metadata } from "next";

/* Hallmark · genre: editorial · macrostructure: form-page family
 * design-system: design.md · designed-as-app
 * theme: Linen · anchor hue: terracotta
 *
 * Hero restyled in Linen voice. The EstimateForm wizard below keeps its
 * own visual system for now — it's a multi-step calculator with its own
 * progress / step / result UI, distinct enough that restyling it without
 * breaking the wizard flow is a separate effort. Marked as follow-up. */

export const metadata: Metadata = {
  title: "Get a Free Estimate | Jones Legacy Creations",
  description:
    "Get a free cost range for your construction, renovation, or interior design project in Southern Utah. No obligation, results in about a minute.",
  openGraph: {
    title: "Get a Free Estimate | Jones Legacy Creations",
    description:
      "Get a free cost range for your construction, renovation, or interior design project in Southern Utah. No obligation.",
  },
};

export default function EstimatePage() {
  return (
    <>
      <Navigation />

      <main style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}>
        {/* Hero — left-aligned editorial display, mono-caps dateline,
            inline trust meta replacing the green-dot pill row */}
        <section
          aria-label="Get a free estimate"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-12 lg:pt-40 lg:pb-16">
            <p
              className="font-mono uppercase mb-6"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.22em",
                color: "var(--hm-ink-3)",
              }}
            >
              Free estimate · Southern Utah
            </p>
            <h1
              className="font-serif font-normal italic"
              style={{
                fontSize: "clamp(2.75rem, 7vw, 6rem)",
                lineHeight: 0.97,
                color: "var(--hm-ink)",
                letterSpacing: "-0.02em",
              }}
            >
              A real number, in about a minute.
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
              Answer a few quick questions about your project and we&apos;ll
              give you a cost range right here. Free, no commitment, no
              follow-up sales calls you didn&apos;t ask for.
            </p>

            {/* Trust meta — mono-caps inline, replacing the green-dot pill row */}
            <ul
              className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono uppercase"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.18em",
                color: "var(--hm-ink-3)",
              }}
            >
              <li>Free</li>
              <li aria-hidden="true">·</li>
              <li>No obligation</li>
              <li aria-hidden="true">·</li>
              <li>~60 seconds</li>
            </ul>
          </div>
        </section>

        {/* Hairline transition into the wizard */}
        <hr
          className="border-0 mx-6 sm:mx-8 lg:mx-12"
          style={{ borderTop: "1px solid var(--hm-rule)" }}
        />

        {/* Wizard — keeps its own UI system. Wrapped in a Linen surface so
            the page reads as one continuous editorial. */}
        <div style={{ background: "var(--hm-paper)" }}>
          <EstimateForm />
        </div>
      </main>

      <Footer />
    </>
  );
}
