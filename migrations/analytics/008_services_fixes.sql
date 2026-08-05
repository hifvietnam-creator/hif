-- 008_services_fixes.sql
--
-- Corrections to 007 based on what the live API actually returns
-- (see scripts/probe-services.ts).
--
-- PersonTeamPositionAssignment exposes `schedule_preference`, not
-- `schedule_to`. The latter exists on Team, which is where the confusion
-- came from.

alter table pco.team_assignments
  rename column schedule_to to schedule_preference;

-- The assignment payload carries no `team` relationship — only
-- person → Person and team_position → TeamPosition. Team is known from the
-- URL used to fetch it. Keeping team_id denormalised is deliberate: it saves
-- a join on every serving query and the sync fills it from loop context.
comment on column pco.team_assignments.team_id is
  'Denormalised from fetch context. The API payload has no team relationship; '
  'team is implied by /teams/{id}/person_team_position_assignments.';
