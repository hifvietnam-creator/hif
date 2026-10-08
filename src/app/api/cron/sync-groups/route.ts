/**
 * /api/cron/sync-groups
 *
 * Triggered by Vercel Cron (weekly) or manually to pull all Connect Groups
 * and Fellowships from Planning Center Online into the Payload `groups` collection.
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/cron/sync-groups", "schedule": "0 2 * * 1" }
 *   → Runs every Monday at 02:00 UTC
 *
 * Authorization: Bearer <CRON_SECRET> header required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { denyUnlessCron } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // PCO pagination may need a bit more time

export async function GET(req: NextRequest) {
  const denied = denyUnlessCron(req)
  if (denied) return denied

  try {
    const payload = await getPayload({ config: configPromise })

    await payload.jobs.queue({
      task: 'sync-pco-groups',
      input: {},
    })

    await payload.jobs.run()

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[Cron] sync-groups failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
