'use client'

import { useMemo, useState } from 'react'

import type { ChildRow } from '@/lib/kq/children'

const GROUP_LABEL: Record<string, string> = {
  explorers: 'Explorers',
  voyagers: 'Voyagers',
  trailblazers: 'Trailblazers',
  pathfinders: 'Pathfinders',
  aftershock: 'Aftershock',
}

const GROUP_TINT: Record<string, string> = {
  explorers: 'bg-brand-soft text-[#14536b]',
  voyagers: 'bg-ok-soft text-ok-ink',
  trailblazers: 'bg-flag-soft text-flag',
  pathfinders: 'bg-[#efeaf8] text-[#5b2a5a]',
  aftershock: 'bg-mist text-hifmuted',
}

type Save = 'idle' | 'saving' | 'saved' | 'error'

export default function KidsTable({ initial }: { initial: ChildRow[] }) {
  const [rows, setRows] = useState(initial)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'no-collector' | 'no-grade' | 'no-guardian'>('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [save, setSave] = useState<Save>('idle')
  const [error, setError] = useState<string | null>(null)

  const patch = async (body: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
    setSave('saving')
    setError(null)
    try {
      const res = await fetch('/api/kq/children', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSave('error')
        setError(data.error ?? 'That did not save.')
        return null
      }
      setSave('saved')
      setTimeout(() => setSave((s) => (s === 'saved' ? 'idle' : s)), 1500)
      return data
    } catch {
      setSave('error')
      setError('No connection. That change was not saved.')
      return null
    }
  }

  const local = (childId: number, patchRow: Partial<ChildRow>) =>
    setRows((rs) => rs.map((r) => (r.childId === childId ? { ...r, ...patchRow } : r)))

  const counts = useMemo(() => ({
    noCollector: rows.filter((r) => !r.guardians.some((g) => g.canPickup)).length,
    noGrade: rows.filter((r) => r.grade === null).length,
    noGuardian: rows.filter((r) => r.guardians.length === 0).length,
  }), [rows])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (filter === 'no-collector') return !r.guardians.some((g) => g.canPickup)
        if (filter === 'no-grade') return r.grade === null
        if (filter === 'no-guardian') return r.guardians.length === 0
        return true
      })
      .filter((r) =>
        !q || `${r.firstName} ${r.lastName} ${r.preferredName ?? ''}`.toLowerCase().includes(q),
      )
  }, [rows, query, filter])

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a name…"
          className="w-56 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <Chip on={filter === 'all'} onClick={() => setFilter('all')}>
          All {rows.length}
        </Chip>
        <Chip on={filter === 'no-collector'} onClick={() => setFilter('no-collector')} alert>
          No collector {counts.noCollector}
        </Chip>
        <Chip on={filter === 'no-guardian'} onClick={() => setFilter('no-guardian')} alert>
          No guardian {counts.noGuardian}
        </Chip>
        <Chip on={filter === 'no-grade'} onClick={() => setFilter('no-grade')}>
          No grade {counts.noGrade}
        </Chip>

        <span className="ml-auto text-xs text-hifmuted">
          {save === 'saving' && 'Saving…'}
          {save === 'saved' && <span className="text-ok-ink">Saved</span>}
          {save === 'error' && <span className="text-alert">Not saved</span>}
        </span>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-card border border-alert/30 bg-alert-soft px-3 py-2 text-sm text-alert-deep">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-line bg-paper shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-mist/60 text-[11px] uppercase tracking-wider text-hifmuted">
              <Th className="w-8" />
              <Th>First name</Th>
              <Th>Last name</Th>
              <Th>Goes by</Th>
              <Th className="w-20">Grade</Th>
              <Th className="w-32">Group</Th>
              <Th className="w-20">Sex</Th>
              <Th>Allergies</Th>
              <Th className="w-28">Collector</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const canBeCollected = r.guardians.some((g) => g.canPickup)
              const open = expanded === r.childId
              return (
                <>
                  <tr
                    key={r.childId}
                    className={`border-t border-line/70 ${open ? 'bg-brand-soft/40' : ''}`}
                  >
                    <Td>
                      <button
                        onClick={() => setExpanded(open ? null : r.childId)}
                        className="grid h-6 w-6 place-items-center rounded text-hifmuted hover:bg-mist"
                        title="Guardians"
                      >
                        {open ? '▾' : '▸'}
                      </button>
                    </Td>
                    <Td>
                      <Cell
                        value={r.firstName}
                        onSave={async (v) => {
                          if (!v.trim()) return
                          local(r.childId, { firstName: v })
                          await patch({ action: 'field', childId: r.childId, field: 'first_name', value: v })
                        }}
                      />
                    </Td>
                    <Td>
                      <Cell
                        value={r.lastName}
                        onSave={async (v) => {
                          local(r.childId, { lastName: v })
                          await patch({ action: 'field', childId: r.childId, field: 'last_name', value: v })
                        }}
                      />
                    </Td>
                    <Td>
                      <Cell
                        value={r.preferredName ?? ''}
                        placeholder="—"
                        onSave={async (v) => {
                          local(r.childId, { preferredName: v || null })
                          await patch({ action: 'field', childId: r.childId, field: 'preferred_name', value: v })
                        }}
                      />
                    </Td>
                    <Td>
                      <Cell
                        value={r.grade === null ? '' : String(r.grade)}
                        placeholder="—"
                        numeric
                        highlight={r.grade === null}
                        onSave={async (v) => {
                          const res = await patch({
                            action: 'grade',
                            enrollmentId: r.enrollmentId,
                            grade: v === '' ? null : v,
                          })
                          if (res) {
                            local(r.childId, {
                              grade: v === '' ? null : Number(v),
                              groupCode: String(res.groupCode ?? r.groupCode),
                              provisional: res.provisional === true,
                            })
                          }
                        }}
                      />
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          GROUP_TINT[r.groupCode] ?? 'bg-mist text-hifmuted'
                        }`}
                      >
                        {GROUP_LABEL[r.groupCode] ?? r.groupCode}
                        {r.provisional && <span title="Unconfirmed placement">?</span>}
                      </span>
                    </Td>
                    <Td>
                      <select
                        value={r.gender ?? ''}
                        onChange={async (e) => {
                          const v = e.target.value
                          local(r.childId, { gender: v || null })
                          await patch({ action: 'field', childId: r.childId, field: 'gender', value: v })
                        }}
                        className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 hover:border-line focus:border-brand focus:outline-none"
                      >
                        <option value="">—</option>
                        <option>Female</option>
                        <option>Male</option>
                      </select>
                    </Td>
                    <Td>
                      <Cell
                        value={r.allergies ?? ''}
                        placeholder="none recorded"
                        onSave={async (v) => {
                          local(r.childId, { allergies: v || null })
                          await patch({ action: 'field', childId: r.childId, field: 'allergies', value: v })
                        }}
                      />
                    </Td>
                    <Td>
                      {canBeCollected ? (
                        <span className="text-xs text-hifmuted">
                          {r.guardians.filter((g) => g.canPickup).length} authorised
                        </span>
                      ) : (
                        <button
                          onClick={() => setExpanded(r.childId)}
                          className="rounded-full bg-alert-soft px-2 py-0.5 text-xs font-bold text-alert-deep"
                        >
                          nobody
                        </button>
                      )}
                    </Td>
                  </tr>

                  {open && (
                    <tr key={`${r.childId}-g`} className="border-t border-line/70 bg-brand-soft/25">
                      <td colSpan={9} className="px-4 py-3">
                        <GuardianPanel
                          row={r}
                          onTogglePickup={async (guardianId, next) => {
                            local(r.childId, {
                              guardians: r.guardians.map((g) =>
                                g.id === guardianId ? { ...g, canPickup: next } : g,
                              ),
                            })
                            await patch({
                              action: 'pickup', childId: r.childId, guardianId, canPickup: next,
                            })
                          }}
                          onAdd={async (input) => {
                            const res = await patch({ action: 'guardian', childId: r.childId, ...input })
                            if (res) {
                              local(r.childId, {
                                guardians: [
                                  ...r.guardians,
                                  {
                                    id: Date.now(), // replaced on next full load
                                    fullName: input.fullName,
                                    relationship: input.relationship,
                                    canPickup: input.canPickup,
                                    isPrimary: false,
                                    email: input.email,
                                    phone: input.phone,
                                  },
                                ],
                              })
                            }
                            return !!res
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}

            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-hifmuted">
                  Nobody matches that.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-hifmuted">
        Cells save when you click away. There is no undo — every change is recorded in the
        child&rsquo;s history with your name against it, which is how a mistake gets found.
      </p>
    </>
  )
}

// ── Bits ─────────────────────────────────────────────────────────────────────

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left font-bold ${className}`}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-1.5 align-middle">{children}</td>
}

