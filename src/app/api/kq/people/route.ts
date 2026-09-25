/**
 * /api/kq/people
 *
 * Volunteer accounts, managed from inside KidzQuest so the ministry
 * administrator never needs the CMS.
 *
 * GET                     list everyone with a KidzQuest role
 * POST { action: ... }    add · role · active · password
 *
 * EVERY WRITE GOES THROUGH canManage().
 *
 * This endpoint creates accounts and sets passwords, which is precisely the
 * shape of a privilege escalation: without the guard, a ministry administrator
 * could set the site administrator's password, sign in as them, and reach the
 * admin panel she was deliberately kept out of.
 *
 * So she may act on teachers and assistants only. Never another administrator,
 * never a siteAdmin, and `siteAdmin` is not a field this endpoint will write at
 * any privilege level.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { canManage } from '@/access/kq'
import { getKqUser } from '@/lib/kq/auth'

export const dynamic = 'force-dynamic'

type Actor = { id: number; role: string; siteAdmin?: boolean }

async function loadActor(headers: Headers): Promise<Actor | null> {
  const user = await getKqUser(headers)
  if (!user) return null
  // getKqUser only reports a KidzQuest role. A site admin with no ministry role
  // still needs to be able to work here, so read the flag directly.
  const payload = await getPayload({ config: configPromise })
  const { user: raw } = await payload.auth({ headers })
  return {
    id: user.id,
    role: user.role,
    siteAdmin: (raw as { siteAdmin?: boolean } | null)?.siteAdmin === true,
  }
}

const actorShape = (a: Actor) => ({ kqRole: a.role, siteAdmin: a.siteAdmin })

export async function GET(req: NextRequest) {
  const actor = await loadActor(req.headers)
  if (!actor) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (actor.role !== 'admin' && !actor.siteAdmin) {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  const payload = await getPayload({ config: configPromise })
  const res = await payload.find({
    collection: 'users',
    where: { kqRole: { in: ['admin', 'teacher', 'ta'] } },
    limit: 200,
    depth: 0,
    sort: 'name',
    overrideAccess: true,
  })

  return NextResponse.json({
    people: res.docs.map((u) => {
      const raw = u as unknown as {
        kqRole?: string; kqActive?: boolean; siteAdmin?: boolean; name?: string
      }
      return {
        id: Number(u.id),
        name: raw.name ?? u.email,
        email: u.email,
        role: raw.kqRole ?? null,
        active: raw.kqActive !== false,
        siteAdmin: raw.siteAdmin === true,
        // The UI greys out rows it cannot act on rather than hiding them.
        // Knowing an account exists is part of the job; changing it is not.
        manageable: canManage(actorShape(actor), {
          kqRole: raw.kqRole, siteAdmin: raw.siteAdmin,
        }),
        isSelf: Number(u.id) === actor.id,
      }
    }),
    you: { id: actor.id, role: actor.role, siteAdmin: actor.siteAdmin },
  })
}

export async function POST(req: NextRequest) {
  const actor = await loadActor(req.headers)
  if (!actor) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (actor.role !== 'admin' && !actor.siteAdmin) {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  /** Load the target and refuse if this actor has no business touching them. */
  const guard = async (id: number) => {
    const target = await payload.findByID({
      collection: 'users', id, depth: 0, overrideAccess: true,
    }).catch(() => null)
    if (!target) return { error: 'No such person', status: 404 as const }

    const raw = target as unknown as { kqRole?: string; siteAdmin?: boolean }
    if (!canManage(actorShape(actor), { kqRole: raw.kqRole, siteAdmin: raw.siteAdmin })) {
      return { error: 'You cannot change this account', status: 403 as const }
    }
    if (id === actor.id) {
      // Nobody edits their own role or locks themselves out by accident.
      return { error: 'You cannot change your own account here', status: 403 as const }
    }
    return { target }
  }

  try {
    switch (body.action) {
      case 'add': {
        const email = String(body.email ?? '').trim().toLowerCase()
        const name = String(body.name ?? '').trim()
        const password = String(body.password ?? '')
        const role = String(body.role ?? '')

        if (!email || !name) {
          return NextResponse.json({ error: 'A name and an email are required' }, { status: 400 })
        }
        if (password.length < 8) {
          return NextResponse.json({ error: 'The password needs at least 8 characters' }, { status: 400 })
        }
        // A ministry administrator can only create volunteers. Allowing 'admin'
        // here would let her mint a peer, and peers can manage each other.
        if (role !== 'teacher' && role !== 'ta') {
          return NextResponse.json({ error: 'Pick teacher or assistant' }, { status: 400 })
        }

        await payload.create({
          collection: 'users',
          data: { email, name, password, kqRole: role, kqActive: true, siteAdmin: false },
          overrideAccess: true,
        })
        return NextResponse.json({ ok: true })
      }

      case 'role': {
        const g = await guard(Number(body.id))
        if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
        const role = String(body.role ?? '')
        if (role !== 'teacher' && role !== 'ta') {
          return NextResponse.json({ error: 'Pick teacher or assistant' }, { status: 400 })
        }
        await payload.update({
          collection: 'users', id: Number(body.id),
          data: { kqRole: role }, overrideAccess: true,
        })
        return NextResponse.json({ ok: true })
      }

      case 'active': {
        const g = await guard(Number(body.id))
        if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
        await payload.update({
          collection: 'users', id: Number(body.id),
          data: { kqActive: body.active === true }, overrideAccess: true,
        })
        return NextResponse.json({ ok: true })
      }

      case 'password': {
        const g = await guard(Number(body.id))
        if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
        const password = String(body.password ?? '')
        if (password.length < 8) {
          return NextResponse.json({ error: 'The password needs at least 8 characters' }, { status: 400 })
        }
        // Payload hashes on write. This is why account creation cannot be done
        // straight in the database: a row inserted by hand has no valid
        // credential and the person can never sign in.
        await payload.update({
          collection: 'users', id: Number(body.id),
          data: { password }, overrideAccess: true,
        })
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Duplicate email is the one failure worth naming, because it is the one
    // that actually happens and "something went wrong" would send Ate looking
    // in the wrong place.
    if (/duplicate|unique/i.test(msg)) {
      return NextResponse.json({ error: 'Somebody already has that email address' }, { status: 409 })
    }
    console.error('[kq/people]', e)
    return NextResponse.json({ error: 'Something went wrong. Nothing was saved.' }, { status: 500 })
  }
}
