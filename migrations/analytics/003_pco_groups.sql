-- 003_pco_groups.sql
--
-- Planning Center Groups: Connect Groups and Fellowships.
--
-- Note this is the RAW mirror. The existing Payload `groups` collection stays
-- as-is — it drives the public website and is edited by staff. This table is
-- the analytical copy, including unlisted and archived groups that the website
-- deliberately hides.

create table if not exists pco.group_types (
  id                     bigint primary key,
  name                   text,
  church_center_visible  boolean,
  pco_created_at         timestamptz,
  synced_at              timestamptz not null default now()
);

create table if not exists pco.groups (
  id                 bigint primary key,
  name               text,
  group_type_id      bigint references pco.group_types(id),
  description        text,
  schedule           text,
  contact_email      text,
  church_center_url  text,
  location_type      text,
  enrollment_open    boolean,
  listed             boolean,
  memberships_count  integer,
  archived_at        timestamptz,
  pco_created_at     timestamptz,
  pco_updated_at     timestamptz,
  synced_at          timestamptz not null default now()
);

create index if not exists groups_type_idx on pco.groups (group_type_id);

-- Known group types in the HIF account, for reference:
--   126940 = Connect Group
--   183728 = Fellowship

create table if not exists pco.group_memberships (
  id              bigint primary key,
  group_id        bigint not null references pco.groups(id) on delete cascade,
  person_id       bigint not null references pco.people(id) on delete cascade,
  role            text,            -- member | leader
  joined_at       timestamptz,
  pco_created_at  timestamptz,
  pco_updated_at  timestamptz,
  synced_at       timestamptz not null default now()
);

-- VERIFY ON FIRST BACKFILL: this assumes the person ID returned by the Groups
-- API is the same ID space as the People API. That is the documented PCO
-- behaviour, but it has not yet been confirmed against this account. The
-- foreign key is intentional — if the assumption is wrong the backfill will
-- fail loudly rather than quietly populate an unjoinable column.

create index if not exists group_memberships_person_idx on pco.group_memberships (person_id);
create index if not exists group_memberships_group_idx  on pco.group_memberships (group_id);
create index if not exists group_memberships_role_idx   on pco.group_memberships (role);
