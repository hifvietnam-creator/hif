/**
 * /api/cron/sync-sermons
 *
 * Triggered every Monday at 04:00 UTC by Vercel Cron.
 * Fetches all YouTube playlists linked to Series in Payload
 * and upserts new/updated sermons automatically.
 *
 * Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config: configPromise })
    await payload.jobs.queue({ task: 'sync-sermons', input: {} })
    await payload.jobs.run()
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[Cron] sync-sermons failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
