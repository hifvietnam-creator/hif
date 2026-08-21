import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'

import Shell from '@/components/kq/Shell'
import { getKqUser } from '@/lib/kq/auth'
import { listChildren } from '@/lib/kq/children'

import KidsTable from './KidsTable'

export const dynamic = 'force-dynamic'

export default async function KidsPage() {
  const user = await getKqUser(await nextHeaders())
  if (!user) redirect('/admin/login?redirect=/kq/kids')
  if (user.role !== 'admin') redirect('/kq/station')

  // Archived children are loaded too — the "Left" filter needs them, and the
  // table hides them from every other view.
  const children = await listChildren(true)

  return (
    <Shell current="/kq/kids" user={{ name: user.name ?? user.email, role: user.role }}>
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Kids</h1>
        <p className="mt-0.5 text-sm text-hifmuted">
          {children.length} children on the register. Edit any cell directly; expand a row
          to manage who may collect them.
        </p>
      </header>

      <div className="mb-4 rounded-card border border-brand/25 bg-brand-soft px-4 py-3 text-sm text-[#14536b]">
        <b>Setting a grade does three things.</b> It records the grade, moves the child into
        the group that grade implies, and marks their placement confirmed. The unconfirmed
        placements left by the import clear themselves as you work down this list.
      </div>

      <KidsTable initial={children} />
    </Shell>
  )
}
