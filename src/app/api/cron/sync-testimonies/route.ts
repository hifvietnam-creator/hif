/**
 * /api/cron/sync-testimonies
 *
 * Triggered every Monday at 05:00 UTC by Vercel Cron.
 * Fetches both HIF testimony playlists from YouTube and
 * upserts them into the Payload testimonies collection.
 *
 * Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { denyUnlessCron } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const denied = denyUnlessCron(req)
  if (denied) return denied

  try {
    const payload = await getPayload({ config: configPromise })
    await payload.jobs.queue({ task: 'sync-testimonies', input: {} })
    await payload.jobs.run()
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[Cron] sync-testimonies failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
