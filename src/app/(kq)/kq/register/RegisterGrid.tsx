'use client'

import { useMemo, useState } from 'react'

import Filters, {
  GRADE_OPTIONS, GROUP_OPTIONS, SEX_OPTIONS,
  type FilterDef, type FilterState,
} from '@/components/kq/Filters'
import type { CellState, RegisterRow } from '@/lib/kq/register-types'

/**
 * The register grid.
 *
 * A client component now, because administrators can correct past Sundays by
 * tapping a cell. Everybody else gets the same grid, read-only.
 */

const MARK: Record<CellState, { glyph: string; cls: string; label: string }> = {
  paper:    { glyph: '✓', cls: 'text-ok-ink',          label: 'marked on paper' },
  station:  { glyph: '✓', cls: 'text-ok font-bold',    label: 'checked in and out' },
  still_in: { glyph: '!', cls: 'text-alert font-bold', label: 'checked in, no check-out recorded' },
  added:    { glyph: '✓', cls: 'text-brand italic',    label: 'added afterwards by an administrator' },
  removed:  { glyph: '✕', cls: 'text-flag',            label: 'a record existed and was corrected to absent' },
  absent:   { glyph: '·', cls: 'text-line',            label: 'not there' },
  not_yet:  { glyph: '',  cls: '',                     label: 'not yet on the register' },
}

