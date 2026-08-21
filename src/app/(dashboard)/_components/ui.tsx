import React from 'react'

/**
 * Shared dashboard presentation. Deliberately plain: no charting library, no
 * animation. These pages exist so staff can check the numbers are right, and a
 * legible figure beats a pretty curve for that.
 */

export function Stat({
  label,
  value,
  note,
  tone = 'normal',
}: {
  label: string
  value: number | string
  note?: string
  /** `warn` for figures that look impressive but need reading carefully. */
  tone?: 'normal' | 'warn'
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        tone === 'warn'
          ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
          : 'border-neutral-200 dark:border-neutral-800'
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {note ? <div className="mt-1 text-xs text-neutral-500">{note}</div> : null}
    </div>
  )
}

export function Section({
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
      {caveat ? <p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-500">{caveat}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function Bars({
  rows,
  labelWidth = 'w-52',
}: {
  rows: { label: string; count: number }[]
  labelWidth?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (rows.length === 0) return <Empty />
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <div className={`${labelWidth} shrink-0 truncate text-neutral-700 dark:text-neutral-300`} title={r.label}>
            {r.label}
          </div>
          <div className="h-4 flex-1 rounded bg-neutral-100 dark:bg-neutral-900">
            <div
              className="h-4 rounded bg-neutral-400 dark:bg-neutral-600"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
          <div className="w-16 shrink-0 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
            {r.count.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  empty = 'Nothing to show.',
}: {
  columns: Array<{
    key: keyof T & string
    header: string
    align?: 'left' | 'right'
    render?: (row: T) => React.ReactNode
  }>
  rows: T[]
  empty?: string
}) {
  if (rows.length === 0) return <Empty>{empty}</Empty>
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 ${
                    c.align === 'right' ? 'text-right tabular-nums' : ''
                  } text-neutral-700 dark:text-neutral-300`}
                >
                  {c.render ? c.render(r) : String(r[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Shown when a query returns nothing — distinguishes "zero" from "broken". */
export function Empty({ children = 'No data.' }: { children?: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
      {children}
    </p>
  )
}

/** A caveat that must not be scrolled past. Used where a number invites a
 *  wrong conclusion. */
export function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      {children}
    </div>
  )
}
