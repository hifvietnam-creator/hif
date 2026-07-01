import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { checkRestreamStatus } from './lib/restream'

import { Categories } from './collections/Categories'
import { CityPartners } from './collections/CityPartners'
import { Fellowships } from './collections/Fellowships'
import { Groups } from './collections/Groups'
import { Locations } from './collections/Locations'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Series } from './collections/Series'
import { Sermons } from './collections/Sermons'
import { Team } from './collections/Team'
import { Testimonies } from './collections/Testimonies'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { LiveStream } from './globals/LiveStream/config'
import { MediaHighlights } from './globals/MediaHighlights/config'
import { SiteSettings } from './globals/SiteSettings/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      beforeLogin: ['@/components/BeforeLogin'],
      beforeDashboard: ['@/components/BeforeDashboard'],
      graphics: {
        Logo: '@/components/Logo/Logo#Logo',
        Icon: '@/components/Logo/Logo#Logo',
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    push: true,
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Categories,
    Users,
    Sermons,
    Series,
    Team,
    Locations,
    Testimonies,
    Fellowships,
    Groups,
    CityPartners,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer, LiveStream, MediaHighlights, SiteSettings],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [
      {
        slug: 'sync-pco-groups',
        label: 'Sync PCO Groups (Connect Groups + Fellowships)',
        inputSchema: [],
        outputSchema: [
          { name: 'upserted', type: 'number' },
          { name: 'skipped', type: 'number' },
        ],
        handler: async ({ req }) => {
          const payload = req.payload

          const PCO_APP_ID = process.env.PCO_APP_ID?.trim()
          const PCO_SECRET = process.env.PCO_SECRET?.trim()
          if (!PCO_APP_ID || !PCO_SECRET) {
            throw new Error('PCO_APP_ID or PCO_SECRET not set in environment')
          }

          const credentials = Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString('base64')
          const headers = {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          }

          // PCO group_type_id → our groupType
          const GROUP_TYPE_MAP: Record<string, 'connect-group' | 'fellowship'> = {
            '126940': 'connect-group',
            '183728': 'fellowship',
          }

          let upserted = 0
          let skipped = 0
          let offset = 0
          const perPage = 25

          while (true) {
            const url = `https://api.planningcenteronline.com/groups/v2/groups?per_page=${perPage}&offset=${offset}&include=group_type`
            const res = await fetch(url, { headers })
            if (!res.ok) {
              throw new Error(`PCO API error: ${res.status} ${res.statusText}`)
            }
            const json = (await res.json()) as {
              data: Array<{
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
              }>
              meta: { total_count: number; next?: { offset: number } }
            }

            for (const group of json.data) {
              const attr = group.attributes
              const typeId = group.relationships.group_type.data.id
              const groupType = GROUP_TYPE_MAP[typeId]

              // Skip unlisted groups or unknown types
              if (!attr.listed || !groupType) {
                skipped++
                continue
              }

              // Detect PCO default placeholder images
              const imageUrl =
                attr.header_image?.medium &&
                !attr.header_image.medium.includes('/defaults/')
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
              } else {
                await payload.create({
                  collection: 'groups',
                  data,
                  overrideAccess: true,
                })
              }
              upserted++
            }

            // Paginate
            if (!json.meta.next || json.data.length < perPage) break
            offset = json.meta.next.offset
          }

          console.log(`[PCO Sync] Done — ${upserted} upserted, ${skipped} skipped`)
          return { output: { upserted, skipped } }
        },
      },
      {
        slug: 'sync-sermons',
        label: 'Sync Sermons from YouTube Playlists',
        inputSchema: [],
        outputSchema: [
          { name: 'created', type: 'number' },
          { name: 'updated', type: 'number' },
        ],
        handler: async ({ req }) => {
          const payload = req.payload
          const apiKey = process.env.YOUTUBE_API_KEY?.trim()
          if (!apiKey) throw new Error('YOUTUBE_API_KEY not set')

          const fetchPlaylist = async (playlistId: string) => {
            const items: Array<{ title: string; description: string; publishedAt: string; videoId: string }> = []
            let pageToken: string | undefined
            while (true) {
              const params = new URLSearchParams({
                part: 'snippet', playlistId, maxResults: '50', key: apiKey,
                ...(pageToken ? { pageToken } : {}),
              })
              const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
              if (!res.ok) throw new Error(`YouTube API ${res.status}`)
              const json = (await res.json()) as { items: Array<{ snippet: { title: string; description: string; publishedAt: string; resourceId: { videoId: string } } }>; nextPageToken?: string }
              for (const item of json.items) {
                if (item.snippet.title === 'Deleted video' || item.snippet.title === 'Private video') continue
                items.push({
                  title: item.snippet.title,
                  description: item.snippet.description,
                  publishedAt: item.snippet.publishedAt,
                  videoId: item.snippet.resourceId.videoId,
                })
              }
              if (!json.nextPageToken) break
              pageToken = json.nextPageToken
            }
            return items
          }

          const slugify = (text: string) =>
            text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80)

          const seriesRes = await payload.find({
            collection: 'series',
            where: { youtubePlaylistId: { exists: true } },
            limit: 100, overrideAccess: true,
          })

          let created = 0; let updated = 0
          for (const series of seriesRes.docs.filter((s) => s.youtubePlaylistId)) {
            const videos = await fetchPlaylist(series.youtubePlaylistId as string)
            for (const v of videos) {
              const youtubeURL = `https://www.youtube.com/watch?v=${v.videoId}`
              const date = new Date(v.publishedAt).toISOString().slice(0, 10)
              const existing = await payload.find({
                collection: 'sermons',
                where: { youtubeURL: { equals: youtubeURL } },
                limit: 1, overrideAccess: true,
              })
              if (existing.docs.length > 0) {
                await payload.update({
                  collection: 'sermons', id: existing.docs[0]!.id,
                  data: { title: v.title, date, series: series.id, _status: 'published' },
                  overrideAccess: true,
                })
                updated++
              } else {
                let slug = slugify(v.title); let attempt = 0
                while (true) {
                  const candidate = attempt === 0 ? slug : `${slug}-${attempt}`
                  const ex = await payload.find({ collection: 'sermons', where: { slug: { equals: candidate } }, limit: 1, overrideAccess: true })
                  if (ex.docs.length === 0) { slug = candidate; break }
                  attempt++
                }
                await payload.create({
                  collection: 'sermons',
                  data: { title: v.title, youtubeURL, date, series: series.id, slug, _status: 'published' },
                  overrideAccess: true,
                })
                created++
              }
            }
          }
          console.log(`[Sermon Sync] Done — ${created} created, ${updated} updated`)
          return { output: { created, updated } }
        },
      },
      {
        slug: 'sync-testimonies',
        label: 'Sync Testimony Videos from YouTube',
        inputSchema: [],
        outputSchema: [
          { name: 'upserted', type: 'number' },
        ],
        handler: async ({ req }) => {
          const payload = req.payload
          const apiKey = process.env.YOUTUBE_API_KEY?.trim()
          if (!apiKey) throw new Error('YOUTUBE_API_KEY not set')

          const PLAYLISTS: Array<{ id: string; category: 'baptism' | 'advent-candle' }> = [
            { id: 'PL7A2w2jsUkUnk84vYR31iTwX-tmmVHXMz', category: 'baptism' },
            { id: 'PL7A2w2jsUkUl4FHTOdR1u3Gtz6y7bC_BE', category: 'advent-candle' },
          ]

          let upserted = 0
          for (const { id: playlistId, category } of PLAYLISTS) {
            let pageToken: string | undefined
            while (true) {
              const params = new URLSearchParams({
                part: 'snippet', playlistId, maxResults: '50', key: apiKey,
                ...(pageToken ? { pageToken } : {}),
              })
              const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
              if (!res.ok) throw new Error(`YouTube API ${res.status}`)
              const json = (await res.json()) as { items: Array<{ snippet: { title: string; publishedAt: string; resourceId: { videoId: string }; description: string } }>; nextPageToken?: string }
              for (const item of json.items) {
                const { title, publishedAt, resourceId, description } = item.snippet
                if (title === 'Deleted video' || title === 'Private video') continue
                const youtubeId = resourceId.videoId
                const data = {
                  name: title, youtubeId, publishedAt: new Date(publishedAt).toISOString(),
                  category, source: 'youtube' as const, videoFeatured: true, featured: false,
                  ...(description && description.length < 500 ? { quote: description } : {}),
                }
                const existing = await payload.find({
                  collection: 'testimonies',
                  where: { youtubeId: { equals: youtubeId } },
                  limit: 1, overrideAccess: true,
                })
                if (existing.docs.length > 0) {
                  await payload.update({ collection: 'testimonies', id: existing.docs[0]!.id, data, overrideAccess: true })
                } else {
                  await payload.create({ collection: 'testimonies', data: { ...data, _status: 'published' }, overrideAccess: true })
                }
                upserted++
              }
              if (!json.nextPageToken) break
              pageToken = json.nextPageToken
            }
          }
          console.log(`[Testimony Sync] Done — ${upserted} upserted`)
          return { output: { upserted } }
        },
      },
      {
        slug: 'sync-restream-status',
        label: 'Sync Restream Live Status',
        // Runs every ~2 minutes via the Vercel cron or manual trigger
        handler: async ({ req }) => {
          const payload = req.payload

          try {
            const status = await checkRestreamStatus(payload)

            if (status.isLive) {
              await payload.updateGlobal({
                slug: 'live-stream',
                data: {
                  isLive: true,
                  ...(status.youtubeVideoId ? { youtubeVideoId: status.youtubeVideoId } : {}),
                  ...(status.eventTitle ? { streamTitle: status.eventTitle } : {}),
                },
                overrideAccess: true,
              })

              console.log(
                `[Restream] 🔴 Live! YouTube video: ${status.youtubeVideoId ?? 'unknown'}`,
              )
            } else {
              await payload.updateGlobal({
                slug: 'live-stream',
                data: { isLive: false },
                overrideAccess: true,
              })

              console.log('[Restream] Stream ended — isLive set to false')
            }
          } catch (err) {
            console.error('[Restream] sync-restream-status job error:', err)
            // Don't throw — let the job complete so it can retry on next cron tick
          }

          return { output: {} }
        },
        outputSchema: [{ name: 'ok', type: 'checkbox' }],
        inputSchema: [],
      },
    ],
  },
})
