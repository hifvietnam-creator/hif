/**
 * Who is operating the station, and what they may do.
 *
 * Two layers, and they answer different questions:
 *
 *   kqRole            what kind of thing you may do
 *   kq.session_staff  which room you may do it in, today
 *
 * A TA assigned to Explorers can check children out of Explorers and nowhere
 * else. That is not a rule anyone has to remember — it falls out of the join.
 */

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { getPool } from '../db'

export type KqRole = 'admin' | 'teacher' | 'ta'

export type KqUser = {
  id: number
  name: string | null
  email: string
  role: KqRole
}

/** The signed-in user, if they have any KidzQuest role at all. */
export async function getKqUser(headers: Headers): Promise<KqUser | null> {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })
  if (!user) return null

  const role = (user as { kqRole?: string }).kqRole
  if (role !== 'admin' && role !== 'teacher' && role !== 'ta') return null

  return {
    id: typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10),
    name: (user as { name?: string | null }).name ?? null,
    email: user.email,
    role,
  }
}

/**
 * May this user work this session?
 *
 * Admins may work any room — somebody has to be able to step in when a TA
 * doesn't turn up. Teachers and TAs must be rostered to it.
 */
export async function canWorkSession(user: KqUser, sessionId: number): Promise<boolean> {
  if (user.role === 'admin') return true
  const { rows } = await getPool().query<{ n: string }>(
    `select count(*)::text as n from kq.session_staff
      where session_id = $1 and staff_user_id = $2`,
    [sessionId, user.id],
  )
  return parseInt(rows[0]!.n, 10) > 0
}

/**
 * Only a teacher or admin may release a child to someone not on the authorised
 * list. It is the one path that bypasses the safeguarding check, so it should
 * cost something — a more senior person putting their name against it.
 */
export const canOverride = (user: KqUser) => user.role === 'admin' || user.role === 'teacher'
