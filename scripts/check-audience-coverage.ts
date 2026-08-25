/**
 * scripts/check-audience-coverage.ts
 *
 * READ-ONLY. Answers one question before any chart gets built: for the people
 * we actually email, how much do we know about them?
 *
 * A pie chart titled "Members by ministry" that silently describes 40 of 261
 * people is worse than no chart. This measures the fill rate of every dimension
 * the staff asked for — age, gender, ministry served, ministry led — across
 * each MailerLite audience, so we find out now whether those breakdowns are
 * worth charting or whether the honest first feature is a list of gaps.
 *
 * Writes nothing.
 *
 * Usage: pnpm check:coverage
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

/**
 * The two audiences in scope. Women and KQ Parents exist in MailerLite but are
 * deliberately out of scope for now.
 */
const AUDIENCES = ['@ll Members List - July 26', '@ll People List - July 26']

const bar = (n: number, d: number, width = 20) => {
  const filled = d === 0 ? 0 : Math.round((n / d) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

async function main() {
  loadEnv()
  const { getPool } = await import('../src/lib/db')
  const pool = getPool()

  const q = async <T extends Record<string, unknown>>(sql: string, p: unknown[] = []) =>
    (await pool.query<T>(sql, p)).rows

  // ── what groups exist, and which of ours match ──
  console.log('\n  MAILERLITE GROUPS')
  console.log('  ' + '─'.repeat(72))
  const groups = await q<{ id: string; name: string; active_count: number; total: string }>(`
    select g.id, g.name, g.active_count,
           (select count(*) from ml.group_subscribers gs where gs.group_id = g.id)::text as total
      from ml.groups g
     order by g.active_count desc nulls last
  `)
  for (const g of groups) {
    const chosen = AUDIENCES.some((a) => a.toLowerCase() === g.name.toLowerCase().trim())
    console.log(
      `  ${chosen ? '▸' : ' '} ${g.name.slice(0, 44).padEnd(44)} ${String(g.total).padStart(6)} subscribers`,
    )
  }
  const matched = groups.filter((g) =>
    AUDIENCES.some((a) => a.toLowerCase() === g.name.toLowerCase().trim()),
  )
  console.log(`\n  ${matched.length} of ${AUDIENCES.length} named audiences matched by name.`)
  const missing = AUDIENCES.filter(
    (a) => !groups.some((g) => g.name.toLowerCase().trim() === a.toLowerCase()),
  )
  if (missing.length) {
    console.log(`  ! not found: ${missing.join(' · ')}`)
    console.log('    (name may differ slightly in MailerLite — check the list above)')
  }

  // ── coverage per audience ──
  for (const g of matched) {
    const [row] = await q<Record<string, string>>(
      `
      with aud as (
        select distinct l.pco_person_id as person_id
          from ml.group_subscribers gs
          join hif.email_links l on l.mailerlite_subscriber_id = gs.subscriber_id
         where gs.group_id = $1
      ),
      subs as (
        select count(*)::int n from ml.group_subscribers where group_id = $1
      ),
      -- Counted separately, because email_links is many-to-many: one shared
      -- household address resolves to several people. Dividing people by
      -- subscribers gave "129% matched", which is not a percentage of anything.
      subs_matched as (
        select count(distinct gs.subscriber_id)::int n
          from ml.group_subscribers gs
          join hif.email_links l on l.mailerlite_subscriber_id = gs.subscriber_id
         where gs.group_id = $1
      ),
      shared as (
        select count(distinct gs.subscriber_id)::int n
          from ml.group_subscribers gs
          join hif.email_links l on l.mailerlite_subscriber_id = gs.subscriber_id
         where gs.group_id = $1 and l.is_ambiguous
      )
      select
        (select n from subs)::text                                                as subscribers,
        (select n from subs_matched)::text                                        as subscribers_matched,
        (select n from shared)::text                                              as shared_inboxes,
        count(*)::text                                                            as matched_people,
        count(*) filter (where p.birthdate is not null)::text                     as has_birthdate,
        count(*) filter (where nullif(trim(p.gender),'') is not null)::text       as has_gender,
        count(*) filter (where exists (
          select 1 from pco.field_data fd
            join pco.field_definitions d on d.id = fd.field_definition_id
           where fd.person_id = p.id
             and d.name like 'Volunteer in Ministry (%'
             and nullif(trim(fd.value),'') is not null))::text                    as has_volunteer,
        count(*) filter (where exists (
          select 1 from pco.field_data fd
            join pco.field_definitions d on d.id = fd.field_definition_id
           where fd.person_id = p.id
             and d.name like 'Role in Ministry%'
             and nullif(trim(fd.value),'') is not null))::text                    as has_role,
        count(*) filter (where nullif(trim(p.membership),'') is not null)::text   as has_membership,
        count(*) filter (where p.primary_campus_id is not null)::text             as has_campus,
        -- Real group membership, with PCO's own leader/member role. Larger and
        -- more truthful than the "Volunteer in Ministry" custom field, which
        -- someone filled in once and nobody maintains.
        count(*) filter (where exists (
          select 1 from pco.group_memberships gm
           where gm.person_id = p.id))::text                                      as in_a_group,
        count(*) filter (where exists (
          select 1 from pco.group_memberships gm
           where gm.person_id = p.id and lower(gm.role) = 'leader'))::text        as leads_a_group
        from aud
        join pco.people p on p.id = aud.person_id
    `,
      [g.id],
    )

    const subs = parseInt(row?.subscribers ?? '0', 10)
    const subsMatched = parseInt(row?.subscribers_matched ?? '0', 10)
    const sharedInboxes = parseInt(row?.shared_inboxes ?? '0', 10)
    const people = parseInt(row?.matched_people ?? '0', 10)

    console.log(`\n  ${g.name}`)
    console.log('  ' + '─'.repeat(72))
    console.log(
      `  ${subs} subscribers · ${subsMatched} matched to a church record ` +
        `(${subs ? Math.round((subsMatched / subs) * 100) : 0}%)`,
    )
    console.log(
      `  those resolve to ${people} people — ${sharedInboxes} are shared inboxes ` +
        `(a couple or family on one address)`,
    )
    if (people === 0) {
      console.log('  No matched people — nothing can be broken down for this audience.')
      continue
    }
    console.log('')
    const dims: Array<[string, string]> = [
      ['Gender', 'has_gender'],
      ['Membership status', 'has_membership'],
      ['Campus', 'has_campus'],
      ['Birthdate (age)', 'has_birthdate'],
      ['— ministry, two sources —', ''],
      ['In a group (PCO)', 'in_a_group'],
      ['Leads a group (PCO)', 'leads_a_group'],
      ['Volunteer field', 'has_volunteer'],
      ['Role field', 'has_role'],
    ]
    for (const [label, key] of dims) {
      if (!key) {
        console.log(`    ${label}`)
        continue
      }
      const n = parseInt(row?.[key] ?? '0', 10)
      const pct = Math.round((n / people) * 100)
      // Group membership is a fact, not a field: someone either is in a group
      // or is not, so a low number is a finding rather than missing data.
      const isFact = key === 'in_a_group' || key === 'leads_a_group'
      const verdict = isFact
        ? '  (a fact, not a gap)'
        : pct >= 70
          ? ''
          : pct >= 30
            ? '  ← thin'
            : '  ← too sparse to chart'
      console.log(
        `    ${label.padEnd(26)} ${bar(n, people)} ${String(n).padStart(5)}/${people}  ${String(pct).padStart(3)}%${verdict}`,
      )
    }
  }

  // ── church-wide, for comparison ──
  const [all] = await q<Record<string, string>>(`
    select count(*)::text                                                        as people,
           count(*) filter (where birthdate is not null)::text                   as has_birthdate,
           count(*) filter (where nullif(trim(gender),'') is not null)::text     as has_gender
      from pco.people
  `)
  console.log(`\n  CHURCH-WIDE (all ${all?.people} people)`)
  console.log('  ' + '─'.repeat(72))
  const total = parseInt(all?.people ?? '0', 10)
  for (const [label, key] of [['Gender', 'has_gender'], ['Birthdate', 'has_birthdate']] as const) {
    const n = parseInt(all?.[key] ?? '0', 10)
    console.log(`    ${label.padEnd(20)} ${bar(n, total)} ${String(n).padStart(5)}/${total}  ${Math.round((n / total) * 100)}%`)
  }

  console.log('')
  console.log('  Anything under 30% should not be a pie chart — it should be a list of')
  console.log('  who is missing, so the gap can be closed rather than averaged over.')
  console.log('')

  await pool.end()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
