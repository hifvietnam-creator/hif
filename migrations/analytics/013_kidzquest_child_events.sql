-- 013_kidzquest_child_events.sql
--
-- Audit trail for changes to a child's record.
--
-- 010 gave attendance an append-only log because a mutable row cannot answer
-- "who collected this child, and when". The same argument applies here and is
-- arguably stronger: attendance is corrected within the hour by people who were
-- in the room, whereas an allergy quietly deleted in March is not noticed until
-- somebody is handed the wrong snack in September.
--
-- Inline table editing makes this necessary rather than nice. A cell that saves
-- on blur has no undo, and a mis-tap on a phone-sized target is indistinguishable
-- from an intentional edit. This table IS the undo — not automatic, but the
-- previous value is recoverable and attributable.

create table if not exists kq.child_events (
  id             bigint generated always as identity primary key,

  child_id       bigint not null references kq.children(id) on delete cascade,

  event_type     text not null
                   check (event_type in ('created', 'field_change', 'group_change',
                                         'guardian_added', 'guardian_removed',
                                         'pickup_changed', 'deactivated', 'note')),

  -- For field_change: what moved, and from what to what. Stored as text on
  -- purpose — this is a record of what a human saw and typed, not a typed copy
  -- of the column, and it must survive the column's type changing later.
  field          text,
  old_value      text,
  new_value      text,

  actor_user_id  integer,          -- Payload user; no FK, `public` is Payload's
  detail         jsonb not null default '{}'::jsonb,

  occurred_at    timestamptz not null default now()
);

create index if not exists kq_child_events_child_idx on kq.child_events (child_id, occurred_at desc);
create index if not exists kq_child_events_time_idx  on kq.child_events (occurred_at desc);

-- Same caveat as kq.attendance_events: this binds the PUBLIC role only. The
-- table owner can still UPDATE and DELETE, so it is a guard rail and a
-- statement of intent rather than a hard guarantee. Give the application a
-- non-owner role if you want it enforced.
revoke update, delete on kq.child_events from public;

comment on table kq.child_events is
  'Append-only history of edits to a child record. Because inline editing has '
  'no undo, this is where a wrongly cleared allergy or a removed pickup right '
  'is recovered from.';

-- Fields worth reviewing when something looks wrong. A safeguarding question
-- months later is about pickup rights and allergies, not about a spelling fix.
create index if not exists kq_child_events_sensitive_idx
  on kq.child_events (child_id, occurred_at desc)
  where event_type in ('pickup_changed', 'guardian_removed', 'guardian_added')
     or field in ('allergies', 'care_notes', 'active');
