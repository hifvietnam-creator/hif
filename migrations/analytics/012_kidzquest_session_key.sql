-- 012_kidzquest_session_key.sql
--
-- Fixes duplicate sessions. Explorers appeared twice in the room picker.
--
-- THE BUG
--
-- 010 declared `unique (service_date, group_code, campus_id)`. In Postgres,
-- NULLs are DISTINCT in a unique constraint — two rows both holding NULL do not
-- conflict with each other. HIF has one campus in the data so far, so every
-- session is created with campus_id NULL, and the constraint therefore never
-- fires. `openSession`'s ON CONFLICT never matched, and each visit to the room
-- picker inserted another row.
--
-- Left alone this is not cosmetic: two sessions for one room means a child
-- checked in on one tablet is invisible on the other, and "who is still here?"
-- silently answers for half the room.
--
-- The fix is to make "no campus" a real value for uniqueness purposes by
-- indexing coalesce(campus_id, 0) rather than campus_id.

-- ── Collapse the duplicates that already exist ───────────────────────────────
-- Keep the lowest id per (date, group, campus) and move any attendance rows
-- onto it. Attendance is unique per (session_id, child_id), so a child recorded
-- on both duplicates would collide — DO NOTHING keeps the survivor's row, then
-- the loser is deleted by cascade.

with ranked as (
  select id,
         first_value(id) over (
           partition by service_date, group_code, coalesce(campus_id, 0)
           order by id
         ) as keep_id
    from kq.sessions
)
update kq.attendance a
   set session_id = r.keep_id
  from ranked r
 where a.session_id = r.id
   and r.id <> r.keep_id
   and not exists (
     select 1 from kq.attendance b
      where b.session_id = r.keep_id and b.child_id = a.child_id
   );

delete from kq.sessions s
 using (
   select id,
          first_value(id) over (
            partition by service_date, group_code, coalesce(campus_id, 0)
            order by id
          ) as keep_id
     from kq.sessions
 ) r
 where s.id = r.id and r.id <> r.keep_id;

-- ── Replace the constraint with an index that treats NULL as a value ─────────

alter table kq.sessions
  drop constraint if exists sessions_service_date_group_code_campus_id_key;

create unique index if not exists kq_sessions_unique
  on kq.sessions (service_date, group_code, (coalesce(campus_id, 0)));

comment on index kq.kq_sessions_unique is
  'Indexes coalesce(campus_id, 0) rather than campus_id. A plain unique '
  'constraint does not collapse NULLs, so single-campus sessions were never '
  'deduplicated and the room picker showed the same room twice.';