export default function RegisterGrid({
  dates, rows: initial, perDate: initialTotals, canEdit,
}: {
  dates: string[]
  rows: RegisterRow[]
  perDate: number[]
  canEdit: boolean
}) {
  const [rows, setRows] = useState(initial)
  const [filters, setFilters] = useState<FilterState>({})
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filters.group && r.groupCode !== filters.group) return false
      if (filters.grade === 'none') { if (r.grade !== null) return false }
      else if (filters.grade && String(r.grade) !== filters.grade) return false
      if (filters.sex === 'none') { if (r.gender) return false }
      else if (filters.sex && r.gender !== filters.sex) return false

      // Attendance bands. "Rarely" is the one worth looking at: a child on the
      // register who is hardly ever in the room.
      if (filters.came === 'never' && r.present > 0) return false
      if (filters.came === 'rare' && !(r.present > 0 && r.present <= 3)) return false
      if (filters.came === 'most' && !(r.possible > 0 && r.present / r.possible >= 0.75)) return false

      if (q && !r.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, filters, query])

  // Recomputed from what is on screen, so the totals row matches the filter
  // rather than silently reporting the whole ministry.
  const perDate = useMemo(
    () => dates.map((_, i) => visible.filter((r) => {
      const s = r.cells[i]!.state
      return s === 'paper' || s === 'station' || s === 'still_in' || s === 'added'
    }).length),
    [visible, dates],
  )

  const FILTER_DEFS: FilterDef[] = [
    { key: 'group', label: 'Any group', options: GROUP_OPTIONS },
    { key: 'grade', label: 'Any grade', options: GRADE_OPTIONS },
    { key: 'sex', label: 'Any sex', options: SEX_OPTIONS },
    {
      key: 'came',
      label: 'How often',
      options: [
        { value: 'never', label: 'Never came' },
        { value: 'rare', label: 'Three times or fewer' },
        { value: 'most', label: 'Came most weeks' },
      ],
    },
  ]

  const toggle = async (row: RegisterRow, i: number) => {
    if (!canEdit) return
    const cell = row.cells[i]!
    const wasHere = ['paper', 'station', 'still_in', 'added'].includes(cell.state)
    const key = `${row.childId}|${i}`
    setBusy(key)
    setError(null)

    const optimistic: CellState = wasHere ? 'removed' : 'added'
    setRows((rs) => rs.map((r) => r.childId !== row.childId ? r : {
      ...r,
      cells: r.cells.map((c, j) => j === i ? { ...c, state: optimistic } : c),
      present: r.present + (wasHere ? -1 : 1),
      possible: cell.state === 'not_yet' ? r.possible + 1 : r.possible,
    }))

    try {
      const res = await fetch('/api/kq/register', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: row.childId, date: dates[i], present: !wasHere }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'That did not save.')
        // Put it back. A grid showing a correction the database does not have
        // is worse than one that refused the tap.
        setRows((rs) => rs.map((r) => r.childId !== row.childId ? r : {
          ...r,
          cells: r.cells.map((c, j) => j === i ? cell : c),
          present: r.present + (wasHere ? 1 : -1),
          possible: cell.state === 'not_yet' ? r.possible - 1 : r.possible,
        }))
      }
    } catch {
      setError('No connection. That change was not saved.')
    } finally {
      setBusy(null)
    }
  }

  const shortDate = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', timeZone: 'UTC',
    })

  return (
    <>
      <Filters
        defs={FILTER_DEFS}
        value={filters}
        onChange={setFilters}
        showing={visible.length}
        total={rows.length}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a name…"
          className="w-52 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          onClick={() => setShowKey((s) => !s)}
          className="ml-auto text-xs font-semibold text-brand-dark underline underline-offset-2"
        >
          {showKey ? 'Hide the key' : 'What do the marks mean?'}
        </button>
      </Filters>

      {/* Collapsed by default. The marks carry real distinctions — especially
          the red !, which is a child nobody recorded leaving — but the key was
          taking up a band across the top of every visit. */}
      {showKey && (
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-card border border-line bg-paper px-4 py-2.5 text-xs text-ink-2">
          {(['paper', 'station', 'still_in', 'added', 'removed', 'absent', 'not_yet'] as CellState[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              {s === 'not_yet'
                ? <span className="inline-block h-3.5 w-3.5 rounded-sm bg-mist/60 ring-1 ring-line" />
                : <span className={`inline-block w-3.5 text-center ${MARK[s].cls}`}>{MARK[s].glyph}</span>}
              {MARK[s].label}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-card border border-alert/30 bg-alert-soft px-3 py-2 text-sm text-alert-deep">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      <div className="overflow-auto rounded-card border border-line bg-paper shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-mist/70 text-[11px] text-hifmuted">
              <th className="sticky left-0 z-20 min-w-[180px] bg-mist px-3 py-2 text-left font-bold uppercase tracking-wider">
                Child
              </th>
              {!filters.group && (
                <th className="min-w-[95px] px-2 py-2 text-left font-bold uppercase tracking-wider">
                  Group
                </th>
              )}
              {dates.map((d) => (
                <th key={d} className="min-w-[46px] px-1 py-2 text-center font-semibold">
                  {shortDate(d)}
                </th>
              ))}
              <th className="min-w-[72px] px-2 py-2 text-center font-bold uppercase tracking-wider">
                Came
              </th>
            </tr>
          </thead>

          <tbody>
            {visible.map((r) => (
              <tr key={r.childId} className="border-t border-line/60">
                <td className="sticky left-0 z-10 bg-paper px-3 py-1.5 font-medium text-ink">
                  {r.name}
                </td>
                {!filters.group && (
                  <td className="px-2 py-1.5 text-xs text-hifmuted">{r.groupCode}</td>
                )}
                {r.cells.map((c, i) => {
                  const m = MARK[c.state]
                  const key = `${r.childId}|${i}`
                  const time = c.checkedInAt
                    ? new Date(c.checkedInAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit', minute: '2-digit',
                      })
                    : null
                  return (
                    <td key={i} className="px-1 py-1.5 text-center">
                      <button
                        disabled={!canEdit || busy === key}
                        onClick={() => toggle(r, i)}
                        title={
                          `${r.name} · ${dates[i]} · ${m.label}` +
                          (time ? ` at ${time}` : '') +
                          (c.group ? ` (${c.group})` : '') +
                          (canEdit ? '\nTap to correct' : '')
                        }
                        className={`h-6 w-full rounded ${m.cls} ${
                          canEdit ? 'hover:bg-mist disabled:opacity-40' : 'cursor-default'
                        } ${c.state === 'not_yet' ? 'bg-mist/60' : ''}`}
                      >
                        {m.glyph}
                      </button>
                    </td>
                  )
                })}
                <td className="px-2 py-1.5 text-center">
                  <span className="font-semibold text-ink">{r.present}</span>
                  <span className="ml-1 text-xs text-hifmuted">of {r.possible}</span>
                </td>
              </tr>
            ))}

            {visible.length === 0 && (
              <tr>
                <td colSpan={dates.length + 3} className="px-4 py-12 text-center text-hifmuted">
                  Nobody matches that.
                </td>
              </tr>
            )}
          </tbody>

          {visible.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-line bg-mist/50 text-xs">
                <td className="sticky left-0 z-10 bg-mist px-3 py-2 font-bold uppercase tracking-wider text-hifmuted">
                  Total
                </td>
                {!filters.group && <td />}
                {perDate.map((n, i) => (
                  <td key={i} className="px-1 py-2 text-center font-bold text-ink">{n}</td>
                ))}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-3 text-xs text-hifmuted">
        Sundays before a child joined are left blank rather than counted as absences, so
        &ldquo;came&rdquo; is out of the weeks they were actually with us.
        {canEdit && ' Tap any cell to correct it. Nothing is deleted: a check-in keeps its time and the adult who brought them, and every change is recorded against your name.'}
      </p>
    </>
  )
}
