import type { AccessArgs, FieldAccess } from 'payload'

import type { User } from '@/payload-types'

/**
 * Who may do what.
 *
 * THREE INDEPENDENT THINGS, and keeping them apart is the point of this file:
 *
 *   siteAdmin           runs the website. Reaches the Payload CMS.
 *   kqRole              runs, teaches in, or helps with KidzQuest.
 *   kq.session_staff    which room you may work in, today.
 *
 * siteAdmin and kqRole do not imply one another. A webmaster can have the CMS
 * and no ministry role; a ministry administrator can run KidzQuest and never
 * see a sermon. They were one field until September 2026, which meant handing
 * the whole church website to whoever looked after the children.
 *
 * The room restriction falls out of the session join rather than living here.
 */

type Check = (args: AccessArgs<User>) => boolean

/**
 * Reads kqRole off whatever Payload hands us.
 *
 * Deliberately loose about its argument: collection access receives a fully
 * typed User, field access receives `TypedUser`, and until payload-types is
 * regenerated neither of them knows kqRole exists. One narrow cast here is
 * better than the same cast repeated at five call sites.
 */
const roleOf = (user: unknown): string | null =>
  (user as { kqRole?: string } | null | undefined)?.kqRole ?? null

const isSite = (user: unknown): boolean =>
  (user as { siteAdmin?: boolean } | null | undefined)?.siteAdmin === true

/**
 * Runs the website. Gates the Payload CMS and nothing else.
 *
 * Deliberately NOT satisfied by kqRole === 'admin'. That was the old behaviour
 * and it is what this change exists to undo.
 */
export const isSiteAdmin: Check = ({ req: { user } }) => isSite(user)

export const isSiteAdminField: FieldAccess = ({ req: { user } }) => isSite(user)

export const isKqAdmin: Check = ({ req: { user } }) => roleOf(user) === 'admin'

export const isKqTeacher: Check = ({ req: { user } }) => {
  const r = roleOf(user)
  return r === 'admin' || r === 'teacher'
}

export const isKqStaff: Check = ({ req: { user } }) => {
  const r = roleOf(user)
  return r === 'admin' || r === 'teacher' || r === 'ta'
}

/**
 * Read your own record, or anyone's if you are an admin.
 *
 * Returning a query constraint rather than a boolean is how Payload filters a
 * list: a TA hitting /api/users gets exactly one row back — themselves —
 * instead of the whole volunteer roster with everyone's email in it.
 */
export const isSelfOrKqAdmin = ({ req: { user } }: AccessArgs<User>) => {
  if (!user) return false
  if (isSite(user) || roleOf(user) === 'admin') return true
  return { id: { equals: user.id } }
}

/**
 * May this person act on that one?
 *
 * The escalation guard. A KidzQuest administrator can add volunteers and set
 * their passwords, which means that without this she could set the site
 * administrator's password, sign in as them, and reach the CMS she was
 * deliberately kept out of.
 *
 * So she may only act on teachers and assistants, and never on a site admin or
 * another ministry admin. Site admins are unrestricted, because they already
 * hold the keys to everything.
 */
export function canManage(
  actor: unknown,
  target: { kqRole?: string | null; siteAdmin?: boolean | null },
): boolean {
  if (isSite(actor)) return true
  if (roleOf(actor) !== 'admin') return false
  if (target.siteAdmin) return false
  return target.kqRole === 'teacher' || target.kqRole === 'ta'
}

/**
 * The same admin check, typed for FIELD access rather than collection access.
 *
 * Payload's FieldAccess passes `data` as Partial<any> where collection Access
 * passes a full document, so the two signatures are genuinely incompatible and
 * one function cannot serve both. This guards the kqRole field itself: without
 * it a TA could edit their own record — which they must be able to do, to
 * change a password — and promote themselves to admin on the way through.
 */
export const isKqAdminField: FieldAccess = ({ req: { user } }) => roleOf(user) === 'admin'
