-- 015_kidzquest_cognito_fields.sql
--
-- Somewhere to put what the registration form collects.
--
-- The Cognito export carries three things the schema had no home for. Without
-- these columns the September reconciliation would parse them and throw them
-- away, which is the sort of loss nobody notices until somebody asks a question
-- a year later and the answer is "we had that once".

alter table kq.children add column if not exists nationality text;

comment on column kq.children.nationality is
  'As typed by the parent, not normalised. The raw data contains USA / Usa / '
  'AMERICAN / American for the same thing. Normalise when reporting rather '
  'than on the way in — a parent writing "British" rather than "UK" is telling '
  'you something, and a lookup table would quietly flatten it.';

-- The family key from the registration form. Siblings share it, which is the
-- only reliable link between them: the roster already contains three children
-- of one parent carrying two different surnames.
alter table kq.children add column if not exists cognito_family_id text;

create index if not exists kq_children_family_idx on kq.children (cognito_family_id)
  where cognito_family_id is not null;

-- Where a Cognito record could not be matched to an existing child with
-- confidence, this holds what the form said so a human can compare. Cleared
-- once somebody has confirmed the match.
alter table kq.children add column if not exists cognito_raw jsonb;

-- ── Attendance provenance ────────────────────────────────────────────────────
--
-- 010 gave kq.attendance a `source` of 'station' or 'import'. That was enough
-- when there had been exactly one import. There have now been two, and the
-- September sheets overlap the August ones for thirteen Sundays.
--
-- Recording which import a row came from means a bad run can be undone by
-- batch rather than by guessing at dates.

alter table kq.attendance add column if not exists import_batch text;

create index if not exists kq_att_batch_idx on kq.attendance (import_batch)
  where import_batch is not null;

comment on column kq.attendance.import_batch is
  'Which import wrote this row, e.g. ''2026-08-13-initial'' or '
  '''2026-09-09-september''. Null for rows created at a station by a person.';

-- ── Cross-sheet conflicts ────────────────────────────────────────────────────
--
-- The September spreadsheets are not a clean partition: several children appear
-- on two group sheets at once, both still being ticked. When a child moved up,
-- a row was added to the new sheet and the old one was left behind.
--
-- This is where those land. Not an error to be fixed by a rule, because only
-- somebody who was in the room knows which sheet is the real one.

create table if not exists kq.sheet_conflicts (
  id             bigint generated always as identity primary key,

  child_id       bigint references kq.children(id) on delete cascade,
  child_name     text not null,

  groups_seen    text[] not null,
  last_seen      jsonb not null,      -- { "explorers": "2026-05-03", ... }
  resolved_to    text,                -- what the import chose, null if it refused

  kind           text not null
                   check (kind in ('two_sheets', 'grade_mismatch',
                                   'impossible_birthday', 'name_order',
                                   'duplicate_family', 'no_longer_listed')),
  detail         text,

  status         text not null default 'pending'
                   check (status in ('pending', 'resolved', 'ignored')),
  resolved_by    integer,
  resolved_at    timestamptz,

  created_at     timestamptz not null default now()
);

create index if not exists kq_conflicts_pending_idx on kq.sheet_conflicts (kind)
  where status = 'pending';

comment on table kq.sheet_conflicts is
  'Things the September import could see were wrong but had no honest way to '
  'decide. A child on two sheets, a birthday in the future, a grade that '
  'contradicts the age on the same row. Each needs a person, not a rule.';
