import Link from 'next/link'
import React from 'react'

/**
 * Admin shell for KidzQuest — sidebar plus content.
 *
 * A component rather than a nested layout, so the station route stays outside
 * it. The station is a phone screen used one-handed at a door; wrapping it in a
 * desktop sidebar would be the wrong shape for the only job that has to work.
 *
 * `SUN` marks the screens needed for a Sunday to run. The rest can follow.
 */

type NavItem = { href: string; label: string; sunday?: boolean; ready?: boolean }

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Sunday',
    items: [{ href: '/kq/station', label: 'Attendance', sunday: true, ready: true }],
  },
  {
    heading: 'Admin',
    items: [
      { href: '/kq/dashboard', label: 'Dashboard', sunday: true, ready: true },
      { href: '/kq/kids', label: 'Kids', sunday: true, ready: true },
      { href: '/kq/register', label: 'Register', sunday: true },
      { href: '/kq/teachers', label: 'Teachers', ready: true },
      { href: '/kq/assistants', label: 'Assistants', ready: true },
    ],
  },
]

export default function Shell({
  current,
  user,
  children,
}: {
  current: string
  user: { name: string; role: string }
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-mist">
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

        {NAV.map((section) => (
          <div key={section.heading}>
            <div className="mb-1.5 mt-4 px-2 text-[11px] font-bold uppercase tracking-wider text-[#66788b]">
              {section.heading}
            </div>
            <nav className="flex flex-col gap-px">
              {section.items.map((item) => {
                const active = current === item.href
                // Unbuilt screens are shown but not linked. Hiding them would
                // make the app look finished; a dead link would waste a click.
                const cls =
                  'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm ' +
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

                return item.ready ? (
                  <Link key={item.href} href={item.href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <span key={item.href} className={cls} title="Not built yet">
                    {inner}
                  </span>
                )
              })}
            </nav>
          </div>
        ))}

        <div className="mt-auto border-t border-[#24313f] px-2 pt-3 text-xs">
          <div className="font-semibold text-white">{user.name}</div>
          <div className="text-[#7d8fa2] capitalize">{user.role}</div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-6 md:px-8">{children}</main>
    </div>
  )
}
