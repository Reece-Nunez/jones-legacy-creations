# Design — Jones Legacy Creations

A locked design system for the joneslegacycreations.com site. Every page
redesign reads this file before emitting code. Do not regenerate per
page — extend or amend this file when the system needs to grow.

> System name: **Linen** · Genre: **editorial** · Anchor hue: **terracotta**
> Established 2026-05-21 via the real-estate page redesign; locked into
> a portable system after the user committed to a full-site Hallmark
> sweep.

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

## Theme — Linen

Warm off-white paper, terracotta accent, italic-serif display. The
tokens are declared as `--hm-*` custom properties in
[`app/globals.css`](app/globals.css). Pages must reference tokens by
name — no inline hex / oklch / rgb values, no `font-family` declarations
outside the token block.

- `--hm-paper`       `oklch(98.5% 0.006 70)` — warm off-white
- `--hm-paper-2`     `oklch(96.5% 0.012 75)` — cream
- `--hm-paper-3`     `oklch(93% 0.014 60)`   — tan tint
- `--hm-ink`         `oklch(20% 0.012 50)`   — warm near-black
- `--hm-ink-2`       `oklch(42% 0.010 55)`   — warm body gray
- `--hm-ink-3`       `oklch(62% 0.008 60)`   — muted gray
- `--hm-rule`        `oklch(85% 0.008 60)`   — hairline
- `--hm-rule-thick`  `oklch(20% 0.012 50)`   — thick rule (= ink)
- `--hm-accent`      `oklch(55% 0.155 35)`   — terracotta clay
- `--hm-accent-ink`  `oklch(99% 0.005 70)`   — off-white on accent
- `--hm-focus`       `oklch(48% 0.18 30)`    — darker accent for rings

## Typography

- **Display**: Playfair Display, weight 400, **style italic**. Loaded via
  `next/font` as `--font-playfair`. Used for all H1/H2/H3, the masthead
  wordmark, and ornamental tabular-nums (prices, phone numbers).
  Tracking: −0.015em on headings.
- **Body**: Geist, weight 400 (and 500 for emphasis). Loaded via
  `next/font` as `--font-sans`.
- **Mono / eyebrow**: Geist Mono via `--font-sans` fallback to system
  mono. Used for uppercase eyebrows, dateline meta, "View on MLS" CTAs,
  status flags, and any tabular meta. Tracking: 0.18em.
- **Hero headline** (Marquee Hero family): `--hm-text-display`
  `clamp(3.5rem, 9vw, 8.5rem)`, italic Playfair, line-height 0.95.
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

- **Primary CTA**: dark ink fill, `--hm-paper` text, mono-caps tracking
  0.15em, 44px min-height, padding `0.75rem 1rem`. On hover, fill shifts
  to `--hm-accent` (terracotta). Square corners — no border-radius.
- **Secondary CTA / chip**: outline only, 1px `--hm-rule-thick` border,
  same dimensions and typography. Active state fills with ink.
- **Tertiary link**: hairline-underlined sans link in `--hm-ink-2`;
  underline shifts to `--hm-accent` on hover.
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
- The accent colour (terracotta) and its placement (≤ 5 % per viewport)
- The display + body fonts (Playfair italic + Geist)
- The CTA voice (square chips, mono-caps tracking, ink fill default,
  terracotta on hover)
- Section heading rhythm (italic Playfair H2, optional mono-caps eyebrow
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

- No `bg-white` / `bg-black` / pure-grey utility classes on public
  marketing surfaces — always reference `--hm-paper*` / `--hm-ink*` /
  `--hm-paper-3`.
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
