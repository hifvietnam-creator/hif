-- 014_ministry_ops.sql
--
-- Ministry attendance and monthly metrics, from the spreadsheets staff already
-- keep. This is the data behind "HIF Monthly Metrics_with Dashboard.xlsx", the
-- report the dashboard is meant to replace.
--
-- Unlike pco.* and ml.*, this is not a mirror of an external system. There is
-- no upstream to re-sync from — the spreadsheets ARE the source, and several
-- of them are point-in-time exports that will not be reproducible later. So
-- every row records which file it came from, and imports accumulate rather than
-- overwrite. Losing history here means losing it permanently.

create schema if not exists ops;

-- ── Provenance ───────────────────────────────────────────────────────────────
-- One row per file imported. The hash is the guard: the folder already contains
-- the same African Fellowship export under two different names, and counting
-- those twice would inflate every attendance figure that ministry reports.

create table if not exists ops.file_imports (
  id             bigserial primary key,
  filename       text        not null,
  sha256         text        not null unique,
  kind           text        not null,   -- group_attendance | monthly_metrics | registration | roster
  snapshot_date  date,                   -- the date the export represents, not when it was imported
  sheet_count    integer,
  row_count      integer,
  imported_at    timestamptz not null default now(),
  imported_by    text,
  note           text
);

comment on column ops.file_imports.sha256 is
  'Unique. Re-importing an identical file is refused rather than duplicated. '
  'A genuinely updated export has different bytes and so imports as a new snapshot.';

comment on column ops.file_imports.snapshot_date is
  'What the data describes, which is not when it was imported. Membership '
  'Signup exists as both a 21-row April file and a 59-row August one; they are '
  'two snapshots, not a correction.';

-- ── Ministries ───────────────────────────────────────────────────────────────
-- The canonical list. Spreadsheets name the same ministry several ways
-- ("Filippino Fellowship", "Filipino Fellowship", "PINOY"), so importers map
-- onto this rather than creating a new ministry per spelling.

create table if not exists ops.ministries (
  id               bigserial primary key,
  slug             text not null unique,
  name             text not null,
  category         text,        -- service | fellowship | connect_group | course | youth | kids | outreach
  campus           text,        -- MyDinh | Ecopark | Thai Nguyen | (null = all)
  -- A ministry that has stopped should read as stopped, not as a ministry with
  -- an attendance of zero. African Fellowship is currently paused "due to
  -- Administration reasons" and would otherwise look like collapse.
  is_active        boolean not null default true,
  discontinued_on  date,
  note             text,
  created_at       timestamptz not null default now()
);

-- Alternative spellings seen in spreadsheets, mapped to one ministry.
create table if not exists ops.ministry_aliases (
  alias        citext primary key,
  ministry_id  bigint not null references ops.ministries(id) on delete cascade,
  source       text
);

create index if not exists ministry_aliases_ministry_idx on ops.ministry_aliases (ministry_id);

-- ── Events ───────────────────────────────────────────────────────────────────
-- One row per gathering. This is the grain the Excel report aggregates from,
-- and keeping it means a weekly average can always be traced back to the
-- meetings it came from.

create table if not exists ops.ministry_events (
  id                 bigserial primary key,
  ministry_id        bigint references ops.ministries(id) on delete set null,
  event_date         date not null,
  event_name         text,
  location           text,
  starts_at          timestamptz,
  ends_at            timestamptz,

  -- Counts as reported. Total is stored rather than derived: some sources give
  -- only a headcount, and computing it from the breakdown would invent detail
  -- that was never recorded.
  total_attended     integer,
  members_attended   integer,
  visitors_attended  integer,
  members_count      integer,     -- roster size at the time, for attendance rate
  leaders            text,

  -- Kept as raw text. Matching these to PCO people is a separate problem with
  -- its own failure modes; storing the text now means the option survives.
  attended_names     text,
  absent_names       text,

  notes              text,
  source_import_id   bigint references ops.file_imports(id) on delete set null,
  external_ref       text,        -- e.g. the PCO group attendance report URL
  created_at         timestamptz not null default now(),

  -- One event per ministry per date per name. Re-importing an overlapping
  -- export updates rather than duplicates.
  unique (ministry_id, event_date, event_name)
);

create index if not exists ministry_events_date_idx     on ops.ministry_events (event_date);
create index if not exists ministry_events_ministry_idx on ops.ministry_events (ministry_id);

comment on table ops.ministry_events is
  'Attendance is a behavioural signal; roster membership is not. A group with '
  '24 members and 3 attenders is not a group of 24.';

-- ── Monthly metrics ──────────────────────────────────────────────────────────
-- The figures leadership already reviews. Some are computable from events
-- above; others are a headcount someone wrote down and have no other source.
-- Both are stored the same way so the report is complete either way.

create table if not exists ops.monthly_metrics (
  id                bigserial primary key,
  metric_key        text not null,       -- stable slug, e.g. 'mydinh_sunday_weekly_avg'
  metric_label      text not null,       -- as written in the spreadsheet
  period_month      date not null,       -- first day of the month
  value             numeric,
  ministry_id       bigint references ops.ministries(id) on delete set null,
  -- Where the number came from, so a manual headcount is never mistaken for a
  -- figure derived from event records.
  origin            text not null default 'spreadsheet',  -- spreadsheet | derived | entered
  source_import_id  bigint references ops.file_imports(id) on delete set null,
  created_at        timestamptz not null default now(),

  unique (metric_key, period_month)
);

create index if not exists monthly_metrics_month_idx  on ops.monthly_metrics (period_month);
create index if not exists monthly_metrics_metric_idx on ops.monthly_metrics (metric_key);

-- ── Registrations ────────────────────────────────────────────────────────────
-- Alpha, Pickleball, Paskong Pinoy, Family Day. The TRY-stage source that
-- exists nowhere else — these are people meeting HIF for the first time, and
-- none of them appear in Planning Center until much later, if ever.

create table if not exists ops.registrations (
  id                bigserial primary key,
  ministry_id       bigint references ops.ministries(id) on delete set null,
  event_label       text not null,       -- 'Alpha Fall 2025', 'Pickleball Mar 2026'
  registered_at     timestamptz,

  full_name         text,
  first_name        text,
  last_name         text,
  email             citext,
  phone             text,
  nationality       text,

  -- Registration forms differ wildly between ministries. Rather than a column
  -- per question, the answers are kept whole — nothing is discarded, and a
  -- question nobody anticipated is still there to query later.
  answers           jsonb,

  -- Filled in later if this person is matched to a church record. Deliberately
  -- nullable: most registrants have no PCO record, and that absence is itself
  -- the finding.
  pco_person_id     bigint references pco.people(id) on delete set null,
  matched_at        timestamptz,

  source_import_id  bigint references ops.file_imports(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists registrations_event_idx  on ops.registrations (event_label);
create index if not exists registrations_email_idx  on ops.registrations (email);
create index if not exists registrations_person_idx on ops.registrations (pco_person_id);

comment on table ops.registrations is
  'One row per person per event. Deduplication is deliberately NOT done at '
  'import: the same person registering for Alpha twice is a real, meaningful '
  'fact, not a duplicate to be cleaned away.';
