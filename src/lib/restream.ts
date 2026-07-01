/**
 * Restream API helper — token management and stream status polling.
 *
 * Tokens are stored in the SiteSettings global (admin-only fields).
 * Access tokens last 1 hour; refresh tokens last 1 year.
 */

import type { BasePayload } from 'payload'

const RESTREAM_TOKEN_URL = 'https://api.restream.io/oauth/token'
const RESTREAM_API_BASE = 'https://api.restream.io/v2'

// ── YouTube platform ID on Restream (platform 5 = YouTube) ──────────────────
// We also check externalUrl as a fallback.
const YOUTUBE_PLATFORM_ID = 5

// ── Token helpers ─────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: string
} | null> {
  const clientId = process.env.RESTREAM_CLIENT_ID
  const clientSecret = process.env.RESTREAM_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[Restream] RESTREAM_CLIENT_ID or RESTREAM_CLIENT_SECRET not set in env')
    return null
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(RESTREAM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[Restream] Token refresh failed:', body)
    return null
  }

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  return { accessToken: data.access_token, expiresAt }
}

/**
 * Returns a valid access token, refreshing if expired.
 * Returns null if no tokens are stored or refresh fails.
 */
export async function getValidAccessToken(payload: BasePayload): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (await payload.findGlobal({ slug: 'site-settings' })) as any
  const { accessToken, refreshToken, expiresAt } = settings?.restream ?? {}

  if (!refreshToken) return null

  // Check if access token is still valid (with 5-min buffer)
  if (accessToken && expiresAt) {
    const expiresMs = new Date(expiresAt).getTime()
    if (Date.now() < expiresMs - 5 * 60 * 1000) {
      return accessToken as string
    }
  }

  // Refresh the token
  const refreshed = await refreshAccessToken(refreshToken as string)
  if (!refreshed) return null

  // Persist the new access token
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      restream: {
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
      },
    },
  })

  return refreshed.accessToken
}

// ── Stream status ─────────────────────────────────────────────────────────────

type StreamStatus = {
  isLive: boolean
  youtubeVideoId: string | null
  eventTitle: string | null
}

function extractYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

/**
 * Polls Restream for in-progress events and returns stream status.
 */
export async function checkRestreamStatus(payload: BasePayload): Promise<StreamStatus> {
  const accessToken = await getValidAccessToken(payload)

  if (!accessToken) {
    return { isLive: false, youtubeVideoId: null, eventTitle: null }
  }

  const res = await fetch(`${RESTREAM_API_BASE}/user/events/in-progress`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    console.error('[Restream] in-progress fetch failed:', res.status)
    return { isLive: false, youtubeVideoId: null, eventTitle: null }
  }

  const events = await res.json()

  if (!Array.isArray(events) || events.length === 0) {
    return { isLive: false, youtubeVideoId: null, eventTitle: null }
  }

  // Find the first event that has a YouTube destination
  for (const event of events) {
    const destinations: { channelId: number; externalUrl: string | null; streamingPlatformId: number }[] =
      event.destinations ?? []

    for (const dest of destinations) {
      const isYoutube =
        dest.streamingPlatformId === YOUTUBE_PLATFORM_ID ||
        (dest.externalUrl?.includes('youtube.com') ?? false)

      if (isYoutube) {
        const videoId = extractYoutubeVideoId(dest.externalUrl)
        return {
          isLive: true,
          youtubeVideoId: videoId,
          eventTitle: event.title ?? null,
        }
      }
    }
  }

  // Events live but no YouTube destination found
  return { isLive: true, youtubeVideoId: null, eventTitle: events[0]?.title ?? null }
}
