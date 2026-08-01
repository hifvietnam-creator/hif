-- 006_hif_linking.sql
--
-- HIF-derived tables: sync bookkeeping and the PCO ↔ MailerLite bridge.
--
-- No journey stages, no metric definitions, no business rules. Those are a
-- later decision and belong in their own migration once leadership has agreed
-- what the words mean.

-- ── Sync state ───────────────────────────────────────────────────────────────
-- One row per synced resource. Holds the incremental watermark so a nightly
-- job fetches only what changed, and records the outcome of the last run so
-- failures are visible rather than silent.

create table if not exists hif.sync_state (
  resource         text primary key,   -- e.g. 'pco.people', 'ml.subscribers'
  last_watermark   timestamptz,        -- max updated_at seen; feeds where[updated_at][gt]
  last_run_at      timestamptz,
  last_run_status  text,               -- ok | error | running
  last_error       text,
  records_seen     integer,
  duration_ms      integer,
  updated_at       timestamptz not null default now()
);

-- ── The PCO ↔ MailerLite bridge ──────────────────────────────────────────────
--
-- Email is the ONLY shared identifier between the two systems, and it is not a
-- reliable person key: ~744 PCO addresses are shared between multiple people
-- (couples and families on one inbox).
--
-- So this is deliberately many-to-many. One MailerLite subscriber may resolve
-- to several PCO people. When it does, `is_ambiguous` is true and the row must
-- NOT be treated as identifying an individual — a shared inbox tells you the
-- household is reachable, not which person read the email.

create table if not exists hif.email_links (
  mailerlite_subscriber_id  text   not null references ml.subscribers(id) on delete cascade,
  pco_person_id             bigint not null references pco.people(id)     on delete cascade,
  email                     citext not null,

  match_type                text   not null default 'exact',  -- exact | manual
  is_ambiguous              boolean not null default false,
  people_sharing_address    integer not null default 1,
  confidence                numeric not null default 1.0,

  reviewed_by               text,
  reviewed_at               timestamptz,
  created_at                timestamptz not null default now(),

  primary key (mailerlite_subscriber_id, pco_person_id)
);

create index if not exists email_links_person_idx     on hif.email_links (pco_person_id);
create index if not exists email_links_subscriber_idx on hif.email_links (mailerlite_subscriber_id);
create index if not exists email_links_ambiguous_idx  on hif.email_links (is_ambiguous)
  where is_ambiguous;

comment on table hif.email_links is
  'Many-to-many by design. Exact email matching only — no fuzzy name matching. '
  'A false link silently corrupts every downstream number, whereas a missing '
  'link is merely a gap. Prefer gaps.';

-- ── Unmatched populations ────────────────────────────────────────────────────
-- These are findings, not errors, and worth persisting so they can be tracked
-- over time rather than recomputed and forgotten.

create table if not exists hif.unmatched_subscribers (
  mailerlite_subscriber_id  text primary key references ml.subscribers(id) on delete cascade,
  email                     citext not null,
  status                    text,
  clicks_count              integer,
  first_seen_at             timestamptz not null default now(),
  resolved_at               timestamptz,
  note                      text
);

comment on table hif.unmatched_subscribers is
  'MailerLite subscribers with no PCO person. Those with clicks are engaged '
  'people who have no church record at all.';

-- ── Notes on MailerLite groups ───────────────────────────────────────────────
-- Several groups are Mailchimp migration leftovers or dated snapshots rather
-- than live segments. This lets a human mark which is which, once, instead of
-- everyone rediscovering it.

create table if not exists hif.ml_group_notes (
  group_id    text primary key references ml.groups(id) on delete cascade,
  category    text,      -- segment | snapshot | legacy | personal | unknown
  is_reliable boolean not null default false,
  note        text,
  updated_by  text,
  updated_at  timestamptz not null default now()
);
