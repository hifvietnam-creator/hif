'use client'

import { useState } from 'react'

/**
 * Sign out of KidzQuest.
 *
 * A button rather than a link, because signing out changes something and a
 * link that changes something is a link a browser will happily prefetch.
 *
 * The navigation afterwards is a full `window.location` assignment, not
 * `router.push`. Every server component rendered for this person is cached in
 * the client router, so a soft navigation would leave their name in the
 * sidebar and their children's names on screen after the cookie had gone.
 */
export default function SignOut({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      className={className}
      onClick={async () => {
        setBusy(true)
        try {
          await fetch('/api/users/logout', {
            method: 'POST',
            credentials: 'include',
          })
        } catch {
          // Offline, or the request never landed. Leave anyway: an expired
          // cookie is better handled by the next page load than by trapping
          // somebody on a screen they asked to leave.
        }
        window.location.href = '/kq/login'
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
