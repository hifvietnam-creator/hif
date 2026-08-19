/**
 * POST /api/kq/staff
 *
 * Assign or unassign a teacher/TA to a room on a Sunday. Admin only.
 *
 *   { action: 'assign',   date, groupCode, staffUserId, role }
 *   { action: 'unassign', date, groupCode, staffUserId }
 */

import { NextRequest, NextResponse } from 'next/server'

import { getKqUser } from '@/lib/kq/auth'
import { assignStaff, unassignStaff } from '@/lib/kq/staff'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
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

  const date = String(body.date ?? '')
  const groupCode = String(body.groupCode ?? '')
  const staffUserId = Number(body.staffUserId)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !groupCode || !staffUserId) {
    return NextResponse.json({ error: 'date, groupCode and staffUserId required' }, { status: 400 })
  }

  try {
    if (body.action === 'assign') {
      const role = body.role === 'teacher' ? 'teacher' : 'ta'
      await assignStaff(date, groupCode, staffUserId, role)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'unassign') {
      await unassignStaff(date, groupCode, staffUserId)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[kq/staff]', e)
    return NextResponse.json({ error: 'Something went wrong. Nothing was saved.' }, { status: 500 })
  }
}
