import Link from "next/link";
import Image from "next/image";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

/* Hallmark · genre: editorial · macrostructure: Bento Grid
 * design-system: design.md · designed-as-app
 * theme: House · anchor hue: none (monochrome)
 *
 * Three sub-brand tiles stay (per client direction), but as varied-size
 * bento blocks rather than three equal columns — the AI fingerprint of
 * the previous design. Real Estate carries the largest tile because the
 * inventory IS the most engaging entry point.
 */

const companies = [
  {
    id: "realty",
    name: "Blake Jones Realty",
    subtitle: "Real estate",
    description:
      "Homes in Southern Utah, brokered carefully. A builder's eye for what a property will actually take to live in. Creative financing when the standard path doesn't fit your situation.",
    iconAlt: "Blake Jones Realty",
    icon: "/JONES REALTY ICON (2).svg",
    href: "/services/real-estate",
    cta: "View listings",
  },
  {
    id: "construction",
    name: "Jones Custom Homes",
    subtitle: "Custom construction",
    description:
      "From concept to closing on a finished home. Residential builds, commercial work, and renovations. Project management that respects your timeline as much as the build itself.",
    iconAlt: "Jones Custom Homes",
    icon: "/JONES CUSTOM HOMES ICON (2).svg",
    href: "/services/construction",
    cta: "See projects",
  },
  {
    id: "interiors",
    name: "Interiors By Jones",
    subtitle: "Design & staging",
    description:
      "The same family eye that finishes the house puts the furniture in it. Interior design, home staging, space planning, and color consultation.",
    iconAlt: "Interiors By Jones",
    icon: "/JONES Interior Design & Staging ICON (2).svg",
    href: "/services/interior-design",
    cta: "See the portfolio",
  },
];

const stats = [
  { value: "100+", label: "Projects completed" },
  { value: "10+", label: "Years experience" },
  { value: "98%", label: "Client satisfaction" },
  { value: "50+", label: "Industry partners" },
];

export default function HomePage() {
  return (
    <>
      <Navigation />

      <main style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}>
        {/* Hero — fixed-height centered display per Bento Grid spec. Not
            full-viewport, no glass cards, no aurora gradient. */}
        <section
          aria-label="Jones Legacy Creations"
          className="pt-28 pb-16 sm:pt-36 sm:pb-24"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
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
              className="font-serif font-bold"
              style={{
                fontSize: "clamp(2.75rem, 7.5vw, 6.5rem)",
                lineHeight: 0.98,
                color: "var(--hm-ink)",
                letterSpacing: "-0.02em",
                overflowWrap: "anywhere",
                minWidth: 0,
              }}
            >
              Three companies,<br />one front door.
            </h1>
            <p
              className="mt-8 font-sans mx-auto"
              style={{
                fontSize: "var(--hm-text-lede)",
                color: "var(--hm-ink-2)",
                lineHeight: 1.55,
                maxWidth: "52ch",
              }}
            >
              Custom-home construction, real-estate brokerage, and interior
              design &amp; staging. All rooted in Southern Utah. All reachable
              through one phone number.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
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
                Start a project
              </Link>
              <Link
                href="/estimate"
                className="inline-flex items-center justify-center font-mono uppercase border border-[var(--hm-ink)] text-[var(--hm-ink)] hover:text-[var(--hm-accent)] hover:border-[var(--hm-accent)] transition-colors duration-200 whitespace-nowrap"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.15em",
                  padding: "0.75rem 1.25rem",
                  minHeight: 44,
                }}
              >
                Free estimate →
              </Link>
            </div>
          </div>
        </section>

        {/* Bento mosaic — three brand tiles + stats tile + trust tile.
            Sizes vary deliberately so the grid breaks the AI 3-equal-columns
            template. Real Estate takes the largest cell as the most
            engaging entry point.

            Grid plan (desktop, 12 cols):
              Row 1: Realty (cols 1-7, rows 1-2)   · Custom Homes (cols 8-12, row 1)
              Row 2: (realty continues)            · Interiors  (cols 8-12, row 2)
              Row 3: Stats     (cols 1-7, row 3)   · Trust      (cols 8-12, row 3) */}
        <section
          aria-label="What we do"
          style={{ background: "var(--hm-paper-2)" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
              {/* Tile: Blake Jones Realty (large feature) */}
              <BrandTile
                company={companies[0]}
                size="large"
                className="lg:col-span-7 lg:row-span-2"
              />
              {/* Tile: Jones Custom Homes */}
              <BrandTile
                company={companies[1]}
                size="medium"
                className="lg:col-span-5"
              />
              {/* Tile: Interiors By Jones */}
              <BrandTile
                company={companies[2]}
                size="medium"
                className="lg:col-span-5"
              />

              {/* Tile: Stats (mono-caps tabular row) */}
              <article
                className="p-7 sm:p-8 lg:col-span-7"
                style={{
                  background: "var(--hm-paper)",
                  border: "1px solid var(--hm-rule)",
                }}
              >
                <p
                  className="font-mono uppercase mb-6"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.22em",
                    color: "var(--hm-ink-3)",
                  }}
                >
                  By the numbers
                </p>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <dt
                        className="font-serif tabular-nums"
                        style={{
                          fontSize: "clamp(1.875rem, 3vw, 2.5rem)",
                          color: "var(--hm-ink)",
                          fontWeight: 500,
                          letterSpacing: "-0.02em",
                          lineHeight: 1,
                        }}
                      >
                        {stat.value}
                      </dt>
                      <dd
                        className="font-mono uppercase mt-2"
                        style={{
                          fontSize: "10px",
                          letterSpacing: "0.18em",
                          color: "var(--hm-ink-3)",
                          lineHeight: 1.3,
                        }}
                      >
                        {stat.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>

              {/* Tile: Trust paragraph (inline, no 4-card grid) */}
              <article
                className="p-7 sm:p-8 lg:col-span-5"
                style={{
                  background: "var(--hm-paper)",
                  border: "1px solid var(--hm-rule)",
                  borderLeft: "3px solid var(--hm-accent)",
                }}
              >
                <p
                  className="font-mono uppercase mb-4"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.22em",
                    color: "var(--hm-ink-3)",
                  }}
                >
                  Why people stay
                </p>
                <p
                  className="font-serif font-bold mb-4"
                  style={{
                    fontSize: "var(--hm-text-h3)",
                    color: "var(--hm-ink)",
                    lineHeight: 1.3,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Licensed, insured, on-time, on-budget. Still local enough
                  to answer the phone.
                </p>
                <p
                  className="font-sans"
                  style={{
                    fontSize: "var(--hm-text-body)",
                    color: "var(--hm-ink-2)",
                    lineHeight: 1.6,
                  }}
                >
                  Fully licensed general contractor with comprehensive
                  insurance. Transparent schedules and cost management.
                  Ten-plus years of relationships in Hurricane, St. George,
                  and the rest of Washington County. The family name is on
                  the front of every truck.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Closing — single short paragraph + chip. No dark gradient bg,
            no centered button grid. */}
        <section
          aria-label="Get in touch"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-28">
            <p
              className="font-mono uppercase mb-5"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.22em",
                color: "var(--hm-ink-3)",
              }}
            >
              Get in touch
            </p>
            <h2
              className="font-serif font-bold mb-6"
              style={{
                fontSize: "var(--hm-text-h2)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              Ready when you are.
            </h2>
            <p
              className="font-sans mb-10"
              style={{
                fontSize: "var(--hm-text-lede)",
                color: "var(--hm-ink-2)",
                lineHeight: 1.6,
                maxWidth: "55ch",
              }}
            >
              If you&apos;re buying, building, selling, or staging, tell us
              about it. Or just call <a
                href="tel:+14352889807"
                className="text-[var(--hm-ink)] hover:text-[var(--hm-accent)] transition-colors"
                style={{ borderBottom: "1px solid var(--hm-rule)" }}
              >
                (435) 288-9807
              </a>. Blake answers his own phone.
            </p>
            <div className="flex flex-wrap items-center gap-3">
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
        </section>
      </main>

      <Footer />
    </>
  );
}

