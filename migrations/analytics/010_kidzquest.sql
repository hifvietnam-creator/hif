-- 010_kidzquest.sql
--
-- KidzQuest: Sunday check-in and check-out for children's ministry.
--
-- A FOURTH SCHEMA, and why.
--
--   pco  — raw mirror of Planning Center.  Never hand-edited.
--   ml   — raw mirror of MailerLite.       Never hand-edited.
--   hif  — our derived data: sync state, cross-system links.
--   kq   — OPERATIONAL data we author ourselves.            ← new
--
-- kq is a different animal from the other three. pco and ml are mirrors, hif
-- is derived. kq is the first schema where this application is the system of
-- record: if a row here is wrong, no upstream sync will correct it, and on a
-- Sunday morning a wrong row means a child is unaccounted for. It is written
-- transactionally by humans at a station, not in bulk by a sync job.
--
-- That difference drives three decisions below: surrogate keys instead of
-- upstream IDs, an append-only audit log, and NOT NULL far more aggressively
-- than the mirror schemas use it.

create schema if not exists kq;

comment on schema kq is
  'KidzQuest operational data. This application is the system of record — '
  'unlike pco/ml, nothing upstream will correct an error here.';

-- ── Reference: groups, and the grade that puts a child in one ────────────────
--
-- GRADE DRIVES THE GROUP, NOT AGE. This is the single most important modelling
-- decision in the file, and it came from the ministry, not from me.
--
-- Age looks like the natural key — the whiteboard is written in ages — but a
-- child's age changes on their birthday, mid-term, in the middle of a Sunday.
-- Grade changes once a year with the school year. Promotion is therefore an
-- annual, deliberate, whole-cohort event rather than 40 individual silent
-- reclassifications scattered through the calendar.
--
-- It also matches how parents and teachers already talk: "she's in Grade 2",
-- not "she's 6 years and 4 months".
--
-- Ages are recorded as `typical_age` for reporting only. Nothing routes on them.

create table if not exists kq.groups (
  code         text primary key,
  label        text not null,
  sort_order   integer not null,
  active       boolean not null default true
);

insert into kq.groups (code, label, sort_order) values
  ('explorers',    'Explorers',    1),   -- pre-school
  ('voyagers',     'Voyagers',     2),
  ('trailblazers', 'Trailblazers', 3),
  ('pathfinders',  'Pathfinders',  4),
  ('aftershock',   'Aftershock',   5)    -- youth; where Grade 8+ goes
on conflict (code) do nothing;

-- The mapping, exactly as the ministry gave it. A table rather than a CASE
-- expression buried in application code: when the cohorts are redrawn — and
-- they will be, as numbers grow — this is one UPDATE, not a deployment.
create table if not exists kq.grade_map (
  grade        integer primary key,
  group_code   text not null references kq.groups(code),
  typical_age  integer
);

insert into kq.grade_map (grade, group_code, typical_age) values
  (0, 'explorers',     4),   -- pre-school
  (1, 'voyagers',      5),
  (2, 'voyagers',      6),
  (3, 'trailblazers',  7),
  (4, 'trailblazers',  8),
  (5, 'pathfinders',   9),
  (6, 'pathfinders',  10),
  (7, 'pathfinders',  11)
on conflict (grade) do nothing;

comment on table kq.grade_map is
  'Grade 0-7 only. A child in Grade 8 or above belongs to Aftershock and is '
  'not routed by this table — the import must treat an unmapped grade as a '
  'referral to youth, never as a default into Pathfinders.';

-- ── Academic years ───────────────────────────────────────────────────────────
--
-- The unit that group membership actually moves in.
--
-- A child who turns 6 in November 2025 does NOT change group in November. They
-- stay where they are for the whole of 2025-26 and move at the rollover. Age is
-- a fact about a birthday; grade and group are facts about a school year. Those
-- are different clocks, and conflating them is what makes a child change room
-- on a random Tuesday.
--
-- KidzQuest rolls over on the FIRST SUNDAY OF AUGUST — not September, and not
-- the Vietnamese school calendar. Dates are explicit rows rather than derived,
-- because that is a ministry decision and it may move.

create table if not exists kq.academic_years (
  code        text primary key,        -- '2025-26'
  starts_on   date not null,           -- first Sunday of August
  ends_on     date not null,           -- Sunday before the next rollover
  is_current  boolean not null default false
);

