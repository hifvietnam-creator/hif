import type { AccessArgs, FieldAccess } from 'payload'

import type { User } from '@/payload-types'

/**
 * KidzQuest role checks.
 *
 * Two layers, deliberately kept apart:
 *
 *   kqRole              what kind of thing you may do
 *   kq.session_staff    which room you may do it in, today
 *
 * A TA can check children out of their own room and no other. That falls out
 * of the session join rather than needing a rule here — this file only answers
 * the first question.
 *
 * These guard the Payload admin panel and the users collection. The station
 * routes under /kq do their own session-level check on top.
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
  if (roleOf(user) === 'admin') return true
  return { id: { equals: user.id } }
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
