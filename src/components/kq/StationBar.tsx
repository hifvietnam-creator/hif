import Link from 'next/link'

import SignOut from './SignOut'

/**
 * The reduced chrome for station screens.
 *
 * The room picker and the room itself deliberately don't get the full sidebar:
 * they are used one-handed at a door, mid-queue, and every extra link is
 * something to hit by accident while reaching for a child's name.
 *
 * But "no sidebar" had become "no way out". A TA who finished a service had no
 * Home and no sign out, and on a shared tablet that second one matters: the
 * next person to pick it up inherited the last person's session.
 *
 * So: the mark, where you are, Home, and out. Nothing else.
 */
export default function StationBar({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 bg-[#16202b] px-3 py-2 text-[#aebac6]">
      <Link
        href="/kq"
        aria-label="KidzQuest home"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-[11px] font-bold text-white"
      >
        KQ
      </Link>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white">{title}</span>
        {subtitle && (
          <span className="block truncate text-[11px] text-[#66788b]">{subtitle}</span>
        )}
      </span>

      <Link
        href="/kq"
        className="shrink-0 rounded-md px-2.5 py-2 text-xs font-semibold text-[#b6c2ce] hover:bg-[#1f2b38] hover:text-white"
      >
        Home
      </Link>
      <SignOut className="shrink-0 rounded-md px-2.5 py-2 text-xs font-semibold text-[#b6c2ce] hover:bg-[#1f2b38] hover:text-white disabled:opacity-50" />
    </div>
  )
}
