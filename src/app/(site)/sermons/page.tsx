import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sermons — Hanoi International Fellowship',
  description:
    'Browse HIF sermons by speaker, series, or year. Watch, download notes, and dig deeper with discussion questions.',
  openGraph: {
    title: 'Sermons — Hanoi International Fellowship',
    description: 'Watch and listen to messages from HIF — searchable by speaker, series, and year.',
    type: 'website',
  },
}

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── page ─────────────────────────────────────────────────────────────────────

type PageProps = {
  searchParams: Promise<{ year?: string; speaker?: string; series?: string }>
}

export default async function SermonsPage({ searchParams }: PageProps) {
  const { year, speaker, series } = await searchParams

  const payload = await getPayload({ config: configPromise })

  // Build where clause.
  // Use overrideAccess: true + explicit _status so we control exactly what's queried
  // and avoid issues with Payload merging our `and` array with access-control clauses.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andConditions: Record<string, any>[] = [
    { _status: { equals: 'published' } },
  ]

  if (year) {
    andConditions.push({ date: { greater_than_equal: `${year}-01-01` } })
    andConditions.push({ date: { less_than_equal: `${year}-12-31` } })
  }
  if (speaker) {
    const speakerIdNum = Number(speaker)
    andConditions.push({ speaker: { equals: Number.isNaN(speakerIdNum) ? speaker : speakerIdNum } })
  }
  if (series) {
    const seriesIdNum = Number(series)
    andConditions.push({ series: { equals: Number.isNaN(seriesIdNum) ? series : seriesIdNum } })
  }

  const where = { and: andConditions }

  const [sermonsRes, teamRes, seriesRes] = await Promise.all([
    payload.find({
      collection: 'sermons',
      where,
      sort: '-date',
      depth: 2,
      limit: 50,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'team',
      sort: 'name',
      limit: 100,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'series',
      sort: '-year',
      limit: 50,
      overrideAccess: true,
    }),
  ])

  const sermons = sermonsRes.docs
  const speakers = teamRes.docs
  const allSeries = seriesRes.docs

  // Only show speakers that have at least one sermon
  const speakerIdsWithSermons = new Set(
    (await payload.find({
      collection: 'sermons',
      where: { and: [{ _status: { equals: 'published' } }, { speaker: { exists: true } }] },
      limit: 500,
      depth: 1,
      overrideAccess: true,
      select: { speaker: true },
    })).docs
      .map((s) => s.speaker && typeof s.speaker === 'object' ? String((s.speaker as any).id) : String(s.speaker))
      .filter(Boolean)
  )
  const activeSpeakers = speakers.filter((sp) => speakerIdsWithSermons.has(String(sp.id)))

  // Derive available years
  const allDates = await payload.find({
    collection: 'sermons',
    where: { _status: { equals: 'published' } },
    sort: '-date',
    limit: 500,
    pagination: false,
    overrideAccess: true,
    select: { date: true },
  })
  const years = [
    ...new Set(
      allDates.docs
        .map((s) => (s.date ? new Date(s.date as string).getFullYear().toString() : null))
        .filter(Boolean) as string[],
    ),
  ].sort((a, b) => Number(b) - Number(a))

  const activeYear = year ?? null
  const activeSpeaker = speaker ?? null
  const activeSeries = series ?? null

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · <Link href="/media">Watch &amp; Listen</Link> · Sermons
          </p>
          <p className="eyebrow eyebrow-light">Sermons</p>
          <h1>
            Every message,
            <br />
            on demand.
          </h1>
          <p className="page-lead">
            Watch HIF sermons, download notes, and dig deeper with discussion questions — all in one
            place.
          </p>
        </div>
      </section>

      {/* FILTERS + GRID */}
      <section className="section">
        <div className="container">
          <div className="sermons-layout">
            {/* ── Sidebar filters ─────────────────────────────────────── */}
            <aside className="sermons-sidebar">

              {/* Series filter */}
              {allSeries.length > 0 && (
                <div className="filter-group">
                  <h3 className="filter-title">Series</h3>
                  <ul className="filter-list">
                    <li>
                      <Link
                        href={`/sermons${activeYear ? `?year=${activeYear}` : ''}${activeSpeaker ? `${activeYear ? '&' : '?'}speaker=${activeSpeaker}` : ''}`}
                        className={`filter-link${!activeSeries ? ' active' : ''}`}
                        scroll={false}
                      >
                        All series
                      </Link>
                    </li>
                    {allSeries.map((s) => (
                      <li key={String(s.id)}>
                        <Link
                          href={`/sermons?series=${s.id}${activeYear ? `&year=${activeYear}` : ''}${activeSpeaker ? `&speaker=${activeSpeaker}` : ''}`}
                          className={`filter-link${activeSeries === String(s.id) ? ' active' : ''}`}
                          scroll={false}
                        >
                          {s.title as string}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {/* When a series is active, show a YouTube playlist link if available */}
                  {activeSeries && (() => {
                    const currentSeries = allSeries.find(s => String(s.id) === activeSeries)
                    const playlistId = currentSeries?.youtubePlaylistId as string | null | undefined
                    if (!playlistId) return null
                    return (
                      <a
                        href={`https://www.youtube.com/playlist?list=${playlistId}`}
                        className="series-playlist-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ▶ Watch full playlist on YouTube
                      </a>
                    )
                  })()}
                </div>
              )}

              {/* Year filter */}
              {years.length > 0 && (
                <div className="filter-group">
                  <h3 className="filter-title">Year</h3>
                  <ul className="filter-list">
                    <li>
                      <Link
                        href={`/sermons${activeSeries ? `?series=${activeSeries}` : ''}${activeSpeaker ? `${activeSeries ? '&' : '?'}speaker=${activeSpeaker}` : ''}`}
                        className={`filter-link${!activeYear ? ' active' : ''}`}
                        scroll={false}
                      >
                        All years
                      </Link>
                    </li>
                    {years.map((y) => (
                      <li key={y}>
                        <Link
                          href={`/sermons?year=${y}${activeSeries ? `&series=${activeSeries}` : ''}${activeSpeaker ? `&speaker=${activeSpeaker}` : ''}`}
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

              {/* Speaker filter — only shown when speakers have sermons */}
              {activeSpeakers.length > 0 && (
                <div className="filter-group">
                  <h3 className="filter-title">Speaker</h3>
                  <ul className="filter-list">
                    <li>
                      <Link
                        href={`/sermons${activeYear ? `?year=${activeYear}` : ''}${activeSeries ? `${activeYear ? '&' : '?'}series=${activeSeries}` : ''}`}
                        className={`filter-link${!activeSpeaker ? ' active' : ''}`}
                        scroll={false}
                      >
                        All speakers
                      </Link>
                    </li>
                    {activeSpeakers.map((sp) => (
                      <li key={String(sp.id)}>
                        <Link
                          href={`/sermons?speaker=${sp.id}${activeYear ? `&year=${activeYear}` : ''}${activeSeries ? `&series=${activeSeries}` : ''}`}
                          className={`filter-link${activeSpeaker === String(sp.id) ? ' active' : ''}`}
                          scroll={false}
                        >
                          {sp.name as string}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>

            {/* ── Sermon grid ──────────────────────────────────────────── */}
            <div className="sermons-main">
              {sermons.length === 0 ? (
                <div className="sermons-empty">
                  <p>No sermons found{activeYear ? ` for ${activeYear}` : ''}. Check back soon.</p>
                  {(activeYear || activeSpeaker || activeSeries) && (
                    <Link href="/sermons" className="btn btn-outline-dark">
                      Clear filters
                    </Link>
                  )}
                </div>
              ) : (
                <div className="sermon-grid">
                  {sermons.map((sermon) => {
                    const videoId = extractYouTubeId(sermon.youtubeURL as string | null)
                    const thumbnailUrl =
                      sermon.thumbnail &&
                      typeof sermon.thumbnail === 'object' &&
                      'url' in sermon.thumbnail
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
                            {videoId && (
                              <span className="sermon-play-btn" aria-hidden="true">
                                ▶
                              </span>
                            )}
                          </div>
                        </Link>
                        <div className="sermon-meta">
                          {seriesTitle && (
                            <p className="sermon-series">{seriesTitle}</p>
                          )}
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
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
