/**
 * PATCH /api/kq/children
 *
 * One endpoint for every edit to a child's record. This is where allergies and
 * pickup rights are changed, and both are safeguarding data, so almost all of
 * it is administrators only.
 *
 * Body is one of:
 *   { action: 'field',    childId, field, value }
 *   { action: 'grade',    enrollmentId, grade }
 *   { action: 'pickup',   childId, guardianId, canPickup, source? }
 *   { action: 'confirm_pickup', childId, guardianId }
 *   { action: 'guardian', childId, fullName, relationship?, email?, phone?,
 *                         canPickup, source?, sessionId? }
 *
 * Two exceptions to administrators only:
 *   'status'    teachers and assistants, see STATUS_ROLES below.
 *   'guardian'  teachers, for a child on their own attendance list. They send
 *               the sessionId they are working in.
 *
 * `source` is the line saying who authorised an adult to collect. It is
 * required whenever pick-up is granted to anyone but a mother or father.
 */

import { NextRequest, NextResponse } from 'next/server'

import { canAddAdult, canWorkSession, getKqUser } from '@/lib/kq/auth'
import {
  CHILD_STATUSES,
  EDITABLE_CHILD_FIELDS,
  PickupRefused,
  addGuardian,
  childIsInSession,
  confirmPickup,
  setChildGrade,
  setChildGroup,
  setChildStatus,
  setPickup,
  updateChildField,
  type ChildStatus,
  type EditableChildField,
} from '@/lib/kq/children'

export const dynamic = 'force-dynamic'

/**
 * Status is the one action teachers and assistants may take here.
 *
 * They are the people who actually know a family has moved away, and making
 * them email an administrator means the register stays wrong for weeks. It is
 * safe to delegate because archiving is not a delete: history survives, restore
 * is one tap, and every change is logged with a name against it.
 *
 * Everything else — names, allergies, grade, pickup ticks — stays admin-only,
 * apart from a teacher adding an adult for a child in their own room.
 */
const STATUS_ROLES = new Set(['admin', 'teacher', 'ta'])

export async function PATCH(req: NextRequest) {
  const user = await getKqUser(req.headers)
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 })
  }

  const action = String(body.action ?? '')
  // 'guardian' does its own check further down, because for a teacher it
  // depends on which child and which room, not only on the role.
  const allowed =
    action === 'status' ? STATUS_ROLES.has(user.role)
    : action === 'guardian' ? true
    : user.role === 'admin'
  if (!allowed) {
    return NextResponse.json(
      { error: action === 'status' ? 'Not permitted' : 'Administrators only' },
      { status: 403 },
    )
  }

  try {
    switch (body.action) {
      case 'status': {
        const status = String(body.status) as ChildStatus
        if (!CHILD_STATUSES.includes(status)) {
          return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
        }
        // The note is optional. The reason is the status itself — "left Hanoi"
        // already says why. Demanding free text on top meant the dialog looked
        // finished while the button stayed dead.
        const note = body.note ? String(body.note).trim() || null : null
        await setChildStatus(Number(body.childId), status, note, user.id)
        return NextResponse.json({ ok: true })
      }

      case 'group': {
        const groupCode = String(body.groupCode ?? '')
        if (!groupCode) {
          return NextResponse.json({ error: 'groupCode required' }, { status: 400 })
        }
        await setChildGroup(Number(body.enrollmentId), groupCode, user.id)
        return NextResponse.json({ ok: true })
      }

      case 'field': {
        const field = String(body.field) as EditableChildField
        // Allowlist, not a check on shape. The field name is interpolated into
        // SQL — it must come from a fixed set, never from the request.
        if (!EDITABLE_CHILD_FIELDS.includes(field)) {
          return NextResponse.json({ error: `Field "${field}" is not editable` }, { status: 400 })
        }
        const value =
          typeof body.value === 'boolean' ? body.value
          : body.value == null ? null
          : String(body.value)

        await updateChildField(Number(body.childId), field, value, user.id)
        return NextResponse.json({ ok: true })
      }

      case 'grade': {
        const raw = body.grade
        const grade = raw === null || raw === '' ? null : Number(raw)
        if (grade !== null && (!Number.isInteger(grade) || grade < 0 || grade > 12)) {
          return NextResponse.json({ error: 'Grade must be 0–12' }, { status: 400 })
        }
        const result = await setChildGrade(Number(body.enrollmentId), grade, user.id)
        return NextResponse.json({ ok: true, ...result })
      }

      case 'pickup': {
        // Administrators only, checked above. A teacher adds an adult; changing
        // a tick somebody else set is Ate's.
        await setPickup(
          Number(body.childId),
          Number(body.guardianId),
          body.canPickup === true,
          { id: user.id, name: user.name ?? user.email, role: 'admin' },
          body.source ? String(body.source) : null,
        )
        return NextResponse.json({ ok: true })
      }

      case 'confirm_pickup': {
        await confirmPickup(
          Number(body.childId),
          Number(body.guardianId),
          { id: user.id, name: user.name ?? user.email, role: 'admin' },
        )
        return NextResponse.json({ ok: true })
      }

      case 'guardian': {
        if (!canAddAdult(user)) {
          return NextResponse.json({ error: 'Please ask a teacher to add this adult.' }, { status: 403 })
        }
        const childId = Number(body.childId)
        if (!Number.isInteger(childId) || childId <= 0) {
          return NextResponse.json({ error: 'childId required' }, { status: 400 })
        }

        // A teacher works from their attendance list, so the request names the
        // session, and both halves are checked: that they are rostered to it,
        // and that this child is on it. Without the second, a valid session id
        // would open every child in the ministry.
        let via: 'children' | 'attendance' = 'children'
        if (user.role !== 'admin') {
          const sessionId = Number(body.sessionId)
          if (
            !Number.isInteger(sessionId) || sessionId <= 0 ||
            !(await canWorkSession(user, sessionId)) ||
            !(await childIsInSession(childId, sessionId))
          ) {
            return NextResponse.json(
              { error: 'You can add an adult for children in your own room.' },
              { status: 403 },
            )
          }
          via = 'attendance'
        } else if (body.sessionId != null) {
          via = 'attendance'
        }

        const adult = await addGuardian(
          childId,
          {
            fullName: String(body.fullName ?? ''),
            relationship: body.relationship ? String(body.relationship) : null,
            email: body.email ? String(body.email) : null,
            phone: body.phone ? String(body.phone) : null,
            canPickup: body.canPickup === true,
            source: body.source ? String(body.source) : null,
          },
          { id: user.id, name: user.name ?? user.email, role: user.role },
          via,
        )
        return NextResponse.json({ ok: true, adult })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e) {
    // Turned down on the merits, with a sentence written for the person asking.
    if (e instanceof PickupRefused) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('[kq/children]', e)
    return NextResponse.json({ error: 'Something went wrong. Nothing was saved.' }, { status: 500 })
  }
}
