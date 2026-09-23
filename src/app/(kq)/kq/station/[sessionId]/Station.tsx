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
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCode, setLastCode] = useState<{ name: string; code: string | null } | null>(null)

  // Nothing prints at the station any more.
  //
  // The ministry keeps a box of physical cards, one per child, handed over at
  // drop-off and returned at pick-up. There is no label to produce, so the
  // printer, the hidden iframe and the auto-print toggle have all gone.
  //
  // That also disposes of a complaint from the first live Sunday: a print
  // dialog appearing during dismissal. It was never the dismissal — a check-in
  // that had not reached the server was sitting in the queue, drained once the
  // connection returned, and printed then, while the TA was on the other tab.

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
            // Only on a check-in. A dismissal returns no code, so the banner
            // cannot appear at the wrong moment.
            if (item.body.action === 'check_in') {
              setLastCode({ name: item.label, code: data.cardCode ?? null })
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
  }, [queue, online, refresh, mode])

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
          <Stat label="Dismissed" value={counts.collected} />
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
            {m === 'in' ? 'Check in' : 'Dismiss'}
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

      {/* Only while checking in. Switching to Dismiss clears it, so nothing
          from the previous action is left hanging about on the wrong screen. */}
      {lastCode && mode === 'in' && (
        <div className="flex items-center gap-2.5 border-b border-ok/30 bg-ok-soft px-4 py-3 text-sm text-ok-ink">
          <span className="min-w-0 flex-1 truncate">
            <b>{lastCode.name}</b> checked in
            {lastCode.code && <> — hand over card</>}
          </span>
          {lastCode.code ? (
            <span className="rounded bg-ink px-2 py-1 font-mono font-bold tracking-widest text-white">
              {lastCode.code}
            </span>
          ) : (
            <span className="rounded bg-flag-soft px-2 py-1 text-xs font-bold text-flag">
              no card yet
            </span>
          )}
          <button onClick={() => setLastCode(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Register */}
      <ul className="flex-1 divide-y divide-line">
        {visible.map((c) => (
          <li key={c.childId} className="flex items-center gap-3 px-3 py-3">
            {/* In Dismiss mode the card code leads. A TA is holding a card a
                parent just handed back and needs to find whose it is — so the
                code has to be scannable down the list, not hidden behind a tap
                on every child in turn. */}
            {mode === 'out' && (
              <span
                className={`shrink-0 rounded px-2 py-1.5 font-mono text-xs font-bold tracking-wider ${
                  c.cardCode ? 'bg-ink text-white' : 'bg-flag-soft text-flag'
                }`}
              >
                {c.cardCode ?? 'no card'}
              </span>
            )}

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
                {mode === 'in' && c.cardCode && ` · card ${c.cardCode}`}
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
                Dismiss
              </button>
            )}
          </li>
        ))}

        {visible.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-hifmuted">
            {mode === 'in'
              ? roster.length === 0
                ? 'Nobody is on this register yet.'
                : 'Everybody has been dismissed.'
              : 'Nobody is checked in yet.'}
          </li>
        )}

        {mode === 'in' && (
          <li className="p-3">
            <button
              onClick={() => setAdding(true)}
              className="kq-tap w-full rounded-card border border-dashed border-line py-3 text-sm font-semibold text-ink-2"
            >
              + Add a child who isn&rsquo;t on the list
            </button>
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
        {stillHere > 0 && mode === 'out' && (
          <span className="font-semibold text-flag">{stillHere} still in the room</span>
        )}
      </footer>

      {adding && (
        <WalkInSheet
          groupLabel={session.groupLabel}
          onCancel={() => setAdding(false)}
          onSave={async (input) => {
            setError(null)
            try {
              const res = await fetch('/api/kq/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...input, sessionId: session.id }),
              })
              const data = await res.json().catch(() => ({}))
              if (!res.ok) {
                setError(data.error ?? 'That did not save.')
                return false
              }
              // Reload rather than splice the row in: the server decides the
              // child's id and whether their guardian merged with an existing
              // one, and a guessed row would then fail to check in.
              await refresh()
              setAdding(false)
              return true
            } catch {
              setError('No connection. A child cannot be registered offline.')
              return false
            }
          }}
        />
      )}

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

/**
 * Registering a child at the door.
 *
 * Five fields, no more. Everything else — grade, birthdate, photo consent, a
 * second authorised adult — is chased during the week from the Kids page. A
 * longer form at a door with a queue behind it gets abandoned or filled with
 * guesses, and a guess about who may collect a child is worse than a gap.
 *
 * Unlike check-in, this does NOT queue offline: it needs the server to assign
 * an id and to decide whether this adult is already on file. Better to say so
 * than to accept a registration that silently never happened.
 */
function WalkInSheet({
  groupLabel, onCancel, onSave,
}: {
  groupLabel: string
  onCancel: () => void
  onSave: (input: {
    firstName: string; lastName: string
    guardianName: string; guardianPhone: string; allergies: string
  }) => Promise<boolean>
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [allergies, setAllergies] = useState('')
  const [busy, setBusy] = useState(false)

  const field =
    'w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand'

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/60" onClick={onCancel}>
      <div
        className="max-h-[90vh] w-full overflow-auto rounded-t-2xl bg-paper p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">New child — {groupLabel}</h2>
        <p className="mt-0.5 text-sm text-hifmuted">
          Just enough to check them in safely. The office fills in the rest this week.
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">First name</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">Last name</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={field} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Adult who brought them
            </span>
            <input
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Full name"
              className={field}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Their phone</span>
            <input
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              inputMode="tel"
              placeholder="09xx xxx xxx"
              className={field}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Allergies <span className="font-normal text-hifmuted">— ask, don&rsquo;t assume</span>
            </span>
            <input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Leave blank if none"
              className={field}
            />
          </label>
        </div>

        <p className="mt-3 rounded-card bg-flag-soft px-3 py-2 text-xs text-flag">
          The adult you name here will be the one allowed to pick this child up today.
          Anyone else will need a teacher to approve it.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            disabled={!firstName.trim() || !guardianName.trim() || busy}
            onClick={async () => {
              setBusy(true)
              await onSave({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                guardianName: guardianName.trim(),
                guardianPhone: guardianPhone.trim(),
                allergies: allergies.trim(),
              })
              setBusy(false)
            }}
            className="kq-tap flex-1 rounded-lg bg-ok py-3.5 font-bold text-white disabled:opacity-40"
          >
            {busy ? 'Adding…' : 'Add to the register'}
          </button>
          <button
            onClick={onCancel}
            className="kq-tap rounded-lg border border-line px-5 py-3.5 font-semibold text-ink-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/** Who is dropping off, or who is picking up. */
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
          {mode === 'in' ? 'Check in' : 'Dismiss'} — {displayName(child)}
          {mode === 'in' && child.cardCode && (
            <span className="ml-2 rounded bg-ink px-2 py-1 align-middle font-mono text-xs font-bold tracking-wider text-white">
              {child.cardCode}
            </span>
          )}
        </h2>
        {/* "Dismissed" is the status; the prompt asks about a person, and
            "who is dismissing?" would be asking the wrong question. */}
        <p className="mt-0.5 text-sm text-hifmuted">
          {mode === 'in' ? 'Who is dropping off?' : 'Who is picking up?'}
        </p>

        {mode === 'out' && child.cardCode && (
          <p className="mt-3 text-sm text-ink-2">
            Their card reads{' '}
            <span className="rounded bg-ink px-2 py-1 font-mono font-bold tracking-widest text-white">
              {child.cardCode}
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
                Nobody on file is authorised to pick up this child. Dismissing them
                needs an override from a teacher.
              </p>
            )}

            {mode === 'out' && others.length > 0 && (
              <p className="pt-1 text-xs text-hifmuted">
                On file but <b>not</b> authorised to pick up:{' '}
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
                    Someone else is picking up
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
