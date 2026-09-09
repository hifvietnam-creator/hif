-- 016_service_attendance.sql
--
-- Sunday service attendance, and the baselines the dashboard measures against.
--
-- Why this table exists at all:
--
-- The dashboard has been quoting figures against the 6,840 records in Planning
-- Center. That is not a denominator. It counts alumni, one-time visitors from
-- years ago, and people who have left Hanoi. Sunday attendance is 400-500, so
-- every percentage against 6,840 was quietly meaningless.
--
-- The measures that mean something, per the Pastor:
--   · average Sunday attendance over a month  — the ongoing denominator
--   · peak attendance (Easter)                — the ceiling, who can be gathered
--   · the programme-year benchmark            — 16 August 2026, the start of the
--                                               year when people return from
--                                               summer; MyDinh counted 489 adults
--
-- Sunday services are NOT in ops.ministry_events, because Planning Center Groups
-- does not track them — those 128 gatherings are small groups and fellowships.
-- Services also need something groups do not: adults and children counted
-- separately, because KidsQuest counts its own and a service total without them
-- is not the congregation.

create table if not exists ops.service_attendance (
  id              bigserial primary key,

  -- Free text rather than a foreign key to pco.campuses: these counts are made
  -- by a person with a clicker, and must not stop being recordable because a
  -- campus was renamed or a new venue has no PCO record yet.
  campus          text not null,
  service_date    date not null,

  adults          integer,
  kids            integer,

  -- Where the children's figure came from. A number taken from KidsQuest
  -- check-ins is evidence; one estimated from a glance at the room is not, and
  -- the two must not be averaged together as if they were the same.
  kids_source     text not null default 'unknown'
                    check (kids_source in ('kidsquest', 'counted', 'estimated', 'unknown')),

  -- Null when neither figure is known, rather than 0. A service with nobody
  -- recorded is not a service nobody attended.
  total           integer generated always as (
                    case when adults is null and kids is null then null
                         else coalesce(adults, 0) + coalesce(kids, 0) end
                  ) stored,

  -- Marks a service that is a reference point rather than an ordinary week.
  is_benchmark    boolean not null default false,
  benchmark_label text,

  note            text,
  recorded_by     text,
  source_import_id bigint references ops.file_imports(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (campus, service_date)
);

create index if not exists service_attendance_date_idx   on ops.service_attendance (service_date);
create index if not exists service_attendance_campus_idx on ops.service_attendance (campus);
create index if not exists service_attendance_bench_idx  on ops.service_attendance (is_benchmark)
  where is_benchmark;

comment on table ops.service_attendance is
  'One row per campus per Sunday. The grain is the service, not the month: a '
  'monthly average can always be computed from services, but services cannot '
  'be recovered from an average.';

comment on column ops.service_attendance.kids is
  'Children present, counted separately because KidsQuest runs its own '
  'register. Null means not recorded — which is what August 2026 looks like, '
  'since KidsQuest history was imported only to the end of July.';

-- ── Baselines ────────────────────────────────────────────────────────────────
-- What a percentage on the dashboard should be measured against. Exposed as a
-- view so every page uses the same definition rather than each inventing one.

create or replace view ops.attendance_baselines as
with monthly as (
  select campus,
         date_trunc('month', service_date)::date as period_month,
         round(avg(total) filter (where total is not null), 0)::int as avg_total,
         count(*) filter (where total is not null)::int             as services_counted
    from ops.service_attendance
   group by 1, 2
)
select campus,
       'monthly_average'                                    as baseline,
       to_char(period_month, 'YYYY-MM')                     as label,
       avg_total                                            as value,
       services_counted                                     as based_on,
       period_month                                         as as_of
  from monthly
 where avg_total is not null

union all

select campus,
       'peak',
       to_char(service_date, 'YYYY-MM-DD'),
       total,
       1,
       service_date
  from (
    select distinct on (campus) campus, service_date, total
      from ops.service_attendance
     where total is not null
     order by campus, total desc, service_date desc
  ) p

union all

select campus,
       'benchmark',
       coalesce(benchmark_label, to_char(service_date, 'YYYY-MM-DD')),
       total,
       1,
       service_date
  from ops.service_attendance
 where is_benchmark;

comment on view ops.attendance_baselines is
  'The three denominators worth using: the monthly average, the peak, and the '
  'programme-year benchmark. Never the Planning Center record count — a record '
  'is not a person in a seat.';
