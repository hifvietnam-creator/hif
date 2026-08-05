import React from 'react'

import {
  getCampuses,
  getGroupConnection,
  getGroupTypes,
  getHeadline,
  getMembershipBreakdown,
  getNationalities,
  getSyncStatus,
} from '@/lib/queries/congregation'

// ── Small presentational helpers ─────────────────────────────────────────────

function Stat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {note ? <div className="mt-1 text-xs text-neutral-500">{note}</div> : null}
    </div>
  )
}

function Section({
  title,
  caveat,
  children,
}: {
  title: string
  caveat?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      {caveat ? <p className="mt-1 text-xs text-neutral-500">{caveat}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Bar rows. Plain CSS rather than a charting library — fewer dependencies,
 *  and for validation a readable number beats a pretty curve. */
function Bars({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <div className="w-52 shrink-0 truncate text-neutral-700 dark:text-neutral-300" title={r.label}>
            {r.label}
          </div>
          <div className="h-4 flex-1 rounded bg-neutral-100 dark:bg-neutral-900">
            <div
              className="h-4 rounded bg-neutral-400 dark:bg-neutral-600"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
          <div className="w-16 shrink-0 text-right tabular-nums">{r.count.toLocaleString()}</div>
          <div className="w-12 shrink-0 text-right text-xs tabular-nums text-neutral-500">
            {total > 0 ? `${((r.count / total) * 100).toFixed(0)}%` : '—'}
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function CongregationPage() {
  const [headline, membership, nationality, campuses, connection, groupTypes, syncs] =
    await Promise.all([
      getHeadline(),
      getMembershipBreakdown(),
      getNationalities(15),
      getCampuses(),
      getGroupConnection(),
      getGroupTypes(),
      getSyncStatus(),
    ])

  const peopleSync = syncs.find((s) => s.resource === 'pco.people')
  const lastRun = peopleSync?.last_run_at ? new Date(peopleSync.last_run_at) : null

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Congregation Overview</h1>
        <span className="text-xs text-neutral-500">
          {lastRun ? `Data as of ${lastRun.toLocaleString()}` : 'Never synced'}
        </span>
      </div>

      <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Everyone Planning Center knows about — not everyone who attends. Membership statuses are
        shown exactly as they are recorded in PCO, with no grouping or interpretation applied.
      </p>

      {/* ── Headline ─────────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="People in PCO" value={headline.people} />
        <Stat label="Active" value={headline.active} note={`${headline.inactive} inactive`} />
        <Stat
          label="With an email"
          value={headline.withEmail}
          note={`${headline.withoutEmail} without`}
        />
        <Stat
          label="In a group"
          value={headline.inGroup}
          note={`${((headline.inGroup / Math.max(1, headline.people)) * 100).toFixed(0)}% of records`}
        />
        <Stat label="Active groups" value={headline.groups} note="archived excluded" />
        <Stat
          label="On a team rota"
          value={headline.serving}
          note={`across ${headline.teams} teams · Services only`}
        />
      </div>

      <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <strong>Worth saying plainly:</strong> this is a record count, not an attendance count.
        Sunday attendance is roughly 400–500, so most of these {headline.people.toLocaleString()}{' '}
        people are not currently attending.
      </p>

      {/* ── Membership ───────────────────────────────────────────────────── */}
      <Section
        title="Membership status"
        caveat="Verbatim from the PCO membership field. Please flag any status that is unused, misapplied, or means something different from what it says."
      >
        <Bars rows={membership} total={headline.people} />
      </Section>

      {/* ── Campus ───────────────────────────────────────────────────────── */}
      <Section title="Primary campus">
        <Bars rows={campuses} total={headline.people} />
      </Section>

      {/* ── Nationality ──────────────────────────────────────────────────── */}
      <Section
        title={`Nationality — top 15 of ${nationality.distinct}`}
        caveat={`From a custom field, recorded for ${nationality.covered.toLocaleString()} of ${headline.people.toLocaleString()} people (${((nationality.covered / headline.people) * 100).toFixed(0)}%). Percentages below are of those with a value, not of everyone.`}
      >
        <Bars rows={nationality.rows} total={nationality.covered} />
      </Section>

      {/* ── Groups ───────────────────────────────────────────────────────── */}
      <Section title="Groups by type" caveat="Archived groups excluded.">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 text-right font-medium">Groups</th>
              <th className="py-2 text-right font-medium">People</th>
            </tr>
          </thead>
          <tbody>
            {groupTypes.map((g) => (
              <tr key={g.label} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="py-2">{g.label}</td>
                <td className="py-2 text-right tabular-nums">{g.groups.toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums">{g.people.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── Connection ───────────────────────────────────────────────────── */}
      <Section
        title="Group connection by membership status"
        caveat="How many people in each status belong to at least one group. A low rate is not necessarily a problem — but it is worth knowing which."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 text-right font-medium">People</th>
              <th className="py-2 text-right font-medium">In a group</th>
              <th className="py-2 text-right font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {connection.map((c) => (
              <tr key={c.label} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="py-2">{c.label}</td>
                <td className="py-2 text-right tabular-nums">{c.total.toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums">{c.in_group.toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums text-neutral-500">
                  {c.total > 0 ? `${((c.in_group / c.total) * 100).toFixed(0)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── Provenance ───────────────────────────────────────────────────── */}
      <Section
        title="Where this data comes from"
        caveat="Every sync, when it last ran, and whether it succeeded. Stale or failed syncs are visible here rather than hidden."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              <th className="py-2 font-medium">Source</th>
              <th className="py-2 text-right font-medium">Records</th>
              <th className="py-2 text-right font-medium">Last run</th>
              <th className="py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {syncs.map((s) => (
              <tr key={s.resource} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="py-2 font-mono text-xs">{s.resource}</td>
                <td className="py-2 text-right tabular-nums">
                  {s.records_seen?.toLocaleString() ?? '—'}
                </td>
                <td className="py-2 text-right text-xs text-neutral-500">
                  {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : '—'}
                </td>
                <td className="py-2 text-right">
                  <span
                    className={
                      s.last_run_status === 'ok'
                        ? 'text-xs text-green-600 dark:text-green-500'
                        : 'text-xs text-red-600 dark:text-red-500'
                    }
                    title={s.last_error ?? undefined}
                  >
                    {s.last_run_status ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}
