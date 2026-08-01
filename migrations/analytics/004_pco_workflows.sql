-- 004_pco_workflows.sql
--
-- Planning Center Workflows — the follow-up pipeline that already exists
-- inside PCO. Mirroring it means we do not have to build follow-up tracking,
-- a follow-up admin UI, or retrain staff on a new tool.
--
-- A card sitting too long in a step is, by definition, someone who fell
-- through a crack. That is the raw material for a drop-off view later.

create table if not exists pco.workflow_categories (
  id         bigint primary key,
  name       text,
  synced_at  timestamptz not null default now()
);

create table if not exists pco.workflows (
  id                       bigint primary key,
  name                     text,
  campus_id                bigint references pco.campuses(id),
  workflow_category_id     bigint references pco.workflow_categories(id),
  total_cards_count        integer,
  total_ready_card_count   integer,
  completed_card_count     integer,
  deleted_at               timestamptz,
  pco_created_at           timestamptz,
  pco_updated_at           timestamptz,
  synced_at                timestamptz not null default now()
);

create table if not exists pco.workflow_steps (
  id                              bigint primary key,
  workflow_id                     bigint references pco.workflows(id) on delete cascade,
  name                            text,
  sequence                        integer,
  expected_response_time_in_days  integer,
  auto_snooze_days                integer,
  synced_at                       timestamptz not null default now()
);

create index if not exists workflow_steps_workflow_idx on pco.workflow_steps (workflow_id);

create table if not exists pco.workflow_cards (
  id                          bigint primary key,
  workflow_id                 bigint references pco.workflows(id) on delete cascade,
  person_id                   bigint references pco.people(id) on delete cascade,
  assignee_id                 bigint,   -- a PCO person, but may be outside our mirror
  current_step_id             bigint references pco.workflow_steps(id),
  stage                       text,     -- unassigned | ready | snoozed | completed
  status                      text,
  sticky_assignment           boolean,
  moved_to_step_at            timestamptz,
  snooze_until                timestamptz,
  completed_at                timestamptz,
  removed_at                  timestamptz,
  flagged_for_notification_at timestamptz,
  pco_created_at              timestamptz,
  pco_updated_at              timestamptz,
  synced_at                   timestamptz not null default now()
);

create index if not exists workflow_cards_person_idx   on pco.workflow_cards (person_id);
create index if not exists workflow_cards_workflow_idx on pco.workflow_cards (workflow_id);
create index if not exists workflow_cards_stage_idx    on pco.workflow_cards (stage);
create index if not exists workflow_cards_moved_idx    on pco.workflow_cards (moved_to_step_at);
