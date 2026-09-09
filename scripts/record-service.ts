/**
 * scripts/record-service.ts
 *
 * Records a Sunday service count into ops.service_attendance.
 *
 * A stopgap until there is a form. Sunday attendance exists nowhere in any
 * system — Planning Center does not track services, and the monthly metrics
 * spreadsheet stops at February 2026 — so until someone can type it into a
 * screen, this is how a number gets in.
 *
 * Children are pulled from KidsQuest automatically when that Sunday has
 * check-ins recorded, and left null when it does not. Null is deliberate: a
 * Sunday with no register is not a Sunday with no children.
 *
 * Usage:
 *   pnpm record:service --campus=MyDinh --date=2026-08-16 --adults=489 \
 *     --benchmark="Programme year 2026-27" --apply
 *
 *   pnpm record:service --list          # what has been recorded so far
 *   pnpm record:service --baselines     # the resulting denominators
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

const arg = (name: string) => {
  const a = process.argv.slice(2).find((x) => x.startsWith(`--${name}=`))
  return a ? a.slice(name.length + 3).replace(/^"|"$/g, '') : undefined
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const { getPool } = await import('../src/lib/db')
  const pool = getPool()
  const q = async <T extends Record<string, unknown>>(sql: string, p: unknown[] = []) =>
    (await pool.query<T>(sql, p)).rows

  // ── listing modes ──
  if (args.includes('--list')) {
    const rows = await q<Record<string, string>>(`
      select campus, service_date::text, adults::text, kids::text,
             kids_source, total::text, is_benchmark::text, benchmark_label
        from ops.service_attendance
       order by service_date desc, campus
       limit 60
    `)
    if (rows.length === 0) {
      console.log('\n  Nothing recorded yet.\n')
    } else {
      console.log('\n  Date        Campus        Adults   Kids  Total  Note')
      console.log('  ' + '─'.repeat(70))
      for (const r of rows) {
        const kids = r.kids ?? '—'
        const flag = r.is_benchmark === 'true' ? ` ★ ${r.benchmark_label ?? 'benchmark'}` : ''
        console.log(
          `  ${r.service_date}  ${(r.campus ?? '').padEnd(12)} ${String(r.adults ?? '—').padStart(6)} ` +
            `${String(kids).padStart(6)} ${String(r.total ?? '—').padStart(6)}${flag}`,
        )
      }
      console.log('')
    }
    await pool.end()
    process.exit(0)
  }

  if (args.includes('--baselines')) {
    const rows = await q<Record<string, string>>(
      `select campus, baseline, label, value::text, based_on::text
         from ops.attendance_baselines
        order by campus, baseline, as_of desc`,
    )
    if (rows.length === 0) {
      console.log('\n  No baselines yet — record at least one service.\n')
    } else {
      console.log('\n  Campus        Baseline          Label       Value  Based on')
      console.log('  ' + '─'.repeat(70))
      for (const r of rows) {
        console.log(
          `  ${(r.campus ?? '').padEnd(12)}  ${(r.baseline ?? '').padEnd(16)}  ${(r.label ?? '').padEnd(10)} ` +
            `${String(r.value ?? '—').padStart(6)}  ${r.based_on} service(s)`,
        )
      }
      console.log('')
    }
    await pool.end()
    process.exit(0)
  }

  // ── record ──
  const campus = arg('campus')
  const date = arg('date')
  const adults = arg('adults')
  const kidsArg = arg('kids')
  const benchmark = arg('benchmark')
  const note = arg('note')
  const doApply = args.includes('--apply')

  if (!campus || !date) {
    console.error('\n  --campus and --date are required.')
    console.error('  e.g. pnpm record:service --campus=MyDinh --date=2026-08-16 --adults=489 --apply\n')
    process.exit(1)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`\n  --date must be YYYY-MM-DD, got "${date}"\n`)
    process.exit(1)
  }

  // Children come from KidsQuest where that Sunday was actually registered.
  const [kq] = await q<{ children: string; sessions: string }>(
    `select count(distinct a.child_id)::text as children,
            count(distinct s.id)::text        as sessions
       from kq.sessions s
       left join kq.attendance a on a.session_id = s.id
      where s.service_date = $1`,
    [date],
  )
  const kqChildren = Number(kq?.children ?? 0)
  const kqSessions = Number(kq?.sessions ?? 0)

  let kids: number | null = null
  let kidsSource = 'unknown'
  if (kidsArg !== undefined) {
    kids = Number(kidsArg)
    kidsSource = 'counted'
  } else if (kqChildren > 0) {
    kids = kqChildren
    kidsSource = 'kidsquest'
  }

  console.log(`\n  ${campus} · ${date}`)
  console.log(`  adults        ${adults ?? '— (not given)'}`)
  if (kidsSource === 'kidsquest') {
    console.log(`  kids          ${kids}  (from KidsQuest check-ins)`)
  } else if (kidsSource === 'counted') {
    console.log(`  kids          ${kids}  (given on the command line)`)
  } else {
    console.log(`  kids          not recorded`)
    if (kqSessions > 0) {
      console.log(
        `                KidsQuest has ${kqSessions} session(s) that day but no children checked in.`,
      )
      console.log(`                Recorded as unknown, not as zero — pass --kids=N if you know it.`)
    }
  }
  if (benchmark) console.log(`  benchmark     ★ ${benchmark}`)

  if (!doApply) {
    console.log('\n  DRY RUN — nothing written. Re-run with --apply.\n')
    await pool.end()
    process.exit(0)
  }

  await q(
    `insert into ops.service_attendance
       (campus, service_date, adults, kids, kids_source, is_benchmark, benchmark_label, note, recorded_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (campus, service_date) do update set
       adults          = coalesce(excluded.adults, ops.service_attendance.adults),
       kids            = coalesce(excluded.kids,   ops.service_attendance.kids),
       kids_source     = case when excluded.kids is not null
                              then excluded.kids_source
                              else ops.service_attendance.kids_source end,
       is_benchmark    = excluded.is_benchmark or ops.service_attendance.is_benchmark,
       benchmark_label = coalesce(excluded.benchmark_label, ops.service_attendance.benchmark_label),
       note            = coalesce(excluded.note, ops.service_attendance.note),
       updated_at      = now()`,
    [
      campus,
      date,
      adults === undefined ? null : Number(adults),
      kids,
      kidsSource,
      Boolean(benchmark),
      benchmark ?? null,
      note ?? null,
      'record-service',
    ],
  )

  console.log('\n  ✓ recorded\n')
  await pool.end()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
