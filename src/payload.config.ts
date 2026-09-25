import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { checkRestreamStatus } from './lib/restream'
import { paginate as pcoPaginate, type PcoResource } from './lib/pco'

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

  /**
   * Transactional email.
   *
   * Only used for password resets at the moment. Without an adapter Payload
   * accepts a reset request, sends nothing, and tells the person to check their
   * inbox — which is worse than having no reset at all, because they wait.
   *
   * Left undefined when RESEND_API_KEY is absent rather than configured with an
   * empty key. Payload then falls back to logging mail to the console, which is
   * what you want locally and obvious if it ever reaches production.
   */
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@hif.vn',
        defaultFromName: 'Hanoi International Fellowship',
        apiKey: process.env.RESEND_API_KEY,
      })
    : undefined,

  db: postgresAdapter({
    // Schema push is a development convenience: it alters tables automatically
    // to match the config. Payload documents it as dev-only, and it becomes
    // genuinely dangerous once analytics tables share this database.
    // Production uses reviewed migrations instead.
    push: process.env.NODE_ENV !== 'production',
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

          // PCO group_type_id → our groupType
          const GROUP_TYPE_MAP: Record<string, 'connect-group' | 'fellowship'> = {
            '126940': 'connect-group',
            '183728': 'fellowship',
          }

          type GroupAttrs = {
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
          type GroupRels = { group_type: { data: { id: string; type: string } | null } }

          let upserted = 0
          let skipped = 0

          // pcoPaginate handles User-Agent, rate limiting, retries and paging.
          for await (const page of pcoPaginate<PcoResource<GroupAttrs, GroupRels>>(
            '/groups/v2/groups?include=group_type',
          )) {
            for (const group of page.data) {
              const attr = group.attributes
              const typeId = group.relationships?.group_type?.data?.id
              const groupType = typeId ? GROUP_TYPE_MAP[typeId] : undefined

              // Skip unlisted groups or unknown types
              if (!attr.listed || !groupType) {
                skipped++
                continue
              }

              // Detect PCO default placeholder images
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
              } else {
                await payload.create({
                  collection: 'groups',
                  data,
                  overrideAccess: true,
                })
              }
              upserted++
            }
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
                  data: { title: v.title, date, series: series.id, _status: 'published' } as any,
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
                  data: { title: v.title, youtubeURL, date, series: series.id, slug, _status: 'published' } as any,
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
                  await payload.create({ collection: 'testimonies', data, overrideAccess: true })
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
