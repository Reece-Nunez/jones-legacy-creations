-- ── Standard trade rates ──────────────────────────────────────────────────────
-- Blake knows roughly what each sub charges per square foot. Storing those
-- rates lets a new quote start from real numbers — rate x the home's square
-- footage — instead of a blank cost breakdown he fills in from memory.
--
-- One row per trade. The contractor is recorded so he knows whose number a
-- rate came from, but it does not key the rate: a trade has one standard rate,
-- and picking a different sub is a per-quote override, not a second rate here.
--
-- Trades with no sensible per-sqft rate (permitting, land) simply have no row.
-- Those line items stay blank for manual entry, which is the existing
-- behaviour and needs no special case.

create table if not exists public.standard_trade_rates (
  id uuid primary key default gen_random_uuid(),
  trade_name text not null,
  rate_per_sqft numeric(10, 4) not null check (rate_per_sqft >= 0),

  -- Whose rate this is. contractor_id when they're in the system;
  -- contractor_note carries a name for subs who aren't.
  contractor_id uuid references public.contractors(id) on delete set null,
  contractor_note text,

  notes text,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One rate per trade, case-insensitively: "Plumbing" and "plumbing" are the
-- same line on a cost breakdown.
create unique index if not exists standard_trade_rates_trade_idx
  on public.standard_trade_rates (lower(trade_name));

-- ── RLS: staff-only ───────────────────────────────────────────────────────────
alter table public.standard_trade_rates enable row level security;
drop policy if exists admin_only on public.standard_trade_rates;
create policy admin_only on public.standard_trade_rates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
