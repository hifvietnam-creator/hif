/**
 * /api/restream/authorize
 *
 * Redirects the admin to Restream's OAuth2 authorization page.
 * After approval, Restream sends the user back to /api/restream/callback.
 *
 * Visit this URL from the admin panel to connect Restream:
 *   http://localhost:3000/api/restream/authorize
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.RESTREAM_CLIENT_ID
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/restream/callback`

  if (!clientId) {
    return NextResponse.json({ error: 'RESTREAM_CLIENT_ID not configured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    // Restream uses scopes as space-separated list
    scope: 'read_stream read_account',
  })

  const authUrl = `https://api.restream.io/oauth/authorize?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
