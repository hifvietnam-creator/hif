-- 014_kidzquest_child_status.sql
--
-- Replaces the `active` boolean with a status that says WHY a child is no
-- longer on the register.
--
-- WHY A BOOLEAN WAS NOT ENOUGH
--
-- "Left" is several different things, and they are not interchangeable:
--
--   left_hanoi          the family relocated. Extremely common here — the PCO
--                       data shows 5,372 people across 30+ nationalities with
--                       only 1,726 currently resident in Vietnam. These children
--                       have not drifted away; they are gone, and chasing them
--                       is wasted effort.
--   stopped_attending   still in the city, no longer coming. THIS is the one
--                       worth a phone call, and a boolean buried it among the
--                       families who moved to another country.
--   moved_to_aftershock graduated out of KidzQuest. A success, not attrition,
--                       and counting it as a loss would make every August look
--                       like a crisis.
--   duplicate           a data artifact, not a person. The import already found
--                       candidates: Elijah Middleton in two groups, and Julia /
--                       Juliet Trần who may be one child recorded twice.
--
-- Collapsing those into `active = false` throws away the only information that
-- makes the number actionable.
--
-- `active` survives as a GENERATED column so every existing query, view and
-- line of application code keeps working, while status becomes the single
-- source of truth. Two writable columns that could disagree would be worse than
-- the boolean was.

alter table kq.children
  add column if not exists status text not null default 'active';

alter table kq.children
  drop constraint if exists kq_children_status_check;

alter table kq.children
  add constraint kq_children_status_check
  check (status in ('active', 'left_hanoi', 'stopped_attending',
                    'moved_to_aftershock', 'duplicate'));

alter table kq.children add column if not exists left_on date;
alter table kq.children add column if not exists status_note text;

-- Carry the boolean across before it goes. Anything already inactive becomes
-- 'stopped_attending' — the honest default, since the old column never recorded
-- a reason and guessing a more specific one would be inventing history.
update kq.children set status = 'stopped_attending' where not active;

-- ── Swap `active` for a generated column ─────────────────────────────────────
-- The views read it, so they have to go first and come back after.

drop view if exists kq.placements_to_confirm;
drop view if exists kq.current_roster;

alter table kq.children drop column active;

alter table kq.children
  add column active boolean generated always as (status = 'active') stored;

create index if not exists kq_children_status_idx on kq.children (status)
  where status <> 'active';

comment on column kq.children.active is
  'Generated from status. Read-only — set status instead. Kept so existing '
  'queries and views did not all have to change at once.';

comment on column kq.children.status is
  'Why a child is or is not on the register. left_hanoi and stopped_attending '
  'are deliberately distinct: only the second is worth a phone call.';

-- ── Rebuild the views ────────────────────────────────────────────────────────

create or replace view kq.current_roster as
  select c.id            as child_id,
         c.first_name, c.last_name, c.preferred_name, c.gender,
         c.allergies, c.active, c.status,
         e.id            as enrollment_id,
         e.academic_year, e.grade, e.group_code, e.group_manual,
         e.provisional, e.started_on
    from kq.children c
    join kq.enrollments e on e.child_id = c.id and e.ended_on is null
   where c.active;

create or replace view kq.placements_to_confirm as
  select r.child_id, r.enrollment_id, r.first_name, r.last_name,
         r.group_code, r.grade, r.academic_year,
         (r.grade is null) as grade_missing
    from kq.current_roster r
   where r.provisional;

-- Children who have left, with the reason and their last enrolment. The list an
-- admin reviews when a family reappears, or when a duplicate needs merging.
create or replace view kq.former_children as
  select c.id as child_id, c.first_name, c.last_name,
         c.status, c.left_on, c.status_note,
         e.group_code as last_group,
         e.academic_year as last_year,
         (select max(s.service_date)
            from kq.attendance a
            join kq.sessions s on s.id = a.session_id
           where a.child_id = c.id
             and a.status in ('present', 'checked_out')) as last_seen
    from kq.children c
    left join lateral (
      select group_code, academic_year
        from kq.enrollments
       where child_id = c.id
       order by started_on desc
       limit 1
    ) e on true
   where c.status <> 'active';
