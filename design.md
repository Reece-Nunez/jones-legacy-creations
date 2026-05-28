# Design — Jones Legacy Creations

A locked design system for the joneslegacycreations.com site. Every page
redesign reads this file before emitting code. Do not regenerate per
page — extend or amend this file when the system needs to grow.

> System name: **House** · Genre: **editorial** · Anchor hue: **none (monochrome)**
> Established 2026-05-21 as Linen (warm cream + terracotta), then
> pivoted on 2026-05-22 to House — black/white grayscale matching the
> JLC logo's classic-print vibe. Hallmark anti-slop discipline
> (macrostructures, editorial typography, real photos, honest copy)
> is preserved; only the colour palette and display weight changed.

## Genre

**editorial** — applies across every public route. The brand is a
multi-service company (real estate, custom-home construction, interior
design + staging) serving Southern Utah. The voice that fits is
local-paper editorial: confident, plainspoken, slightly literary,
allergic to corporate-SaaS tropes.

## Macrostructure family

Pages live in three families. Pages within a family share the family's
shape; they vary only in component archetypes within the system.

- **Marketing pages**: pick per brief from **Marquee Hero · Long Document ·
  Photographic · Stat-Led**. The real-estate page is currently Marquee
  Hero — future redesigns of `/services/construction`,
  `/services/interior-design`, `/about`, `/`, `/gallery` rotate through
  these four. No two adjacent marketing pages share the same one.
- **Content pages**: **Long Document** for `/privacy`, `/terms`, and any
  future essay/copy pages. Single column, generous measure, no marketing
  apparatus.
- **Form pages**: hairline-divided stacked sections for `/contact` and
  `/estimate`. Match the pattern landed on `/services/real-estate`'s
  contact section — paper-fill section blocks with hairline borders,
  italic-serif section heads, mono-caps eyebrows.
- **Blog pages**: index uses a hero-then-cards rhythm (one full-width
  hero card, three-column grid below — closest to Photographic but
  smaller imagery). Detail uses Long Document — single column,
  generous measure (62 ch), no tag-left/header-right. A single
  post-end newsletter capture is allowed (it is the only marketing
  apparatus permitted in this family — the entire purpose of the
  blog is top-of-funnel conversion). Cover images, when present,
  use a 16:9 ratio on detail and 4:3 on cards.

## Theme — House (custom, monochrome)

White paper, black ink, no chromatic accent. Pure grayscale. Matches
the JLC logo (script wordmark + minimal serif tagline on a white
field). The tokens are declared as `--hm-*` custom properties in
[`app/globals.css`](app/globals.css). Pages must reference tokens by
name — no inline hex / oklch / rgb values, no `font-family` declarations
outside the token block.

- `--hm-paper`       `oklch(100% 0 0)` — pure white
- `--hm-paper-2`     `oklch(97% 0 0)`  — light gray
- `--hm-paper-3`     `oklch(93% 0 0)`  — slightly darker gray
- `--hm-ink`         `oklch(14% 0 0)`  — near black
- `--hm-ink-2`       `oklch(38% 0 0)`  — body gray
- `--hm-ink-3`       `oklch(58% 0 0)`  — muted gray
- `--hm-rule`        `oklch(88% 0 0)`  — hairline
- `--hm-rule-thick`  `oklch(14% 0 0)`  — thick rule (= ink)
- `--hm-accent`      `oklch(32% 0 0)`  — charcoal half-step from ink, used
   only for hover/active state shifts. Reads as "slightly lighter
   black", not a colour.
- `--hm-accent-ink`  `oklch(100% 0 0)` — paper on accent surfaces
- `--hm-focus`       `oklch(20% 0 0)`  — dark gray for focus rings

## Typography

Brand fonts come from Jess — they match the physical signage she makes
for JLC. Both are geometric sans.

- **Display**: League Spartan, weights 400/500/700/800. Loaded via
  `next/font` as `--font-display`. Used for all H1/H2/H3 and
  ornamental tabular-nums (prices, phone numbers). Tracking:
  −0.015 em on big headings; League Spartan also works very well
  uppercase with positive tracking for mono-caps eyebrows. The
  Tailwind `font-serif` class is remapped to this variable in
  `globals.css` (the class name is legacy; the font is sans).
- **Body**: Montserrat, weights 400/500/600/700. Loaded as
  `--font-sans`. Used for everything not display — paragraphs, form
  labels, link text, button text.
- **Mono / eyebrow**: legacy `font-mono` falls back to the system
  monospace stack since the project no longer loads Geist Mono.
  Mono-caps eyebrows can use League Spartan with `letter-spacing:
  0.18em` instead — same uppercase aesthetic, one fewer font in the
  page weight budget.
- **Hero headline** (Marquee Hero family): `--hm-text-display`
  `clamp(3.5rem, 9vw, 8.5rem)`, line-height 0.95. Display weight 700–800.
- **Article H1 / post titles** (Blog detail): `--hm-text-display-s`
  `clamp(2.25rem, 6vw, 4.5rem)`, line-height 1.02. Smaller than the
  marquee hero so an article doesn't shout louder than the homepage.
- **H2 (section heads)**: `--hm-text-h2` `clamp(1.75rem, 3.2vw, 2.75rem)`.
- **H3**: `--hm-text-h3` `clamp(1.25rem, 2vw, 1.5rem)`.
- **Lede**: `--hm-text-lede` `clamp(1.125rem, 1.4vw, 1.375rem)`.
- **Body**: `--hm-text-body` 1.0625rem.
- **Meta / mono caps**: `--hm-text-meta` 0.8125rem.
- **Measure**: 55–62ch for prose. Never wider.

