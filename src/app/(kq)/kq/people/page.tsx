import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import Shell from '@/components/kq/Shell'
import { getKqUser } from '@/lib/kq/auth'

import PeopleTable from './PeopleTable'

export const dynamic = 'force-dynamic'

/**
 * Volunteer accounts, inside KidzQuest.
 *
 * This exists so the ministry administrator never needs the Payload CMS. She
 * adds teachers and assistants, changes what they do, stops somebody who has
 * left, and sets a password when one is forgotten — without ever being able to
 * reach a sermon, a page, or the site administrator's account.
 */
export default async function PeoplePage() {
  const user = await getKqUser(await nextHeaders())

  // A site administrator may have no KidzQuest role at all, so getKqUser alone
  // would turn them away from a screen they are entitled to.
  const payload = await getPayload({ config: configPromise })
  const { user: raw } = await payload.auth({ headers: await nextHeaders() })
  const siteAdmin = (raw as { siteAdmin?: boolean } | null)?.siteAdmin === true

  if (!user && !siteAdmin) redirect('/admin/login?redirect=/kq/people')
  if (user && user.role !== 'admin' && !siteAdmin) redirect('/kq/station')

  return (
    <Shell
      current="/kq/people"
      user={{ name: user?.name ?? raw?.email ?? 'Administrator', role: user?.role ?? 'admin' }}
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">People</h1>
        <p className="mt-0.5 text-sm text-hifmuted">
          Everyone who helps with KidzQuest. Add somebody, change what they do, or stop
          an account when they are no longer serving.
        </p>
      </header>

      <div className="mb-4 rounded-card border border-brand/25 bg-brand-soft px-4 py-3 text-sm text-[#14536b]">
        <b>Accounts have to be made here, not in the database.</b> Passwords are
        scrambled when they are saved, so a person added any other way has an account
        that exists but can never be signed into.
      </div>

      <PeopleTable />
    </Shell>
  )
}
