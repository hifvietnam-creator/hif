import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-static'
export const revalidate = 600

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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ── static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const sermons = await payload.find({
    collection: 'sermons',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
  })
  return sermons.docs.map(({ slug }) => ({ slug }))
}

// ── metadata ──────────────────────────────────────────────────────────────────

type Args = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'sermons',
    where: { slug: { equals: slug }, _status: { equals: 'published' } },
    depth: 1,
    limit: 1,
    overrideAccess: false,
  })
  const sermon = result.docs[0]
  if (!sermon) return { title: 'Sermon — HIF' }

  const speakerName =
    sermon.speaker && typeof sermon.speaker === 'object'
      ? (sermon.speaker as { name?: string }).name
      : null

  return {
    title: `${sermon.title}${speakerName ? ` — ${speakerName}` : ''} | HIF Sermons`,
    description: (sermon.description as string) ?? undefined,
  }
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function SermonPage({ params }: Args) {
  const { slug } = await params

  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'sermons',
    where: { slug: { equals: slug }, _status: { equals: 'published' } },
    depth: 2,
    limit: 1,
    overrideAccess: false,
  })

  const sermon = result.docs[0]
  if (!sermon) notFound()

  const videoId = extractYouTubeId(sermon.youtubeURL as string | null)

  const speakerName =
    sermon.speaker && typeof sermon.speaker === 'object'
      ? (sermon.speaker as { name?: string }).name
      : null

  const seriesTitle =
    sermon.series && typeof sermon.series === 'object'
      ? (sermon.series as { title?: string }).title
      : null

  const seriesSlug =
    sermon.series && typeof sermon.series === 'object'
      ? (sermon.series as { slug?: string }).slug
      : null

  // Discussion questions
  const dq = sermon.discussionQuestions as
    | { type?: string; url?: string; file?: { url?: string }; questionsText?: string }
    | undefined
  const dqUrl =
    dq?.type === 'url'
      ? dq.url
      : dq?.type === 'upload' && dq.file?.url
        ? dq.file.url
        : null
  const dqInline = dq?.type === 'inline' ? (dq.questionsText ?? null) : null

  // Sermon PDF — uploaded file takes priority; fall back to external URL
  const sermonPDF = sermon.sermonPDF as { url?: string; filename?: string } | undefined
  const pdfUrl = sermonPDF?.url ?? (sermon.sermonPdfUrl as string | null) ?? null

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero page-hero-sm">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · <Link href="/media">Watch &amp; Listen</Link> ·{' '}
            <Link href="/sermons">Sermons</Link>
          </p>
          {seriesTitle && (
            <p className="eyebrow eyebrow-light">
              {seriesSlug ? (
                <Link href={`/sermons?series=${seriesSlug}`}>{seriesTitle}</Link>
              ) : (
                seriesTitle
              )}
            </p>
          )}
          <h1>{sermon.title as string}</h1>
          <div className="sermon-hero-meta">
            {speakerName && <span>{speakerName}</span>}
            {sermon.date && (
              <span>{formatDate(sermon.date as string)}</span>
            )}
            {sermon.scripture && <span>{sermon.scripture as string}</span>}
            {sermon.duration && <span>{sermon.duration as string}</span>}
          </div>
        </div>
      </section>

      {/* SERMON CONTENT */}
      <section className="section">
        <div className="container sermon-detail">

          {/* ── Resources bar (discussion questions link + PDF) ── */}
          {(dqUrl || pdfUrl) && (
            <div className="sermon-resources reveal">
              {dqUrl && (
                <a
                  className="btn btn-outline-dark"
                  href={dqUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📄 Discussion questions
                </a>
              )}
              {pdfUrl && (
                <a
                  className="btn btn-outline-dark"
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ⬇ Sermon notes (PDF)
                </a>
              )}
            </div>
          )}

          {/* ── Inline discussion questions accordion ── */}
          {dqInline && (
            <details className="sermon-dq-accordion reveal">
              <summary className="sermon-dq-summary">📄 Discussion questions</summary>
              <div className="sermon-dq-body">
                {dqInline.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </details>
          )}

          {/* ── Video embed ── */}
          {videoId ? (
            <div className="video-embed reveal">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title={sermon.title as string}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="sermon-no-video reveal">
              <p>Video not yet available. Check back soon or visit our{' '}
                <a href="https://www.youtube.com/@HIFVietnam" target="_blank" rel="noopener noreferrer">
                  YouTube channel
                </a>.
              </p>
            </div>
          )}

          {/* ── Description ── */}
          {sermon.description && (
            <div className="sermon-body reveal">
              <p>{sermon.description as string}</p>
            </div>
          )}

          {/* ── Back link ── */}
          <p className="sermon-back reveal">
            <Link href="/sermons" className="link-arrow">
              ← All sermons
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
