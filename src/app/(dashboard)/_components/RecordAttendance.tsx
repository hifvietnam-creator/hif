'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * Enter the adult headcount for a Sunday.
 *
 * One field, saved on blur or Enter. The deliberate constraint is scope: the
 * moment this becomes a form with several fields and a submit button, it turns
 * into a task somebody defers — and the monthly report already shows where
 * that ends up, 55% empty across six months.
 *
 * Children are shown but not editable here when KidsQuest supplied them; the
 * register is the better source and should not be casually overwritten.
 */

export type PendingService = {
  id: string | null
  campus: string
  service_date: string
  adults: number | null
  kids: number | null
  kids_source: string
}

function Row({ service }: { service: PendingService }) {
  const router = useRouter()
  const [value, setValue] = useState(service.adults === null ? '' : String(service.adults))
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const save = async () => {
    const original = service.adults === null ? '' : String(service.adults)
    if (value === original) return
    setState('saving')
    setMessage(null)
    try {
      const res = await fetch('/api/dashboard/service-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campus: service.campus,
          date: service.service_date,
          adults: value === '' ? null : value,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not save')
      setState('saved')
      // Refresh so the baselines above recompute with the new figure.
      startTransition(() => router.refresh())
    } catch (err) {
      setState('error')
      setMessage((err as Error).message)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 py-2 last:border-0 dark:border-neutral-900">
      <span className="w-28 shrink-0 tabular-nums text-neutral-600 dark:text-neutral-400">
        {service.service_date}
      </span>
      <span className="w-28 shrink-0 text-neutral-700 dark:text-neutral-300">{service.campus}</span>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Adults</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setState('idle')
          }}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          placeholder="—"
          className="w-24 rounded border border-neutral-300 bg-transparent px-2 py-1 tabular-nums dark:border-neutral-700"
        />
      </label>

      <span className="text-sm text-neutral-500">
        Children{' '}
        {service.kids === null ? (
          <span className="text-amber-700 dark:text-amber-500">not recorded</span>
        ) : (
          <span className="tabular-nums text-neutral-700 dark:text-neutral-300">
            {service.kids}
            <span className="ml-1 text-xs text-neutral-400">
              {service.kids_source === 'kidsquest' ? 'from KidsQuest' : service.kids_source}
            </span>
          </span>
        )}
      </span>

      <span className="ml-auto text-xs">
        {state === 'saving' && <span className="text-neutral-500">saving…</span>}
        {state === 'saved' && <span className="text-emerald-600 dark:text-emerald-500">saved</span>}
        {state === 'error' && <span className="text-red-600 dark:text-red-400">{message}</span>}
      </span>
    </div>
  )
}

export default function RecordAttendance({ services }: { services: PendingService[] }) {
  if (services.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Every recent Sunday has an adult count. Nothing to enter.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      {services.map((s) => (
        <Row key={`${s.campus}-${s.service_date}`} service={s} />
      ))}
      <p className="mt-3 text-xs text-neutral-500">
        Type the number and press Enter, or click away. Children come from KidsQuest automatically
        when the register has been taken.
      </p>
    </div>
  )
}
