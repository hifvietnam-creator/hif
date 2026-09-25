'use client'

import { useCallback, useEffect, useState } from 'react'

export type Person = {
  id: number
  name: string
  email: string
  role: string | null
  active: boolean
  siteAdmin: boolean
  manageable: boolean
  isSelf: boolean
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  ta: 'Assistant',
}

export default function PeopleTable() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [resetting, setResetting] = useState<Person | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/kq/people', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not load the list.'); return }
      setPeople(data.people)
    } catch {
      setError('No connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (body: Record<string, unknown>, message?: string) => {
    setError(null)
    const res = await fetch('/api/kq/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error ?? 'That did not save.'); return false }
    if (message) { setNote(message); setTimeout(() => setNote(null), 6000) }
    await load()
    return true
  }

  const serving = people.filter((p) => p.active)
  const notServing = people.filter((p) => !p.active)

  if (loading) return <p className="text-sm text-hifmuted">Loading…</p>

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm text-hifmuted">
          {serving.length} serving
          {notServing.length > 0 && ` · ${notServing.length} not serving`}
        </span>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-bold text-white"
        >
          + Add somebody
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-card border border-alert/30 bg-alert-soft px-3 py-2 text-sm text-alert-deep">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {note && (
        <div className="mb-3 flex items-start gap-2 rounded-card border border-ok/30 bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          <span className="flex-1">{note}</span>
          <button onClick={() => setNote(null)} className="font-bold">✕</button>
        </div>
      )}

      <Group title="Serving" rows={serving} act={act} onReset={setResetting} />
      {notServing.length > 0 && (
        <Group title="No longer serving" rows={notServing} act={act} onReset={setResetting} muted />
      )}

      <p className="mt-3 text-xs text-hifmuted">
        Nobody is ever deleted. Somebody who stops serving keeps their account and their
        record of which rooms they worked, and can be brought back in one tap.
      </p>

      {adding && (
        <AddDialog
          onCancel={() => setAdding(false)}
          onSave={async (input) => {
            const ok = await act(
              { action: 'add', ...input },
              `${input.name} can now sign in. Give them the password you just set, and ask them to change it.`,
            )
            if (ok) setAdding(false)
            return ok
          }}
        />
      )}

      {resetting && (
        <PasswordDialog
          person={resetting}
          onCancel={() => setResetting(null)}
          onSave={async (password) => {
            const ok = await act(
              { action: 'password', id: resetting.id, password },
              `${resetting.name}'s password is set. Tell them in person or by message, not by email.`,
            )
            if (ok) setResetting(null)
            return ok
          }}
        />
      )}
    </>
  )
}

