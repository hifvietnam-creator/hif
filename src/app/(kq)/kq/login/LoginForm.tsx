'use client'

import { useState } from 'react'

/**
 * KidzQuest sign-in.
 *
 * Posts to Payload's own login endpoint, so the credential handling, the
 * hashing, the cookie and the beforeLogin hook are all unchanged. The only
 * thing this replaces is the screen, which until now was the CMS login and
 * told a teacher she was signing in to manage the website.
 */
export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      if (res.ok) {
        // Full page load, not router.push. The cookie was set by the response
        // we are holding, and the router's cache still belongs to nobody.
        window.location.href = next
        return
      }

      // Payload puts the useful sentence in errors[0].message. That is where
      // the deactivated-account message arrives, so it has to be preferred
      // over anything generic.
      const body = (await res.json().catch(() => null)) as {
        errors?: { message?: string }[]
      } | null
      const message = body?.errors?.[0]?.message

      setError(
        message && message !== 'The email or password provided is incorrect.'
          ? message
          : 'That email and password do not match an account. Check for a stray space, and remember the password is case sensitive.',
      )
    } catch {
      setError('Could not reach the server. Check the connection and try again.')
    }

    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-card border border-alert/30 bg-alert-soft px-4 py-3 text-sm text-alert-deep"
        >
          {error}
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="kq-tap w-full rounded-md bg-brand px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
