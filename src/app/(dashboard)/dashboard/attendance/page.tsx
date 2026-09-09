import React from 'react'

import { Bars, Section, Stat, Table, Warning } from '../../_components/ui'
import RecordAttendance from '../../_components/RecordAttendance'
import {
  getBaselines,
  getHistoricSunday,
  getKidsByWeek,
  getKidsSummary,
  getPendingServices,
  getRecordCount,
  getServices,
} from '@/lib/queries/attendance'

export const dynamic = 'force-dynamic'

const BASELINE_LABEL: Record<string, string> = {
  benchmark: 'Programme-year benchmark',
  monthly_average: 'Monthly average',
  peak: 'Peak',
}

const BASELINE_HELP: Record<string, string> = {
  benchmark: 'The reference point for the year — the Sunday everyone is back from summer.',
  monthly_average: 'The ongoing denominator. What a normal week looks like.',
  peak: 'The ceiling: the most people gathered at once.',
}

export default async function AttendancePage() {
  const [baselines, services, historic, kidsWeeks, kids, records, pending] = await Promise.all([
    getBaselines(),
    getServices(),
    getHistoricSunday(),
    getKidsByWeek(),
    getKidsSummary(),
    getRecordCount(),
    getPendingServices(),
  ])

  const campuses = [...new Set(baselines.map((b) => b.campus))]
  const thin = baselines.some((b) => b.based_on < 4)

  // Historic averages pivoted: metric down, month across.
  const months = [...new Set(historic.map((h) => h.period_month))].sort()
  const metrics = [...new Set(historic.map((h) => h.metric_label))]
  const cell = (metric: string, month: string) =>
    historic.find((h) => h.metric_label === metric && h.period_month === month)

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Attendance</h1>
      <p className="mt-1 text-sm text-neutral-500">
        What a Sunday actually looks like, and what everything else should be measured against.
      </p>

      <div className="mt-6">
        <Warning>
          <strong>The Planning Center record count is not a denominator.</strong> There are{' '}
          {records.total.toLocaleString()} records ({records.active.toLocaleString()} marked active),
          but that includes alumni, one-time visitors from years ago, and people who have left
          Hanoi. Sunday attendance is 400–500. Any percentage measured against the record count says
          almost nothing, so this page uses attendance instead.
        </Warning>
      </div>

      <Section
        title="This week's count"
        caveat="The one figure no system holds: somebody counted it. Everything else on this page is derived — children come from the KidsQuest register automatically each Sunday evening."
      >
        <RecordAttendance services={pending} />
      </Section>

      <Section
        title="Baselines"
        caveat="Three denominators, each answering a different question. Every figure elsewhere should say which one it is measured against."
      >
        {campuses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            No services recorded yet.
          </p>
        ) : (
          campuses.map((campus) => (
            <div key={campus} className="mb-4">
              <h3 className="mb-2 text-sm font-medium">{campus}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {['benchmark', 'monthly_average', 'peak'].map((kind) => {
                  const b = baselines.find((x) => x.campus === campus && x.baseline === kind)
                  return (
                    <Stat
                      key={kind}
                      label={BASELINE_LABEL[kind] ?? kind}
                      value={b?.value ?? '—'}
                      note={
                        b
                          ? `${b.label} · from ${b.based_on} service${b.based_on === 1 ? '' : 's'}`
                          : 'not enough data'
                      }
                      tone={b && b.based_on < 4 ? 'warn' : 'normal'}
                    />
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div className="mt-2 space-y-1">
          {Object.entries(BASELINE_HELP).map(([k, v]) => (
            <p key={k} className="text-xs text-neutral-500">
              <span className="font-medium">{BASELINE_LABEL[k]}</span> — {v}
            </p>
          ))}
        </div>
      </Section>

      {thin && (
        <div className="mt-2">
          <Warning>
            Some baselines rest on fewer than four services. A monthly average computed from one
            Sunday is that Sunday, not an average — it will only start to mean something once a few
            weeks have been recorded.
          </Warning>
        </div>
      )}

      <Section
        title="Services recorded"
        caveat="Counted at the door. Children are listed separately because KidsQuest keeps its own register; where the figure is missing it is shown as unrecorded rather than as zero."
      >
        <Table
          rows={services}
          empty="No services recorded yet."
          columns={[
            { key: 'service_date', header: 'Date' },
            {
              key: 'campus',
              header: 'Campus',
              render: (r) => (
                <span>
                  {r.campus}
                  {r.is_benchmark && (
                    <span className="ml-2 rounded bg-neutral-900 px-1.5 py-0.5 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900">
                      {r.benchmark_label ?? 'benchmark'}
                    </span>
                  )}
                </span>
              ),
            },
            { key: 'adults', header: 'Adults', align: 'right', render: (r) => r.adults ?? '—' },
            {
              key: 'kids',
              header: 'Children',
              align: 'right',
              render: (r) =>
                r.kids === null ? (
                  <span className="text-amber-700 dark:text-amber-500" title="Not recorded — not zero">
                    not recorded
                  </span>
                ) : (
                  <span>
                    {r.kids}
                    <span className="ml-2 text-xs text-neutral-500">{r.kids_source}</span>
                  </span>
                ),
            },
            {
              key: 'total',
              header: 'Total',
              align: 'right',
              render: (r) => (r.total === null ? '—' : <strong>{r.total}</strong>),
            },
          ]}
        />
      </Section>

      <Section
        title="KidsQuest"
        caveat="Children are part of the congregation, and a Sunday total without them is incomplete."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Children on record" value={kids.children} />
          <Stat label="Sessions" value={kids.sessions} note={kids.first ? `${kids.first} → ${kids.last}` : undefined} />
          <Stat
            label="Checked in at a door"
            value={kids.fromStation}
            note="using the app"
            tone={kids.fromStation < 10 ? 'warn' : 'normal'}
          />
          <Stat label="Back-filled from paper" value={kids.fromImport} note="imported history" />
        </div>

        {kids.fromStation < 10 && kids.rows > 0 && (
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-amber-700 dark:text-amber-500">
            Of {kids.rows.toLocaleString()} attendance records, {kids.fromStation} came from someone
            tapping at the door. The check-in app works — it is simply not being used yet, so the
            register stops when the imported history stops
            {kids.lastWithChildren ? ` (${kids.lastWithChildren})` : ''}. Later Sundays show zero
            children, which is a gap and not an empty room.
          </p>
        )}

        <div className="mt-4">
          <Bars
            rows={kidsWeeks
              .slice()
              .reverse()
              .map((w) => ({ label: w.service_date, count: w.children }))}
            labelWidth="w-28"
          />
        </div>
      </Section>

      <Section
        title="Before this page existed"
        caveat="Monthly averages kept in the metrics spreadsheet. These are averages, not headcounts, and are not mixed with the services above — an average cannot be traced back to a Sunday."
      >
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                <th className="px-3 py-2 text-left font-medium">Metric</th>
                {months.map((m) => (
                  <th key={m} className="px-3 py-2 text-right font-medium">
                    {m.slice(2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                  <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{metric}</td>
                  {months.map((m) => {
                    const c = cell(metric, m)
                    if (!c || c.value_status === 'missing') {
                      return (
                        <td key={m} className="px-3 py-2 text-right text-neutral-300 dark:text-neutral-700">
                          ·
                        </td>
                      )
                    }
                    if (c.value_status === 'unknown') {
                      return (
                        <td key={m} className="px-3 py-2 text-right text-amber-600">
                          ?
                        </td>
                      )
                    }
                    return (
                      <td key={m} className="px-3 py-2 text-right tabular-nums">
                        {c.value === null ? '—' : Math.round(Number(c.value)).toLocaleString()}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-neutral-500">
          The record stops in February 2026. Anything after that has to be entered — which is why
          the benchmark had to be typed in rather than derived.
        </p>
      </Section>
    </div>
  )
}
