-- Track when the AI estimate call fails so Blake can spot the rows
-- that quietly fell back to the static $/sqft multiplier.
alter table public.estimates
  add column if not exists ai_error text;

comment on column public.estimates.ai_error is
  'When the AI estimate call fails, the error message is recorded here. Null = AI ran successfully (or was disabled).';
