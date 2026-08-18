import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { buildHref, type SermonFilters } from './SermonGrid'

// ── Filter facets ─────────────────────────────────────────────────────────────
//
// The sidebar needs three things derived from the whole collection rather than
// the current filter: which years have sermons, which speakers have sermons, and
// the list of series. That means scanning the collection — far too expensive to
// repeat on every filter click, which is what made this page take ~20s.
//
// So it is cached. Facets only change when sermons are added or edited, and a
// stale entry costs nothing worse than a missing year in the sidebar for a few
// minutes. Call revalidateTag('sermons', 'max') after a sync to refresh it.

export const getFacets = unstable_cache(
  async () => {
    const payload = await getPayload({ config: configPromise })

    // One scan, two facets. This was previously two queries — one at depth 1,
    // which joined every speaker row for nothing, and one capped at 500 which
    // would have silently dropped data past that point.
    const [index, teamRes, seriesRes] = await Promise.all([
      payload.find({
        collection: 'sermons',
        where: { _status: { equals: 'published' } },
        depth: 0, // relationships stay as raw ids — no joins
        pagination: false,
        overrideAccess: true,
        select: { date: true, speaker: true },
      }),
      payload.find({
        collection: 'team',
        sort: 'name',
        limit: 200,
        depth: 0,
        overrideAccess: true,
        select: { name: true },
      }),
      payload.find({
        collection: 'series',
        // Sorted in JS below, not here. Postgres orders NULLs FIRST on a
        // descending sort, so `-year` put every year-less archive series above
        // the current one — the newest series ended up buried at the bottom.
        limit: 200,
        depth: 0,
        overrideAccess: true,
        select: { title: true, year: true, youtubePlaylistId: true },
      }),
    ])

    const years = [
      ...new Set(
        index.docs
          .map((s) => (s.date ? new Date(s.date as string).getFullYear().toString() : null))
          .filter(Boolean) as string[],
      ),
    ].sort((a, b) => Number(b) - Number(a))

    const speakerIdsWithSermons = new Set(
      index.docs
        .map((s) =>
          s.speaker && typeof s.speaker === 'object'
            ? String((s.speaker as { id: unknown }).id)
            : s.speaker != null
              ? String(s.speaker)
              : null,
        )
        .filter(Boolean) as string[],
    )

    return {
      years,
      series: seriesRes.docs
        .map((s) => ({
          id: String(s.id),
          title: s.title as string,
          year: (s.year as number | null) ?? null,
          youtubePlaylistId: (s.youtubePlaylistId as string | null) ?? null,
        }))
        // Newest first, with undated series last rather than first, then
        // alphabetical within a year so the order is stable between renders.
        .sort((a, b) => {
          if (a.year !== b.year) {
            if (a.year === null) return 1
            if (b.year === null) return -1
            return b.year - a.year
          }
          return a.title.localeCompare(b.title)
        }),
      speakers: teamRes.docs
        .filter((sp) => speakerIdsWithSermons.has(String(sp.id)))
        .map((sp) => ({ id: String(sp.id), name: sp.name as string })),
    }
  },
  ['sermon-filter-facets'],
  { revalidate: 300, tags: ['sermons'] },
)

export function FilterSidebarSkeleton() {
  return (
    <aside className="sermons-sidebar" aria-busy="true" aria-label="Loading filters">
      {['Series', 'Year', 'Speaker'].map((label) => (
        <div className="filter-group" key={label}>
          <h3 className="filter-title">{label}</h3>
          <ul className="filter-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <span className="skeleton-text skeleton-filter" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  )
}

export default async function FilterSidebar({ filters }: { filters: SermonFilters }) {
  const { years, series: allSeries, speakers } = await getFacets()

  const activeSeries = filters.series ?? null
  const activeYear = filters.year ?? null
  const activeSpeaker = filters.speaker ?? null
  const currentSeries = activeSeries ? allSeries.find((s) => s.id === activeSeries) : null

  return (
    <aside className="sermons-sidebar">
      {allSeries.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-title">Series</h3>
          <ul className="filter-list">
            <li>
              <Link
                href={buildHref(filters, { series: undefined })}
                className={`filter-link${!activeSeries ? ' active' : ''}`}
                scroll={false}
              >
                All series
              </Link>
            </li>
            {allSeries.map((s) => (
              <li key={s.id}>
                <Link
                  href={buildHref(filters, { series: s.id })}
                  className={`filter-link${activeSeries === s.id ? ' active' : ''}`}
                  scroll={false}
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
          {currentSeries?.youtubePlaylistId && (
            <a
              href={`https://www.youtube.com/playlist?list=${currentSeries.youtubePlaylistId}`}
              className="series-playlist-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              ▶ Watch full playlist on YouTube
            </a>
          )}
        </div>
      )}

      {years.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-title">Year</h3>
          <ul className="filter-list">
            <li>
              <Link
                href={buildHref(filters, { year: undefined })}
                className={`filter-link${!activeYear ? ' active' : ''}`}
                scroll={false}
              >
                All years
              </Link>
            </li>
            {years.map((y) => (
              <li key={y}>
                <Link
                  href={buildHref(filters, { year: y })}
                  className={`filter-link${activeYear === y ? ' active' : ''}`}
                  scroll={false}
                >
                  {y}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {speakers.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-title">Speaker</h3>
          <ul className="filter-list">
            <li>
              <Link
                href={buildHref(filters, { speaker: undefined })}
                className={`filter-link${!activeSpeaker ? ' active' : ''}`}
                scroll={false}
              >
                All speakers
              </Link>
            </li>
            {speakers.map((sp) => (
              <li key={sp.id}>
                <Link
                  href={buildHref(filters, { speaker: sp.id })}
                  className={`filter-link${activeSpeaker === sp.id ? ' active' : ''}`}
                  scroll={false}
                >
                  {sp.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
