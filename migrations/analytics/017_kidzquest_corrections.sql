-- 017_kidzquest_corrections.sql
--
-- Lets an administrator correct a past Sunday.
--
-- The case is ordinary: a helper ticked a child who never arrived, or missed
-- one who did, and nobody noticed until weeks later. Ate needs to put it right.
--
-- WHY A THIRD SOURCE RATHER THAN REUSING 'import'
--
-- 010 had two: 'station' for somebody tapping at a door, 'import' for a
-- spreadsheet tick. A correction is neither. It is a claim made after the fact
-- by somebody who was not necessarily in the room, and it deserves to look
-- different from a record made at the time.
--
-- The alternative — quietly writing corrections as 'import' — would make a
-- guess indistinguishable from a register, which is exactly the sort of small
-- dishonesty that makes a dataset untrustworthy later.

alter table kq.attendance drop constraint if exists attendance_source_check;

alter table kq.attendance
  add constraint attendance_source_check
  check (source in ('station', 'import', 'correction'));

comment on column kq.attendance.source is
  'station  — somebody tapped at a door, so there is a time and a named adult. '
  'import   — a tick on a paper register, no time, no adult. '
  'correction — added afterwards by an administrator for a Sunday that had no '
  'record at all. Weaker evidence than either of the others; shown differently.';

-- A row flipped to 'absent' keeps everything else. The check-in time, the adult
-- who dropped the child off, the collection: all still there, because they are
-- the record of a child being handed over and must survive somebody deciding
-- afterwards that the attendance was wrong.
--
-- So an absent row with a checked_in_at is not a contradiction. It is a
-- correction with its history intact, and this index finds them.
create index if not exists kq_att_corrected_idx
  on kq.attendance (session_id)
  where status = 'absent' and checked_in_at is not null;

comment on index kq.kq_att_corrected_idx is
  'Check-ins later marked absent. Worth a look if one child accumulates them: '
  'either somebody is tapping the wrong row on a Sunday, or somebody is '
  'correcting records they should not be.';
