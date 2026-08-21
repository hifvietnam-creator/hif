-- 015_metric_definitions.sql
--
-- Two additions the Monthly Metrics spreadsheet forced.
--
-- 1. Its cells contain four different things: a number, "?", "-", and blank.
--    They are not interchangeable. Baptisms = 0 means a month with no baptisms;
--    Alpha = "-" means no course was running; Spotlight = "?" means nobody
--    collected it; blank means the row was never filled in. Storing all four as
--    a null number would erase the difference between "none happened" and "we
--    do not know", which is the distinction the whole report rests on.
--
-- 2. The sheet's first row names who is responsible for each metric — Marian,
--    Shilpa, Tomi, Yorino and so on. That ownership is the most useful thing in
--    the file and exists nowhere else.

-- ── How to read a value ──────────────────────────────────────────────────────

alter table ops.monthly_metrics
  add column if not exists value_status text not null default 'reported';

comment on column ops.monthly_metrics.value_status is
  'reported       — a real figure; value is set. '
  'zero           — it ran and nobody came; value is 0 and that is a finding. '
  'unknown        — "?" in the sheet: it happened, nobody recorded it. '
  'not_applicable — "-" in the sheet: it did not run this month. '
  'missing        — blank cell; nobody filled it in. '
  'Only `reported` and `zero` may be averaged or charted. The rest must be '
  'visible as gaps, because a chart that treats "unknown" as zero invents a '
  'decline that never happened.';

-- ── The metric catalogue ─────────────────────────────────────────────────────
-- One row per metric, stable across months. This is the specification of the
-- report: what is tracked, who owns it, and where the number is meant to come
-- from.

create table if not exists ops.metric_definitions (
  metric_key    text primary key,
  label         text not null,          -- exactly as written in the spreadsheet
  owner         text,                   -- the person named in the Oversight row
  ministry_id   bigint references ops.ministries(id) on delete set null,
  unit          text,                   -- people | count | average
  -- Where the figure comes from decides whether it can ever be automated:
  --   pco        — derivable from mirrored Planning Center data
  --   headcount  — somebody counts and writes it down; no system holds it
  --   form       — a registration or signup export
  source_kind   text,
  is_active     boolean not null default true,
  sort_order    integer,
  note          text,
  created_at    timestamptz not null default now()
);

comment on table ops.metric_definitions is
  'Taken from the Monthly Metrics spreadsheet, which is the existing report '
  'this dashboard replaces. Reproduce these before adding anything new — a '
  'dashboard that disagrees with the numbers leadership already trusts will '
  'be assumed wrong, and will be right to be doubted.';

comment on column ops.metric_definitions.source_kind is
  'Roughly half these metrics are headcounts with no underlying system. No '
  'amount of importing will produce them; they need someone to enter them.';
