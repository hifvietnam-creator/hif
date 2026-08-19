'use client'

import { useMemo, useState } from 'react'

import type { StaffMember } from '@/lib/kq/staff'

const GROUPS = [
  { code: 'explorers', short: 'Exp' },
  { code: 'voyagers', short: 'Voy' },
  { code: 'trailblazers', short: 'Trail' },
  { code: 'pathfinders', short: 'Path' },
]

export default function StaffTable({
  initial, date, role,
}: {
  initial: StaffMember[]
  date: string
  role: 'teacher' | 'ta'
}) {
  const [staff, setStaff] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const people = useMemo(() => staff.filter((s) => s.role === role), [staff, role])

  const toggle = async (person: StaffMember, groupCode: string) => {
    const assigned = person.assignedGroups.includes(groupCode)
    const key = `${person.userId}|${groupCode}`
    setBusy(key)
    setError(null)

    // Optimistic — the grid is the thing being read while it is being edited.
    setStaff((ss) =>
      ss.map((s) =>
        s.userId === person.userId
          ? {
              ...s,
              assignedGroups: assigned
                ? s.assignedGroups.filter((g) => g !== groupCode)
                : [...s.assignedGroups, groupCode],
            }
          : s,
      ),
    )

    try {
      const res = await fetch('/api/kq/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: assigned ? 'unassign' : 'assign',
          date, groupCode, staffUserId: person.userId, role: person.role,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'That did not save.')
        // Put it back — a rota that shows an assignment the database does not
        // have is worse than one that refuses the click.
        setStaff((ss) =>
          ss.map((s) =>
            s.userId === person.userId
              ? {
                  ...s,
                  assignedGroups: assigned
                    ? [...s.assignedGroups, groupCode]
                    : s.assignedGroups.filter((g) => g !== groupCode),
                }
              : s,
          ),
        )
      }
    } catch {
      setError('No connection. That change was not saved.')
    } finally {
      setBusy(null)
    }
  }

  const unassigned = people.filter((p) => p.assignedGroups.length === 0).length

  return (
    <>
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-card border border-alert/30 bg-alert-soft px-3 py-2 text-sm text-alert-deep">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {people.length === 0 ? (
        <div className="rounded-card border border-line bg-paper px-4 py-10 text-center">
          <p className="text-sm text-hifmuted">
            Nobody has the{' '}
            <b>{role === 'teacher' ? 'Teacher' : 'Teaching assistant'}</b> role yet.
          </p>
          <p className="mt-2 text-sm text-hifmuted">
            Create them in <a href="/admin" className="font-semibold text-brand-dark underline">/admin</a> →
            Users, then set kqRole in the sidebar. Passwords have to be hashed by Payload,
            so accounts cannot be made directly in the database.
          </p>
        </div>
      ) : (
        <>
          {unassigned > 0 && (
            <p className="mb-3 rounded-card bg-flag-soft px-3 py-2 text-sm text-flag">
              <b>{unassigned}</b> not assigned to a room this Sunday. They will be able to
              sign in, but every room will tell them it is not theirs.
            </p>
          )}

          <div className="overflow-x-auto rounded-card border border-line bg-paper shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-mist/60 text-[11px] uppercase tracking-wider text-hifmuted">
                  <th className="px-3 py-2 text-left font-bold">Name</th>
                  <th className="px-3 py-2 text-left font-bold">Room this Sunday</th>
                  <th className="px-3 py-2 text-right font-bold">Sundays</th>
                  <th className="px-3 py-2 text-left font-bold">Last 8</th>
                  <th className="px-3 py-2 text-left font-bold">Last served</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.userId} className="border-t border-line/70">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-ink">{p.name}</div>
                      <div className="text-xs text-hifmuted">{p.email}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {GROUPS.map((g) => {
                          const on = p.assignedGroups.includes(g.code)
                          const key = `${p.userId}|${g.code}`
                          return (
                            <button
                              key={g.code}
                              disabled={busy === key}
                              onClick={() => toggle(p, g.code)}
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                on
                                  ? 'bg-brand-dark text-white'
                                  : 'bg-mist text-hifmuted hover:brightness-95'
                              }`}
                            >
                              {g.short}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">
                      {p.sundaysServed}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex gap-0.5">
                        {p.recent.map((served, i) => (
                          <span
                            key={i}
                            title={served ? 'served' : 'not serving'}
                            className={`inline-block h-3.5 w-3.5 rounded-sm ${
                              served ? 'bg-ok' : 'bg-line'
                            }`}
                          />
                        ))}
                        {p.recent.length === 0 && (
                          <span className="text-xs text-hifmuted">no history</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-hifmuted">
                      {p.lastServed
                        ? new Date(p.lastServed + 'T00:00:00Z').toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', timeZone: 'UTC',
                          })
                        : 'never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-3 text-xs text-hifmuted">
        Assigning somebody creates the room&rsquo;s session if it does not exist yet, so
        there is nothing to set up first. Administrators can open any room regardless.
      </p>
    </>
  )
}
