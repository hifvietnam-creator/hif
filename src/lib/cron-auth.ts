import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Guard for the /api/cron/* routes.
 *
 * These are ordinary public URLs that happen to run syncs and write to the
 * database, so the only thing standing between them and the open internet is a
 * shared secret. Vercel sends it as `Authorization: Bearer $CRON_SECRET` on
 * scheduled runs.
 *
 * The check each route carried previously was:
 *
 *     if (cronSecret && authHeader !== `Bearer ${cronSecret}`) return 401
 *
 * which skips verification entirely when CRON_SECRET is unset. That fails
 * OPEN: forgetting the variable in Vercel does not break the cron, it silently
 * publishes it. This refuses to run instead, so a missing secret shows up as a
 * failed job rather than an unguarded endpoint.
 *
 * Returns a response to send, or null when the request may proceed.
 */
export function denyUnlessCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  const header = req.headers.get('authorization')

  if (!secret) {
    // Locally there is no Vercel to send the header, and running a sync by hand
    // is the point of having the route. Anywhere else, refuse.
    if (process.env.NODE_ENV !== 'production') return null

    console.error('[cron] CRON_SECRET is not set — refusing to run unauthenticated')
    return NextResponse.json(
      { error: 'Cron is not configured. Set CRON_SECRET.' },
      { status: 503 },
    )
  }

  if (!header || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

/**
 * Constant-time compare, so a wrong token cannot be narrowed down by timing.
 *
 * timingSafeEqual throws on inputs of different length, and checking the
 * length first would itself leak it, so both sides are hashed to a fixed
 * 32 bytes and the digests compared.
 */
function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(digest(a), digest(b))
}