insert into kq.academic_years (code, starts_on, ends_on, is_current) values
  ('2024-25', date '2024-08-04', date '2025-08-02', false),
  ('2025-26', date '2025-08-03', date '2026-08-01', false),
  ('2026-27', date '2026-08-02', date '2027-08-07', true)
on conflict (code) do nothing;

-- Only one year can be current.
create unique index if not exists kq_year_one_current
  on kq.academic_years ((is_current)) where is_current;

comment on table kq.academic_years is
  'Rollover is the first Sunday of August. 2026-27 began 2 Aug 2026 — which '
  'falls INSIDE the May-Aug span of the imported spreadsheets, so imported '
  'attendance straddles two academic years.';

-- ── Children ─────────────────────────────────────────────────────────────────

create table if not exists kq.children (
  id                bigint generated always as identity primary key,

  -- Optional link to a synced PCO person. Nullable on purpose: a child who
  -- turns up on Sunday must be enterable in ten seconds without existing
  -- anywhere upstream. No FK — see the comment below.
  pco_person_id     bigint,

  first_name        text not null,
  last_name         text not null,
  preferred_name    text,

  -- Free text, not an enum. The source sheets contain 'Male', 'Female ',
  -- 'Male ' and blank; several children have none recorded at all. Normalise
  -- on import, but do not let a constraint here reject a real child on a
  -- Sunday morning because nobody ever filled the cell in.
  gender            text,

  birthdate         date,

  -- NOTE: grade and group are NOT columns here. They live in kq.enrollments,
  -- one row per child per academic year, because they change every year and a
  -- column would only ever hold the latest value. See that table.

  -- Care information. NOTE: migration 002 deliberately excludes medical_notes
  -- from pco.people. That boundary still holds — this is not a mirror of it.
  -- These are authored here because a TA at a door needs an allergy visible
  -- in the moment. Keep it minimal and operational, never clinical history.
  allergies         text,
  care_notes        text,

  photo_consent     boolean,

  source            text not null default 'manual'
                      check (source in ('cognito', 'excel', 'manual')),
  cognito_entry_id  text unique,

  active            boolean not null default true,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists kq_children_pco_idx  on kq.children (pco_person_id);
create index if not exists kq_children_name_idx on kq.children (lower(last_name), lower(first_name));

comment on column kq.children.pco_person_id is
  'No foreign key to pco.people by design. pco is a mirror: a PCO-side merge '
  'or delete would break a FK mid-service. A dangling link here degrades to '
  '"no PCO record", which is survivable. Check pco.person_merges when resolving.';

-- ── Enrolments: the child's path through the ministry ────────────────────────
--
-- One row per child per academic year. This is the table that answers
-- "where has this child been?" — Explorers, then Voyagers, then Trailblazers,
-- then Pathfinders, then out to Aftershock.
--
-- Why a table and not a column on kq.children:
--
--   A column holds one value. Promotion overwrites it, and the previous year is
--   gone — you could no longer say a Pathfinder used to be a Trailblazer, or
--   notice that a child was with you for three years and then wasn't.
--
--   It also makes the interesting questions answerable. How many of last year's
--   Voyagers came back as Trailblazers? Which year loses the most children? At
--   which transition do families drift away? None of that is reachable from a
--   mutable column, and all of it falls out of this table with a self-join.
--
-- Multiple rows per child per year are allowed. A mid-year move is real — the
-- 2026 sheets already show one child marked in two groups in the same term.
-- started_on / ended_on carry that; ended_on IS NULL means "currently here".

create table if not exists kq.enrollments (
  id             bigint generated always as identity primary key,

  child_id       bigint not null references kq.children(id) on delete cascade,
  academic_year  text   not null references kq.academic_years(code),

  grade          integer references kq.grade_map(grade),
  group_code     text not null references kq.groups(code),

  -- True when a human placed this child somewhere other than where their grade
  -- says. Maturity, additional needs, staying with a sibling. The promotion job
  -- must carry this forward rather than "correcting" it every year.
  group_manual   boolean not null default false,

  -- The row is a working assumption nobody has confirmed yet.
  --
  -- The 2026 import had no grades, so most new-year placements are guesses:
  -- Explorers all move (grade 0 is the whole group, so that one is certain),
  -- everyone else provisionally stays put. Roughly half of those are wrong.
  --
  -- Provisional rows behave exactly like real ones — a child still appears on a
  -- register and can still be checked in and out. This is deliberate: a wrong
  -- room is recoverable in thirty seconds, a child missing from every register
  -- is not. The flag only means the app keeps asking until a teacher confirms.
  provisional    boolean not null default false,
  confirmed_by   integer,
  confirmed_at   timestamptz,

  started_on     date not null,
  ended_on       date,                    -- null = still in this group

  reason         text not null default 'annual promotion'
                   check (reason in ('initial import', 'registration',
                                     'annual promotion', 'mid-year move',
                                     'moved to aftershock', 'left')),
  note           text,
  created_at     timestamptz not null default now()
);

create index if not exists kq_enrol_child_idx on kq.enrollments (child_id, started_on);
create index if not exists kq_enrol_year_idx  on kq.enrollments (academic_year, group_code);
create index if not exists kq_enrol_prov_idx  on kq.enrollments (group_code) where provisional;

-- A child can only be in one group at a time.
create unique index if not exists kq_enrol_one_open
  on kq.enrollments (child_id) where ended_on is null;

comment on table kq.enrollments is
  'The cursus. A child''s group is a fact about them IN A GIVEN YEAR, not a '
  'property of the child — so it lives here, not as a column on kq.children.';

-- Current roster. What the station and every admin screen should read.
create or replace view kq.current_roster as
  select c.id            as child_id,
         c.first_name, c.last_name, c.preferred_name, c.gender,
         c.allergies, c.active,
         e.id            as enrollment_id,
         e.academic_year, e.grade, e.group_code, e.group_manual,
         e.provisional, e.started_on
    from kq.children c
    join kq.enrollments e on e.child_id = c.id and e.ended_on is null
   where c.active;

-- The teacher's to-do list: children in my room whose placement nobody has
-- confirmed. Drives the in-app placement screen, which is how grades actually
-- get collected — a teacher tapping through their own register on a Sunday,
-- rather than a spreadsheet emailed to volunteers who work all week.
create or replace view kq.placements_to_confirm as
  select r.child_id, r.enrollment_id, r.first_name, r.last_name,
         r.group_code, r.grade, r.academic_year,
         (r.grade is null) as grade_missing
    from kq.current_roster r
   where r.provisional;

-- ── Annual promotion ─────────────────────────────────────────────────────────
-- Run once at the rollover — the first Sunday of August. Never automatically.
--
--   -- 1. close the year
--   update kq.enrollments set ended_on = :rollover
--    where ended_on is null;
--
--   -- 2. open the next one, carrying manual placements forward
--   insert into kq.enrollments
--          (child_id, academic_year, grade, group_code, group_manual,
--           started_on, reason)
--   select e.child_id,
--          :next_year,
--          e.grade + 1,
--          case when e.group_manual then e.group_code
--               else coalesce(m.group_code, 'aftershock') end,
--          e.group_manual,
--          :rollover,
--          'annual promotion'
--     from kq.enrollments e
--     left join kq.grade_map m on m.grade = e.grade + 1
--     join kq.children c on c.id = e.child_id and c.active
--    where e.ended_on = :rollover
--      and e.grade is not null
--      and e.grade + 1 <= 7;          -- Grade 8+ handled separately, by hand
--
-- Children ageing out of Grade 7 are NOT moved automatically. They surface as a
-- list to hand to Aftershock, because leaving KidzQuest is a conversation with
-- a family, not an UPDATE.
--
-- Children with a NULL grade are skipped entirely and must be placed by hand —
-- which is exactly the situation the 2026 import leaves behind, and exactly why
-- kq.placements_to_confirm exists.

-- ── Retention across the transitions ─────────────────────────────────────────
-- The question the enrolment table exists to answer: of the children in a group
-- one year, where did they go the next?
--
-- DISTINCT ON picks only the immediately following enrolment. A plain
-- `started_on > prev.started_on` join would match every later year at once, so
-- a child with three years of history would be counted twice.

create or replace view kq.year_transitions as
  with steps as (
    select distinct on (prev.id)
           prev.id                as from_enrollment,
           prev.academic_year     as from_year,
           prev.group_code        as from_group,
           nxt.academic_year      as to_year,
           nxt.group_code         as to_group
      from kq.enrollments prev
      left join kq.enrollments nxt
             on nxt.child_id   = prev.child_id
            and nxt.started_on > prev.started_on
     order by prev.id, nxt.started_on
  )
  select from_year,
         from_group,
         coalesce(to_year, '(no later year)')    as to_year,
         coalesce(to_group, '(did not return)')  as to_group,
         count(*)                                as children
    from steps
   group by 1, 2, 3, 4;

-- ── Guardians ────────────────────────────────────────────────────────────────

create table if not exists kq.guardians (
  id              bigint generated always as identity primary key,
  pco_person_id   bigint,

  full_name       text not null,
  phone           text,
  e164            text,
  email           citext,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Deliberately NOT unique. Migration 002 found 6,758 email records across
-- 6,014 distinct addresses — families share one inbox. That is far MORE true
-- of parents of small children than of the congregation at large. A unique
-- constraint here would silently merge two parents into one, and the person
-- authorised to collect a child would become wrong.
create index if not exists kq_guardians_email_idx on kq.guardians (email);
create index if not exists kq_guardians_e164_idx  on kq.guardians (e164);

-- ── Who may collect whom ─────────────────────────────────────────────────────
-- The safeguarding table. Everything else is bookkeeping; this one decides
-- whether a child leaves with the right adult.

create table if not exists kq.child_guardians (
  child_id      bigint not null references kq.children(id)  on delete cascade,
  guardian_id   bigint not null references kq.guardians(id) on delete cascade,

  relationship  text,                        -- mother, father, aunt, driver, ...
  is_primary    boolean not null default false,

  -- Separate from relationship on purpose. A grandparent may be a contact but
  -- not an authorised collector; a household helper may be the reverse.
  --
  -- The 2026 import sets this TRUE for the spreadsheet's primary contact. The
  -- stricter default would be FALSE, but that would force an override for all
  -- 138 children on the first Sunday, and a control everybody overrides on day
  -- one stops being a control by week two. The paper system already treats this
  -- person as the collector; this carries that forward and asks for
  -- confirmation family by family instead of blocking the room.
  can_pickup    boolean not null default false,

  created_at    timestamptz not null default now(),
  primary key (child_id, guardian_id)
);

create index if not exists kq_cg_guardian_idx on kq.child_guardians (guardian_id);

-- ── Sessions: one room, one group, one Sunday ────────────────────────────────

create table if not exists kq.sessions (
  id             bigint generated always as identity primary key,

  service_date   date not null,
  group_code     text not null references kq.groups(code),

  -- HIF meets at Hanoi, Ecopark and Thai Nguyen. No FK to pco.campuses for the
  -- same reason as kq.children.pco_person_id; store the id and treat it as a hint.
  campus_id      bigint,
  room           text,

  opened_at      timestamptz,
  closed_at      timestamptz,

  created_at     timestamptz not null default now(),

  unique (service_date, group_code, campus_id)
);

create index if not exists kq_sessions_date_idx on kq.sessions (service_date desc);

-- Staff assigned to a session. staff_user_id points at Payload's users table
-- in `public`. No FK: migration 001 states Payload owns `public` and manages
-- it through its own adapter. Reaching into it with a constraint would couple
-- our schema to Payload's migrations and could break on a schema push.
create table if not exists kq.session_staff (
  session_id     bigint not null references kq.sessions(id) on delete cascade,
  staff_user_id  integer not null,
  role           text not null check (role in ('teacher', 'ta')),
  primary key (session_id, staff_user_id)
);

-- ── Attendance ───────────────────────────────────────────────────────────────

create table if not exists kq.attendance (
  id                    bigint generated always as identity primary key,

  session_id            bigint not null references kq.sessions(id) on delete cascade,
  child_id              bigint not null references kq.children(id),

  -- Where this row came from. 'station' means a person stood at a door and
  -- tapped; 'import' means it was back-filled from a spreadsheet tick and
  -- carries no time, no code and no named adult, because the paper never
  -- recorded any. Keeping them distinguishable matters: an imported row must
  -- never be mistaken for evidence that a child was safely released.
  source                text not null default 'station'
                          check (source in ('station', 'import')),

  -- Printed on both the child's tag and the guardian's claim tag. Rotates every
  -- session rather than being a permanent per-child code: a code that never
  -- changes is a code that ends up photographed, screenshotted and reused.
  -- Nullable only for imported history — see the constraint below.
  security_code         text,

  checked_in_at         timestamptz,
  checked_in_by_user    integer,          -- staff operating the station
  checked_in_guardian   bigint references kq.guardians(id),

  checked_out_at        timestamptz,
  checked_out_by_user   integer,
  checked_out_guardian  bigint references kq.guardians(id),

  -- Set when a child was released to someone not in child_guardians.can_pickup.
  -- The CHECK below makes a reason mandatory — an override without a stated
  -- reason is exactly the record you will wish you had.
  checkout_override     boolean not null default false,
  checkout_reason       text,

  status                text not null default 'expected'
                          check (status in ('expected', 'present', 'checked_out', 'absent')),

  -- Idempotency key from the station. If the network drops between the write
  -- and the response, the station retries with the same uuid and we upsert
  -- rather than double-checking-in a child.
  client_uuid           uuid unique,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (session_id, child_id),

  -- NULLs do not collide in a Postgres unique index, so imported rows (which
  -- have no code) coexist happily while live codes stay unique per session.
  unique (session_id, security_code),

  constraint checkout_override_needs_reason
    check (not checkout_override or checkout_reason is not null),

  -- A live check-in must always carry a code. Only imported history may omit it.
  constraint station_rows_need_a_code
    check (source = 'import' or security_code is not null),

  constraint checkout_after_checkin
    check (checked_out_at is null or checked_in_at is null
           or checked_out_at >= checked_in_at)
);

create index if not exists kq_att_session_idx on kq.attendance (session_id);
create index if not exists kq_att_child_idx   on kq.attendance (child_id);

-- Children currently in a room. The query a TA's screen runs constantly, and
-- the one that answers "who is still here?" when a service overruns.
create index if not exists kq_att_present_idx
  on kq.attendance (session_id)
  where status = 'present';

-- ── Audit log ────────────────────────────────────────────────────────────────
-- Append-only by convention and by permission.
--
-- kq.attendance holds current state; this holds how it got there. When a parent
-- asks who collected their child, or a safeguarding question is raised months
-- later, the mutable row cannot answer it and this can.

create table if not exists kq.attendance_events (
  id             bigint generated always as identity primary key,

  attendance_id  bigint not null references kq.attendance(id) on delete cascade,

  event_type     text not null
                   check (event_type in ('check_in', 'check_out', 'override',
                                         'undo', 'note', 'transfer')),

  actor_user_id  integer,
  guardian_id    bigint,
  detail         jsonb not null default '{}'::jsonb,

  station_id     text,
  occurred_at    timestamptz not null default now()
);

create index if not exists kq_events_att_idx  on kq.attendance_events (attendance_id, occurred_at);
create index if not exists kq_events_time_idx on kq.attendance_events (occurred_at desc);

revoke update, delete on kq.attendance_events from public;

comment on table kq.attendance_events is
  'Append-only safeguarding log. A correction is a NEW row with '
  'event_type = ''undo'', never an edit to an existing one. NOTE: the REVOKE '
  'above only binds the PUBLIC role — the table owner still has UPDATE and '
  'DELETE, so this is a guard rail and a statement of intent, not a hard '
  'guarantee. Give the application a non-owner role if you want it enforced.';

-- ── Import review queue ──────────────────────────────────────────────────────
-- Where Excel rows and Cognito submissions land when they cannot be matched
-- with confidence. Nothing auto-merges: a duplicated child is recoverable,
-- two children silently collapsed into one is not.

create table if not exists kq.import_review (
  id                bigint generated always as identity primary key,

  source            text not null check (source in ('cognito', 'excel')),
  source_ref        text,
  raw               jsonb not null,

  proposed_child_id bigint references kq.children(id),
  match_confidence  text check (match_confidence in ('exact', 'probable', 'none')),
  match_notes       text,

  status            text not null default 'pending'
                      check (status in ('pending', 'accepted', 'rejected', 'merged')),
  reviewed_by       integer,
  reviewed_at       timestamptz,

  created_at        timestamptz not null default now()
);

create index if not exists kq_review_status_idx on kq.import_review (status)
  where status = 'pending';

-- ── updated_at maintenance ───────────────────────────────────────────────────

create or replace function kq.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- CREATE OR REPLACE TRIGGER requires Postgres 14+. Neon is well past that.
create or replace trigger kq_children_touch   before update on kq.children
  for each row execute function kq.touch_updated_at();
create or replace trigger kq_guardians_touch  before update on kq.guardians
  for each row execute function kq.touch_updated_at();
create or replace trigger kq_attendance_touch before update on kq.attendance
  for each row execute function kq.touch_updated_at();
