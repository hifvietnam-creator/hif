/**
 * Card codes.
 *
 * The ministry keeps a box of physical cards, one per child. A parent is handed
 * their child's card at drop-off and returns it at pick-up. The card never
 * leaves the building.
 *
 * That makes the code an identifier rather than a secret. Knowing Abigail Bui
 * is EX-AB-BU gets nobody anywhere without the card itself, so the code can be
 * readable — which matters far more, because a volunteer holding a returned
 * card has to find the right child in a room of forty.
 *
 *   EX-AB-BU    Explorers · Abigail · Bui
 *   VO-BA-NG    Voyagers  · Bảo Anh · Nguyễn
 *   EX-GE-NI-2  the second Explorer whose letters collide
 *
 * Mirrors kq.card_letters and kq.group_prefix in migration 016. The SQL does
 * the initial pass over everyone; this handles children who arrive afterwards.
 * Both must agree, so change them together.
 */

import { getPool } from '../db'

const PREFIX: Record<string, string> = {
  explorers: 'EX',
  voyagers: 'VO',
  trailblazers: 'TR',
  pathfinders: 'PA',
  aftershock: 'AS',
}

/**
 * First two letters, with diacritics removed.
 *
 * 'Bảo Anh' → BA · 'de Armas' → DE · "nyang'ondi" → NY
 *
 * Returns null when there are not two letters to take, which is how a child
 * with no family name ends up without a card rather than with a broken one.
 */
export function cardLetters(name: string | null | undefined, n = 2): string | null {
  if (!name) return null
  const stripped = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // combining accents
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^A-Za-z]/g, '')
  return stripped.length >= n ? stripped.slice(0, n).toUpperCase() : null
}

export const groupPrefix = (groupCode: string) => PREFIX[groupCode] ?? 'KQ'

/** The code a child would get, before any collision is resolved. */
export function baseCode(
  groupCode: string,
  firstName: string,
  lastName: string | null,
): string | null {
  const a = cardLetters(firstName)
  const b = cardLetters(lastName)
  if (!a || !b) return null
  return `${groupPrefix(groupCode)}-${a}-${b}`
}

/**
 * Give a child a code, or return the one they already have.
 *
 * Never overwrites. A card exists in the world; correcting a spelling in the
 * database must not quietly make it wrong. Reissuing is a deliberate act.
 */
export async function ensureCardCode(childId: number): Promise<string | null> {
  const db = getPool()

  const { rows } = await db.query<{
    card_code: string | null; first_name: string; last_name: string; group_code: string | null
  }>(
    `select c.card_code, c.first_name, c.last_name, e.group_code
       from kq.children c
       left join kq.enrollments e on e.child_id = c.id and e.ended_on is null
      where c.id = $1`,
    [childId],
  )
  const row = rows[0]
  if (!row) return null
  if (row.card_code) return row.card_code
  if (!row.group_code) return null

  const base = baseCode(row.group_code, row.first_name, row.last_name)
  if (!base) return null   // no family name yet

  // Take the base if free, else the lowest free suffix. The unique index is the
  // real guard — two TAs adding children at once would otherwise both see the
  // same gap and both try to take it.
  for (let n = 1; n <= 40; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    try {
      const { rowCount } = await db.query(
        `update kq.children set card_code = $2 where id = $1 and card_code is null`,
        [childId, candidate],
      )
      if (rowCount) return candidate
      // Somebody assigned one in between; use theirs.
      const { rows: again } = await db.query<{ card_code: string | null }>(
        `select card_code from kq.children where id = $1`, [childId],
      )
      return again[0]?.card_code ?? null
    } catch (e) {
      if ((e as { code?: string }).code === '23505') continue   // taken, try the next
      throw e
    }
  }
  return null
}

/**
 * Reissue after a group change. Deliberate, and it tells the caller what the
 * old code was so a card can be pulled from the box.
 */
export async function reissueCardCode(
  childId: number,
  actorUserId: number,
): Promise<{ from: string | null; to: string | null }> {
  const db = getPool()
  const { rows } = await db.query<{ card_code: string | null }>(
    `select card_code from kq.children where id = $1`, [childId],
  )
  const from = rows[0]?.card_code ?? null

  await db.query(
    `update kq.children set card_code = null, card_issued_at = null where id = $1`,
    [childId],
  )
  const to = await ensureCardCode(childId)

  await db.query(
    `insert into kq.child_events
       (child_id, event_type, field, old_value, new_value, actor_user_id)
     values ($1,'field_change','card_code',$2,$3,$4)`,
    [childId, from, to, actorUserId],
  )
  return { from, to }
}
