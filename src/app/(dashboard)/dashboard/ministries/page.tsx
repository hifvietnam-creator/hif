import React from 'react'

import { Bars, Section, Stat, Table, Warning } from '../../_components/ui'
import {
  getAttendanceByMonth,
  getEventsByMonth,
  getImports,
  getMetricCoverage,
  getMinistryAttendance,
  getMinistryHeadline,
  getMonthlyMetricCells,
  type MetricCell,
} from '@/lib/queries/ministries'

export const dynamic = 'force-dynamic'

/** Gaps must look like gaps. A dash is not a zero and must not read as one. */
function Cell({ cell }: { cell: MetricCell | undefined }) {
  if (!cell) return <span className="text-neutral-300 dark:text-neutral-700">·</span>
  switch (cell.value_status) {
    case 'reported':
      return <span className="tabular-nums">{Number(cell.value).toLocaleString()}</span>
    case 'zero':
      return <span className="tabular-nums text-neutral-500">0</span>
    case 'unknown':
      return (
        <span className="text-amber-600 dark:text-amber-500" title="Happened, but nobody recorded it">
          ?
        </span>
      )
    case 'not_applicable':
      return (
        <span className="text-neutral-400 dark:text-neutral-600" title="Did not run this month">
          –
        </span>
      )
    default:
      return (
        <span className="text-neutral-300 dark:text-neutral-700" title="Never filled in">
          ·
        </span>
      )
  }
}

