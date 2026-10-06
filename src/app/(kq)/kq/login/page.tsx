import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Sign in · KidzQuest' }

/**
 * The volunteers' front door.
 *
 * Before this existed, everybody signed in at /admin/login, which is the CMS
 * login. Two things were wrong with that. It said "Sign in to manage hif.vn",
 * which is not what a teacher is there to do. And once the CMS was closed to
 * anybody without siteAdmin, a volunteer who reached that page without a
 * ?redirect= on it was authenticated and then refused the panel: cookie set,
 * error on screen, no way through to KidzQuest.
 *
 * Nothing about the credentials themselves changed. The form posts to the same
 * Payload endpoint, so existing emails and passwords work exactly as they did.
 */
export default async function KqLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect: wanted } = await searchParams

  // Only ever bounce back inside KidzQuest. A ?redirect= is attacker-supplied
  // by definition, and "//evil.example" is a protocol-relative URL that a
  // naive startsWith('/') would wave through.
  const next =
    wanted && wanted.startsWith('/kq/') && !wanted.startsWith('/kq//') ? wanted : '/kq'

  // Already signed in? Don't make them do it again.
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (user) {
    const u = user as unknown as { kqRole?: string; siteAdmin?: boolean; kqActive?: boolean }
    const usable = u.kqActive !== false
    if (usable && (u.siteAdmin || u.kqRole)) redirect(next)
  }

  // The reset email goes out through Resend. Until the DNS records are in
  // place the endpoint accepts the request and sends nothing, so offering the
  // link would be a dead end dressed up as a solution.
  const canResetByEmail = Boolean(process.env.RESEND_API_KEY)

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-7 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-lg font-bold text-white">
          KQ
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">KidzQuest</h1>
        <p className="mt-1 text-sm text-hifmuted">
          Sunday check-in for Hanoi International Fellowship
        </p>
      </div>

      <div className="rounded-card border border-line bg-paper p-5 shadow-sm">
        <LoginForm next={next} />
      </div>

      <p className="mt-5 text-center text-sm leading-relaxed text-hifmuted">
        {canResetByEmail ? (
          <>
            Forgotten your password?{' '}
            <a href="/admin/forgot" className="font-semibold text-brand-dark underline">
              Send yourself a reset link
            </a>
            , or ask the KidzQuest administrator to set a new one.
          </>
        ) : (
          <>
            Forgotten your password? Ask the KidzQuest administrator and she can set a
            new one for you.
          </>
        )}
      </p>
    </main>
  )
}
