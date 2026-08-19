'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Guardian, RosterChild, SessionInfo } from '@/lib/kq/station'

type Props = {
  session: SessionInfo
  initialRoster: RosterChild[]
  you: { id: number; name: string; role: string }
  mayOverride: boolean
}

type Queued = {
  clientUuid: string
  body: Record<string, unknown>
  childId: number
  label: string
}

/** Stable per-device id, so the audit log can say which tablet did what. */
function stationId(): string {
  if (typeof window === 'undefined') return 'server'
  const k = 'kq.stationId'
  let v = window.localStorage.getItem(k)
  if (!v) {
    v = `st_${Math.random().toString(36).slice(2, 8)}`
    window.localStorage.setItem(k, v)
  }
  return v
}

const uuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const displayName = (c: RosterChild) =>
  `${c.preferredName || c.firstName} ${c.lastName}`.trim()

export default function Station({ session, initialRoster, you, mayOverride }: Props) {
  const [roster, setRoster] = useState(initialRoster)
  const [mode, setMode] = useState<'in' | 'out'>('in')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<RosterChild | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastCode, setLastCode] = useState<
    { name: string; code: string; attendanceId: number } | null
  >(null)

  // Printing goes through a hidden iframe rather than a new tab. A tab would
  // pull the TA off the register mid-queue and leave them to find their way
  // back with a parent waiting.
  const printFrame = useRef<HTMLIFrameElement | null>(null)
  const [autoPrint, setAutoPrint] = useState(true)

  const printLabel = useCallback((attendanceId: number) => {
    if (!printFrame.current) return
    printFrame.current.src = `/kq/label/${attendanceId}`
  }, [])

  // Writes that have not reached the server yet. Held in state and retried, so
  // a dropped connection mid-service degrades to "saving" rather than to a lost
  // check-in that nobody notices until a parent asks where their child is.
  const [queue, setQueue] = useState<Queued[]>([])
  const [online, setOnline] = useState(true)
  const draining = useRef(false)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    setOnline(navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/kq/roster?sessionId=${session.id}`, { cache: 'no-store' })
      if (!r.ok) return
      const data = await r.json()
      setRoster(data.roster)
    } catch {
      /* offline; the cached roster stands */
    }
  }, [session.id])

  // Drain the queue whenever it changes or we come back online.
  useEffect(() => {
    if (draining.current || queue.length === 0 || !online) return
    draining.current = true

    ;(async () => {
      for (const item of [...queue]) {
        try {
          const res = await fetch('/api/kq/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.body),
          })
          const data = await res.json().catch(() => ({}))

          if (res.ok) {
            if (data.securityCode && data.attendanceId) {
              setLastCode({
                name: item.label,
                code: data.securityCode,
                attendanceId: data.attendanceId,
              })
              // Only print once the write has actually landed. Printing
              // optimistically would put a code on a label that no row in the
              // database agrees with if the request then failed.
              if (autoPrint) printLabel(data.attendanceId)
            }
            setQueue((q) => q.filter((x) => x.clientUuid !== item.clientUuid))
          } else if (res.status >= 400 && res.status < 500) {
            // The server refused on the merits — retrying will not help, and
            // leaving it queued would make the badge lie about unsaved work.
            setError(data.error ?? 'That was refused.')
            setQueue((q) => q.filter((x) => x.clientUuid !== item.clientUuid))
            await refresh()
          } else {
            break   // server trouble: stop, keep the rest queued, try later
          }
        } catch {
          break     // network died mid-drain
        }
      }
      draining.current = false
      await refresh()
    })()
  }, [queue, online, refresh])

  const enqueue = (body: Record<string, unknown>, childId: number, label: string) => {
    const clientUuid = uuid()
    setQueue((q) => [...q, { clientUuid, body: { ...body, clientUuid, stationId: stationId() }, childId, label }])
  }

  // Optimistic: the row updates immediately and the queue catches up. A TA at a
  // door cannot wait on a round trip with a parent standing in front of them.
  const applyLocal = (childId: number, patch: Partial<RosterChild>) =>
    setRoster((rs) => rs.map((c) => (c.childId === childId ? { ...c, ...patch } : c)))

  const doCheckIn = (child: RosterChild, guardian: Guardian | null) => {
    applyLocal(child.childId, { status: 'present', checkedInAt: new Date().toISOString() })
    enqueue(
      { action: 'check_in', sessionId: session.id, childId: child.childId, guardianId: guardian?.id ?? null },
      child.childId,
      displayName(child),
    )
    setActive(null)
  }

  const doCheckOut = (
    child: RosterChild,
    guardian: Guardian | null,
    override: boolean,
    reason: string,
    collectorName: string,
  ) => {
    applyLocal(child.childId, { status: 'checked_out', checkedOutAt: new Date().toISOString() })
    enqueue(
      {
        action: 'check_out', sessionId: session.id, childId: child.childId,
        guardianId: guardian?.id ?? null,
        override, overrideReason: reason || null, collectorName: collectorName || null,
      },
      child.childId,
      displayName(child),
    )
    setActive(null)
  }

  const counts = useMemo(() => ({
    expected: roster.length,
    present: roster.filter((c) => c.status === 'present').length,
    collected: roster.filter((c) => c.status === 'checked_out').length,
  }), [roster])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return roster
      .filter((c) => (mode === 'in' ? c.status !== 'checked_out' : c.status === 'present'))
      .filter((c) => !q || displayName(c).toLowerCase().includes(q))
  }, [roster, mode, query])

  const stillHere = counts.present

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-brand-dark px-4 pb-3 pt-4 text-white">
        <div className="flex items-center justify-between text-sm opacity-90">
          <a href="/kq/station" className="underline-offset-2 hover:underline">← Rooms</a>
          <span>{you.name}</span>
        </div>
        <h1 className="mt-1 text-lg font-bold">{session.groupLabel}</h1>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Expected" value={counts.expected} />
          <Stat label="Here" value={counts.present} />
          <Stat label="Collected" value={counts.collected} />
        </div>
      </header>

      {/* Mode */}
      <div className="flex border-b border-line">
        {(['in', 'out'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`kq-tap flex-1 border-b-2 py-3.5 text-sm font-semibold ${
              mode === m ? 'border-brand text-brand-dark' : 'border-transparent text-hifmuted'
            }`}
          >
            {m === 'in' ? 'Check in' : 'Check out'}
          </button>
        ))}
      </div>

      <div className="border-b border-line p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a name…"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 outline-none focus:border-brand"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 border-b border-alert/30 bg-alert-soft px-4 py-3 text-sm text-alert-deep">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {lastCode && (
        <div className="flex items-center gap-2.5 border-b border-ok/30 bg-ok-soft px-4 py-3 text-sm text-ok-ink">
          <span className="min-w-0 flex-1 truncate">
            <b>{lastCode.name}</b> checked in
          </span>
          <span className="rounded bg-ink px-2 py-1 font-mono font-bold tracking-widest text-white">
            {lastCode.code}
          </span>
          <button
            onClick={() => printLabel(lastCode.attendanceId)}
            className="kq-tap rounded border border-ok/40 px-2 py-1 text-xs font-bold"
            title="Print these tags again"
          >
            Reprint
          </button>
          <button onClick={() => setLastCode(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Register */}
      <ul className="flex-1 divide-y divide-line">
        {visible.map((c) => (
          <li key={c.childId} className="flex items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink">
                {displayName(c)}
                {c.allergies && (
                  <span className="ml-2 rounded-full bg-alert-soft px-2 py-0.5 text-xs font-bold text-alert-deep">
                    {c.allergies}
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-hifmuted">
                {c.guardians.length === 0 ? (
                  <span className="font-semibold text-alert">No guardian on file</span>
                ) : (
                  c.guardians[0]!.fullName
                )}
                {c.securityCode && ` · ${c.securityCode}`}
                {c.provisional && ' · room unconfirmed'}
              </div>
            </div>

            {mode === 'in' ? (
              c.status === 'present' ? (
                <span className="rounded-lg bg-mist px-3 py-2 text-sm font-semibold text-hifmuted">
                  Here ✓
                </span>
              ) : (
                <button
                  onClick={() => setActive(c)}
                  className="kq-tap rounded-lg bg-ok px-4 py-3 text-sm font-bold text-white active:brightness-95"
                >
                  Check in
                </button>
              )
            ) : (
              <button
                onClick={() => setActive(c)}
                className="kq-tap rounded-lg bg-brand-deep px-4 py-3 text-sm font-bold text-white active:brightness-95"
              >
                Check out
              </button>
            )}
          </li>
        ))}

        {visible.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-hifmuted">
            {mode === 'in' ? 'Everybody has been collected.' : 'Nobody is checked in yet.'}
          </li>
        )}
      </ul>

      {/* Footer */}
      <footer className="sticky bottom-0 flex items-center justify-between border-t border-line bg-mist px-4 py-3 text-xs">
        <span className="flex items-center gap-2 text-ink-2">
          <span
            className={`h-2 w-2 rounded-full ${
              queue.length ? 'bg-flag' : online ? 'bg-ok' : 'bg-hifmuted'
            }`}
          />
          {queue.length
            ? `${queue.length} waiting to save`
            : online
              ? 'All saved'
              : 'Offline — taps are being held'}
        </span>
        <span className="flex items-center gap-3">
          {stillHere > 0 && mode === 'out' && (
            <span className="font-semibold text-flag">{stillHere} still in the room</span>
          )}
          <label className="kq-tap flex cursor-pointer items-center gap-1.5 text-ink-2">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#1f6b85]"
            />
            Print labels
          </label>
        </span>
      </footer>

      {/*
        Off-screen rather than display:none — a hidden iframe does not always
        lay out, and printing an unlaid-out document yields a blank label.
      */}
      <iframe
        ref={printFrame}
        title="Label printing"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none fixed left-[-9999px] top-0 h-[400px] w-[300px] border-0"
      />

      {active && (
        <GuardianSheet
          child={active}
          mode={mode}
          mayOverride={mayOverride}
          onCancel={() => setActive(null)}
          onCheckIn={(g) => doCheckIn(active, g)}
          onCheckOut={(g, override, reason, name) => doCheckOut(active, g, override, reason, name)}
        />
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/15 px-2 py-1.5">
      <div className="text-xl font-bold leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-85">{label}</div>
    </div>
  )
}

const sheetBtn =
  'kq-tap flex w-full items-center gap-3 rounded-card border p-3.5 text-left transition'

/** Who is dropping off, or who is collecting. */
function GuardianSheet({
  child, mode, mayOverride, onCancel, onCheckIn, onCheckOut,
}: {
  child: RosterChild
  mode: 'in' | 'out'
  mayOverride: boolean
  onCancel: () => void
  onCheckIn: (g: Guardian | null) => void
  onCheckOut: (g: Guardian | null, override: boolean, reason: string, name: string) => void
}) {
  const [overriding, setOverriding] = useState(false)
  const [reason, setReason] = useState('')
  const [name, setName] = useState('')

  const authorised = child.guardians.filter((g) => g.canPickup)
  const others = child.guardians.filter((g) => !g.canPickup)

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/60" onClick={onCancel}>
      <div
        className="max-h-[85vh] w-full overflow-auto rounded-t-2xl bg-paper p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">
          {mode === 'in' ? 'Check in' : 'Check out'} — {displayName(child)}
        </h2>
        <p className="mt-0.5 text-sm text-hifmuted">
          {mode === 'in' ? 'Who is dropping off?' : 'Who is collecting?'}
        </p>

        {mode === 'out' && child.securityCode && (
          <p className="mt-3 text-sm text-ink-2">
            Their label should read{' '}
            <span className="rounded bg-ink px-2 py-1 font-mono font-bold tracking-widest text-white">
              {child.securityCode}
            </span>
          </p>
        )}

        {!overriding && (
          <div className="mt-4 space-y-2">
            {(mode === 'in' ? child.guardians : authorised).map((g) => (
              <button
                key={g.id}
                onClick={() => (mode === 'in' ? onCheckIn(g) : onCheckOut(g, false, '', ''))}
                className={`${sheetBtn} border-line hover:border-brand`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{g.fullName}</div>
                  <div className="truncate text-xs text-hifmuted">
                    {g.relationship ?? 'contact'}
                    {g.phone && ` · ${g.phone}`}
                  </div>
                </div>
                {mode === 'out' && (
                  <span className="rounded-full bg-ok-soft px-2 py-1 text-xs font-bold text-ok-ink">
                    Authorised
                  </span>
                )}
              </button>
            ))}

            {mode === 'out' && authorised.length === 0 && (
              <p className="rounded-card bg-alert-soft p-3 text-sm text-alert-deep">
                Nobody on file is authorised to collect this child. Releasing them
                needs an override from a teacher.
              </p>
            )}

            {mode === 'out' && others.length > 0 && (
              <p className="pt-1 text-xs text-hifmuted">
                On file but <b>not</b> authorised to collect:{' '}
                {others.map((g) => g.fullName).join(', ')}
              </p>
            )}

            {mode === 'in' && child.guardians.length === 0 && (
              <button
                onClick={() => onCheckIn(null)}
                className={`${sheetBtn} border-dashed border-line text-ink-2`}
              >
                <span>
                  <span className="block font-semibold">No guardian on file</span>
                  <span className="block text-xs text-hifmuted">
                    Check in anyway — but this child cannot be collected without an override.
                  </span>
                </span>
              </button>
            )}

            {mode === 'out' && (
              <button
                onClick={() => setOverriding(true)}
                disabled={!mayOverride}
                className={`${sheetBtn} border-dashed border-alert/40 disabled:opacity-50`}
              >
                <span>
                  <span className="block font-semibold text-alert-deep">
                    Someone else is collecting
                  </span>
                  <span className="block text-xs text-hifmuted">
                    {mayOverride
                      ? 'Needs a reason, and it will be recorded against your name.'
                      : 'A teacher or administrator must do this.'}
                  </span>
                </span>
              </button>
            )}
          </div>
        )}

        {overriding && (
          <div className="mt-4 space-y-3">
            <div className="rounded-card bg-alert-soft p-3 text-sm text-alert-deep">
              You are releasing <b>{displayName(child)}</b> to someone not on their
              authorised list. This is recorded permanently against your name.
            </div>
            <label className="block text-sm font-semibold text-ink">Who is collecting?</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand"
            />
            <label className="block text-sm font-semibold text-ink">Why?</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Mother phoned ahead; this is the child's aunt, known to the team."
              className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand"
            />
            <button
              onClick={() => onCheckOut(null, true, reason, name)}
              disabled={reason.trim().length < 10 || !name.trim()}
              className="kq-tap w-full rounded-lg bg-alert py-3.5 font-bold text-white disabled:opacity-40"
            >
              Release {displayName(child)}
            </button>
          </div>
        )}

        <button
          onClick={onCancel}
          className="kq-tap mt-4 w-full rounded-lg border border-line py-3.5 font-semibold text-ink-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
