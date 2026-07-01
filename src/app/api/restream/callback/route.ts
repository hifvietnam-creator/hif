/**
 * /api/restream/callback
 *
 * Restream redirects here after the admin approves OAuth access.
 * Exchanges the authorization code for access + refresh tokens,
 * then stores them in the SiteSettings global (admin-only fields).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const RESTREAM_TOKEN_URL = 'https://api.restream.io/oauth/token'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json({ error: `Restream authorization denied: ${error}` }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 })
  }

  const clientId = process.env.RESTREAM_CLIENT_ID
  const clientSecret = process.env.RESTREAM_CLIENT_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/restream/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'RESTREAM_CLIENT_ID or RESTREAM_CLIENT_SECRET not configured' },
      { status: 500 },
    )
  }

  // Exchange code for tokens
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const tokenRes = await fetch(RESTREAM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('[Restream] Token exchange failed:', body)
    return NextResponse.json({ error: 'Token exchange failed', detail: body }, { status: 502 })
  }

  const tokens = await tokenRes.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const connectedAt = new Date().toISOString()

  // Store tokens in SiteSettings
  const payload = await getPayload({ config: configPromise })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      restream: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        connectedAt,
      },
    },
    overrideAccess: true, // this is a server-side system action
  })

  // Redirect back to the admin panel with success message
  const adminUrl = `${baseUrl}/admin/globals/site-settings?restream=connected`
  return NextResponse.redirect(adminUrl)
}
