/**
 * scripts/check-attendance-baseline.ts
 *
 * READ-ONLY. Answers the Pastor's question before anything is built on it.
 *
 * The dashboard has been using the PCO record count (6,840) as the implicit
 * denominator. That is wrong: a record is not a person in a seat. The measures
 * that matter are average Sunday attendance, peak attendance, and the start of
 * the programme year — and adults alone are not the congregation, because the
 * children are counted separately by KidsQuest.
 *
 * This reports:
 *   1. whether kq.attendance actually holds data, and for which Sundays
 *   2. what Sunday attendance figures exist in ops.monthly_metrics
 *   3. whether anything is recorded for 16 August 2026
 *
 * Writes nothing.
 *
 * Usage: pnpm check:baseline
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function loadEnv() {
  try {
    const envFile = readFileSync(resolve(ROOT, '.env'), 'utf8')
    for (const line of envFile.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  } catch {
    /* optional */
  }
}

const BENCHMARK = '2026-08-16'

async function main() {
  loadEnv()
  const { getPool } = await import('../src/lib/db')
  const pool = getPool()
  const q = async <T extends Record<string, unknown>>(sql: string, p: unknown[] = []) =>
    (await pool.query<T>(sql, p)).rows

  // ── 1. KidsQuest ──
  console.log('\n  KIDSQUEST ATTENDANCE')
  console.log('  ' + '─'.repeat(72))

  const [kq] = await q<Record<string, string>>(`
    select (select count(*) from kq.sessions)::text                       as sessions,
           (select count(*) from kq.attendance)::text                     as attendance_rows,
           (select count(*) from kq.children)::text                       as children,
           (select min(service_date)::text from kq.sessions)              as first_session,
           (select max(service_date)::text from kq.sessions)              as last_session,
           (select count(*) from kq.attendance where source = 'station')::text as from_station,
           (select count(*) from kq.attendance where source = 'import')::text  as from_import
  `)

  console.log(`  children on record      ${kq?.children ?? 0}`)
  console.log(`  sessions                ${kq?.sessions ?? 0}`)
  console.log(`  attendance rows         ${kq?.attendance_rows ?? 0}`)
  console.log(`    checked in at a door  ${kq?.from_station ?? 0}`)
  console.log(`    back-filled from paper${' '.repeat(1)}${kq?.from_import ?? 0}`)
  if (kq?.first_session) {
    console.log(`  covering                ${kq.first_session} → ${kq.last_session}`)
  }

  if (Number(kq?.attendance_rows ?? 0) === 0) {
    console.log('\n  ! No attendance recorded. The tables exist and the check-in app is built,')
    console.log('    but nothing has been captured yet — so kids cannot be added to any')
    console.log('    Sunday total until KidsQuest starts using it or history is imported.')
  } else {
    const recent = await q<{ service_date: string; children: number; groups: number }>(`
      select s.service_date::text                        as service_date,
             count(distinct a.child_id)::int             as children,
             count(distinct s.group_code)::int           as groups
        from kq.sessions s
        left join kq.attendance a on a.session_id = s.id
       group by s.service_date
       order by s.service_date desc
       limit 12
    `)
    if (recent.length) {
      console.log('\n  Most recent Sundays')
      console.log('    Date          Children  Groups')
      for (const r of recent) {
        console.log(
          `    ${r.service_date}  ${String(r.children).padStart(8)}  ${String(r.groups).padStart(6)}`,
        )
      }
    }
  }

  // ── 2. Sunday figures we hold ──
  console.log('\n\n  SUNDAY ATTENDANCE ALREADY RECORDED')
  console.log('  ' + '─'.repeat(72))

  const sunday = await q<{
    metric_label: string
    period_month: string
    value: string | null
    value_status: string
  }>(`
    select metric_label, to_char(period_month,'YYYY-MM') as period_month,
           value::text, value_status
      from ops.monthly_metrics
     where metric_label ilike '%sunday%' or metric_label ilike '%kidsquest%'
        or metric_label ilike '%kidquest%' or metric_label ilike '%kq%'
     order by metric_label, period_month
  `)

  if (sunday.length === 0) {
    console.log('  Nothing found.')
  } else {
    let current = ''
    for (const r of sunday) {
      if (r.metric_label !== current) {
        current = r.metric_label
        console.log(`\n  ${current}`)
      }
      const shown =
        r.value_status === 'reported' || r.value_status === 'zero'
          ? r.value
          : `(${r.value_status})`
      console.log(`    ${r.period_month}  ${String(shown).padStart(6)}`)
    }
  }

  // ── 3. The proposed benchmark ──
  console.log('\n\n  BENCHMARK: 16 AUGUST 2026')
  console.log('  ' + '─'.repeat(72))

  const [bench] = await q<Record<string, string>>(
    `select (select count(*) from ops.ministry_events where event_date = $1)::text as events,
            (select count(*) from kq.sessions where service_date = $1)::text       as kq_sessions,
            (select count(distinct a.child_id) from kq.attendance a
               join kq.sessions s on s.id = a.session_id
              where s.service_date = $1)::text                                     as kq_children`,
    [BENCHMARK],
  )

  console.log(`  gatherings recorded     ${bench?.events ?? 0}`)
  console.log(`  KidsQuest sessions      ${bench?.kq_sessions ?? 0}`)
  console.log(`  children present        ${bench?.kq_children ?? 0}`)
  console.log('')
  console.log('  Adults were counted at 489. Nothing in the database records that yet:')
  console.log('  the monthly metrics stop at February 2026, and Sunday services are not')
  console.log('  in ops.ministry_events because Planning Center Groups does not track')
  console.log('  them. A benchmark has to be entered, not derived.')
  console.log('')

  await pool.end()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
