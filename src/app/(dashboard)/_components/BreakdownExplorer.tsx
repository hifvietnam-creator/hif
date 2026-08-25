'use client'

import { useMemo, useState } from 'react'

/**
 * Interactive breakdown of an audience by one dimension at a time.
 *
 * All the aggregates are computed server-side and sent as counts, so pivoting
 * is instant and no personal data crosses the wire — only "Male: 214". Named
 * lists live behind their own page.
 *
 * Charts are hand-drawn rather than pulled from a library, matching the
 * existing dashboard: for checking whether a number is right, a legible figure
 * beats a pretty curve, and it keeps the dependency list short.
 */

export type BreakdownRow = { dimension: string; label: string; count: number }

export type AudienceOption = {
  id: string
  name: string
  people: number
}

const DIMENSIONS: Array<{ key: string; label: string; note?: string }> = [
  { key: 'involvement', label: 'Group involvement', note: 'A fact about each person, not a field — nobody is missing from this.' },
  { key: 'gender', label: 'Gender' },
  { key: 'membership', label: 'Membership status' },
  { key: 'campus', label: 'Campus' },
  {
    key: 'age',
    label: 'Age group',
    note: 'Birthdate is recorded for a minority of people. The "Not recorded" share is shown rather than hidden — read the chart as describing only the rest.',
  },
]

/** Muted, distinguishable, and readable in both themes. */
const COLOURS = [
  '#6b7280', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6',
  '#ef4444', '#14b8a6', '#f97316', '#64748b', '#a855f7',
]
const NOT_RECORDED = '#d4d4d8'

const isNotRecorded = (label: string) =>
  /^not recorded$/i.test(label) || /^no campus set$/i.test(label)

function Donut({ rows }: { rows: BreakdownRow[] }) {
  const total = rows.reduce((n, r) => n + r.count, 0)
  if (total === 0) return null

  const R = 70
  const C = 2 * Math.PI * R
  let offset = 0

  return (
    <svg viewBox="0 0 200 200" className="h-48 w-48 shrink-0 -rotate-90">
      {rows.map((r, i) => {
        const frac = r.count / total
        const dash = frac * C
        const el = (
          <circle
            key={r.label}
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={isNotRecorded(r.label) ? NOT_RECORDED : COLOURS[i % COLOURS.length]}
            strokeWidth="34"
            strokeDasharray={`${dash} ${C - dash}`}
            strokeDashoffset={-offset}
          />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

export default function BreakdownExplorer({
  audiences,
  data,
}: {
  audiences: AudienceOption[]
  /** audience id → every dimension's rows, precomputed. */
  data: Record<string, BreakdownRow[]>
}) {
  const [audienceId, setAudienceId] = useState(audiences[0]?.id ?? '')
  const [dimension, setDimension] = useState('involvement')

  const rows = useMemo(() => {
    const all = data[audienceId] ?? []
    return all
      .filter((r) => r.dimension === dimension)
      .sort((a, b) => {
        // Keep "Not recorded" last so it never leads the chart, and keep age
        // bands in age order rather than by size.
        if (isNotRecorded(a.label) !== isNotRecorded(b.label)) return isNotRecorded(a.label) ? 1 : -1
        if (dimension === 'age') return a.label.localeCompare(b.label)
        return b.count - a.count
      })
  }, [data, audienceId, dimension])

  const total = rows.reduce((n, r) => n + r.count, 0)
  const unknown = rows.filter((r) => isNotRecorded(r.label)).reduce((n, r) => n + r.count, 0)
  const known = total - unknown
  const coverage = total ? Math.round((known / total) * 100) : 0
  const activeDim = DIMENSIONS.find((d) => d.key === dimension)

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={audienceId}
          onChange={(e) => setAudienceId(e.target.value)}
          className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
        >
          {audiences.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.people.toLocaleString()})
            </option>
          ))}
        </select>

        <span className="text-sm text-neutral-500">broken down by</span>

        <div className="flex flex-wrap gap-1">
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDimension(d.key)}
              className={`rounded px-2.5 py-1 text-sm transition ${
                dimension === d.key
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {coverage < 100 && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-500">
          Based on {known.toLocaleString()} of {total.toLocaleString()} people ({coverage}%).{' '}
          {unknown.toLocaleString()} not recorded, shown in grey.
        </p>
      )}
      {activeDim?.note && <p className="mt-2 text-xs text-neutral-500">{activeDim.note}</p>}

      <div className="mt-4 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Donut rows={rows} />

        <div className="w-full space-y-1">
          {rows.map((r, i) => {
            const pct = total ? (r.count / total) * 100 : 0
            return (
              <div key={r.label} className="flex items-center gap-3 text-sm">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{
                    background: isNotRecorded(r.label) ? NOT_RECORDED : COLOURS[i % COLOURS.length],
                  }}
                />
                <span
                  className={`w-44 shrink-0 truncate ${
                    isNotRecorded(r.label)
                      ? 'text-neutral-400 dark:text-neutral-600'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                  title={r.label}
                >
                  {r.label}
                </span>
                <span className="h-3 flex-1 rounded bg-neutral-100 dark:bg-neutral-900">
                  <span
                    className="block h-3 rounded"
                    style={{
                      width: `${pct}%`,
                      background: isNotRecorded(r.label)
                        ? NOT_RECORDED
                        : COLOURS[i % COLOURS.length],
                    }}
                  />
                </span>
                <span className="w-24 shrink-0 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                  {r.count.toLocaleString()}
                  <span className="ml-1 text-xs text-neutral-400">{pct.toFixed(0)}%</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
