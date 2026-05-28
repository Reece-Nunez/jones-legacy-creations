import Link from "next/link";
import Image from "next/image";
import { NewsletterSignup } from "@/components/NewsletterSignup";

/* Hallmark · genre: editorial · component: footer · archetype: Ft4 Dense colophon
 * design-system: design.md · designed-as-app
 *
 * A magazine-style colophon: wordmark + tagline above a hairline rule, then
 * three short columns (Services · Company · Direct) below, then a fine-print
 * row at the bottom. Replaces the 4-column AI footer template — no Resources
 * / Legal / Products column rhythm, no social-icon row, no centered branding.
 *
 * Server Component on purpose — no useState / pathname / handlers needed.
 * Hover color flips are CSS-only via Tailwind hover: arbitrary-value classes,
 * so the whole footer can be statically rendered.
 */

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--hm-paper-3)",
        color: "var(--hm-ink)",
        borderTop: "1px solid var(--hm-rule-thick)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-10 sm:pt-24">
        {/* Masthead — wordmark + italic tagline */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 sm:gap-10">
          <div>
            <Link
              href="/"
              aria-label="Jones Legacy Creations — home"
              className="inline-block"
            >
              <Image
                src="/logo-transparent.png"
                alt="Jones Legacy Creations"
                width={504}
                height={360}
                className="object-contain"
                style={{ height: "64px", width: "auto" }}
              />
            </Link>
            <p
              className="mt-5 font-serif font-bold"
              style={{
                fontSize: "var(--hm-text-h3)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
                maxWidth: "32ch",
              }}
            >
              Real estate, custom homes, and interior design. Rooted in
              Southern Utah.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center font-mono uppercase self-start sm:self-end whitespace-nowrap border bg-[var(--hm-ink)] text-[var(--hm-paper)] border-[var(--hm-ink)] hover:bg-[var(--hm-accent)] hover:border-[var(--hm-accent)] transition-colors duration-200"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.15em",
              padding: "0.75rem 1.25rem",
              minHeight: 44,
            }}
          >
            Start a project →
          </Link>
        </div>

        {/* Thick rule under the masthead */}
        <hr
          className="border-0 mt-12"
          style={{ borderTop: "1px solid var(--hm-rule-thick)" }}
        />

        {/* Newsletter signup — site-wide capture for visitors who
          * aren't ready to fill the full lead form. Single opt-in,
          * dual-writes to the leads table with source='newsletter'. */}
        <div className="mt-2">
          <NewsletterSignup source="footer" />
        </div>

        {/* Three colophon columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12 pt-12">
          <ColophonColumn label="Services">
            <ColophonLink href="/services/real-estate">Real Estate</ColophonLink>
            <ColophonLink href="/services/construction">Construction</ColophonLink>
            <ColophonLink href="/services/interior-design">
              Interior Design &amp; Staging
            </ColophonLink>
          </ColophonColumn>

          <ColophonColumn label="Company">
            <ColophonLink href="/about">About</ColophonLink>
            <ColophonLink href="/blog">The Journal</ColophonLink>
            <ColophonLink href="/gallery">Gallery</ColophonLink>
            <ColophonLink href="/estimate">Free estimate</ColophonLink>
            <ColophonLink href="/contact">Contact</ColophonLink>
          </ColophonColumn>

          <ColophonColumn label="Direct">
            <ColophonLink href="tel:+14352889807">(435) 288-9807</ColophonLink>
            <ColophonLink href="mailto:office@joneslegacycreations.com">
              office@joneslegacycreations.com
            </ColophonLink>
            <ColophonStatic>Hurricane, Utah</ColophonStatic>
            <ColophonStatic>Serving all of Southern Utah</ColophonStatic>

            <div className="mt-5">
              <p
                className="font-mono uppercase mb-2"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.22em",
                  color: "var(--hm-ink-3)",
                }}
              >
                Social
              </p>
              <ul className="space-y-1">
                <li>
                  <ColophonExternal href="https://www.instagram.com/jonescustomhomes/">
                    Instagram · Custom Homes
                  </ColophonExternal>
                </li>
                <li>
                  <ColophonExternal href="https://www.instagram.com/interiors.by.jch/">
                    Instagram · Interior Design
                  </ColophonExternal>
                </li>
                <li>
                  <ColophonExternal href="https://www.facebook.com/profile.php?id=61575767564467">
                    Facebook · Interior Design
                  </ColophonExternal>
                </li>
              </ul>
            </div>
          </ColophonColumn>
        </div>

        {/* Fine-print row */}
        <div
          className="mt-16 pt-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 font-mono uppercase"
          style={{
            fontSize: "10px",
            letterSpacing: "0.18em",
            color: "var(--hm-ink-3)",
            borderTop: "1px solid var(--hm-rule)",
          }}
        >
          <span>© {currentYear} Jones Legacy Creations</span>
          <span className="inline-flex flex-wrap items-baseline gap-x-6">
            <Link
              href="/privacy"
              className="text-[var(--hm-ink-3)] hover:text-[var(--hm-ink)] transition-colors duration-200"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-[var(--hm-ink-3)] hover:text-[var(--hm-ink)] transition-colors duration-200"
            >
              Terms
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

function ColophonColumn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="font-mono uppercase mb-4"
        style={{
          fontSize: "10px",
          letterSpacing: "0.22em",
          color: "var(--hm-ink-3)",
        }}
      >
        {label}
      </p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function ColophonLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isAbsolute = /^(https?:|mailto:|tel:)/.test(href);
  const className =
    "inline-block font-sans text-[var(--hm-ink-2)] hover:text-[var(--hm-accent)] transition-colors duration-200";
  const style: React.CSSProperties = {
    fontSize: "var(--hm-text-body)",
    lineHeight: 1.5,
  };

  if (isAbsolute) {
    return (
      <li>
        <a href={href} className={className} style={style}>
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    </li>
  );
}

function ColophonStatic({ children }: { children: React.ReactNode }) {
  return (
    <li
      className="font-sans"
      style={{
        fontSize: "var(--hm-text-body)",
        color: "var(--hm-ink-2)",
        lineHeight: 1.5,
      }}
    >
      {children}
    </li>
  );
}

function ColophonExternal({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block font-sans text-[var(--hm-ink-2)] hover:text-[var(--hm-accent)] transition-colors duration-200"
      style={{
        fontSize: "var(--hm-text-body)",
        lineHeight: 1.5,
      }}
    >
      {children}
    </a>
  );
}
