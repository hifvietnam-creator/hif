'use client'

import { useEffect, useState } from 'react'

// From child-fields, not children: the latter imports the Postgres pool, and a
// client component importing it pulls `pg` into the browser bundle.
import {
  PICKUP_SOURCE_MIN,
  needsPickupSource,
  type NewAdultInput,
} from '@/lib/kq/child-fields'

/**
 * The adults on file for one child, and the form that adds one.
 *
 * One component for two screens. Ate opens it from the Children page with time
 * to spare; a teacher opens it from the attendance list with a parent standing
 * in front of them. Same fields, same wording, same rule about the source line,
 * because a rule that differs by screen is a rule somebody gets wrong.
 *
 * WHY THE FORM IS THE MAIN EVENT
 *
 * When this was planned the expectation was a list of adults with a box to
 * tick. The data said otherwise: every one of the 42 children nobody could
 * collect had no adult on file at all. So the form opens by itself whenever the
 * list is empty, and the list is the smaller half.
 *
 * LAYOUT
 *
 * A sheet that rises from the bottom on a phone, where a thumb can reach the
 * buttons, and a panel down the right-hand side on anything wider. The backdrop
 * closes it. So does Escape, for the laptop.
 */

export type AdultLine = {
  id: number
  fullName: string
  relationship: string | null
  phone: string | null
  email?: string | null
  canPickup: boolean
  isPrimary?: boolean
}

type Kind = 'mother' | 'father' | 'other'

const field =
  'w-full rounded-lg border border-line bg-paper px-3 py-3 outline-none focus:border-brand'