## Spacing

4-point named scale, declared as `--hm-space-*` in `app/globals.css`.
Always reference by name; never raw values.

- `--hm-space-3xs` 0.25rem, `-2xs` 0.5rem, `-xs` 0.75rem
- `--hm-space-sm` 1rem, `-md` 1.5rem, `-lg` 2rem
- `--hm-space-xl` 3rem, `-2xl` 4.5rem, `-3xl` 7rem

## Motion

- Easings: `--hm-ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`,
  `--hm-ease-in-out` `cubic-bezier(0.65, 0, 0.35, 1)`.
- Durations: `--hm-dur-short` 220ms, `--hm-dur-medium` 400ms.
- **Reveal pattern**: ONE orchestrated fade-in on first paint per page
  (the hero element). Below the fold, content is just there — no
  `whileInView`, no scroll-triggered staggers.
- Reduced-motion fallback handled globally in `app/globals.css`.

## Microinteractions

- **Silent success** on form submits — toast on failure only.
- **Hover tooltips delay 800ms**, focus tooltips delay 0ms.
- **Optimistic updates + Undo** over confirmation dialogs.
- **Focus rings instant**, never animated. `:focus-visible` global rule
  in `globals.css` already handles this (2px outline, 2px offset).
- **`transition-all` is banned** — name the properties.
- **No bounce / overshoot easings** on UI state.

## CTA voice

- **Primary CTA**: black ink fill, white text, mono-caps tracking
  0.15 em, 44 px min-height, padding `0.75rem 1rem`. On hover, fill
  shifts to `--hm-accent` (charcoal half-step) — a subtle darkening
  rather than a colour pop. Square corners — no border-radius.
- **Secondary CTA / chip**: outline only, 1 px `--hm-rule-thick`
  border, same dimensions and typography. Active state fills with ink.
- **Tertiary link**: hairline-underlined sans link in `--hm-ink-2`;
  underline shifts to `--hm-accent` (charcoal) on hover.
- **Avoid pills.** No `rounded-full` on buttons. Square chips read
  editorial; pills read SaaS.

## Component archetypes — locked

- **Nav archetype**: **N7 Newspaper masthead** — wordmark left, mono-caps
  service link row right, hairline bottom rule. No scroll-shrink. No
  dark backdrop. No dropdowns; three services flat in the link row.
  Component: [`components/Navigation.tsx`](components/Navigation.tsx).
- **Footer archetype**: **Ft4 Dense colophon** — wordmark + tagline at the
  top, three short columns underneath (services · company · contact),
  hairline bottom rule with copyright + legal links + brokerage
  disclosure. No social-icon grid; social as inline mono-caps links in
  the contact column. Component: [`components/Footer.tsx`](components/Footer.tsx).

## What pages MUST share

- The JLC wordmark / logotype
- The monochrome palette — no chromatic accents anywhere
- The display + body fonts (Playfair bold + Geist)
- The CTA voice (square chips, mono-caps tracking, ink fill default,
  charcoal half-step on hover — no colour pop)
- Section heading rhythm (bold Playfair H2, optional mono-caps eyebrow
  vertically stacked above — never tag-left/header-right two-column
  hangers, which are banned)
- The 4-pt spacing scale
- The single-fade-in motion stance

## What pages MAY differ on

- Macrostructure within their page-type family (a marketing page can be
  Marquee Hero on `/services/real-estate` and Long Document on
  `/about` — both still use Linen tokens, type, and CTA voice).
- Hero archetype (within the family's allowance).
- Enrichment — only on marketing pages, Tier-A (CSS art) or Tier-B
  (hand-built SVG) max. No Lottie. No fake browser/phone chrome.

## Per-page allowances

- **Marketing pages** MAY use enrichment (Tier-A or Tier-B) and a hero
  polish pattern (HP1–HP4).
- **App / admin pages** are out of scope for this design system — they
  use their own admin UI (shadcn-default).
- **Content pages** stay typography-only.

## Site-wide compliance gates

- Reference Linen / House tokens (`--hm-paper*` / `--hm-ink*` /
  `--hm-paper-3`) rather than Tailwind `bg-white` / `bg-black`. The
  tokens are now grayscale, so the visual result is the same as the
  literal Tailwind classes — but the token-by-name discipline means
  future theme tweaks (lifted accent, darker ink) propagate from a
  single place.
- No `text-center` on every section. Bias left, or vary section by
  section.
- No `whileInView` cascades — single fade-in on first paint per page.
- No icon-tile feature card triplets. Cut the cards or restructure as
  prose.
- No three-column equal-width "feature grid". Asymmetry or single column.
- No fake browser bars, phone frames, code-block windows, or IDE chrome.
- No invented metrics, testimonials, or logos. Real numbers or labelled
  `—` placeholder ("metric to confirm"). Real names only.
- Mobile: every emit verified at 320 / 375 / 414 / 768 px. Buttons /
  links never wrap to two lines (`white-space: nowrap` on CTAs).

## Stamp format

Every page CSS must carry the stamp at its top:

```
/* Hallmark · genre: editorial · macrostructure: <name>
 * design-system: design.md · designed-as-app
 */
```

The `designed-as-app` flag tells future Hallmark runs to read this file
rather than invent a new system. The `genre: editorial` is locked.

## Diversification rule — INVERTED

Across pages of this site, pages MUST share theme, accent, typography,
and CTA voice. They MAY differ on macrostructure within the family. The
catalog-rotation diversification gates from Hallmark's standard slop
test are skipped for `designed-as-app` outputs — consistency wins, not
variety.

Pages that drift from this file are slop. The audit verb flags
`design.md` drift as a critical structural finding.
