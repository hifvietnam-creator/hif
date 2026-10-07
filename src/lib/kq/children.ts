/**
 * KidzQuest children — list and edit.
 *
 * Every mutation writes a kq.child_events row in the same transaction as the
 * change itself. Inline editing has no undo, so if the audit write fails the
 * edit must fail with it — an unattributable change to a child's allergy is
 * worse than a change that didn't happen.
 */

import { getPool, isoDate } from '../db'
import { cardLetters, groupPrefix } from './cards'

// Shapes and constants live in child-fields.ts, which imports no database code.
// Client components must import from there directly: importing them from here
// pulls in the Postgres pool and fails the browser build on `require('dns')`.
// Re-exported so existing server-side imports keep working.
export {
  CHILD_STATUSES,
  EDITABLE_CHILD_FIELDS,
  STATUS_LABEL,
} from './child-fields'
export type {
  AddedAdult, ChildRow, ChildStatus, EditableChildField, NewAdultInput, PickupToConfirm,
} from './child-fields'

import { PICKUP_SOURCE_MIN, needsPickupSource } from './child-fields'
import type {
  AddedAdult, ChildRow, ChildStatus, EditableChildField, NewAdultInput, PickupToConfirm,
} from './child-fields'

export async function listChildren(includeInactive = false): Promise<ChildRow[]> {
  const db = getPool()

  const { rows } = await db.query<{
    child_id: string; enrollment_id: string
    first_name: string; last_name: string; preferred_name: string | null
    gender: string | null; birthdate: Date | null
    grade: number | null; group_code: string
    group_manual: boolean; provisional: boolean; card_code: string | null
    allergies: string | null; care_notes: string | null
    photo_consent: boolean | null; active: boolean
    status: string; left_on: Date | null; status_note: string | null
  }>(
    // LEFT JOIN LATERAL rather than an inner join on the open enrolment: an
    // archived child's enrolment is closed, so an inner join would hide exactly
    // the rows the "archived" filter exists to show.
    `select c.id as child_id, e.id as enrollment_id,
            c.first_name, c.last_name, c.preferred_name,
            c.gender, c.birthdate,
            e.grade, e.group_code, e.group_manual, e.provisional,
            c.card_code,
            c.allergies, c.care_notes, c.photo_consent, c.active,
            c.status, c.left_on, c.status_note
       from kq.children c
       left join lateral (
         select id, grade, group_code, group_manual, provisional
           from kq.enrollments
          where child_id = c.id
          order by (ended_on is null) desc, started_on desc
          limit 1
       ) e on true
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
    enrollmentId: r.enrollment_id ? parseInt(r.enrollment_id, 10) : 0,
    firstName: r.first_name,
    lastName: r.last_name,
    preferredName: r.preferred_name,
    gender: r.gender,
    birthdate: isoDate(r.birthdate),
    grade: r.grade,
    groupCode: r.group_code,
    groupManual: r.group_manual,
    provisional: r.provisional,
    cardCode: r.card_code,
    allergies: r.allergies,
    careNotes: r.care_notes,
    photoConsent: r.photo_consent,
    active: r.active,
    status: r.status as ChildStatus,
    leftOn: isoDate(r.left_on),
    statusNote: r.status_note,
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

    // Only log a real change. A blur that saves the same value is not history,
    // and a log full of no-ops is a log nobody reads when it matters.
    //
    // Always 'field_change' — leaving is no longer expressible here. It goes
    // through setChildStatus, which records a reason and closes the enrolment.
    if (oldValue !== newValue) {
      await client.query(
        `insert into kq.child_events
           (child_id, event_type, field, old_value, new_value, actor_user_id)
         values ($1, 'field_change', $2, $3, $4, $5)`,
        [childId, field, oldValue, newValue, actorUserId],
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

/**
 * Move a child to a group by hand.
 *
 * Sets group_manual, which is not a side effect — it is the point. A child may
 * sit outside their grade's group for maturity, additional needs, or to stay
 * with a sibling, and the annual promotion skips manual placements precisely so
 * that decision is not silently undone every August.
 *
 * The cost is that their group stops tracking their grade. That is visible in
 * the table as a "manual" badge, so whoever wonders in a year's time why this
 * child did not move up has the answer in front of them.
 */
export async function setChildGroup(
  enrollmentId: number,
  groupCode: string,
  actorUserId: number,
): Promise<void> {
  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')

    const { rows } = await client.query<{ child_id: string; group_code: string; grade: number | null }>(
      `select child_id, group_code, grade from kq.enrollments where id = $1 for update`,
      [enrollmentId],
    )
    if (rows.length === 0) throw new Error('No such enrolment')
    const row = rows[0]!
    const childId = parseInt(row.child_id, 10)

    // Moving a child by hand is also a confirmation that they belong there, so
    // the placement stops being provisional even without a grade.
    await client.query(
      `update kq.enrollments
          set group_code   = $2,
              group_manual = true,
              provisional  = false,
              confirmed_by = $3,
              confirmed_at = now()
        where id = $1`,
      [enrollmentId, groupCode, actorUserId],
    )

    if (row.group_code !== groupCode) {
      await client.query(
        `insert into kq.child_events
           (child_id, event_type, field, old_value, new_value, actor_user_id, detail)
         values ($1,'group_change','group_code',$2,$3,$4,$5)`,
        [childId, row.group_code, groupCode, actorUserId,
         JSON.stringify({ manual: true, gradeAtTime: row.grade })],
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
 * Archive a child, or bring them back.
 *
 * Never a delete. Attendance history, the enrolment trail and the audit log all
 * survive — a child who returns in six months should reappear with their past
 * intact, and a safeguarding question about last March must still be answerable
 * about somebody who has since left.
 *
 * Archiving closes the open enrolment, which is what removes them from every
 * register. Restoring opens a fresh one in the group they were last in.
 */
export async function setChildStatus(
  childId: number,
  status: ChildStatus,
  note: string | null,
  actorUserId: number,
): Promise<void> {
  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')

    const { rows: cur } = await client.query<{ status: string }>(
      `select status from kq.children where id = $1 for update`,
      [childId],
    )
    if (cur.length === 0) throw new Error('No such child')
    const wasStatus = cur[0]!.status
    const leaving = status !== 'active'

    await client.query(
      `update kq.children
          set status      = $2,
              left_on     = case when $3 then coalesce(left_on, current_date) else null end,
              status_note = $4
        where id = $1`,
      [childId, status, leaving, note],
    )

    if (leaving) {
      await client.query(
        `update kq.enrollments
            set ended_on = coalesce(ended_on, current_date),
                reason   = case when $2 = 'moved_to_aftershock'
                                then 'moved to aftershock' else 'left' end
          where child_id = $1 and ended_on is null`,
        [childId, status],
      )
    } else if (wasStatus !== 'active') {
      // Coming back. Reopen in whatever group they were last in — a returning
      // child is not a new registration, and making someone re-place them by
      // hand is how a child ends up on no register at all.
      const { rows: last } = await client.query<{
        academic_year: string; grade: number | null; group_code: string; group_manual: boolean
      }>(
        `select academic_year, grade, group_code, group_manual
           from kq.enrollments where child_id = $1
          order by started_on desc limit 1`,
        [childId],
      )
      if (last[0]) {
        const { rows: year } = await client.query<{ code: string }>(
          `select code from kq.academic_years where is_current limit 1`,
        )
        await client.query(
          `insert into kq.enrollments
             (child_id, academic_year, grade, group_code, group_manual,
              started_on, reason, provisional, note)
           values ($1,$2,$3,$4,$5,current_date,'registration',true,$6)`,
          [childId, year[0]?.code ?? last[0].academic_year, last[0].grade,
           last[0].group_code, last[0].group_manual,
           'restored after being marked ' + wasStatus],
        )
      }
    }

    await client.query(
      `insert into kq.child_events
         (child_id, event_type, field, old_value, new_value, actor_user_id, detail)
       values ($1, $2, 'status', $3, $4, $5, $6)`,
      [childId, leaving ? 'deactivated' : 'note', wasStatus, status, actorUserId,
       JSON.stringify({ note })],
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
 * Register a child who is not on any register.
 *
 * Two callers, same function: a TA at the door on Sunday, and an admin adding a
 * family they know is coming. The `source` differs and that is the whole
 * distinction — a door-side registration is created under time pressure by
 * somebody holding a clipboard, so it always lands in the review queue.
 *
 * THE WEAK POINT, STATED PLAINLY
 *
 * Everywhere else in this system the authorised-pickup list was written in
 * advance by an administrator, and the station only checks against it. Here the
 * same person creates the list and later releases the child against it. That is
 * structurally weaker and cannot be designed away at a door with a queue behind
 * it — the paper system has exactly the same property. What we can do is make
 * it visible: source = 'manual', a review row, and the adult recorded by name.
 */
export async function registerChild(
  input: {
    firstName: string
    lastName: string
    groupCode: string
    gender?: string | null
    allergies?: string | null
    guardianName?: string | null
    guardianPhone?: string | null
    guardianEmail?: string | null
  },
  actorUserId: number,
  origin: 'station' | 'admin',
): Promise<{ childId: number }> {
  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')

    const { rows: child } = await client.query<{ id: string }>(
      `insert into kq.children
         (first_name, last_name, gender, allergies, source, status)
       values ($1,$2,$3,$4,'manual','active') returning id`,
      [input.firstName, input.lastName, input.gender ?? null, input.allergies ?? null],
    )
    const childId = parseInt(child[0]!.id, 10)

    // Provisional and grade-less: nobody asked for a school grade at the door,
    // and inventing one would silently place the child in next August's
    // promotion. The Kids page chases it.
    const { rows: year } = await client.query<{ code: string }>(
      `select code from kq.academic_years where is_current limit 1`,
    )
    await client.query(
      `insert into kq.enrollments
         (child_id, academic_year, grade, group_code, started_on, reason, provisional, note)
       values ($1,$2,null,$3,current_date,'registration',true,$4)`,
      [childId, year[0]?.code ?? '2026-27', input.groupCode,
       origin === 'station' ? 'registered at the door' : 'added by an administrator'],
    )

    if (input.guardianName?.trim()) {
      const digits = (input.guardianPhone ?? '').replace(/\D/g, '')
      const e164 = /^0[35789]\d{8}$/.test(digits) ? '+84' + digits.slice(1) : null

      // Match an existing adult on phone or email first — a sibling's parent is
      // almost certainly already here, and creating a second copy would split
      // the family across two records.
      let guardianId: number | null = null
      if (input.guardianEmail || digits) {
        const { rows } = await client.query<{ id: string }>(
          `select id from kq.guardians
            where ($1::citext is not null and email = $1::citext)
               or ($2::text <> '' and (phone = $2 or e164 = $3))
            limit 1`,
          [input.guardianEmail ?? null, digits, e164],
        )
        if (rows[0]) guardianId = parseInt(rows[0].id, 10)
      }

      if (guardianId === null) {
        const { rows } = await client.query<{ id: string }>(
          `insert into kq.guardians (full_name, email, phone, e164)
           values ($1,$2,$3,$4) returning id`,
          [input.guardianName.trim(), input.guardianEmail ?? null,
           input.guardianPhone ?? null, e164],
        )
        guardianId = parseInt(rows[0]!.id, 10)
      }

      // can_pickup TRUE: the adult who brought the child is the adult who takes
      // them home. Refusing that would force an override on the first dismissal
      // of every walk-in, which teaches everybody that overrides are routine.
      await client.query(
        `insert into kq.child_guardians (child_id, guardian_id, relationship, is_primary, can_pickup)
         values ($1,$2,'brought them today',true,true)
         on conflict (child_id, guardian_id) do nothing`,
        [childId, guardianId],
      )
    }

    // Give them a card code straight away where we can. A child registered at
    // the door with no family name gets none, and turns up on Ate's
    // cards-outstanding list rather than being handed a broken one.
    const first = cardLetters(input.firstName)
    const last = cardLetters(input.lastName)
    if (first && last) {
      const base = `${groupPrefix(input.groupCode)}-${first}-${last}`
      for (let n = 1; n <= 40; n++) {
        const candidate = n === 1 ? base : `${base}-${n}`
        const { rowCount } = await client.query(
          `update kq.children set card_code = $2
            where id = $1 and not exists (
              select 1 from kq.children x where x.card_code = $2
            )`,
          [childId, candidate],
        )
        if (rowCount) break
      }
    }

    await client.query(
      `insert into kq.child_events
         (child_id, event_type, new_value, actor_user_id, detail)
       values ($1,'created',$2,$3,$4)`,
      [childId, `${input.firstName} ${input.lastName}`.trim(), actorUserId,
       JSON.stringify({ origin, groupCode: input.groupCode })],
    )

    await client.query(
      `insert into kq.import_review
         (source, raw, match_confidence, match_notes, status, proposed_child_id)
       values ('cognito', $1, 'none', $2, 'pending', $3)`,
      [JSON.stringify(input),
       origin === 'station'
         ? 'Registered at the door. Confirm the details and who may pick them up.'
         : 'Added by an administrator ahead of Sunday. Confirm grade and guardians.',
       childId],
    )

    await client.query('commit')
    return { childId }
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}

// ── Adults who may collect ───────────────────────────────────────────────────

/** Who is making the change. The name is stored, so the audit reads on its own. */
export type PickupActor = {
  id: number
  name: string
  /** Assistants never reach these functions. The API turns them away first. */
  role: 'admin' | 'teacher'
}

/**
 * A change that was understood and turned down, with a sentence fit to show the
 * person who asked. Anything else thrown from here is a fault, and the API
 * reports it as one.
 */
export class PickupRefused extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PickupRefused'
  }
}

/** Names compared without case, spacing or Vietnamese tone marks. */
const nameKey = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** A Vietnamese mobile in the form the importer stored, or null. */
const toE164 = (digits: string) =>
  /^0[35789]\d{8}$/.test(digits) ? '+84' + digits.slice(1)
  : /^84[35789]\d{8}$/.test(digits) ? '+' + digits
  : null

function checkSource(relationship: string | null, canPickup: boolean, source: string | null) {
  if (needsPickupSource(relationship, canPickup) && (source ?? '').trim().length < PICKUP_SOURCE_MIN) {
    throw new PickupRefused(
      'Please add a line saying who told you this adult may collect. ' +
      'It is only skipped for a mother or father.',
    )
  }
}

/**
 * The provenance columns from migration 018, for a tick being granted now.
 *
 * An administrator's tick confirms itself. A teacher's is in force straight
 * away and waits on kq.pickups_to_confirm for Ate to look at.
 */
const GRANT_SQL = `
  can_pickup          = true,
  pickup_set_by       = $3,
  pickup_set_by_name  = $4,
  pickup_set_role     = $5,
  pickup_set_at       = now(),
  pickup_source       = $6,
  pickup_confirmed_by = case when $5 = 'admin' then $3::integer else null end,
  pickup_confirmed_at = case when $5 = 'admin' then now() else null end`

/**
 * Turn a guardian's authority to collect on or off.
 *
 * Granting it to anyone other than a mother or father needs a line saying
 * where the authorisation came from. Taking it away never does: removing a
 * permission should not cost more than the mistake that granted it.
 */
export async function setPickup(
  childId: number,
  guardianId: number,
  canPickup: boolean,
  actor: PickupActor,
  source: string | null = null,
): Promise<void> {
  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')

    const { rows } = await client.query<{
      can_pickup: boolean; relationship: string | null; full_name: string
    }>(
      `select cg.can_pickup, cg.relationship, g.full_name
         from kq.child_guardians cg
         join kq.guardians g on g.id = cg.guardian_id
        where cg.child_id = $1 and cg.guardian_id = $2
          for update of cg`,
      [childId, guardianId],
    )
    const cur = rows[0]
    if (!cur) throw new PickupRefused('That adult is not on file for this child.')

    // A tap that changes nothing is not history.
    if (cur.can_pickup === canPickup) {
      await client.query('commit')
      return
    }

    const cleanSource = source?.trim() || null
    if (canPickup) {
      checkSource(cur.relationship, true, cleanSource)
      await client.query(
        `update kq.child_guardians set ${GRANT_SQL}
          where child_id = $1 and guardian_id = $2`,
        [childId, guardianId, actor.id, actor.name, actor.role, cleanSource],
      )
    } else {
      // Who granted it and why are left in place. They are the answer to "how
      // did this adult come to be ticked", which is still worth having after
      // the tick has gone.
      await client.query(
        `update kq.child_guardians set can_pickup = false
          where child_id = $1 and guardian_id = $2`,
        [childId, guardianId],
      )
    }

    await client.query(
      `insert into kq.child_events
         (child_id, event_type, field, old_value, new_value, actor_user_id, detail)
       values ($1,'pickup_changed','can_pickup',$2,$3,$4,$5)`,
      [childId, String(cur.can_pickup), String(canPickup), actor.id,
       JSON.stringify({
         guardianId, guardianName: cur.full_name, relationship: cur.relationship,
         source: canPickup ? cleanSource : null,
         actorName: actor.name, actorRole: actor.role,
       })],
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
 * REUSING AN ADULT ALREADY ON FILE
 *
 * A brother's mother is almost certainly this child's mother, and two records
 * for her would mean a corrected phone number applies to one child and not the
 * other. So an existing guardian is reused, but only when the contact detail
 * AND the name both match.
 *
 * It used to match on phone or email alone. Families share a phone, 010 says
 * so in as many words, and on that rule a teacher typing the mother's name
 * against the family number would have silently authorised whoever was already
 * stored under it, usually the father. The name on the screen and the adult in
 * the database have to be the same person or this table is not worth having.
 *
 * WHO MAY CALL THIS
 *
 * Administrators, and teachers at the door. A teacher's tick is in force at
 * once and lands on Ate's list to confirm. See migration 018 for why.
 *
 * Adding never removes. If this adult is already ticked for this child, a
 * second add with the box unticked leaves them ticked. Unticking is its own
 * action with its own audit line.
 */
export async function addGuardian(
  childId: number,
  input: NewAdultInput,
  actor: PickupActor,
  via: 'children' | 'attendance' = 'children',
): Promise<AddedAdult> {
  const fullName = input.fullName.trim().replace(/\s+/g, ' ')
  if (!fullName) throw new PickupRefused('A name is needed.')

  const relationship = input.relationship?.trim().toLowerCase() || null
  const source = input.source?.trim() || null
  const email = input.email?.trim().toLowerCase() || null
  const phone = input.phone?.trim() || null
  const digits = (phone ?? '').replace(/\D/g, '')
  const e164 = toE164(digits)

  checkSource(relationship, input.canPickup, source)

  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')

    const { rows: child } = await client.query(
      `select 1 from kq.children where id = $1 for update`,
      [childId],
    )
    if (child.length === 0) throw new PickupRefused('That child is not on the register.')

    let guardianId: number | null = null

    // Already an adult for this very child, under the same name. Typing "Mr
    // Long" twice should find Mr Long, with or without a phone number, rather
    // than leaving two of him on one child.
    const { rows: mine } = await client.query<{ id: string; full_name: string }>(
      `select g.id, g.full_name
         from kq.child_guardians cg
         join kq.guardians g on g.id = cg.guardian_id
        where cg.child_id = $1
        order by g.id`,
      [childId],
    )
    const here = mine.find((r) => nameKey(r.full_name) === nameKey(fullName))
    if (here) guardianId = parseInt(here.id, 10)

    if (guardianId === null && (email || digits.length >= 8)) {
      // Stored numbers are a mixture of "0912 345 678", "0912345678" and
      // "+84912345678", so both sides are reduced to digits before comparing.
      const { rows } = await client.query<{ id: string; full_name: string }>(
        `select id, full_name from kq.guardians
          where ($1::citext is not null and email = $1::citext)
             or ($2::text <> '' and (
                  regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $2
               or regexp_replace(coalesce(e164,  ''), '\\D', '', 'g') = $2
               or ($3::text is not null and e164 = $3)
             ))
          order by id`,
        [email, digits.length >= 8 ? digits : '', e164],
      )
      const same = rows.find((r) => nameKey(r.full_name) === nameKey(fullName))
      if (same) guardianId = parseInt(same.id, 10)
    }

    const alreadyOnFile = guardianId !== null

    if (guardianId === null) {
      const { rows } = await client.query<{ id: string }>(
        `insert into kq.guardians (full_name, email, phone, e164)
         values ($1,$2,$3,$4) returning id`,
        [fullName, email, phone, e164],
      )
      guardianId = parseInt(rows[0]!.id, 10)
    }

    const { rows: linkRows } = await client.query<{
      can_pickup: boolean; relationship: string | null
    }>(
      `select can_pickup, relationship from kq.child_guardians
        where child_id = $1 and guardian_id = $2 for update`,
      [childId, guardianId],
    )
    const link = linkRows[0]
    const wasTicked = link?.can_pickup === true
    const granting = input.canPickup && !wasTicked

    if (!link) {
      await client.query(
        `insert into kq.child_guardians (child_id, guardian_id, relationship, is_primary, can_pickup)
         values ($1,$2,$3,false,false)`,
        [childId, guardianId, relationship],
      )
    } else if (relationship && relationship !== link.relationship) {
      await client.query(
        `update kq.child_guardians set relationship = $3
          where child_id = $1 and guardian_id = $2`,
        [childId, guardianId, relationship],
      )
    }

    if (granting) {
      await client.query(
        `update kq.child_guardians set ${GRANT_SQL}
          where child_id = $1 and guardian_id = $2`,
        [childId, guardianId, actor.id, actor.name, actor.role, source],
      )
    }

    const detail = JSON.stringify({
      guardianId, relationship: relationship ?? link?.relationship ?? null,
      canPickup: wasTicked || input.canPickup,
      source: granting ? source : null,
      alreadyOnFile, via,
      actorName: actor.name, actorRole: actor.role,
    })

    if (!link) {
      await client.query(
        `insert into kq.child_events
           (child_id, event_type, new_value, actor_user_id, detail)
         values ($1,'guardian_added',$2,$3,$4)`,
        [childId, fullName, actor.id, detail],
      )
    } else if (granting) {
      // Already a contact for this child, now allowed to collect. That is a
      // change to pick-up, and the log should say so in those words.
      await client.query(
        `insert into kq.child_events
           (child_id, event_type, field, old_value, new_value, actor_user_id, detail)
         values ($1,'pickup_changed','can_pickup','false','true',$2,$3)`,
        [childId, actor.id, detail],
      )
    }

    const { rows: out } = await client.query<{
      full_name: string; relationship: string | null; can_pickup: boolean
      email: string | null; phone: string | null
    }>(
      `select g.full_name, cg.relationship, cg.can_pickup,
              g.email::text as email, coalesce(g.e164, g.phone) as phone
         from kq.child_guardians cg
         join kq.guardians g on g.id = cg.guardian_id
        where cg.child_id = $1 and cg.guardian_id = $2`,
      [childId, guardianId],
    )

    await client.query('commit')

    const o = out[0]!
    return {
      guardianId,
      fullName: o.full_name,
      relationship: o.relationship,
      phone: o.phone,
      email: o.email,
      canPickup: o.can_pickup,
      alreadyOnFile,
    }
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}

/**
 * An administrator has looked at an adult a teacher authorised, and agrees.
 *
 * Changes nothing about who may collect. The tick was already in force. This
 * records that somebody with time and a phone has checked it, which is the
 * half of the safeguard a teacher at a door cannot supply.
 */
export async function confirmPickup(
  childId: number,
  guardianId: number,
  actor: PickupActor,
): Promise<void> {
  const db = getPool()
  const client = await db.connect()
  try {
    await client.query('begin')

    const { rows } = await client.query<{ full_name: string; pickup_set_by_name: string | null }>(
      `update kq.child_guardians cg
          set pickup_confirmed_by = $3, pickup_confirmed_at = now()
         from kq.guardians g
        where cg.child_id = $1 and cg.guardian_id = $2
          and g.id = cg.guardian_id
          and cg.can_pickup and cg.pickup_confirmed_at is null
        returning g.full_name, cg.pickup_set_by_name`,
      [childId, guardianId, actor.id],
    )

    // Nothing matched: confirmed already from another tab, or unticked since.
    // Either way the list is out of date, not broken.
    if (rows[0]) {
      await client.query(
        `insert into kq.child_events
           (child_id, event_type, field, new_value, actor_user_id, detail)
         values ($1,'pickup_confirmed','can_pickup','true',$2,$3)`,
        [childId, actor.id,
         JSON.stringify({
           guardianId, guardianName: rows[0].full_name,
           addedBy: rows[0].pickup_set_by_name, actorName: actor.name,
         })],
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

/** Adults a teacher has authorised that Ate has not looked at yet. Oldest first. */
export async function listPickupsToConfirm(): Promise<PickupToConfirm[]> {
  const { rows } = await getPool().query<{
    child_id: string; guardian_id: string
    first_name: string; last_name: string; preferred_name: string | null
    group_code: string; guardian_name: string; guardian_phone: string | null
    relationship: string | null; pickup_source: string | null
    pickup_set_by_name: string | null; pickup_set_at: Date | null
  }>(
    `select * from kq.pickups_to_confirm order by pickup_set_at nulls last, child_id`,
  )
  return rows.map((r) => ({
    childId: parseInt(r.child_id, 10),
    guardianId: parseInt(r.guardian_id, 10),
    childName: `${r.preferred_name || r.first_name} ${r.last_name}`.trim(),
    groupCode: r.group_code,
    guardianName: r.guardian_name,
    guardianPhone: r.guardian_phone,
    relationship: r.relationship,
    source: r.pickup_source,
    addedBy: r.pickup_set_by_name,
    addedAt: r.pickup_set_at?.toISOString() ?? null,
  }))
}

/**
 * Is this child on the list for this session?
 *
 * The same two-part test getRoster uses: enrolled in the session's room, or
 * already holding an attendance row for it. A teacher may add an adult for a
 * child they can see on their own attendance list, and for nobody else.
 */
export async function childIsInSession(childId: number, sessionId: number): Promise<boolean> {
  const { rows } = await getPool().query(
    `select 1
       from kq.sessions s
      where s.id = $2
        and (
          exists (select 1 from kq.attendance a
                   where a.session_id = s.id and a.child_id = $1)
          or exists (select 1 from kq.children c
                       join kq.enrollments e on e.child_id = c.id and e.ended_on is null
                      where c.id = $1 and c.active and e.group_code = s.group_code)
        )`,
    [childId, sessionId],
  )
  return rows.length > 0
}
