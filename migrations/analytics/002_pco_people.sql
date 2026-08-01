-- 002_pco_people.sql
--
-- Core Planning Center People tables.
-- PCO person IDs are the canonical key throughout. No surrogate keys.

-- ── Campuses ─────────────────────────────────────────────────────────────────

create table if not exists pco.campuses (
  id              bigint primary key,
  name            text,
  description     text,
  city            text,
  country         text,
  time_zone       text,
  pco_created_at  timestamptz,
  pco_updated_at  timestamptz,
  synced_at       timestamptz not null default now()
);

-- ── People ───────────────────────────────────────────────────────────────────

create table if not exists pco.people (
  id                bigint primary key,
  first_name        text,
  last_name         text,
  name              text,
  nickname          text,
  status            text,          -- active | inactive
  membership        text,          -- Visitor, Member, Alumni, In Progress, ...
  child             boolean,
  birthdate         date,
  anniversary       date,
  gender            text,
  grade             text,
  school_type       text,
  primary_campus_id bigint references pco.campuses(id),
  remote_id         text,          -- legacy ID from a prior system, if any
  inactivated_at    timestamptz,
  pco_created_at    timestamptz,
  pco_updated_at    timestamptz,
  synced_at         timestamptz not null default now()
);

-- Deliberately NOT mirrored: medical_notes, avatar, permissions, background
-- check status. Sensitive and irrelevant to attendance/engagement analysis.
-- Do not add them without a specific, stated reason.

create index if not exists people_membership_idx on pco.people (membership);
create index if not exists people_status_idx     on pco.people (status);
create index if not exists people_campus_idx     on pco.people (primary_campus_id);
create index if not exists people_updated_idx    on pco.people (pco_updated_at);

comment on column pco.people.membership is
  'Free-text PCO field. Observed values include Visitor, In Progress, Alumni, '
  'New Resident, Participant, Member, KQ Kid, Aftershock, Local, '
  'Regular Attender, Facility, Member Kid, Spotlight, Exploring Church, '
  'Applied Membership, Friend, Returnee. Mapping these to journey stages is a '
  'separate, later decision — do not hard-code assumptions here.';

-- ── Emails ───────────────────────────────────────────────────────────────────

create table if not exists pco.emails (
  id              bigint primary key,
  person_id       bigint not null references pco.people(id) on delete cascade,
  address         citext not null,
  location        text,            -- Home | Work | Other
  is_primary      boolean,
  blocked         boolean,
  pco_created_at  timestamptz,
  pco_updated_at  timestamptz,
  synced_at       timestamptz not null default now()
);

-- IMPORTANT: address is NOT unique, and must not be.
-- Observed in live data: 6,758 email records across only 6,014 distinct
-- addresses — roughly 744 addresses are shared, typically by couples and
-- families using one inbox. Any code that treats email as a unique person
-- identifier will silently merge people. See hif.email_links.
create index if not exists emails_address_idx on pco.emails (address);
create index if not exists emails_person_idx  on pco.emails (person_id);

-- ── Phone numbers ────────────────────────────────────────────────────────────

create table if not exists pco.phone_numbers (
  id              bigint primary key,
  person_id       bigint not null references pco.people(id) on delete cascade,
  number          text,
  e164            text,
  location        text,
  is_primary      boolean,
  pco_created_at  timestamptz,
  pco_updated_at  timestamptz,
  synced_at       timestamptz not null default now()
);

create index if not exists phones_person_idx on pco.phone_numbers (person_id);
create index if not exists phones_e164_idx   on pco.phone_numbers (e164);

-- ── Custom fields ────────────────────────────────────────────────────────────
-- Where baptism dates and similar church-specific data live.

create table if not exists pco.field_definitions (
  id          bigint primary key,
  name        text,
  slug        text,
  data_type   text,
  tab_id      bigint,
  sequence    integer,
  deleted_at  timestamptz,
  synced_at   timestamptz not null default now()
);

create table if not exists pco.field_data (
  id                   bigint primary key,
  person_id            bigint references pco.people(id) on delete cascade,
  field_definition_id  bigint references pco.field_definitions(id),
  value                text,
  file_url             text,
  pco_created_at       timestamptz,
  pco_updated_at       timestamptz,
  synced_at            timestamptz not null default now()
);

create index if not exists field_data_person_idx on pco.field_data (person_id);
create index if not exists field_data_defn_idx   on pco.field_data (field_definition_id);

-- ── Person merges ────────────────────────────────────────────────────────────
-- When PCO merges duplicate people, one ID disappears and its data moves to
-- the survivor. Without this, foreign keys point at a dead row. Populated by
-- a reconciliation job, not by the main sync.

create table if not exists pco.person_merges (
  old_id      bigint primary key,
  new_id      bigint not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);
