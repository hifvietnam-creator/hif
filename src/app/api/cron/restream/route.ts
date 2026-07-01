/**
 * /api/cron/restream
 *
 * Triggered by Vercel Cron (or manually) to poll Restream
 * and keep the LiveStream global in sync.
 *
 * Vercel cron config (vercel.json):
 *   { "crons": [{ "path": "/api/cron/restream", "schedule": "* * * * *" }] }
 *
 * Authorization: Bearer <CRON_SECRET> header required (set in env).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // seconds

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config: configPromise })

    // Queue a Payload job task
    await payload.jobs.queue({
      task: 'sync-restream-status',
      input: {},
    })

    // Run queued jobs immediately (so this request waits for the result)
    await payload.jobs.run()

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[Cron] restream sync failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
