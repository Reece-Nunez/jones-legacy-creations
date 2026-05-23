"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Settings } from "lucide-react";

/* Hallmark · genre: editorial · component: navigation · archetype: N7 Newspaper masthead
 * design-system: design.md · designed-as-app
 *
 * Wordmark on the left, mono-caps service link row on the right, hairline
 * ink rule at the bottom. No scroll-shrink, no dark backdrop over hero, no
 * dropdowns — the three services are flat in the link row because hiding
 * destinations is the AI-nav fingerprint we're explicitly stepping away from.
 */

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const services = [
    { name: "Real Estate", href: "/services/real-estate" },
    { name: "Construction", href: "/services/construction" },
    { name: "Design", href: "/services/interior-design" },
  ];

  const isActive = (href: string) => pathname === href;

  // Single nav-link style — mono-caps small with hover-tinted underline.
  // Active state shows a solid terracotta underline so the visitor can read
  // where they are without us having to add highlight boxes.
  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    fontSize: "var(--hm-text-meta)",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: active ? "var(--hm-ink)" : "var(--hm-ink-2)",
    borderBottom: active
      ? "1px solid var(--hm-accent)"
      : "1px solid transparent",
    paddingBottom: "2px",
    transition:
      "color var(--hm-dur-short) var(--hm-ease-out), border-color var(--hm-dur-short) var(--hm-ease-out)",
    whiteSpace: "nowrap",
  });

  return (
    <nav
      aria-label="Main navigation"
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "var(--hm-paper)",
        borderBottom: "1px solid var(--hm-rule-thick)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Wordmark — logo image carries the brand name, no redundant tag */}
          <Link
            href="/"
            className="inline-flex items-center group"
            aria-label="Jones Legacy Creations — home"
          >
            <Image
              src="/logo-transparent.png"
              alt="Jones Legacy Creations"
              width={400}
              height={400}
              className="object-contain"
              // Fluid sizing: 48 px floor on phones, scales up to 64 px on
              // wide screens. Fits inside the existing h-16 (mobile) /
              // h-20 (desktop) nav without changing the layout.
              style={{ height: "clamp(48px, 5.5vw, 64px)", width: "auto" }}
              priority
            />
          </Link>

          {/* Right masthead column — service links + secondary + CTA */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {/* Services (flat, not a dropdown) */}
            <div className="flex items-center gap-5 lg:gap-7">
              {services.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  style={linkStyle(isActive(s.href))}
                  onMouseEnter={(e) => {
                    if (!isActive(s.href)) {
                      e.currentTarget.style.color = "var(--hm-ink)";
                      e.currentTarget.style.borderColor = "var(--hm-accent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(s.href)) {
                      e.currentTarget.style.color = "var(--hm-ink-2)";
                      e.currentTarget.style.borderColor = "transparent";
                    }
                  }}
                  {...(isActive(s.href) ? { "aria-current": "page" as const } : {})}
                >
                  {s.name}
                </Link>
              ))}
            </div>

            {/* Hairline divider between services and secondary links */}
            <span
              className="h-5 w-px"
              style={{ background: "var(--hm-rule)" }}
              aria-hidden="true"
            />

            <div className="flex items-center gap-5 lg:gap-7">
              <Link
                href="/about"
                style={linkStyle(isActive("/about"))}
                onMouseEnter={(e) => {
                  if (!isActive("/about")) {
                    e.currentTarget.style.color = "var(--hm-ink)";
                    e.currentTarget.style.borderColor = "var(--hm-accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/about")) {
                    e.currentTarget.style.color = "var(--hm-ink-2)";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
                {...(isActive("/about") ? { "aria-current": "page" as const } : {})}
              >
                About
              </Link>
              <Link
                href="/gallery"
                style={linkStyle(isActive("/gallery"))}
                onMouseEnter={(e) => {
                  if (!isActive("/gallery")) {
                    e.currentTarget.style.color = "var(--hm-ink)";
                    e.currentTarget.style.borderColor = "var(--hm-accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/gallery")) {
                    e.currentTarget.style.color = "var(--hm-ink-2)";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
                {...(isActive("/gallery") ? { "aria-current": "page" as const } : {})}
              >
                Gallery
              </Link>
              <Link
                href="/estimate"
                style={linkStyle(isActive("/estimate"))}
                onMouseEnter={(e) => {
                  if (!isActive("/estimate")) {
                    e.currentTarget.style.color = "var(--hm-ink)";
                    e.currentTarget.style.borderColor = "var(--hm-accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/estimate")) {
                    e.currentTarget.style.color = "var(--hm-ink-2)";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
                {...(isActive("/estimate") ? { "aria-current": "page" as const } : {})}
              >
                Estimate
              </Link>
            </div>

            {/* Contact CTA — square ink chip, tints to terracotta on hover */}
            <Link
              href="/contact"
              className="inline-flex items-center justify-center font-mono uppercase"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.15em",
                padding: "0.5rem 1rem",
                minHeight: 36,
                background: "var(--hm-ink)",
                color: "var(--hm-paper)",
                border: "1px solid var(--hm-ink)",
                transition:
                  "background var(--hm-dur-short) var(--hm-ease-out), border-color var(--hm-dur-short) var(--hm-ease-out)",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hm-accent)";
                e.currentTarget.style.borderColor = "var(--hm-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--hm-ink)";
                e.currentTarget.style.borderColor = "var(--hm-ink)";
              }}
              {...(isActive("/contact") ? { "aria-current": "page" as const } : {})}
            >
              Contact
            </Link>

            {/* Admin gear — small, quiet, far right */}
            <Link
              href="/admin"
              aria-label="Admin panel"
              title="Admin"
              className="inline-flex items-center justify-center h-9 w-9"
              style={{ color: "var(--hm-ink-3)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--hm-ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--hm-ink-3)";
              }}
            >
              <Settings aria-hidden="true" className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden h-11 w-11 inline-flex items-center justify-center"
            style={{ color: "var(--hm-ink)" }}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? (
              <X aria-hidden="true" className="w-6 h-6" />
            ) : (
              <Menu aria-hidden="true" className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu — Linen-styled sheet that opens below the masthead. */}
      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{
          background: "var(--hm-paper)",
          borderTop: isOpen ? "1px solid var(--hm-rule)" : "0",
          overscrollBehavior: "contain",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="px-6 py-8 space-y-1">
          <MobileLink href="/" active={isActive("/")} onNavigate={() => setIsOpen(false)}>
            Home
          </MobileLink>
          <MobileEyebrow>Services</MobileEyebrow>
          {services.map((s) => (
            <MobileLink
              key={s.href}
              href={s.href}
              active={isActive(s.href)}
              onNavigate={() => setIsOpen(false)}
              indent
            >
              {s.name}
            </MobileLink>
          ))}
          <MobileEyebrow>Company</MobileEyebrow>
          <MobileLink
            href="/about"
            active={isActive("/about")}
            onNavigate={() => setIsOpen(false)}
            indent
          >
            About
          </MobileLink>
          <MobileLink
            href="/gallery"
            active={isActive("/gallery")}
            onNavigate={() => setIsOpen(false)}
            indent
          >
            Gallery
          </MobileLink>
          <MobileLink
            href="/estimate"
            active={isActive("/estimate")}
            onNavigate={() => setIsOpen(false)}
            indent
          >
            Estimate
          </MobileLink>

          <div className="pt-6 mt-4" style={{ borderTop: "1px solid var(--hm-rule)" }}>
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="inline-flex w-full items-center justify-center font-mono uppercase"
              style={{
                fontSize: "var(--hm-text-meta)",
                letterSpacing: "0.15em",
                padding: "0.875rem 1rem",
                minHeight: 48,
                background: "var(--hm-ink)",
                color: "var(--hm-paper)",
                border: "1px solid var(--hm-ink)",
              }}
              {...(isActive("/contact") ? { "aria-current": "page" as const } : {})}
            >
              Contact
            </Link>
          </div>

          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            aria-label="Admin panel"
            className="inline-flex items-center gap-2 mt-6 font-mono uppercase"
            style={{
              fontSize: "10px",
              letterSpacing: "0.18em",
              color: "var(--hm-ink-3)",
            }}
          >
            <Settings aria-hidden="true" className="w-3.5 h-3.5" />
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* Mobile link — italic-serif body label, hairline divider below each item.
 * Reads as a vertical contents page, not a dropdown drawer of CTAs. */
function MobileLink({
  href,
  active,
  indent,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  indent?: boolean;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block py-3 font-serif"
      style={{
        fontSize: "1.125rem",
        color: active ? "var(--hm-ink)" : "var(--hm-ink-2)",
        fontStyle: "italic",
        paddingLeft: indent ? "0.75rem" : "0",
        borderLeft: indent
          ? `2px solid ${active ? "var(--hm-accent)" : "var(--hm-rule)"}`
          : "none",
        marginLeft: indent ? "0.25rem" : "0",
      }}
      {...(active ? { "aria-current": "page" as const } : {})}
    >
      {children}
    </Link>
  );
}

function MobileEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="pt-6 pb-2 font-mono uppercase"
      style={{
        fontSize: "10px",
        letterSpacing: "0.22em",
        color: "var(--hm-ink-3)",
      }}
    >
      {children}
    </p>
  );
}
