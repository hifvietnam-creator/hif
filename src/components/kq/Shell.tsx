import Link from 'next/link'
import React from 'react'

import SignOut from './SignOut'

/**
 * Admin shell for KidzQuest.
 *
 * Sidebar on a laptop, a menu that drops from the top on a phone. The mobile
 * half is not a nicety: the first version hid the sidebar below `md` and put
 * nothing in its place, so anyone on a phone landed on a page and had no way
 * to leave it. Most of the people using this are holding a phone.
 *
 * The menu is a <details> element rather than a client component with state.
 * It works with no JavaScript, closes by itself on navigation because the page
 * re-renders, and keeps this whole file on the server.
 *
 * `SUN` marks the screens needed for a Sunday to run.
 */

type NavItem = {
  href: string; label: string
  sunday?: boolean; ready?: boolean
  /** Hidden from teachers and assistants, who would only be redirected away. */
  adminOnly?: boolean
}

/**
 * Labels are the ones the ministry uses, not the ones the database uses.
 *
 * "Teachers" and "People" both used to be in this list, and both read as the
 * place you add a teacher. One was the Sunday rota, the other was the accounts,
 * and nothing on screen said which. They now say what they are for.
 *
 * The second heading was "Admin", which is the single word for the one place
 * Ate must never go. It is "Ministry" now.
 */
const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'KidzQuest',
    items: [{ href: '/kq', label: 'Home', ready: true }],
  },
  {
    heading: 'Sunday',
    items: [
      { href: '/kq/station', label: 'Take attendance', sunday: true, ready: true },
      { href: '/kq/register', label: 'Register', sunday: true, ready: true },
    ],
  },
  {
    heading: 'Ministry',
    items: [
      { href: '/kq/dashboard', label: 'Dashboard', sunday: true, ready: true, adminOnly: true },
      { href: '/kq/kids', label: 'Children', sunday: true, ready: true, adminOnly: true },
      // Who is in which room this Sunday.
      { href: '/kq/teachers', label: 'Rota: teachers', ready: true, adminOnly: true },
      { href: '/kq/assistants', label: 'Rota: assistants', ready: true, adminOnly: true },
      // Accounts, which is a different question from the rota, so a different
      // screen. This is where a teacher gets created.
      { href: '/kq/people', label: 'Volunteers and logins', ready: true, adminOnly: true },
    ],
  },
]

const ALL_ITEMS = NAV.flatMap((s) => s.items)

/** "ta" is not a word. Nobody calls themselves that out loud. */
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  ta: 'Teaching assistant',
}

export default function Shell({
  current,
  user,
  children,
}: {
  current: string
  user: { name: string; role: string }
  children: React.ReactNode
}) {
  const visible = (items: NavItem[]) =>
    items.filter((i) => !i.adminOnly || user.role === 'admin')

  const here = ALL_ITEMS.find((i) => i.href === current)

  return (
    <div className="flex min-h-screen flex-col bg-mist md:flex-row">
      {/* ── Phone: a bar you can always get out of ─────────────────────── */}
      <details className="group sticky top-0 z-30 bg-[#16202b] text-[#aebac6] md:hidden">
        <summary
          className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 [&::-webkit-details-marker]:hidden"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-xs font-bold text-white">
            KQ
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold text-white">
              {here?.label ?? 'KidzQuest'}
            </span>
            <span className="block text-[11px] text-[#66788b]">{user.name}</span>
          </span>
          {/* Rotates when open, so the control says which way it goes. */}
          <span className="text-lg transition-transform group-open:rotate-180">⌄</span>
        </summary>

        <nav className="border-t border-[#24313f] px-3 pb-3 pt-1">
          {NAV.map((section) => {
            const items = visible(section.items)
            if (!items.length) return null
            return (
              <div key={section.heading}>
                <div className="mb-1 mt-3 px-2 text-[11px] font-bold uppercase tracking-wider text-[#66788b]">
                  {section.heading}
                </div>
                {items.map((item) => (
                  <NavLink key={item.href} item={item} active={current === item.href} big />
                ))}
              </div>
            )
          })}

          <div className="mt-3 border-t border-[#24313f] pt-2">
            <SignOut className="w-full rounded-md px-2.5 py-3 text-left text-sm text-[#b6c2ce] hover:bg-[#1f2b38] hover:text-white disabled:opacity-50" />
          </div>
        </nav>
      </details>

      {/* ── Laptop: the sidebar ────────────────────────────────────────── */}
      <aside className="hidden w-56 shrink-0 flex-col bg-[#16202b] px-3 py-4 text-[#aebac6] md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
            KQ
          </span>
          <span>
            <span className="block text-[15px] font-bold text-white">KidzQuest</span>
            <span className="block text-[11px] text-[#66788b]">Hanoi campus</span>
          </span>
        </div>

        {NAV.map((section) => {
          const items = visible(section.items)
          if (!items.length) return null
          return (
            <div key={section.heading}>
              <div className="mb-1.5 mt-4 px-2 text-[11px] font-bold uppercase tracking-wider text-[#66788b]">
                {section.heading}
              </div>
              <nav className="flex flex-col gap-px">
                {items.map((item) => (
                  <NavLink key={item.href} item={item} active={current === item.href} />
                ))}
              </nav>
            </div>
          )
        })}

        <div className="mt-auto border-t border-[#24313f] pt-3">
          <div className="px-2 text-xs">
            <div className="font-semibold text-white">{user.name}</div>
            <div className="text-[#7d8fa2]">{ROLE_LABEL[user.role] ?? user.role}</div>
          </div>
          <SignOut className="mt-2 w-full rounded-md px-2 py-2 text-left text-xs font-semibold text-[#8fa3b6] hover:bg-[#1f2b38] hover:text-white disabled:opacity-50" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-6">{children}</main>
    </div>
  )
}

function NavLink({ item, active, big }: { item: NavItem; active: boolean; big?: boolean }) {
  // Taller targets on a phone. 44px is about the smallest a thumb finds
  // reliably, and this gets used one-handed.
  const cls =
    `flex items-center gap-2 rounded-md px-2.5 text-sm ${big ? 'py-3' : 'py-2'} ` +
    (active
      ? 'bg-brand font-semibold text-white'
      : item.ready
        ? 'text-[#b6c2ce] hover:bg-[#1f2b38] hover:text-white'
        : 'cursor-not-allowed text-[#5d6d7d]')

  const inner = (
    <>
      <span className="flex-1">{item.label}</span>
      {item.sunday && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
            active ? 'bg-white/25 text-white' : 'bg-[#2c3b4b] text-[#8fa3b6]'
          }`}
        >
          SUN
        </span>
      )}
    </>
  )

  // Unbuilt screens are shown but not linked. Hiding them would make the app
  // look finished; a dead link would waste a tap.
  return item.ready ? (
    <Link href={item.href} className={cls}>{inner}</Link>
  ) : (
    <span className={cls} title="Not built yet">{inner}</span>
  )
}
