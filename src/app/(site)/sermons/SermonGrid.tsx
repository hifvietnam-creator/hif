import Link from 'next/link'
import Image from 'next/image'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const SERMONS_PER_PAGE = 24

function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  )
  return match ? match[1] : null
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export type SermonFilters = {
  year?: string
  speaker?: string
  series?: string
  page?: string
}

/** Rebuilds the query string, dropping empties and resetting paging. */
export function buildHref(filters: SermonFilters, overrides: Partial<SermonFilters>): string {
  const next = { ...filters, ...overrides }
  // Any filter change invalidates the current page number.
  if (!('page' in overrides)) delete next.page
  const qs = new URLSearchParams()
  for (const key of ['series', 'year', 'speaker', 'page'] as const) {
    const v = next[key]
    if (v) qs.set(key, v)
  }
  const s = qs.toString()
  return s ? `/sermons?${s}` : '/sermons'
}

export default async function SermonGrid({ filters }: { filters: SermonFilters }) {
  const { year, speaker, series } = filters
  const page = Math.max(1, Number(filters.page ?? '1') || 1)

  const payload = await getPayload({ config: configPromise })

  const and: Record<string, unknown>[] = [{ _status: { equals: 'published' } }]
  if (year) {
    and.push({ date: { greater_than_equal: `${year}-01-01` } })
    and.push({ date: { less_than_equal: `${year}-12-31` } })
  }
  if (speaker) {
    const n = Number(speaker)
    and.push({ speaker: { equals: Number.isNaN(n) ? speaker : n } })
  }
  if (series) {
    const n = Number(series)
    and.push({ series: { equals: Number.isNaN(n) ? series : n } })
  }

  // depth 1 resolves speaker.name / series.title / thumbnail.url, which is all
  // the card renders. depth 2 was pulling the relations OF those relations.
  const res = await payload.find({
    collection: 'sermons',
    where: { and },
    // sortDate, not date: undated sermons carry a 1900 sentinel so they land at
    // the end. Sorting on `date` would surface them first, because Postgres
    // orders NULLs first on a descending sort.
    sort: '-sortDate',
    depth: 1,
    limit: SERMONS_PER_PAGE,
    page,
    overrideAccess: true,
    select: {
      title: true,
      slug: true,
      date: true,
      scripture: true,
      description: true,
      youtubeURL: true,
      audioURL: true,
      audioUnavailable: true,
      thumbnail: true,
      speaker: true,
      series: true,
    },
  })

  const sermons = res.docs
  const hasFilters = Boolean(year || speaker || series)

  if (sermons.length === 0) {
    return (
      <div className="sermons-empty">
        <p>No sermons found{year ? ` for ${year}` : ''}. Check back soon.</p>
        {hasFilters && (
          <Link href="/sermons" className="btn btn-outline-dark">
            Clear filters
          </Link>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="sermons-count">
        {res.totalDocs} sermon{res.totalDocs === 1 ? '' : 's'}
        {res.totalPages > 1 ? ` · page ${res.page} of ${res.totalPages}` : ''}
      </p>

      <div className="sermon-grid">
        {sermons.map((sermon) => {
          const videoId = extractYouTubeId(sermon.youtubeURL as string | null)
          const thumbnailUrl =
            sermon.thumbnail && typeof sermon.thumbnail === 'object' && 'url' in sermon.thumbnail
              ? (sermon.thumbnail.url as string)
              : videoId
                ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                : null

          const speakerName =
            sermon.speaker && typeof sermon.speaker === 'object'
              ? (sermon.speaker as { name?: string }).name
              : null

          const seriesTitle =
            sermon.series && typeof sermon.series === 'object'
              ? (sermon.series as { title?: string }).title
              : null

          return (
            <article key={String(sermon.id)} className="sermon-card reveal">
              <Link href={`/sermons/${sermon.slug}`} className="sermon-thumb-link">
                <div className="sermon-thumb">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={`Thumbnail for ${sermon.title}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="sermon-thumb-placeholder" aria-hidden="true" />
                  )}
                  {videoId ? (
                    <span className="sermon-play-btn" aria-hidden="true">
                      ▶
                    </span>
                  ) : sermon.audioURL && !sermon.audioUnavailable ? (
                    // Audio-only archive sermons. Without this they look like
                    // broken cards — a blank thumbnail and no affordance at all.
                    <span className="sermon-play-btn sermon-audio-btn" aria-hidden="true">
                      🎧
                    </span>
                  ) : null}
                </div>
              </Link>
              <div className="sermon-meta">
                {seriesTitle && <p className="sermon-series">{seriesTitle}</p>}
                <h2 className="sermon-title">
                  <Link href={`/sermons/${sermon.slug}`}>{sermon.title}</Link>
                </h2>
                <p className="sermon-info">
                  {speakerName && <span>{speakerName}</span>}
                  {speakerName && sermon.date && <span aria-hidden="true"> · </span>}
                  {sermon.date && <span>{formatDate(sermon.date as string)}</span>}
                  {sermon.scripture && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>{sermon.scripture as string}</span>
                    </>
                  )}
                </p>
                {sermon.description && (
                  <p className="sermon-desc">{sermon.description as string}</p>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {res.totalPages > 1 && (
        <nav className="sermons-pagination" aria-label="Sermon pages">
          {res.hasPrevPage ? (
            <Link
              className="page-btn"
              href={buildHref(filters, { page: String(res.page! - 1) })}
              rel="prev"
            >
              ← Previous
            </Link>
          ) : (
            <span className="page-btn disabled">← Previous</span>
          )}

          <span className="page-status">
            Page {res.page} of {res.totalPages}
          </span>

          {res.hasNextPage ? (
            <Link
              className="page-btn"
              href={buildHref(filters, { page: String(res.page! + 1) })}
              rel="next"
            >
              Next →
            </Link>
          ) : (
            <span className="page-btn disabled">Next →</span>
          )}
        </nav>
      )}
    </>
  )
}
