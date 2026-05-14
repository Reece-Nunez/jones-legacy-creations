# Security & QC Hardening — May 2026

A multi-pass audit and remediation of the admin app: API auth, database RLS, file storage, transactional integrity, and a sweep of P1/P2 bugs surfaced along the way.

## TL;DR

The app went from "open API + open RLS + public file storage" to a properly gated system in **14 commits**. Anyone with the public anon key used to be able to read or mutate every table directly via the Supabase REST endpoint and fetch every W-9 / project document by URL without authentication. That's all closed.

## The headline findings

### 1. `/api/admin/*` was unauthenticated
50 admin API routes never called `supabase.auth.getUser()`. `middleware.ts` only guarded the page tree (`/admin/:path*`), not the API. **Anyone who opened DevTools could call any admin endpoint.**

**Fix** ([d4da39a](https://github.com/Reece-Nunez/jones-legacy-creations/commit/d4da39a)):
- New `lib/supabase/requireAdmin.ts` helper applied to all 52 admin routes
- `middleware.ts` matcher widened to `/api/admin/:path*` as defense-in-depth (returns 401 JSON, not a redirect, for API paths)

### 2. RLS policies were `using (true)`
Every public-schema table had an "Allow all on X" policy with no auth check. Many tables actually had **RLS disabled entirely**. Combined with the public anon key shipping to every browser, the entire database was readable/writable via `https://<project>.supabase.co/rest/v1/*`.

**Fix** ([2a370a8](https://github.com/Reece-Nunez/jones-legacy-creations/commit/2a370a8)):
- `public.is_admin()` SECURITY DEFINER helper
- RLS enabled on every public table
- All `using (true)` policies dropped; replaced with admin-only policies via `is_admin()`
- `user_profiles` gets bespoke self-management policies so new admins can auto-create their own row

### 3. Storage buckets were public
- `contractor-w9`: held W-9 forms (with EINs/SSNs) and insurance COIs
- `project-documents`: invoices, receipts, permits, photos, etc.

Both were `public = true` with broad SELECT policies. Anyone with a URL could fetch any document.

**Fix** ([0e50e40](https://github.com/Reece-Nunez/jones-legacy-creations/commit/0e50e40), [b994d47](https://github.com/Reece-Nunez/jones-legacy-creations/commit/b994d47)):
- Buckets flipped private; admin-only storage RLS
- Generic admin redirect endpoint `/api/admin/files/download?bucket=&path=` mints 60s signed URLs
- Client helper `fileDownloadUrl()` wraps stored URLs to point at the endpoint
- 16 UI sites in `ProjectDetail.tsx`, 2 in financials, 4 in ContractorDetail all wrap through the helper
- Server-side downloaders (W-9 extractors, QBO bill attachment, PDF bundler) use `storage.download(path)` or short-lived signed URLs
- Public gallery (`/api/gallery`) mints batched 6h signed URLs server-side
- `avatars` bucket intentionally kept public — benign profile pics

### 4. Independent exploitable bugs ([429989b](https://github.com/Reece-Nunez/jones-legacy-creations/commit/429989b))
- **PostgREST `.or()` injection** in 3 routes (contractors search, global search, document vendor lookup): user input was interpolated into filter strings that aren't parameterized. Fixed with `safeIlikeValue()` helper that strips `, ( ) " \`.
- **8-char upload-link tokens** (32 bits, brute-forceable) replaced with 32-byte base64url tokens.
- **Public submit-invoice** had no file-type/size check, sanitized no filenames, and could overwrite an existing W-9 via token. Now allowlists PDF/image, caps at 15 MB, sanitizes path separators, skips W-9 upload if one is on file.
- **Permits-extract SSRF**: server `fetch()`'d any caller-supplied URL. Constrained to the Supabase storage origin.
- **Document PATCH** dropped the `project_id` filter and accepted any body field. Now filtered + 7-field allowlist.

### 5. Quote calculate was not transactional ([c19ec7c](https://github.com/Reece-Nunez/jones-legacy-creations/commit/c19ec7c))
1+N+M+1 writes with no transaction. A failure midway left totals out of sync with items. Concurrent recalcs could interleave. Money math accumulated JS float error before `numeric(12,2)` rounded on write.

**Fix:** `public.recalc_quote_totals(uuid)` Postgres function. `SELECT … FOR UPDATE` locks the quote row; all writes happen atomically; `round(…, 2)` at every money boundary. Route is now a single `supabase.rpc()` call.

## P1 bugs cleaned up along the way

- **Dead Cmd-K results** ([429989b](https://github.com/Reece-Nunez/jones-legacy-creations/commit/429989b)): estimate search links pointed at a route that doesn't exist. Now routes through `/admin/estimates?id=<id>` with scroll + highlight.
- **Quote detail spinner flicker** ([429989b](https://github.com/Reece-Nunez/jones-legacy-creations/commit/429989b)): `SimpleQuoteDetail` set `loading=true` despite SSR data, so every page load flashed a spinner. Gate removed.
- **Silent error swallows** ([d97ab69](https://github.com/Reece-Nunez/jones-legacy-creations/commit/d97ab69)): 6 sites caught errors with `catch {}` and toasted generic messages. Each now surfaces the API's actual reason.
- **`key={index}` on editable rows** ([d97ab69](https://github.com/Reece-Nunez/jones-legacy-creations/commit/d97ab69)): React was reusing input DOM across rows after removal, leaking edits. Stable IDs in `SimpleQuoteEditor` and `AiReviewModal`.
- **ProjectDetail refetch loop** ([73d671f](https://github.com/Reece-Nunez/jones-legacy-creations/commit/73d671f)): `useEffect` depended on array prop identity (recreated every parent render). Switched to `.length` deps.
- **AdminShell badge polling** ([73d671f](https://github.com/Reece-Nunez/jones-legacy-creations/commit/73d671f)): refetched on every navigation on top of the 30s poll. Dropped to mount-only.
- **Mobile usability** ([73d671f](https://github.com/Reece-Nunez/jones-legacy-creations/commit/73d671f)): `QuotesList` and bulk-add contractors now have proper mobile card layouts instead of unworkable horizontal-scroll tables.
- **`/admin/detailedquotes` orphan** ([73d671f](https://github.com/Reece-Nunez/jones-legacy-creations/commit/73d671f)): advanced quote builder existed but wasn't linked anywhere. Now in sidebar quick links.

## P2 polish

- **Currency + date formatters consolidated** ([88cdb79](https://github.com/Reece-Nunez/jones-legacy-creations/commit/88cdb79)): 14 admin files dropped local `Intl.NumberFormat` / `toLocaleDateString` helpers; everyone uses `lib/formatters.ts`.
- **`confirmAction` extracted to `lib/`** ([eb17550](https://github.com/Reece-Nunez/jones-legacy-creations/commit/eb17550)): 4 near-identical copies replaced with one shared toast-based confirm.
- **`next/image` migration** ([a4c5417](https://github.com/Reece-Nunez/jones-legacy-creations/commit/a4c5417)): avatar sites + project photo grid use `next/image` (lazy load, modern formats). Raw `<img>` kept only where blob:/data:/auth-gated URLs require it.
- **1099 badge respects `w9_required`** ([77d7083](https://github.com/Reece-Nunez/jones-legacy-creations/commit/77d7083)): previously rendered on every non-vendor contractor.
- **Tap targets ≥44px** ([77d7083](https://github.com/Reece-Nunez/jones-legacy-creations/commit/77d7083)) on team-page icon buttons and quote-editor remove-row.
- **Postgres `search_path` pinned** ([77d7083](https://github.com/Reece-Nunez/jones-legacy-creations/commit/77d7083)) on 5 pre-existing functions (advisor warnings).
- **Views flipped to `SECURITY INVOKER`** ([9443108](https://github.com/Reece-Nunez/jones-legacy-creations/commit/9443108)): `v_project_financials` and `v_draw_amount_integrity` no longer bypass RLS. Cleared both Supabase advisor ERRORs.
- **QBO webhook idempotency** ([7d0b0f9](https://github.com/Reece-Nunez/jones-legacy-creations/commit/7d0b0f9)): unique index on `(realm, type, id, op, lastUpdated)` + ON CONFLICT DO NOTHING — QBO retries no longer reprocess.

## Database migrations applied to prod

All migrations are in [`supabase/migrations/`](../supabase/migrations/) and were applied to project `rvyummgsvggjqtjbtqfw`:

| File | What it does |
|---|---|
| `20260514_tighten_rls.sql` | `is_admin()` helper + RLS on every public table |
| `20260514_recalc_quote_totals.sql` | Transactional quote recalculation function |
| `20260514_private_w9_bucket.sql` | `contractor-w9` bucket private + admin-only policy |
| `20260514_views_security_invoker.sql` | Flip 2 views to SECURITY INVOKER |
| `20260514_private_project_documents.sql` | `project-documents` bucket private + admin-only policies |
| `20260514_function_search_path.sql` | Pin `search_path` on 5 pre-existing functions |
| `20260514_qbo_webhook_idempotency.sql` | Unique index on `qbo_webhook_events` |

## How to smoke test

1. Sign in to `/admin` as yourself → dashboards, project list, contractor list all load
2. Open a project → progress meter, tasks, documents, photos all render
3. Click any invoice, receipt, document link → file opens (via signed-URL redirect)
4. Open a contractor with a W-9 → click W-9 link → file opens
5. Open a quote → recalculate prices → totals match items
6. From an **incognito window** (signed out):
   - `GET /api/admin/projects` → `401 {"error":"Not authenticated"}`
   - Paste an old direct W-9 or project-document URL → 400/403 (no longer public)
   - Public `/gallery` page → photos still render (signed URLs)
7. Public estimate form → still saves
8. Public `/submit-invoice/<token>` → still accepts uploads

## What was intentionally left alone

- **`avatars` storage bucket** stays public — profile pics, benign, would add unnecessary signed-URL overhead.
- **`is_admin()` callable via `/rest/v1/rpc/is_admin`** — Supabase advisor warns, but the function returns `false` to non-admins. No info leak.
- **`auth_leaked_password_protection`** — a Supabase dashboard toggle, not a code change. Recommended to enable.
- **A handful of raw `<img>` tags** for `blob:` / `data:` URL previews (FileReader crop, MFA QR, etc.) where `next/image` adds no value.

## Commits, in order

```
d4da39a Lock down /api/admin/* with requireAdmin helper + middleware gate
2a370a8 Tighten RLS: enable on every public table, admin-only via is_admin()
429989b Close S3-S6 punch-list items: injection, SSRF, weak tokens, broken UX
d97ab69 P1 batch A: surface error reasons, stable keys on editable rows
73d671f P1 batch B: refetch loops, pagination caps, mobile cards, quote math
c19ec7c Make quote recalc atomic via Postgres function
0e50e40 Make contractor-w9 storage bucket private; route reads via signed URLs
9443108 Flip v_project_financials + v_draw_amount_integrity to SECURITY INVOKER
b994d47 Make project-documents bucket private; route all reads via signed URLs
77d7083 Small correctness fixes: 1099 badge, tap targets, function search_path
88cdb79 Consolidate currency + date formatting onto lib/formatters
eb17550 Extract confirmAction to lib/ (drop 4 duplicates)
a4c5417 Migrate stable-URL avatars + photo grid to next/image
7d0b0f9 QBO webhook: enforce idempotency via DB unique index
```
