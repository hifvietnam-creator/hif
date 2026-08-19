import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

/**
 * Sitemap for the sermon archive — 800+ pages that no search engine could
 * otherwise discover, since nothing links to most of them beyond a paginated
 * listing 30-odd pages deep.
 *
 * Priorities are weighted by recency rather than left flat. A flat sitemap
 * tells a crawler nothing about where to spend its budget, and with this many
 * URLs that matters: last Sunday's sermon should be reached before one from
 * 2015.
 */
const getSermonsSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'

    const results = await payload.find({
      collection: 'sermons',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 5000,
      pagination: false,
      where: { _status: { equals: 'published' } },
      select: { slug: true, date: true, updatedAt: true },
    })

    const dateFallback = new Date().toISOString()
    const now = Date.now()

    const sitemap = (results.docs ?? [])
      .filter((s) => Boolean(s?.slug))
      .map((s) => {
        const preached = s.date ? new Date(s.date as string).getTime() : null
        const ageYears = preached ? (now - preached) / 31_536_000_000 : 12

        // Recent sermons get crawled first; the archive stays included but low.
        const priority = ageYears < 0.5 ? 0.8 : ageYears < 2 ? 0.6 : ageYears < 6 ? 0.4 : 0.3

        return {
          loc: `${SITE_URL}/sermons/${s.slug}`,
          // updatedAt, not the sermon date: lastmod means "when the page
          // changed", and a 2015 sermon whose PDF link we fixed last week has
          // genuinely changed.
          lastmod: (s.updatedAt as string) || dateFallback,
          changefreq: ageYears < 0.5 ? ('weekly' as const) : ('yearly' as const),
          priority,
        }
      })

    return sitemap
  },
  ['sermons-sitemap'],
  { tags: ['sermons-sitemap', 'sermons'] },
)

export async function GET() {
  const sitemap = await getSermonsSitemap()

  return getServerSideSitemap(sitemap)
}
