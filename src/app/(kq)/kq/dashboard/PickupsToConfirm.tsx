'use client'

import { useState } from 'react'

import { saveAdult } from '@/components/kq/AdultSheet'
import type { PickupToConfirm } from '@/lib/kq/child-fields'

/**
 * Adults a teacher said may collect, waiting for Ate to look.
 *
 * WHAT THIS IS NOT
 *
 * It is not an approval queue. Each tick here is already in force and was on
 * the Sunday it was made, because the alternative was the same child needing an
 * override at the same door an hour later. This list is the second look: an
 * administrator with a phone and no queue behind her, agreeing with a decision
 * a teacher made in a hurry, or undoing it.
 *
 * The same idea as the unconfirmed placements, and it empties the same way, by
 * being worked through.
 *
 * Cards, not a table. Each line is a sentence about two people, and it is read
 * on a phone as often as not.
 */

const GROUP_LABEL: Record<string, string> = {
  explorers: 'Explorers',
  voyagers: 'Voyagers',
  trailblazers: 'Trailblazers',
  pathfinders: 'Pathfinders',
}

/**
 * "Sun 11 Oct", in Hanoi time, built by hand.
 *
 * Not toLocaleDateString. This renders once on the server and again in the
 * browser, and the two disagree twice over: on the clock, because the server
 * runs in UTC and a Sunday morning in Hanoi is still Saturday night there, and
 * on punctuation, because different engines put a comma after the weekday.
 * Either difference is a hydration error on Ate's dashboard.
 */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const HANOI_OFFSET_MS = 7 * 60 * 60 * 1000

const when = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(new Date(iso).getTime() + HANOI_OFFSET_MS)
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

type Outcome = 'confirmed' | 'removed'

export default function PickupsToConfirm({ initial }: { initial: PickupToConfirm[] }) {
  const [done, setDone] = useState<Record<string, Outcome>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  if (initial.length === 0) return null

  const left = initial.filter((p) => !done[`${p.childId}|${p.guardianId}`]).length

  const act = async (p: PickupToConfirm, outcome: Outcome) => {
    const key = `${p.childId}|${p.guardianId}`
    setBusy(key)
    setProblem(null)
    const { problem: failed } = await saveAdult(
      outcome === 'confirmed'
        ? { action: 'confirm_pickup', childId: p.childId, guardianId: p.guardianId }
        : { action: 'pickup', childId: p.childId, guardianId: p.guardianId, canPickup: false },
    )
    setBusy(null)
    if (failed) setProblem(failed)
    else setDone((d) => ({ ...d, [key]: outcome }))
  }

  return (
    <section className="mt-5 rounded-card border border-line bg-paper shadow-sm">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[15px] font-semibold text-ink">
          Added by a teacher
          {left > 0 && (
            <span className="ml-2 rounded-full bg-flag-soft px-2 py-0.5 text-xs font-bold text-flag">
              {left} to look at
            </span>
          )}
        </h2>
        <p className="mt-0.5 text-xs text-hifmuted">
          These adults can already collect. Have a look when you have a moment, and confirm
          each one or take the tick away.
        </p>
      </div>

      {problem && (
        <p className="border-b border-alert/30 bg-alert-soft px-4 py-2.5 text-sm text-alert-deep">
          {problem}
        </p>
      )}

      <ul>
        {initial.map((p) => {
          const key = `${p.childId}|${p.guardianId}`
          const outcome = done[key]
          return (
            <li key={key} className="border-b border-line/70 px-4 py-3.5 last:border-0">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1 basis-60">
                  <div className="text-sm text-ink">
                    <b>{p.guardianName}</b>
                    <span className="text-hifmuted"> may collect </span>
                    <b>{p.childName}</b>
                  </div>
                  <div className="mt-0.5 break-words text-xs text-hifmuted">
                    {p.relationship ?? 'relationship not given'}
                    {p.guardianPhone && ` · ${p.guardianPhone}`}
                    {` · ${GROUP_LABEL[p.groupCode] ?? p.groupCode}`}
                  </div>
                  {p.source && (
                    <div className="mt-1.5 rounded-lg bg-mist px-2.5 py-1.5 text-sm text-ink-2">
                      &ldquo;{p.source}&rdquo;
                    </div>
                  )}
                  <div className="mt-1.5 text-xs text-hifmuted">
                    Added by {p.addedBy ?? 'a teacher'}
                    {when(p.addedAt) && ` on ${when(p.addedAt)}`}
                  </div>
                </div>

                {outcome ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      outcome === 'confirmed' ? 'bg-ok-soft text-ok-ink' : 'bg-mist text-hifmuted'
                    }`}
                  >
                    {outcome === 'confirmed' ? 'Confirmed' : 'Tick removed. Still on file as a contact.'}
                  </span>
                ) : (
                  <div className="flex w-full gap-2 sm:w-auto">
                    <button
                      disabled={busy === key}
                      onClick={() => act(p, 'confirmed')}
                      className="kq-tap flex-1 rounded-lg bg-ok px-4 py-3 text-sm font-bold text-white disabled:opacity-40 sm:flex-none"
                    >
                      Confirm
                    </button>
                    <button
                      disabled={busy === key}
                      onClick={() => act(p, 'removed')}
                      className="kq-tap flex-1 rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink-2 disabled:opacity-40 sm:flex-none"
                    >
                      Remove tick
                    </button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
