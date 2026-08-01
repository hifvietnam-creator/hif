-- 005_mailerlite.sql
--
-- Raw mirror of MailerLite. Read-only analytics source.
--
-- Nothing in this schema may ever drive a congregation count. MailerLite
-- status is a COMMUNICATIONS attribute: it tells you whether someone can be
-- reached, never whether they belong. Membership comes from PCO alone.

create table if not exists ml.subscribers (
  id               text primary key,      -- MailerLite subscriber ID (numeric string)
  email            citext not null unique,-- unique here: one subscriber per address
  status           text not null,         -- active|unsubscribed|unconfirmed|bounced|junk
  source           text,

  -- Lifetime totals as reported by MailerLite, not windowed.
  -- 205 campaigns since 2023-06-11; up to 163 sends to one person.
  -- Opens are inflated by Apple Mail Privacy Protection image pre-fetching.
  -- Treat clicks as the trustworthy engagement signal.
  sent             integer,
  opens_count      integer,
  clicks_count     integer,
  open_rate        numeric,
  click_rate       numeric,

  name             text,                  -- fields.name
  last_name        text,                  -- fields.last_name
  phone            text,                  -- fields.phone
  country          text,
  city             text,

  subscribed_at    timestamptz,
  unsubscribed_at  timestamptz,
  ml_created_at    timestamptz,
  ml_updated_at    timestamptz,
  synced_at        timestamptz not null default now()
);

create index if not exists ml_subscribers_status_idx on ml.subscribers (status);
create index if not exists ml_subscribers_email_idx  on ml.subscribers (email);

comment on column ml.subscribers.status is
  'Five distinct meanings, routinely conflated: '
  'active = reachable; '
  'unsubscribed = a deliberate choice, respect it; '
  'unconfirmed = incomplete opt-in (currently 0 in this account); '
  'bounced = dead address, a DATA BUG and fixable; '
  'junk = spam complaint. '
  'Never collapse these into a single "not subscribed" flag.';

-- ── Groups ───────────────────────────────────────────────────────────────────
-- Note: many MailerLite groups in this account are point-in-time snapshots or
-- Mailchimp migration leftovers rather than maintained segments. Do not assume
-- a group is a meaningful cohort without checking. Flagging is manual — see
-- hif.ml_group_notes below.

create table if not exists ml.groups (
  id                  text primary key,
  name                text not null,
  active_count        integer,
  sent_count          integer,
  opens_count         integer,
  open_rate           numeric,
  clicks_count        integer,
  click_rate          numeric,
  unsubscribed_count  integer,
  unconfirmed_count   integer,
  bounced_count       integer,
  junk_count          integer,
  ml_created_at       timestamptz,
  synced_at           timestamptz not null default now()
);

create table if not exists ml.group_subscribers (
  group_id       text not null references ml.groups(id) on delete cascade,
  subscriber_id  text not null references ml.subscribers(id) on delete cascade,
  synced_at      timestamptz not null default now(),
  primary key (group_id, subscriber_id)
);

create index if not exists ml_group_subs_subscriber_idx on ml.group_subscribers (subscriber_id);

-- ── Campaigns ────────────────────────────────────────────────────────────────

create table if not exists ml.campaigns (
  id             text primary key,
  name           text,
  type           text,
  status         text,
  subject        text,
  scheduled_for  timestamptz,
  finished_at    timestamptz,
  recipients     integer,
  opens_count    integer,
  clicks_count   integer,
  open_rate      numeric,
  click_rate     numeric,
  unsubscribes   integer,
  spam_count     integer,
  -- The campaign payload is deeply nested and only partly mapped above.
  -- Keep the original so we can mine it later without a re-sync.
  raw            jsonb,
  synced_at      timestamptz not null default now()
);

create index if not exists ml_campaigns_finished_idx on ml.campaigns (finished_at);
