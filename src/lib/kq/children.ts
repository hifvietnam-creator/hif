/**
 * KidzQuest children — list and edit.
 *
 * Every mutation writes a kq.child_events row in the same transaction as the
 * change itself. Inline editing has no undo, so if the audit write fails the
 * edit must fail with it — an unattributable change to a child's allergy is
 * worse than a change that didn't happen.
 */

import { getPool } from '../db'

// Shapes and constants live in child-fields.ts, which imports no database code.
// Client components must import from there directly: importing them from here
// pulls in the Postgres pool and fails the browser build on `require('dns')`.
// Re-exported so existing server-side imports keep working.
export {
  CHILD_STATUSES,
  EDITABLE_CHILD_FIELDS,
  STATUS_LABEL,
} from './child-fields'
export type { ChildRow, ChildStatus, EditableChildField } from './child-fields'

import type { ChildRow, ChildStatus, EditableChildField } from './child-fields'

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
    status: string; left_on: Date | null; status_note: string | null
  }>(
    // LEFT JOIN LATERAL rather than an inner join on the open enrolment: an
    // archived child's enrolment is closed, so an inner join would hide exactly
    // the rows the "archived" filter exists to show.
    `select c.id as child_id, e.id as enrollment_id,
            c.first_name, c.last_name, c.preferred_name,
            c.gender, c.birthdate,
            e.grade, e.group_code, e.group_manual, e.provisional,
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
    birthdate: r.birthdate ? r.birthdate.toISOString().slice(0, 10) : null,
    grade: r.grade,
    groupCode: r.group_code,
    groupManual: r.group_manual,
    provisional: r.provisional,
    allergies: r.allergies,
    careNotes: r.care_notes,
    photoConsent: r.photo_consent,
    active: r.active,
    status: r.status as ChildStatus,
    leftOn: r.left_on ? r.left_on.toISOString().slice(0, 10) : null,
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
