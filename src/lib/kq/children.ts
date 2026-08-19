/**
 * KidzQuest children — list and edit.
 *
 * Every mutation writes a kq.child_events row in the same transaction as the
 * change itself. Inline editing has no undo, so if the audit write fails the
 * edit must fail with it — an unattributable change to a child's allergy is
 * worse than a change that didn't happen.
 */

import { getPool } from '../db'

export type ChildRow = {
  childId: number
  enrollmentId: number
  firstName: string
  lastName: string
  preferredName: string | null
  gender: string | null
  birthdate: string | null
  grade: number | null
  groupCode: string
  groupManual: boolean
  provisional: boolean
  allergies: string | null
  careNotes: string | null
  photoConsent: boolean | null
  active: boolean
  guardians: {
    id: number
    fullName: string
    relationship: string | null
    canPickup: boolean
    isPrimary: boolean
    email: string | null
    phone: string | null
  }[]
}

/** Flat fields a cell may edit. Anything not here is rejected by the API. */
export const EDITABLE_CHILD_FIELDS = [
  'first_name', 'last_name', 'preferred_name',
  'gender', 'birthdate', 'allergies', 'care_notes',
  'photo_consent', 'active',
] as const
export type EditableChildField = (typeof EDITABLE_CHILD_FIELDS)[number]

export async function listChildren(includeInactive = false): Promise<ChildRow[]> {
  const db = getPool()

  const { rows } = await db.query<{
    child_id: string; enrollment_id: string
    first_name: string; last_name: string; preferred_name: string | null
    gender: string | null; birthdate: Date | null
    grade: number | null; group_code: string
    group_manual: boolean; provisional: boolean
    allergies: string | null; care_notes: string | null
    photo_consent: boolean | null; active: boolean
  }>(
    `select c.id as child_id, e.id as enrollment_id,
            c.first_name, c.last_name, c.preferred_name,
            c.gender, c.birthdate,
            e.grade, e.group_code, e.group_manual, e.provisional,
            c.allergies, c.care_notes, c.photo_consent, c.active
       from kq.children c
       join kq.enrollments e on e.child_id = c.id and e.ended_on is null
      where ($1::boolean or c.active)
      order by lower(c.first_name), lower(c.last_name)`,
    [includeInactive],
  )

  if (rows.length === 0) return []

  const ids = rows.map((r) => parseInt(r.child_id, 10))
  const { rows: gRows } = await db.query<{
    child_id: string; id: string; full_name: string
    relationship: string | null; can_pickup: boolean; is_primary: boolean
    email: string | null; phone: string | null
  }>(
    `select cg.child_id, g.id, g.full_name, cg.relationship, cg.can_pickup,
            cg.is_primary, g.email::text as email, coalesce(g.e164, g.phone) as phone
       from kq.child_guardians cg
       join kq.guardians g on g.id = cg.guardian_id
      where cg.child_id = any($1::bigint[])
      order by cg.is_primary desc, g.full_name`,
    [ids],
  )

  const byChild = new Map<number, ChildRow['guardians']>()
  for (const g of gRows) {
    const k = parseInt(g.child_id, 10)
    if (!byChild.has(k)) byChild.set(k, [])
    byChild.get(k)!.push({
      id: parseInt(g.id, 10),
      fullName: g.full_name,
      relationship: g.relationship,
      canPickup: g.can_pickup,
      isPrimary: g.is_primary,
      email: g.email,
      phone: g.phone,
    })
  }

  return rows.map((r) => ({
    childId: parseInt(r.child_id, 10),
    enrollmentId: parseInt(r.enrollment_id, 10),
    firstName: r.first_name,
    lastName: r.last_name,
    preferredName: r.preferred_name,
    gender: r.gender,
    birthdate: r.birthdate ? r.birthdate.toISOString().slice(0, 10) : null,
    grade: r.grade,
    groupCode: r.group_code,
    groupManual: r.group_manual,
    provisional: r.provisional,
    allergies: r.allergies,
    careNotes: r.care_notes,
    photoConsent: r.photo_consent,
    active: r.active,
    guardians: byChild.get(parseInt(r.child_id, 10)) ?? [],
  }))
}

// ── Edits ────────────────────────────────────────────────────────────────────

