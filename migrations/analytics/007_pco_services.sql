-- 007_pco_services.sql
--
-- Planning Center Services — the real serving data.
--
-- Why this matters: the ministry custom fields cover ~210 people and look
-- hand-maintained. Services holds actual team membership and scheduling, so
-- it can answer "who serves, how often, and did they actually turn up"
-- rather than "who was listed once".
--
-- Two complementary sources:
--   person_team_position_assignments — standing membership of a team
--   plan_people                      — scheduled instances, with a status
--                                      (confirmed / declined / unconfirmed)
--
-- The second is the behavioural signal: a standing assignment says someone is
-- on the rota; a run of confirmed plan_people says they actually serve.

create table if not exists pco.service_types (
  id              bigint primary key,
  name            text,
  sequence        integer,
  frequency       text,
  parent_id       bigint,
  archived_at     timestamptz,
  pco_created_at  timestamptz,
  pco_updated_at  timestamptz,
  synced_at       timestamptz not null default now()
);

create table if not exists pco.teams (
  id                     bigint primary key,
  service_type_id        bigint references pco.service_types(id) on delete cascade,
  name                   text,
  sequence               integer,
  rehearsal_team         boolean,
  schedule_to            text,
  default_status         text,
  archived_at            timestamptz,
  pco_created_at         timestamptz,
  pco_updated_at         timestamptz,
  synced_at              timestamptz not null default now()
);

create index if not exists teams_service_type_idx on pco.teams (service_type_id);

create table if not exists pco.team_positions (
  id           bigint primary key,
  team_id      bigint references pco.teams(id) on delete cascade,
  name         text,
  sequence     integer,
  synced_at    timestamptz not null default now()
);

create index if not exists team_positions_team_idx on pco.team_positions (team_id);

-- ── Standing team membership ─────────────────────────────────────────────────

create table if not exists pco.team_assignments (
  id                bigint primary key,
  person_id         bigint references pco.people(id) on delete cascade,
  team_id           bigint references pco.teams(id) on delete cascade,
  team_position_id  bigint references pco.team_positions(id) on delete set null,
  schedule_to       text,
  preferred_weeks   text,
  pco_created_at    timestamptz,
  pco_updated_at    timestamptz,
  synced_at         timestamptz not null default now()
);

create index if not exists team_assignments_person_idx on pco.team_assignments (person_id);
create index if not exists team_assignments_team_idx   on pco.team_assignments (team_id);

-- ── Plans and actual scheduling ──────────────────────────────────────────────

create table if not exists pco.plans (
  id               bigint primary key,
  service_type_id  bigint references pco.service_types(id) on delete cascade,
  title            text,
  series_title     text,
  dates            text,
  sort_date        timestamptz,
  plan_people_count integer,
  is_public        boolean,
  pco_created_at   timestamptz,
  pco_updated_at   timestamptz,
  synced_at        timestamptz not null default now()
);

create index if not exists plans_service_type_idx on pco.plans (service_type_id);
create index if not exists plans_sort_date_idx    on pco.plans (sort_date);

create table if not exists pco.plan_people (
  id                bigint primary key,
  plan_id           bigint references pco.plans(id) on delete cascade,
  person_id         bigint references pco.people(id) on delete cascade,
  team_id           bigint references pco.teams(id) on delete set null,
  team_position_name text,
  status            text,   -- C(onfirmed) | U(nconfirmed) | D(eclined)
  decline_reason    text,
  notes             text,
  pco_created_at    timestamptz,
  pco_updated_at    timestamptz,
  synced_at         timestamptz not null default now()
);

create index if not exists plan_people_person_idx on pco.plan_people (person_id);
create index if not exists plan_people_plan_idx   on pco.plan_people (plan_id);
create index if not exists plan_people_status_idx on pco.plan_people (status);

comment on table pco.plan_people is
  'One row per person per plan they were scheduled for. Status distinguishes '
  'scheduled from confirmed from declined — do not treat a scheduling as '
  'evidence that someone served.';

-- NOTE: person_id foreign keys reference pco.people on the assumption that the
-- Services API returns the same person ID space as the People API. This is the
-- same assumption that already failed once (field_data.customizable turned out
-- to be polymorphic), so the sync validates IDs against pco.people before
-- inserting rather than trusting the relationship.
