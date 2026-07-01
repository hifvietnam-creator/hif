/**
 * scripts/pco-sync-groups.ts
 *
 * Fetches all Connect Groups and Fellowships from Planning Center Online
 * and upserts them into the Payload `groups` collection.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/pco-sync-groups.ts
 *
 * Requires .env:
 *   PCO_APP_ID=...
 *   PCO_SECRET=...
 *   DATABASE_URL=...
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function loadEnv() {
  try {
    const envFile = readFileSync(resolve(ROOT, '.env'), 'utf8')
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}

// PCO group_type_id → our groupType slug
const GROUP_TYPE_MAP: Record<string, 'connect-group' | 'fellowship'> = {
  '126940': 'connect-group',
  '183728': 'fellowship',
}

interface PCOGroup {
  id: string
  attributes: {
    name: string
    description_as_plain_text: string | null
    schedule: string | null
    header_image: { medium: string } | null
    public_church_center_web_url: string | null
    enrollment_open: boolean
    listed: boolean
    contact_email: string | null
    memberships_count: number
  }
  relationships: {
    group_type: { data: { id: string } }
  }
}

interface PCOResponse {
  data: PCOGroup[]
  meta: {
    total_count: number
    next?: { offset: number }
  }
}

async function fetchAllGroups(authHeader: string): Promise<PCOGroup[]> {
  const allGroups: PCOGroup[] = []
  let offset = 0
  const perPage = 25

  while (true) {
    const url = `https://api.planningcenteronline.com/groups/v2/groups?per_page=${perPage}&offset=${offset}&include=group_type`
    console.log(`[PCO] Fetching: offset=${offset}`)

    const res = await fetch(url, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(`PCO API error: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as PCOResponse
    allGroups.push(...json.data)
    console.log(`[PCO] Got ${json.data.length} groups (total so far: ${allGroups.length} / ${json.meta.total_count})`)

    if (!json.meta.next || json.data.length < perPage) break
    offset = json.meta.next.offset
  }

  return allGroups
}

async function main() {
  loadEnv()

  const PCO_APP_ID = process.env.PCO_APP_ID?.trim()
  const PCO_SECRET = process.env.PCO_SECRET?.trim()
  if (!PCO_APP_ID || !PCO_SECRET) {
    throw new Error('PCO_APP_ID and PCO_SECRET must be set in .env')
  }

  const credentials = Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString('base64')
  const authHeader = `Basic ${credentials}`

  const { default: config } = await import('@payload-config')
  const { getPayload } = await import('payload')
  const payload = await getPayload({ config })

  console.log('\n[PCO Sync] Starting group sync...\n')
  const allGroups = await fetchAllGroups(authHeader)

  let upserted = 0
  let skipped = 0

  for (const group of allGroups) {
    const attr = group.attributes
    const typeId = group.relationships.group_type.data.id
    const groupType = GROUP_TYPE_MAP[typeId]

    if (!attr.listed || !groupType) {
      console.log(`[SKIP] "${attr.name}" — listed=${attr.listed}, typeId=${typeId}`)
      skipped++
      continue
    }

    // Filter out PCO placeholder images
    const imageUrl =
      attr.header_image?.medium && !attr.header_image.medium.includes('/defaults/')
        ? attr.header_image.medium
        : null

    const data = {
      pcoId: group.id,
      name: attr.name,
      groupType,
      description: attr.description_as_plain_text ?? null,
      schedule: attr.schedule ?? null,
      imageUrl,
      churchCenterUrl: attr.public_church_center_web_url ?? null,
      enrollmentOpen: attr.enrollment_open,
      listed: attr.listed,
      contactEmail: attr.contact_email ?? null,
      membershipsCount: attr.memberships_count,
    }

    // Upsert by pcoId
    const existing = await payload.find({
      collection: 'groups',
      where: { pcoId: { equals: group.id } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'groups',
        id: existing.docs[0]!.id,
        data,
        overrideAccess: true,
      })
      console.log(`[UPDATE] ${groupType.toUpperCase()} — ${attr.name}`)
    } else {
      await payload.create({
        collection: 'groups',
        data,
        overrideAccess: true,
      })
      console.log(`[CREATE] ${groupType.toUpperCase()} — ${attr.name}`)
    }
    upserted++
  }

  console.log(`\n[PCO Sync] Done. ${upserted} upserted, ${skipped} skipped.\n`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[PCO Sync] Error:', err)
  process.exit(1)
})
