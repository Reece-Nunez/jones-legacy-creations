-- ── recalc_quote_totals: transactional quote recalculation ───────────────────
-- Before this migration, /api/admin/quotes/[id]/calculate did:
--   1. Update each quote_item.total (N writes)
--   2. Update each quote_section.subtotal (M writes)
--   3. Update the quotes row (1 write)
-- These were not wrapped in a transaction, so a failure midway through left
-- the totals on the quote out of sync with its items. This function does it
-- all in one statement-by-statement transaction (functions are atomic) and
-- locks the quote row so two concurrent recalcs can't interleave.

create or replace function public.recalc_quote_totals(quote_id_in uuid)
returns public.quotes
language plpgsql
security invoker
set search_path = public
as $$
declare
  q public.quotes%rowtype;
  sub          numeric(14,2);
  t_materials  numeric(14,2);
  t_labor      numeric(14,2);
  t_sub        numeric(14,2);
  t_equip      numeric(14,2);
  v_overhead   numeric(14,2);
  v_profit     numeric(14,2);
  v_contingency numeric(14,2);
  v_tax        numeric(14,2);
  v_grand      numeric(14,2);
begin
  -- Lock the quote so concurrent recalcs serialize.
  select * into q from public.quotes where id = quote_id_in for update;
  if not found then
    raise exception 'Quote not found: %', quote_id_in using errcode = 'P0002';
  end if;

  -- 1. Per-item totals
  update public.quote_items qi
  set total = round(
    (
      coalesce(qi.material_cost, 0) +
      coalesce(qi.labor_cost, 0) +
      coalesce(qi.equipment_cost, 0) +
      coalesce(qi.subcontractor_cost, 0)
    ) * coalesce(qi.quantity, 0) * (1 + coalesce(qi.markup_pct, 0) / 100)
    + coalesce(qi.tax, 0),
    2
  )
  where qi.quote_id = quote_id_in;

  -- 2. Per-section subtotals (sum of item totals in that section)
  update public.quote_sections qs
  set subtotal = coalesce((
    select round(sum(qi.total), 2)
    from public.quote_items qi
    where qi.section_id = qs.id
  ), 0)
  where qs.quote_id = quote_id_in;

  -- 3. Quote-level aggregates
  select
    round(coalesce(sum(total), 0), 2),
    round(coalesce(sum(material_cost * quantity), 0), 2),
    round(coalesce(sum(labor_cost * quantity), 0), 2),
    round(coalesce(sum(subcontractor_cost * quantity), 0), 2),
    round(coalesce(sum(equipment_cost * quantity), 0), 2)
  into sub, t_materials, t_labor, t_sub, t_equip
  from public.quote_items
  where quote_id = quote_id_in;

  v_overhead    := round(sub * coalesce(q.overhead_pct, 0) / 100, 2);
  v_profit      := round((sub + v_overhead) * coalesce(q.profit_pct, 0) / 100, 2);
  v_contingency := round(sub * coalesce(q.contingency_pct, 0) / 100, 2);
  v_tax         := round(sub * coalesce(q.sales_tax_pct, 0) / 100, 2);
  v_grand       := round(sub + v_overhead + v_profit + v_contingency + v_tax, 2);

  update public.quotes
  set
    subtotal            = sub,
    total_materials     = t_materials,
    total_labor         = t_labor,
    total_subcontractor = t_sub,
    total_equipment     = t_equip,
    overhead_amount     = v_overhead,
    profit_amount       = v_profit,
    contingency_amount  = v_contingency,
    tax_amount          = v_tax,
    grand_total         = v_grand,
    updated_at          = now()
  where id = quote_id_in
  returning * into q;

  return q;
end;
$$;

revoke all on function public.recalc_quote_totals(uuid) from public;
grant execute on function public.recalc_quote_totals(uuid) to authenticated;