export async function updateChildField(
  childId: number,
  field: EditableChildField,
  value: string | boolean | null,
  actorUserId: number,
): Promise<void> {
  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')

    const { rows: before } = await client.query(
      `select ${field}::text as v from kq.children where id = $1 for update`,
      [childId],
    )
    if (before.length === 0) throw new Error('No such child')
    const oldValue = (before[0] as { v: string | null }).v

    await client.query(
      `update kq.children set ${field} = $2 where id = $1`,
      [childId, value === '' ? null : value],
    )

    const { rows: after } = await client.query(
      `select ${field}::text as v from kq.children where id = $1`,
      [childId],
    )
    const newValue = (after[0] as { v: string | null }).v

    if (oldValue !== newValue) {
      await client.query(
        `insert into kq.child_events
           (child_id, event_type, field, old_value, new_value, actor_user_id)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          childId,
          field === 'active' && newValue === 'false' ? 'deactivated' : 'field_change',
          field, oldValue, newValue, actorUserId,
        ],
      )
    }

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}

/**
 * Set a child's grade on their current enrolment.
 *
 * This is the screen's main event. Setting a grade does three things at once:
 * records the grade, moves the child to the group that grade implies, and
 * clears `provisional`. So the 107 unconfirmed placements left by the import
 * resolve as a side effect of ordinary roster tidying — there is no separate
 * "confirm placements" screen to build or to remember to use.
 *
 * A manual placement is respected: if someone deliberately put a child outside
 * their grade's group, the grade is recorded but the group is left alone.
 */
export async function setChildGrade(
  enrollmentId: number,
  grade: number | null,
  actorUserId: number,
): Promise<{ groupCode: string; provisional: boolean }> {
  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')

    const { rows: cur } = await client.query<{
      child_id: string; grade: number | null; group_code: string; group_manual: boolean
    }>(
      `select child_id, grade, group_code, group_manual
         from kq.enrollments where id = $1 for update`,
      [enrollmentId],
    )
    if (cur.length === 0) throw new Error('No such enrolment')
    const row = cur[0]!
    const childId = parseInt(row.child_id, 10)

    let groupCode = row.group_code
    if (grade !== null && !row.group_manual) {
      const { rows: m } = await client.query<{ group_code: string }>(
        `select group_code from kq.grade_map where grade = $1`,
        [grade],
      )
      // A grade past the table means the child has outgrown KidzQuest. Do not
      // move them automatically — leaving for Aftershock is a conversation with
      // a family, not a consequence of typing 8 into a cell.
      groupCode = m[0]?.group_code ?? row.group_code
    }

    const provisional = grade === null

    await client.query(
      `update kq.enrollments
          set grade        = $2,
              group_code   = $3,
              provisional  = $4,
              confirmed_by = case when $4 then null else $5 end,
              confirmed_at = case when $4 then null else now() end
        where id = $1`,
      [enrollmentId, grade, groupCode, provisional, actorUserId],
    )

    if (row.grade !== grade) {
      await client.query(
        `insert into kq.child_events
           (child_id, event_type, field, old_value, new_value, actor_user_id, detail)
         values ($1,'field_change','grade',$2,$3,$4,$5)`,
        [childId, row.grade?.toString() ?? null, grade?.toString() ?? null, actorUserId,
         JSON.stringify({ viaGradeCell: true })],
      )
    }
    if (row.group_code !== groupCode) {
      await client.query(
        `insert into kq.child_events
           (child_id, event_type, field, old_value, new_value, actor_user_id, detail)
         values ($1,'group_change','group_code',$2,$3,$4,$5)`,
        [childId, row.group_code, groupCode, actorUserId,
         JSON.stringify({ derivedFromGrade: grade })],
      )
    }

    await client.query('commit')
    return { groupCode, provisional }
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}

/** Turn a guardian's authority to collect on or off. */
export async function setPickup(
  childId: number,
  guardianId: number,
  canPickup: boolean,
  actorUserId: number,
): Promise<void> {
  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query(
      `update kq.child_guardians set can_pickup = $3
        where child_id = $1 and guardian_id = $2`,
      [childId, guardianId, canPickup],
    )
    await client.query(
      `insert into kq.child_events
         (child_id, event_type, field, old_value, new_value, actor_user_id, detail)
       values ($1,'pickup_changed','can_pickup',$2,$3,$4,$5)`,
      [childId, String(!canPickup), String(canPickup), actorUserId,
       JSON.stringify({ guardianId })],
    )
    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}

/**
 * Attach an adult to a child, creating the guardian if they are new.
 *
 * Matches an existing guardian on email or phone before creating one, for the
 * same reason the importer did: a family sharing a number should not become two
 * records, or a correction made in one place will silently not apply in the
 * other.
 */
export async function addGuardian(
  childId: number,
  input: {
    fullName: string
    relationship: string | null
    email: string | null
    phone: string | null
    canPickup: boolean
  },
  actorUserId: number,
): Promise<void> {
  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')

    let guardianId: number | null = null
    if (input.email || input.phone) {
      const { rows } = await client.query<{ id: string }>(
        `select id from kq.guardians
          where ($1::citext is not null and email = $1::citext)
             or ($2::text  is not null and (phone = $2 or e164 = $2))
          limit 1`,
        [input.email, input.phone],
      )
      if (rows[0]) guardianId = parseInt(rows[0].id, 10)
    }

    if (guardianId === null) {
      const digits = (input.phone ?? '').replace(/\D/g, '')
      const e164 = /^0[35789]\d{8}$/.test(digits) ? '+84' + digits.slice(1) : null
      const { rows } = await client.query<{ id: string }>(
        `insert into kq.guardians (full_name, email, phone, e164)
         values ($1,$2,$3,$4) returning id`,
        [input.fullName, input.email, input.phone, e164],
      )
      guardianId = parseInt(rows[0]!.id, 10)
    }

    await client.query(
      `insert into kq.child_guardians (child_id, guardian_id, relationship, is_primary, can_pickup)
       values ($1,$2,$3,false,$4)
       on conflict (child_id, guardian_id) do update
         set can_pickup   = excluded.can_pickup,
             relationship = coalesce(excluded.relationship, kq.child_guardians.relationship)`,
      [childId, guardianId, input.relationship, input.canPickup],
    )

    await client.query(
      `insert into kq.child_events
         (child_id, event_type, new_value, actor_user_id, detail)
       values ($1,'guardian_added',$2,$3,$4)`,
      [childId, input.fullName, actorUserId,
       JSON.stringify({ guardianId, canPickup: input.canPickup, relationship: input.relationship })],
    )

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}