function Chip({
  children, on, onClick, alert,
}: {
  children: React.ReactNode; on: boolean; onClick: () => void; alert?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        on
          ? alert
            ? 'bg-alert text-white'
            : 'bg-brand-dark text-white'
          : alert
            ? 'bg-alert-soft text-alert-deep hover:brightness-95'
            : 'bg-mist text-ink-2 hover:brightness-95'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * An editable cell.
 *
 * A styled input rather than contenteditable: it gives real keyboard support,
 * tabbing between cells, and mobile keyboards that match the field type — all
 * of which contenteditable makes you rebuild badly.
 *
 * Escape reverts. It is the only undo there is once focus leaves.
 */
function Cell({
  value, onSave, placeholder, numeric, highlight,
}: {
  value: string
  onSave: (v: string) => void | Promise<void>
  placeholder?: string
  numeric?: boolean
  highlight?: boolean
}) {
  const [draft, setDraft] = useState(value)
  const [dirty, setDirty] = useState(false)

  // Keep in step when the parent replaces the row underneath us.
  if (!dirty && draft !== value) setDraft(value)

  return (
    <input
      value={draft}
      inputMode={numeric ? 'numeric' : undefined}
      placeholder={placeholder}
      onChange={(e) => { setDraft(e.target.value); setDirty(true) }}
      onBlur={() => {
        if (!dirty) return
        setDirty(false)
        if (draft !== value) onSave(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') { setDraft(value); setDirty(false) }
      }}
      className={`w-full rounded border border-transparent px-1.5 py-1 outline-none hover:border-line focus:border-brand focus:bg-paper ${
        highlight ? 'bg-flag-soft' : 'bg-transparent'
      } ${numeric ? 'text-center' : ''}`}
    />
  )
}

function GuardianPanel({
  row, onTogglePickup, onAdd,
}: {
  row: ChildRow
  onTogglePickup: (guardianId: number, next: boolean) => Promise<void>
  onAdd: (input: {
    fullName: string; relationship: string | null
    email: string | null; phone: string | null; canPickup: boolean
  }) => Promise<boolean>
}) {
  const [adding, setAdding] = useState(row.guardians.length === 0)
  const [fullName, setFullName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [canPickup, setCanPickup] = useState(true)

  return (
    <div className="max-w-3xl">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-hifmuted">
        Adults for {row.preferredName || row.firstName}
      </h3>

      {row.guardians.length === 0 && (
        <p className="mb-3 rounded-card bg-alert-soft px-3 py-2 text-sm text-alert-deep">
          Nobody is on file. This child cannot be checked out on Sunday without a
          teacher overriding, which is recorded as an exception every week until
          somebody is added here.
        </p>
      )}

      <div className="space-y-1.5">
        {row.guardians.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-3 rounded-card border border-line bg-paper px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">
                {g.fullName}
                {g.isPrimary && (
                  <span className="ml-2 rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-bold text-hifmuted">
                    PRIMARY
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-hifmuted">
                {g.relationship ?? 'contact'}
                {g.phone && ` · ${g.phone}`}
                {g.email && ` · ${g.email}`}
              </div>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={g.canPickup}
                onChange={(e) => onTogglePickup(g.id, e.target.checked)}
                className="h-4 w-4 accent-[#6fa22a]"
              />
              <span className={g.canPickup ? 'text-ok-ink' : 'text-hifmuted'}>
                May collect
              </span>
            </label>
          </div>
        ))}
      </div>

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-brand"
        >
          + Add an adult
        </button>
      ) : (
        <div className="mt-2 rounded-card border border-line bg-paper p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Relationship" value={relationship} onChange={setRelationship} placeholder="mother, uncle, driver…" />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="0912 345 678" />
            <Field label="Email" value={email} onChange={setEmail} />
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={canPickup}
              onChange={(e) => setCanPickup(e.target.checked)}
              className="h-4 w-4 accent-[#6fa22a]"
            />
            May collect this child
          </label>
          <p className="mt-1 text-xs text-hifmuted">
            Being a contact and being allowed to collect are separate. Leave this
            unticked for someone who should be reachable but not hand the child over.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              disabled={!fullName.trim()}
              onClick={async () => {
                const okDone = await onAdd({
                  fullName: fullName.trim(),
                  relationship: relationship.trim() || null,
                  email: email.trim() || null,
                  phone: phone.trim() || null,
                  canPickup,
                })
                if (okDone) {
                  setFullName(''); setRelationship(''); setPhone(''); setEmail('')
                  setAdding(false)
                }
              }}
              className="rounded-lg bg-brand-dark px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-ink-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-2">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line px-2.5 py-2 text-sm outline-none focus:border-brand"
      />
    </label>
  )
}