export default function AdultSheet({
  childName,
  adults,
  mayAdd,
  mayTick = false,
  showEmail = false,
  addNote,
  onAdd,
  onTogglePickup,
  onClose,
}: {
  /** What the child is called in the room, for the wording. */
  childName: string
  adults: AdultLine[]
  /** Teachers and administrators. Assistants see the list and who to ask. */
  mayAdd: boolean
  /** Administrators only: change a tick somebody else set. */
  mayTick?: boolean
  showEmail?: boolean
  /** A line under the form, such as who will look at this afterwards. */
  addNote?: string
  /** Resolves to null when saved, or a sentence to show when it was not. */
  onAdd: (input: NewAdultInput) => Promise<string | null>
  onTogglePickup?: (adultId: number, next: boolean, source: string | null) => Promise<string | null>
  onClose: () => void
}) {
  const [adding, setAdding] = useState(adults.length === 0 && mayAdd)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const collectors = adults.filter((a) => a.canPickup).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-ink/60 md:items-stretch md:justify-end"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Adults for ${childName}`}
        className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-paper md:h-full md:max-h-none md:w-[440px] md:rounded-none md:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-ink">Adults for {childName}</h2>
            <p className="mt-0.5 text-sm text-hifmuted">
              {adults.length === 0
                ? 'Nobody is on file yet.'
                : collectors === 0
                  ? 'On file, but nobody is ticked to collect.'
                  : `${collectors} may collect.`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="kq-tap grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl text-hifmuted hover:bg-mist"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-auto px-4 py-4">
          {justAdded && (
            <p className="mb-3 rounded-card bg-ok-soft px-3 py-2.5 text-sm font-semibold text-ok-ink">
              {justAdded} is saved.
            </p>
          )}

          {adults.length > 0 && (
            <ul className="space-y-2">
              {adults.map((a) => (
                <AdultRow
                  key={a.id}
                  adult={a}
                  mayTick={mayTick && !!onTogglePickup}
                  onToggle={(next, source) => onTogglePickup!(a.id, next, source)}
                />
              ))}
            </ul>
          )}

          {!mayAdd && (
            <p className="mt-3 rounded-card bg-brand-soft px-3 py-3 text-sm text-exp-ink">
              {adults.length === 0
                ? 'Please let a teacher know, and they can add an adult here.'
                : 'To add someone else, please let a teacher know.'}
            </p>
          )}

          {mayAdd && !adding && (
            <button
              onClick={() => { setAdding(true); setJustAdded(null) }}
              className="kq-tap mt-3 w-full rounded-card border border-dashed border-line py-3.5 text-sm font-semibold text-ink-2 hover:border-brand"
            >
              + Add another adult
            </button>
          )}

          {mayAdd && adding && (
            <AddAdultForm
              childName={childName}
              showEmail={showEmail}
              note={addNote}
              first={adults.length === 0}
              onCancel={adults.length === 0 ? onClose : () => setAdding(false)}
              onSubmit={async (input) => {
                const problem = await onAdd(input)
                if (problem === null) {
                  setAdding(false)
                  setJustAdded(input.fullName)
                }
                return problem
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * One adult already on file.
 *
 * The tick is read-only for a teacher. They can add somebody; changing a
 * permission that was set by someone else is Ate's.
 *
 * Ticking anyone who is not a mother or father asks for the source line first,
 * in place, instead of saving and complaining afterwards.
 */
function AdultRow({
  adult, mayTick, onToggle,
}: {
  adult: AdultLine
  mayTick: boolean
  onToggle: (next: boolean, source: string | null) => Promise<string | null>
}) {
  const [asking, setAsking] = useState(false)
  const [source, setSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const run = async (next: boolean, src: string | null) => {
    setBusy(true)
    setProblem(null)
    const p = await onToggle(next, src)
    setBusy(false)
    if (p) setProblem(p)
    else { setAsking(false); setSource('') }
  }

  return (
    <li className="rounded-card border border-line bg-paper px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink">
            {adult.fullName}
            {adult.isPrimary && (
              <span className="ml-2 rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-bold text-hifmuted">
                MAIN CONTACT
              </span>
            )}
          </div>
          <div className="break-words text-xs text-hifmuted">
            {adult.relationship ?? 'contact'}
            {adult.phone && ` · ${adult.phone}`}
            {adult.email && ` · ${adult.email}`}
          </div>
        </div>

        {mayTick ? (
          <label className="kq-tap flex shrink-0 cursor-pointer items-center gap-2 py-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={adult.canPickup}
              disabled={busy}
              onChange={(e) => {
                const next = e.target.checked
                if (next && needsPickupSource(adult.relationship, true)) setAsking(true)
                else void run(next, null)
              }}
              className="h-5 w-5 accent-[#6fa22a]"
            />
            <span className={adult.canPickup ? 'text-ok-ink' : 'text-hifmuted'}>May collect</span>
          </label>
        ) : (
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
              adult.canPickup ? 'bg-ok-soft text-ok-ink' : 'bg-mist text-hifmuted'
            }`}
          >
            {adult.canPickup ? 'May collect' : 'Contact only'}
          </span>
        )}
      </div>

      {asking && (
        <div className="mt-3 border-t border-line pt-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Who told you they may collect?
            </span>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Mum phoned the office on Tuesday"
              className={field}
              autoFocus
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              disabled={busy || source.trim().length < PICKUP_SOURCE_MIN}
              onClick={() => run(true, source.trim())}
              className="kq-tap flex-1 rounded-lg bg-ok py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setAsking(false); setSource(''); setProblem(null) }}
              className="kq-tap rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {problem && <p className="mt-2 text-sm text-alert-deep">{problem}</p>}
    </li>
  )
}

/**
 * Adding an adult.
 *
 * The order is the order of the conversation at a door. Who are you to this
 * child, what is your name, how do we reach you. Then the one question that
 * matters, already answered yes, because an adult standing there to be added is
 * nearly always the adult who collects.
 *
 * Mother and Father are buttons because between them they are most of the
 * answers, and a button is one tap where a text box is a keyboard. They also
 * decide the friction: either of those and the form is done. Anybody else and
 * one more line appears, asking where the say-so came from. That line goes in
 * the child's history next to the name of whoever typed it.
 */
function AddAdultForm({
  childName, showEmail, note, first, onSubmit, onCancel,
}: {
  childName: string
  showEmail: boolean
  note?: string
  first: boolean
  onSubmit: (input: NewAdultInput) => Promise<string | null>
  onCancel: () => void
}) {
  const [kind, setKind] = useState<Kind | null>(null)
  const [otherRelationship, setOtherRelationship] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [canPickup, setCanPickup] = useState(true)
  const [source, setSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const relationship =
    kind === 'mother' ? 'mother'
    : kind === 'father' ? 'father'
    : otherRelationship.trim() || null

  // Somebody who types "mother" into the other box has still told us enough.
  const wantSource = kind !== null && needsPickupSource(relationship, canPickup)

  const ready =
    kind !== null &&
    fullName.trim().length > 1 &&
    (!wantSource || source.trim().length >= PICKUP_SOURCE_MIN)

  const kindBtn = (k: Kind, label: string) => (
    <button
      type="button"
      onClick={() => setKind(k)}
      aria-pressed={kind === k}
      className={`kq-tap rounded-card border-2 px-2 py-3.5 text-sm font-bold ${
        kind === k
          ? 'border-brand bg-brand-soft text-brand-dark'
          : 'border-line bg-paper text-ink-2'
      }`}
    >
      {label}
    </button>
  )

  return (
    <form
      className={first ? '' : 'mt-4 border-t border-line pt-4'}
      onSubmit={async (e) => {
        e.preventDefault()
        if (!ready || busy) return
        setBusy(true)
        setProblem(null)
        const p = await onSubmit({
          fullName: fullName.trim(),
          relationship,
          phone: phone.trim() || null,
          email: email.trim() || null,
          canPickup,
          source: wantSource ? source.trim() : null,
        })
        setBusy(false)
        if (p) setProblem(p)
      }}
    >
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink">
          Who are they to {childName}?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {kindBtn('mother', 'Mother')}
          {kindBtn('father', 'Father')}
          {kindBtn('other', 'Someone else')}
        </div>
      </fieldset>

      {kind === 'other' && (
        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-semibold text-ink">How do they know the family?</span>
          <input
            value={otherRelationship}
            onChange={(e) => setOtherRelationship(e.target.value)}
            placeholder="grandmother, aunt, driver, family friend"
            autoCapitalize="none"
            className={field}
          />
        </label>
      )}

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-semibold text-ink">Their full name</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoCapitalize="words"
          autoComplete="off"
          className={field}
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-semibold text-ink">
          Phone <span className="font-normal text-hifmuted">if you have it</span>
        </span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          autoComplete="off"
          placeholder="09xx xxx xxx"
          className={field}
        />
      </label>

      {showEmail && (
        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-semibold text-ink">
            Email <span className="font-normal text-hifmuted">if you have it</span>
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            className={field}
          />
        </label>
      )}

      <label className="kq-tap mt-4 flex cursor-pointer items-start gap-3 rounded-card border border-line px-3 py-3">
        <input
          type="checkbox"
          checked={canPickup}
          onChange={(e) => setCanPickup(e.target.checked)}
          className="mt-0.5 h-6 w-6 shrink-0 accent-[#6fa22a]"
        />
        <span>
          <span className="block font-semibold text-ink">May collect {childName}</span>
          <span className="block text-xs text-hifmuted">
            Untick this for someone we can phone but who does not take {childName} home.
          </span>
        </span>
      </label>

      {wantSource && (
        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-semibold text-ink">
            Who told you they may collect?
          </span>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Mum asked me at the door today"
            className={field}
          />
          <span className="mt-1 block text-xs text-hifmuted">
            One line is plenty. It is kept with your name beside it.
          </span>
        </label>
      )}

      {note && <p className="mt-3 text-xs text-hifmuted">{note}</p>}

      {problem && (
        <p className="mt-3 rounded-card bg-alert-soft px-3 py-2.5 text-sm text-alert-deep">{problem}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={!ready || busy}
          className="kq-tap flex-1 rounded-lg bg-ok py-3.5 font-bold text-white disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save this adult'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="kq-tap rounded-lg border border-line px-5 py-3.5 font-semibold text-ink-2"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

/** Shared by both screens, so a refusal reads the same wherever it happens. */
export async function saveAdult(
  body: Record<string, unknown>,
): Promise<{ problem: string | null; data: Record<string, unknown> }> {
  try {
    const res = await fetch('/api/kq/children', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { problem: String(data.error ?? 'That did not save. Please try again.'), data }
    }
    return { problem: null, data }
  } catch {
    return {
      problem: 'No connection just now, so this was not saved. Please try again in a moment.',
      data: {},
    }
  }
}
