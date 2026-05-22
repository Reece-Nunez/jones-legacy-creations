import Image from "next/image";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

/* Hallmark · genre: editorial · macrostructure: Long Document
 * design-system: design.md · designed-as-app
 * theme: Linen · anchor hue: terracotta
 *
 * About page in letter form. Single column at 60-65ch measure, inline
 * italic section heads emerging from the paragraph flow, the family
 * photo sized to the text measure (not full-bleed split-screen), and
 * the six former trust-point cards woven into prose instead of being
 * a 3-column icon grid.
 */

export const metadata = {
  title: "About",
  description:
    "Blake and Hilari Jones run three companies out of Hurricane, Utah: custom home construction, real estate brokerage, and interior design + staging.",
};

export default function AboutPage() {
  return (
    <>
      <Navigation />

      <main style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}>
        <article className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-24 lg:pt-40 lg:pb-32">
          {/* Hero — left-aligned display, no centered title block */}
          <p
            className="font-mono uppercase mb-6"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.22em",
              color: "var(--hm-ink-3)",
            }}
          >
            Hurricane, Utah · est. 2014
          </p>
          <h1
            className="font-serif font-normal italic"
            style={{
              fontSize: "clamp(3rem, 9vw, 7.5rem)",
              lineHeight: 0.96,
              color: "var(--hm-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            About.
          </h1>
          <p
            className="mt-6 font-serif italic"
            style={{
              fontSize: "var(--hm-text-h3)",
              color: "var(--hm-ink-2)",
              lineHeight: 1.35,
              maxWidth: "42ch",
            }}
          >
            Blake and Hilari Jones, in their own words.
          </p>

          {/* Body prose — single column, 62ch measure, generous line-height */}
          <div
            className="mt-14 font-sans space-y-7"
            style={{
              fontSize: "var(--hm-text-lede)",
              color: "var(--hm-ink-2)",
              lineHeight: 1.65,
              maxWidth: "62ch",
            }}
          >
            <p>
              Most of what we do has been the same conversation for over a
              decade. Build, broker, design. Three sides of the same business,
              one family, one phone number. This page is the short version of
              how it got here and what we care about.
            </p>

            {/* Inline family photo — sized to text measure, never full-bleed */}
            <figure className="my-12 not-italic">
              <div
                className="relative w-full"
                style={{
                  aspectRatio: "4 / 5",
                  maxWidth: "440px",
                  background: "var(--hm-paper-3)",
                  border: "1px solid var(--hm-rule)",
                }}
              >
                <Image
                  src="https://jones-legacy-creations.s3.us-east-1.amazonaws.com/about-us/about-us.jpg"
                  alt="Blake and Hilari Jones, founders of Jones Legacy Creations, standing together"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 440px"
                  priority
                />
              </div>
              <figcaption
                className="mt-3 font-mono uppercase"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.22em",
                  color: "var(--hm-ink-3)",
                }}
              >
                Blake &amp; Hilari Jones · Hurricane, Utah
              </figcaption>
            </figure>

            <h2
              className="font-serif italic"
              style={{
                fontSize: "var(--hm-text-h3)",
                color: "var(--hm-ink)",
                lineHeight: 1.2,
                marginTop: "2.5rem",
              }}
            >
              The work.
            </h2>
            <p>
              We build custom homes. We help buyers find homes and sellers
              move them. We design and stage interiors. Each side feeds the
              others in ways the corporate version of this never could. The
              builder&apos;s eye that finishes the house picks the right
              comps for it. The realtor who knows the market also knows
              what a renovation will actually cost when the inspection
              comes back. The designer who stages a house for sale also
              knows what makes a kitchen worth the upgrade.
            </p>

            <h2
              className="font-serif italic"
              style={{
                fontSize: "var(--hm-text-h3)",
                color: "var(--hm-ink)",
                lineHeight: 1.2,
                marginTop: "2.5rem",
              }}
            >
              The way we run it.
            </h2>
            <p>
              One-stop, but not bundled. You can hire us for one piece or
              the whole thing. We specialize in creative financing options
              that open doors when a conventional loan won&apos;t, and we
              keep a network of inspectors, lenders, contractors, and
              trades we still call by their first names. The handover
              isn&apos;t the end of the relationship. That&apos;s where it
              starts.
            </p>

            <h2
              className="font-serif italic"
              style={{
                fontSize: "var(--hm-text-h3)",
                color: "var(--hm-ink)",
                lineHeight: 1.2,
                marginTop: "2.5rem",
              }}
            >
              What we care about.
            </h2>
            <p>
              Custom builds done with patience. Spaces that actually fit the
              people who live in them. Honest pricing and clear schedules.
              Answering the phone when it rings. A decade of relationships
              in Hurricane, St. George, and the rest of Washington County
              that we&apos;d like to still have a decade from now.
            </p>

            {/* Hairline rule before closing */}
            <hr
              className="border-0 my-12"
              style={{ borderTop: "1px solid var(--hm-rule)" }}
            />

            <p>
              If any of that sounds like the kind of help you need, get in
              touch. Or call{" "}
              <a
                href="tel:+14352889807"
                className="text-[var(--hm-ink)] hover:text-[var(--hm-accent)] transition-colors"
                style={{ borderBottom: "1px solid var(--hm-rule)" }}
              >
                (435) 288-9807
              </a>
              . Blake answers his own phone.
            </p>

            <div className="not-italic pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center font-mono uppercase border bg-[var(--hm-ink)] text-[var(--hm-paper)] border-[var(--hm-ink)] hover:bg-[var(--hm-accent)] hover:border-[var(--hm-accent)] transition-colors duration-200 whitespace-nowrap"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.15em",
                  padding: "0.75rem 1.25rem",
                  minHeight: 44,
                }}
              >
                Tell us about your project
              </Link>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
}
