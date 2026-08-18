-- 011_kidzquest_year_bounds.sql
--
-- Fixes a wrong end date seeded by 010, and adds the constraint that would
-- have caught it.
--
-- THE ERROR
--
-- 010 seeded 2026-27 as 2026-08-02 → 2027-08-07, on the assumption that the
-- first Sunday of August 2027 falls on the 7th. It does not.
--
--   2026-08-02 is a Sunday (confirmed: it is a column header in the imported
--   attendance sheets, which list consecutive Sundays).
--   + 364 days — exactly 52 weeks — is 2027-08-01, so that is also a Sunday.
--   1 August is the earliest date August can offer, so it IS the first Sunday.
--
-- The seeded value therefore ran a week past the point at which 2027-28 will
-- begin. Harmless today because nothing reads ends_on yet — the importer uses
-- an explicit rollover constant — but it would have produced two overlapping
-- academic years the moment anyone added the next one.
--
-- The convention, stated plainly since 010's comment got it wrong: a year runs
-- from its rollover Sunday to the DAY BEFORE the next rollover. Not "the Sunday
-- before" — the day before. The first two seeded rows already followed this;
-- only the third did not.

update kq.academic_years
   set ends_on = date '2027-07-31'
 where code = '2026-27'
   and ends_on = date '2027-08-07';

comment on column kq.academic_years.ends_on is
  'The day before the next rollover — not the last Sunday. A year is a '
  'contiguous span: [starts_on, ends_on] and the next year begins ends_on + 1.';

-- ── Make the class of error impossible ───────────────────────────────────────
--
-- A date typed by hand was wrong and nothing objected. These constraints mean
-- the next wrong one fails loudly at insert time rather than sitting in the
-- table until someone notices a child in two academic years at once.

alter table kq.academic_years
  drop constraint if exists academic_year_ends_after_start;

alter table kq.academic_years
  add constraint academic_year_ends_after_start
  check (ends_on > starts_on);

-- Overlapping years are the real hazard: kq.enrollments references a year code,
-- so two overlapping spans make "which year was this child in on that Sunday?"
-- ambiguous — and that question is the whole point of the enrolment table.
--
-- GiST over a daterange needs no extra extension; the exclusion operator is
-- built in for range types.
alter table kq.academic_years
  drop constraint if exists academic_years_no_overlap;

alter table kq.academic_years
  add constraint academic_years_no_overlap
  exclude using gist (daterange(starts_on, ends_on, '[]') with &&);

-- Sanity: rollovers must land on a Sunday. Postgres numbers Sunday as 0 for
-- extract(dow). Advisory rather than absolute — if the ministry ever moves to a
-- Saturday service this is the line to change, deliberately.
alter table kq.academic_years
  drop constraint if exists academic_year_starts_on_sunday;

alter table kq.academic_years
  add constraint academic_year_starts_on_sunday
  check (extract(dow from starts_on) = 0);
