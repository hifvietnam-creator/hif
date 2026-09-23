'use client'

import React from 'react'

/**
 * The filter bar for Kids and Register.
 *
 * Dropdowns rather than chips, because these combine: Voyagers and grade 2 and
 * girls is three at once, and twenty chips with four of them lit is not
 * something anybody can read at a glance.
 *
 * Shared so the two screens behave identically. Ate should not have to learn
 * the filters twice.
 */

export type FilterDef = {
  key: string
  label: string
  options: { value: string; label: string; count?: number }[]
}

export type FilterState = Record<string, string>

export const GROUP_OPTIONS = [
  { value: 'explorers', label: 'Explorers' },
  { value: 'voyagers', label: 'Voyagers' },
  { value: 'trailblazers', label: 'Trailblazers' },
  { value: 'pathfinders', label: 'Pathfinders' },
]

export const GRADE_OPTIONS = [
  { value: 'none', label: 'No grade yet' },
  ...Array.from({ length: 8 }, (_, i) => ({ value: String(i), label: `Grade ${i}` })),
]

export const SEX_OPTIONS = [
  { value: 'Female', label: 'Girls' },
  { value: 'Male', label: 'Boys' },
  { value: 'none', label: 'Not recorded' },
]

export default function Filters({
  defs,
  value,
  onChange,
  showing,
  total,
  children,
}: {
  defs: FilterDef[]
  value: FilterState
  onChange: (next: FilterState) => void
  /** How many rows survive the filters. */
  showing: number
  total: number
  /** Anything extra on the right, like a search box or an add button. */
  children?: React.ReactNode
}) {
  const active = Object.entries(value).filter(([, v]) => v && v !== 'all')

  const set = (key: string, v: string) => {
    const next = { ...value }
    if (!v || v === 'all') delete next[key]
    else next[key] = v
    onChange(next)
  }

  return (
    <div className="mb-3 rounded-card border border-line bg-paper px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {defs.map((d) => {
          const on = value[d.key] && value[d.key] !== 'all'
          return (
            <label key={d.key} className="relative">
              <span className="sr-only">{d.label}</span>
              <select
                value={value[d.key] ?? 'all'}
                onChange={(e) => set(d.key, e.target.value)}
                className={`rounded-lg border px-2.5 py-2 text-sm font-medium outline-none ${
                  on
                    ? 'border-brand bg-brand-soft text-brand-dark'
                    : 'border-line bg-paper text-ink-2 hover:border-hifmuted'
                }`}
              >
                <option value="all">{d.label}</option>
                {d.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {o.count !== undefined ? ` (${o.count})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )
        })}

        {children}
      </div>

      {/* Only shown once something is filtering. Otherwise it is a line of text
          telling you nothing is happening, which is worse than nothing. */}
      {active.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2 text-xs text-hifmuted">
          <span>
            <b className="text-ink">{showing}</b> of {total}
            {' · '}
            {active.length} filter{active.length === 1 ? '' : 's'}
          </span>
          {active.map(([k, v]) => {
            const def = defs.find((d) => d.key === k)
            const opt = def?.options.find((o) => o.value === v)
            return (
              <button
                key={k}
                onClick={() => set(k, 'all')}
                className="rounded-full bg-mist px-2 py-0.5 font-semibold text-ink-2 hover:brightness-95"
                title={`Remove the ${def?.label.toLowerCase()} filter`}
              >
                {opt?.label ?? v} ✕
              </button>
            )
          })}
          <button
            onClick={() => onChange({})}
            className="font-semibold text-brand-dark underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
