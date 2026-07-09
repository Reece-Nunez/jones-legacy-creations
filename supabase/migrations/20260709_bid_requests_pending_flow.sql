-- Bid Requests → two-sided "pending" flow.
--
-- Revised per Blake: the contractor SUBMITS a bid (optional amount + note) which
-- lands as `submitted` (pending), then Blake accepts or declines it later. On
-- accept the contractor is notified "we'll contact you for scheduling"; on
-- complete they're reminded to send an invoice (payment runs through the draw /
-- lender flow, so there is no `paid` status here).
--
-- New status set:
--   draft → sent → viewed → submitted → accepted → completed
--   contractor may `passed` (declined the request) from sent/viewed
--   Blake may `rejected` a submitted bid, or `void` any non-terminal request

alter table public.bid_requests drop constraint if exists bid_requests_status_check;
alter table public.bid_requests add constraint bid_requests_status_check
  check (status in (
    'draft', 'sent', 'viewed', 'submitted', 'passed',
    'accepted', 'rejected', 'completed', 'void'
  ));

-- Contractor's submitted bid (both optional — they may just say "I'm in").
alter table public.bid_requests add column if not exists bid_amount numeric(12,2);
alter table public.bid_requests add column if not exists bid_note text;

-- Blake's decision + completion timestamps.
alter table public.bid_requests add column if not exists accepted_at timestamptz;
alter table public.bid_requests add column if not exists rejected_at timestamptz;
alter table public.bid_requests add column if not exists invoice_requested_at timestamptz;

-- Payment is handled by the draw/lender flow, not here.
alter table public.bid_requests drop column if exists paid_at;