export default async function MinistriesPage() {
  const [headline, attendance, byMonth, events, cells, coverage, imports] = await Promise.all([
    getMinistryHeadline(),
    getMinistryAttendance(),
    getAttendanceByMonth(),
    getEventsByMonth(),
    getMonthlyMetricCells(),
    getMetricCoverage(),
    getImports(),
  ])

  const months = [...new Set(cells.map((c) => c.period_month))].sort()
  const metricOrder: string[] = []
  const byMetric = new Map<string, { label: string; owner: string | null; cells: Map<string, MetricCell> }>()
  for (const c of cells) {
    if (!byMetric.has(c.metric_key)) {
      byMetric.set(c.metric_key, { label: c.metric_label, owner: c.owner, cells: new Map() })
      metricOrder.push(c.metric_key)
    }
    byMetric.get(c.metric_key)!.cells.set(c.period_month, c)
  }

  const totalCells = coverage.reduce((n, r) => n + r.months, 0)
  const reportedCells = coverage.reduce((n, r) => n + r.reported, 0)
  const completeness = totalCells ? Math.round((reportedCells / totalCells) * 100) : 0
  const neverReported = coverage.filter((r) => r.reported === 0)
  const headcountMetrics = coverage.filter((r) => r.source_kind === 'headcount')

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Ministries</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Attendance from Planning Center Groups, alongside the monthly report staff already keep.
      </p>

      <Section
        title="Overview"
        caveat="Event attendance and the monthly report are shown separately throughout. They measure different things and are not combined."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Ministries with events" value={attendance.length} />
          <Stat
            label="Gatherings recorded"
            value={headline.events}
            note={headline.firstEvent ? `${headline.firstEvent} → ${headline.lastEvent}` : undefined}
          />
          <Stat label="Total attendances" value={headline.totalAttendances} />
          <Stat label="Of those, guests" value={headline.totalGuests} note="visitors, not members" />
          <Stat label="Metrics tracked" value={headline.metricsTracked} note="in the monthly report" />
          <Stat
            label="Report completeness"
            value={`${completeness}%`}
            note={`${reportedCells} of ${totalCells} cells filled`}
            tone={completeness < 70 ? 'warn' : 'normal'}
          />
        </div>
      </Section>

      {completeness < 70 && (
        <div className="mt-6">
          <Warning>
            <strong>The monthly report is {100 - completeness}% empty.</strong> That is not a
            criticism of anyone — the gaps sit almost entirely in ministries with no system behind
            them, where someone has to remember to count and write it down every month. The metrics
            backed by Planning Center are the ones that are complete.
            {neverReported.length > 0 && (
              <>
                {' '}
                {neverReported.length} metric{neverReported.length === 1 ? ' has' : 's have'} never
                been filled in at all: {neverReported.map((r) => r.metric_label).join(', ')}.
              </>
            )}
          </Warning>
        </div>
      )}

      <Section
        title="Attendance by ministry"
        caveat="From Planning Center Groups event records. Turnout is average members attending against the roster; guests are counted separately, because a small group with steady guests is growing rather than over-full."
      >
        <Table
          rows={attendance}
          columns={[
            {
              key: 'name',
              header: 'Ministry',
              render: (r) => (
                <span>
                  {r.name}
                  {!r.is_active && (
                    <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      stopped
                    </span>
                  )}
                </span>
              ),
            },
            { key: 'category', header: 'Type', render: (r) => r.category ?? '—' },
            { key: 'events', header: 'Events', align: 'right' },
            { key: 'roster', header: 'Roster', align: 'right', render: (r) => r.roster ?? '—' },
            { key: 'avg_members', header: 'Members', align: 'right', render: (r) => r.avg_members ?? '—' },
            { key: 'avg_guests', header: 'Guests', align: 'right', render: (r) => r.avg_guests ?? '—' },
            {
              key: 'turnout',
              header: 'Turnout',
              align: 'right',
              render: (r) => (r.turnout === null ? '—' : `${r.turnout}%`),
            },
            { key: 'last_event', header: 'Last met', render: (r) => r.last_event ?? '—' },
          ]}
        />
      </Section>

      <Section title="Gatherings per month">
        <Bars rows={events} labelWidth="w-24" />
      </Section>

      <Section
        title="Total attendance per month"
        caveat="Members and guests combined, across all groups that record attendance."
      >
        <Bars rows={byMonth} labelWidth="w-24" />
      </Section>

      <Section
        title="Monthly report"
        caveat="As kept in the spreadsheet. A number is a reported figure; 0 means it ran and nobody came; ? means it happened but was not recorded; – means it did not run; · means the cell was never filled in. Only numbers and zeros are ever averaged."
      >
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                <th className="px-3 py-2 text-left font-medium">Metric</th>
                <th className="px-3 py-2 text-left font-medium">Owner</th>
                {months.map((m) => (
                  <th key={m} className="px-3 py-2 text-right font-medium">
                    {m.slice(2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricOrder.map((key) => {
                const m = byMetric.get(key)!
                return (
                  <tr key={key} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                    <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{m.label}</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">{m.owner ?? '—'}</td>
                    {months.map((mo) => (
                      <td key={mo} className="px-3 py-2 text-right">
                        <Cell cell={m.cells.get(mo)} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Where the gaps are"
        caveat="Ordered by how little has been reported. `headcount` means no system holds this figure — someone counts it. Those are the metrics an entry form would fix; the rest could be derived automatically."
      >
        <Table
          rows={coverage}
          columns={[
            { key: 'metric_label', header: 'Metric' },
            { key: 'owner', header: 'Owner', render: (r) => r.owner ?? '—' },
            {
              key: 'source_kind',
              header: 'Source',
              render: (r) => (
                <span
                  className={
                    r.source_kind === 'headcount'
                      ? 'text-amber-700 dark:text-amber-500'
                      : 'text-neutral-500'
                  }
                >
                  {r.source_kind ?? '—'}
                </span>
              ),
            },
            {
              key: 'reported',
              header: 'Reported',
              align: 'right',
              render: (r) => `${r.reported} / ${r.months}`,
            },
            { key: 'missing', header: 'Blank', align: 'right' },
            { key: 'unknown', header: 'Unknown', align: 'right' },
          ]}
        />
        <p className="mt-3 text-xs text-neutral-500">
          {headcountMetrics.length} of {coverage.length} metrics are headcounts with no underlying
          system. Importing cannot produce them — they only exist if someone enters them.
        </p>
      </Section>

      <Section
        title="Sources"
        caveat="Every figure above traces to one of these files. A dashboard nobody can audit is a dashboard nobody trusts."
      >
        <Table
          rows={imports}
          columns={[
            { key: 'filename', header: 'File' },
            { key: 'kind', header: 'Kind' },
            { key: 'snapshot_date', header: 'Covers to', render: (r) => r.snapshot_date ?? '—' },
            { key: 'row_count', header: 'Rows', align: 'right', render: (r) => r.row_count ?? '—' },
            {
              key: 'imported_at',
              header: 'Imported',
              render: (r) => new Date(r.imported_at).toISOString().slice(0, 10),
            },
          ]}
        />
      </Section>
    </div>
  )
}
