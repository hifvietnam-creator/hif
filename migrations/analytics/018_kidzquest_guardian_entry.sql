-- 018_kidzquest_guardian_entry.sql
--
-- Who said this adult may collect this child, and has Ate seen it.
--
-- WHY
--
-- 42 of the 169 children on the register have no adult on file at all. Not a
-- box somebody forgot to tick: no row. Each of those is a conversation with a
-- parent, and the person standing in front of that parent on a Sunday is the
-- teacher, not the administrator. So teachers may now add an adult.
--
-- That is not a new power. Teachers already hold the override, which releases
-- a child to anyone for one Sunday. But the two last differently. An override
-- is loud and expires at the end of the service. A can_pickup tick is silent
-- and permanent: it is checked every Sunday from then on and nobody is asked
-- again. A long-lived permission granted at a busy door deserves a second pair
-- of eyes, which is what these columns record.
--
-- THE RULE
--
-- A teacher's tick takes effect at once. Making it wait for confirmation would
-- mean the child still needs an override that same Sunday, and the point of the
-- exercise is fewer overrides, not the same number with more typing. Ate
-- confirms afterwards from kq.pickups_to_confirm, or removes the tick.
--
-- An administrator's tick is its own confirmation.
--
-- Everything already in the table counts as confirmed. Those ticks came from
-- the August import, which carried forward the paper system's collector, and
-- asking Ate to confirm 127 of them on day one would bury the handful that
-- actually need her.

alter table kq.child_guardians
  -- Payload user who last granted can_pickup. No FK, for the reason given in
  -- 010: `public` is Payload's.
  add column if not exists pickup_set_by        integer,

  -- Their name as it stood when they did it. Denormalised on purpose. Nothing
  -- in this schema reads `public.users`, and the list Ate confirms from has to
  -- say "added by Hannah", not "added by user 14".
  add column if not exists pickup_set_by_name   text,

  add column if not exists pickup_set_role      text
    check (pickup_set_role in ('admin', 'teacher')),

  add column if not exists pickup_set_at        timestamptz,

  -- Where the authorisation came from, in the words of whoever recorded it.
  -- Required by the application for anyone who is not the child's mother or
  -- father. "Mum asked at the door, this is the family's driver."
  add column if not exists pickup_source        text,

  add column if not exists pickup_confirmed_by  integer,
  add column if not exists pickup_confirmed_at  timestamptz;

comment on column kq.child_guardians.pickup_source is
  'One line saying who authorised this adult to collect, typed by the person '
  'who ticked can_pickup. Null for a mother or father, and for every row that '
  'predates migration 018.';

-- ── What Ate needs to look at ────────────────────────────────────────────────
-- Same shape as kq.placements_to_confirm: a view over live rows, so the list
-- empties itself as she works and there is no second table to keep in step.
--
-- current_roster, not children: a tick on a child who has since left is not
-- worth her attention.
create or replace view kq.pickups_to_confirm as
  select cg.child_id, cg.guardian_id,
         r.first_name, r.last_name, r.preferred_name, r.group_code,
         g.full_name                    as guardian_name,
         coalesce(g.e164, g.phone)      as guardian_phone,
         cg.relationship,
         cg.pickup_source,
         cg.pickup_set_by, cg.pickup_set_by_name, cg.pickup_set_at
    from kq.child_guardians cg
    join kq.current_roster r on r.child_id = cg.child_id
    join kq.guardians g      on g.id = cg.guardian_id
   where cg.can_pickup
     and cg.pickup_set_role = 'teacher'
     and cg.pickup_confirmed_at is null;

comment on view kq.pickups_to_confirm is
  'Adults a teacher has authorised to collect a child, which an administrator '
  'has not yet confirmed. The tick is already in force. This is the review, '
  'not the gate.';

create index if not exists kq_cg_to_confirm_idx
  on kq.child_guardians (pickup_set_at)
  where can_pickup and pickup_set_role = 'teacher' and pickup_confirmed_at is null;

-- ── The audit trail gains one word ───────────────────────────────────────────
-- A confirmation is not a change to can_pickup, so 'pickup_changed' would be a
-- lie, and 'note' would bury it among status notes. It gets its own type.
alter table kq.child_events drop constraint if exists child_events_event_type_check;

alter table kq.child_events
  add constraint child_events_event_type_check
  check (event_type in ('created', 'field_change', 'group_change',
                        'guardian_added', 'guardian_removed',
                        'pickup_changed', 'pickup_confirmed',
                        'deactivated', 'note'));

-- 013 built a partial index over the sensitive event types. Rebuilt to include
-- the new one, so "everything that ever touched who may collect this child" is
-- still one index scan.
drop index if exists kq.kq_child_events_sensitive_idx;

create index kq_child_events_sensitive_idx
  on kq.child_events (child_id, occurred_at desc)
  where event_type in ('pickup_changed', 'pickup_confirmed',
                       'guardian_removed', 'guardian_added')
     or field in ('allergies', 'care_notes', 'active');
