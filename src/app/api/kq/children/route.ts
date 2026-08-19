/**
 * PATCH /api/kq/children
 *
 * One endpoint for every edit the Kids table makes. Admin only — this is where
 * allergies and pickup rights are changed, and both are safeguarding data.
 *
 * Body is one of:
 *   { action: 'field',    childId, field, value }
 *   { action: 'grade',    enrollmentId, grade }
 *   { action: 'pickup',   childId, guardianId, canPickup }
 *   { action: 'guardian', childId, fullName, relationship?, email?, phone?, canPickup }
 */

import { NextRequest, NextResponse } from 'next/server'

import { getKqUser } from '@/lib/kq/auth'
import {
  EDITABLE_CHILD_FIELDS,
  addGuardian,
  setChildGrade,
  setPickup,
  updateChildField,
  type EditableChildField,
} from '@/lib/kq/children'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const user = await getKqUser(req.headers)
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 })
  }

  try {
    switch (body.action) {
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
        await setPickup(
          Number(body.childId),
          Number(body.guardianId),
          body.canPickup === true,
          user.id,
        )
        return NextResponse.json({ ok: true })
      }

      case 'guardian': {
        const fullName = String(body.fullName ?? '').trim()
        if (!fullName) {
          return NextResponse.json({ error: 'A name is required' }, { status: 400 })
        }
        await addGuardian(
          Number(body.childId),
          {
            fullName,
            relationship: body.relationship ? String(body.relationship).trim() : null,
            email: body.email ? String(body.email).trim().toLowerCase() : null,
            phone: body.phone ? String(body.phone).trim() : null,
            canPickup: body.canPickup === true,
          },
          user.id,
        )
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e) {
    console.error('[kq/children]', e)
    return NextResponse.json({ error: 'Something went wrong. Nothing was saved.' }, { status: 500 })
  }
}