function Group({
  title, rows, act, onReset, muted,
}: {
  title: string
  rows: Person[]
  act: (b: Record<string, unknown>, m?: string) => Promise<boolean>
  onReset: (p: Person) => void
  muted?: boolean
}) {
  if (rows.length === 0) return null
  return (
    <section className={muted ? 'mt-5 opacity-80' : ''}>
      <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-hifmuted">{title}</h2>
      <div className="overflow-x-auto rounded-card border border-line bg-paper shadow-sm">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="bg-mist/60 text-[11px] uppercase tracking-wider text-hifmuted">
              <th className="px-3 py-2 text-left font-bold">Name</th>
              <th className="w-[150px] px-3 py-2 text-left font-bold">Does</th>
              <th className="px-3 py-2 text-right font-bold">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-line/70">
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-ink">
                    {p.name}
                    {p.isSelf && <span className="ml-2 text-xs font-normal text-hifmuted">you</span>}
                  </div>
                  <div className="text-xs text-hifmuted">{p.email}</div>
                </td>

                <td className="px-3 py-2.5">
                  {p.manageable ? (
                    <select
                      value={p.role ?? ''}
                      onChange={(e) => act({ action: 'role', id: p.id, role: e.target.value })}
                      className="w-full rounded border border-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-brand"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="ta">Assistant</option>
                    </select>
                  ) : (
                    // Shown, not hidden. Knowing an account exists is part of
                    // the job; being able to change it is not.
                    <span className="text-sm text-hifmuted">
                      {ROLE_LABEL[p.role ?? ''] ?? '—'}
                      {p.siteAdmin && (
                        <span className="ml-1.5 rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-bold">
                          WEBSITE
                        </span>
                      )}
                    </span>
                  )}
                </td>

                <td className="px-3 py-2.5 text-right">
                  {p.manageable ? (
                    <span className="flex justify-end gap-2">
                      <button
                        onClick={() => onReset(p)}
                        className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-2"
                      >
                        Set password
                      </button>
                      <button
                        onClick={() =>
                          act(
                            { action: 'active', id: p.id, active: !p.active },
                            p.active
                              ? `${p.name} can no longer sign in.`
                              : `${p.name} can sign in again.`,
                          )
                        }
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                          p.active ? 'bg-mist text-ink-2' : 'bg-ok text-white'
                        }`}
                      >
                        {p.active ? 'Stop serving' : 'Bring back'}
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-hifmuted">not yours to change</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** A password somebody can read aloud once and type correctly. */
function suggestPassword() {
  const words = ['sunday', 'lantern', 'harbour', 'meadow', 'compass', 'willow', 'pebble', 'garden']
  const w = () => words[Math.floor(Math.random() * words.length)]
  return `${w()}-${w()}-${Math.floor(Math.random() * 90 + 10)}`
}

function AddDialog({
  onCancel, onSave,
}: {
  onCancel: () => void
  onSave: (i: { name: string; email: string; password: string; role: string }) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('ta')
  const [password, setPassword] = useState(suggestPassword)
  const [busy, setBusy] = useState(false)

  const field = 'w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <Modal title="Add somebody to the team" onCancel={onCancel}>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">They will be a</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
            <option value="ta">Teaching assistant</option>
            <option value="teacher">Teacher</option>
          </select>
          <span className="mt-1 block text-xs text-hifmuted">
            Teachers can approve a pick-up by somebody not on a child&rsquo;s list.
            Assistants cannot.
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">First password</span>
          <div className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            <button
              type="button"
              onClick={() => setPassword(suggestPassword())}
              className="shrink-0 rounded-lg border border-line px-3 text-xs font-semibold text-ink-2"
            >
              Another
            </button>
          </div>
          <span className="mt-1 block text-xs text-hifmuted">
            Tell them this in person or by message. They can change it once they are in.
          </span>
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink-2">
          Cancel
        </button>
        <button
          disabled={!name.trim() || !email.trim() || password.length < 8 || busy}
          onClick={async () => {
            setBusy(true)
            await onSave({ name: name.trim(), email: email.trim(), password, role })
            setBusy(false)
          }}
          className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? 'Adding…' : 'Add them'}
        </button>
      </div>
    </Modal>
  )
}

function PasswordDialog({
  person, onCancel, onSave,
}: {
  person: Person
  onCancel: () => void
  onSave: (p: string) => Promise<boolean>
}) {
  const [password, setPassword] = useState(suggestPassword)
  const [busy, setBusy] = useState(false)

  return (
    <Modal title={`New password for ${person.name}`} onCancel={onCancel}>
      <p className="text-sm text-hifmuted">
        Their old password stops working straight away. Tell them the new one in person
        or by message.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={() => setPassword(suggestPassword())}
          className="shrink-0 rounded-lg border border-line px-3 text-xs font-semibold text-ink-2"
        >
          Another
        </button>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink-2">
          Cancel
        </button>
        <button
          disabled={password.length < 8 || busy}
          onClick={async () => { setBusy(true); await onSave(password); setBusy(false) }}
          className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Set it'}
        </button>
      </div>
    </Modal>
  )
}

function Modal({
  title, onCancel, children,
}: {
  title: string; onCancel: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={onCancel}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-card bg-paper p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-lg font-bold text-ink">{title}</h3>
        {children}
      </div>
    </div>
  )
}
