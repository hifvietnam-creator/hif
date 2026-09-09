import { NextRequest, NextResponse } from 'next/server'

import { getAudienceById, getAudienceSubscribers } from '@/lib/queries/reachability'
import { getMeUser } from '@/utilities/getMeUser'

export const dynamic = 'force-dynamic'

/**
 * CSV of an audience, optionally filtered by status.
 *
 * A list of bounced addresses is only useful outside the browser — someone has
 * to correct them in Planning Center — so the export exists to get the data to
 * where the work happens.
 *
 * Auth is checked here explicitly. The dashboard pages are protected by the
 * layout, but a route handler has no layout above it: without this the export
 * would hand out every subscriber's address to anyone who guessed the URL.
 */

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ audienceId: string }> },
) {
  const { user } = await getMeUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { audienceId } = await params
  const group = await getAudienceById(audienceId)
  if (!group) return new NextResponse('Not found', { status: 404 })

  const status = req.nextUrl.searchParams.get('status') ?? undefined
  const rows = await getAudienceSubscribers(audienceId, status, 100_000)

  const header = ['email', 'status', 'people', 'people_count', 'sent', 'clicks']
  const body = rows.map((r) =>
    [r.email, r.status, r.people ?? '', r.person_count, r.sent ?? '', r.clicks_count ?? '']
      .map(csvCell)
      .join(','),
  )

  const slug = group.name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  const filename = `${slug}${status ? `-${status}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`

  // Leading BOM: without it Excel on Windows reads the file as ANSI and mangles
  // every non-ASCII name. This congregation spans 30+ nationalities, so that is
  // most of the interesting rows.
  const csv = '﻿' + [header.join(','), ...body].join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