/* Brand tile — Linen-styled bento cell. NOT the old glass-card / dark-
 * gradient template. Hairline frame, paper-fill, small inline brand mark,
 * italic Playfair name, mono-caps subtitle, prose body, terracotta-tinted
 * tertiary link. Variant on the large tile gets a thicker accent rule. */
function BrandTile({
  company,
  size,
  className,
}: {
  company: (typeof companies)[number];
  size: "large" | "medium";
  className?: string;
}) {
  const isLarge = size === "large";

  return (
    <Link
      href={company.href}
      aria-label={`${company.name} — ${company.subtitle}`}
      className={`group block ${className ?? ""}`}
      style={{
        background: isLarge ? "var(--hm-paper)" : "var(--hm-paper)",
        border: "1px solid var(--hm-rule)",
        borderTop: isLarge ? "3px solid var(--hm-accent)" : "1px solid var(--hm-rule)",
        transition: "border-color var(--hm-dur-short) var(--hm-ease-out)",
      }}
    >
      <article
        className={
          isLarge
            ? "p-8 sm:p-10 lg:p-12 h-full flex flex-col"
            : "p-7 sm:p-8 h-full flex flex-col"
        }
      >
        <div className="flex items-start gap-3 mb-5">
          <Image
            src={company.icon}
            alt={company.iconAlt}
            width={56}
            height={56}
            /* SVG brand marks: bypass the image optimizer, which returns HTTP
             * 400 for SVG unless dangerouslyAllowSVG is enabled. Vector assets
             * gain nothing from optimization anyway. */
            unoptimized
            className="object-contain"
            style={{
              height: isLarge ? "40px" : "32px",
              width: "auto",
              flexShrink: 0,
            }}
          />
          <span
            className="font-mono uppercase mt-1"
            style={{
              fontSize: "10px",
              letterSpacing: "0.22em",
              color: "var(--hm-ink-3)",
            }}
          >
            {company.subtitle}
          </span>
        </div>
        <h2
          className="font-serif font-bold mb-4"
          style={{
            fontSize: isLarge
              ? "clamp(1.875rem, 3.5vw, 2.75rem)"
              : "var(--hm-text-h3)",
            color: "var(--hm-ink)",
            letterSpacing: "-0.015em",
            lineHeight: 1.15,
          }}
        >
          {company.name}
        </h2>
        <p
          className="font-sans"
          style={{
            fontSize: isLarge ? "var(--hm-text-lede)" : "var(--hm-text-body)",
            color: "var(--hm-ink-2)",
            lineHeight: 1.6,
            maxWidth: "55ch",
          }}
        >
          {company.description}
        </p>
        <div className="mt-auto pt-6">
          <span
            className="inline-flex items-center font-mono uppercase transition-colors duration-200 group-hover:text-[var(--hm-accent)]"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.15em",
              color: "var(--hm-ink)",
              borderBottom: "1px solid var(--hm-rule-thick)",
              paddingBottom: "2px",
            }}
          >
            {company.cta} →
          </span>
        </div>
      </article>
    </Link>
  );
}
