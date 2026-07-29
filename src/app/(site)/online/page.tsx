import type { Metadata } from 'next'
import Link from 'next/link'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import RichText from '@/components/RichText'
import CountdownTimer from './CountdownTimer'

// Always check live status fresh — never serve a stale "not live" page to someone tuning in
export const dynamic = 'force-dynamic'

const HIF_CHANNEL_ID = 'UCgPCJErnYUZ8GPug7u2m6vQ'

/** Queries YouTube Data API for a live video on the HIF channel. */
async function getYouTubeLiveVideo(): Promise<{ videoId: string; title: string } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return null
  try {
    const params = new URLSearchParams({
      part: 'id,snippet',
      channelId: HIF_CHANNEL_ID,
      type: 'video',
      eventType: 'live',
      maxResults: '1',
      key: apiKey,
    })
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      next: { revalidate: 0 }, // always fresh
    })
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null
    return {
      videoId: item.id.videoId as string,
      title: (item.snippet?.title as string) || 'Sunday Worship — Live Now',
    }
  } catch {
    return null
  }
}

export const metadata: Metadata = {
  title: 'Watch Online — Hanoi International Fellowship',
  description:
    'Join HIF live on Sundays or catch up on any message on demand — from anywhere in the world.',
  openGraph: {
    title: 'Watch Online — Hanoi International Fellowship',
    description: 'Live Sunday worship and on-demand sermons from HIF in Hanoi.',
    type: 'website',
  },
}

function YTEmbed({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div className="video-embed">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
        title={title}
        loading="eager"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

export default async function OnlinePage() {
  const payload = await getPayload({ config: configPromise })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = (await payload.findGlobal({ slug: 'live-stream' }).catch(() => null)) as any

  // 1. Check YouTube directly for a live video — most reliable source
  const ytLive = await getYouTubeLiveVideo()

  // 2. Admin manual override takes precedence for video ID if set
  const adminVideoId = (stream?.youtubeVideoId as string) || null
  const adminIsLive = Boolean(stream?.isLive)

  // isLive = YouTube detected live OR admin toggled it on
  const isLive = Boolean(ytLive) || adminIsLive
  // videoId = YouTube detected ID, or admin-set ID as fallback
  const videoId = ytLive?.videoId || adminVideoId || null
  const streamTitle =
    ytLive?.title || (stream?.streamTitle as string) || 'Sunday Worship — Live Now'
  const nextDate = (stream?.nextServiceDate as string) || null
  const nextTitle = (stream?.nextServiceTitle as string) || 'Sunday Worship'
  const preMessage = stream?.preServiceMessage ?? null

  return (
    <>
      {/* ── PAGE HERO ─────────────────────────────────────────────────────── */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Online
          </p>
          {isLive ? (
            <>
              <p className="eyebrow eyebrow-light">
                <span className="live-dot" aria-hidden="true" /> Live right now
              </p>
              <h1>{streamTitle}</h1>
              <p className="page-lead">
                We&apos;re streaming right now — find a comfortable spot and join us.
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow eyebrow-light">Watch online</p>
              <h1>
                Same family,<br />wherever you are.
              </h1>
              <p className="page-lead">
                Join us live on Sunday mornings or catch up on any message on demand — from anywhere
                in the world.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── LIVE STATE ────────────────────────────────────────────────────── */}
      {isLive && videoId && (
        <section className="section watch">
          <div className="container watch-inner reveal">
            <div className="watch-copy">
              <p className="eyebrow eyebrow-light">
                <span className="live-dot" aria-hidden="true" /> You&apos;re just in time
              </p>
              <h2 className="section-title">{streamTitle}</h2>
              <p>We&apos;re live right now. You&apos;re welcome here just as you are.</p>
              <div className="watch-actions">
                <a
                  className="btn btn-primary btn-lg"
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open on YouTube
                </a>
                <a
                  className="btn btn-outline-light btn-lg"
                  href="https://www.facebook.com/hifvietnam"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch on Facebook
                </a>
              </div>
            </div>
            <div className="watch-media">
              <YTEmbed videoId={videoId} title={streamTitle} />
            </div>
          </div>
        </section>
      )}

      {/* ── NOT-LIVE STATE ────────────────────────────────────────────────── */}
      {!isLive && (
        <section className="section watch">
          <div className="container">
            {/* Countdown or static service time */}
            <div className="online-next reveal">
              <div className="online-next-label">
                <p className="eyebrow eyebrow-light">Next service</p>
                <h2 className="section-title">{nextTitle}</h2>
                {!nextDate && (
                  <p style={{ color: 'rgba(255,255,255,.75)', marginTop: '12px' }}>
                    Sundays at 9 AM &amp; 11 AM · Detech Tower, Hanoi
                  </p>
                )}
              </div>
              {nextDate ? (
                <CountdownTimer targetDate={nextDate} />
              ) : (
                <div className="online-platform-group">
                  <a
                    className="btn btn-primary btn-lg"
                    href="https://www.youtube.com/@HIFVietnam"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Subscribe on YouTube
                  </a>
                </div>
              )}
            </div>

            {/* Waiting room / welcome message from admin */}
            {preMessage && (
              <div className="online-message reveal">
                <RichText data={preMessage} enableProse enableGutter={false} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── WHERE TO WATCH ────────────────────────────────────────────────── */}
      <section className={isLive ? 'section about' : 'section about'} style={{ paddingTop: isLive ? undefined : 0 }}>
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Ways to watch</p>
            <h2 className="section-title">
              {isLive ? 'More ways to join us.' : 'Join us on Sundays.'}
            </h2>
          </div>
          <div className="online-watch-links">
            <a
              className="online-platform"
              href="https://www.youtube.com/@HIFVietnam"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="online-platform-icon" aria-hidden="true">▶</span>
              <span className="online-platform-label">YouTube</span>
              <span className="online-platform-sub">Subscribe to never miss a service</span>
            </a>
            <a
              className="online-platform"
              href="https://www.facebook.com/hifvietnam"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="online-platform-icon" aria-hidden="true">f</span>
              <span className="online-platform-label">Facebook</span>
              <span className="online-platform-sub">Live services + weekly updates</span>
            </a>
            <Link className="online-platform" href="/sermons">
              <span className="online-platform-icon" aria-hidden="true">🎙</span>
              <span className="online-platform-label">Sermon library</span>
              <span className="online-platform-sub">Every message, on demand</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHAT TO EXPECT ────────────────────────────────────────────────── */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">What to expect</p>
            <h2 className="section-title">A Sunday online with HIF.</h2>
            <p className="section-intro">
              Whether it&apos;s your first time or your hundredth, here&apos;s what you&apos;ll
              find when you join us.
            </p>
          </div>
          <div className="min-grid">
            <article className="min-card">
              <span className="min-bar bar-red"></span>
              <h3>Worship together</h3>
              <p>Songs to open your heart and focus your mind — modern worship rooted in Scripture.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-purple"></span>
              <h3>A practical message</h3>
              <p>
                Teaching straight from the Bible that connects to real life — clear enough for
                newcomers, deep enough for longtime followers.
              </p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-blue"></span>
              <h3>A warm welcome</h3>
              <p>
                We know watching from home can feel distant. The HIF family is genuinely glad
                you&apos;re here.
              </p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-green"></span>
              <h3>About 75 minutes</h3>
              <p>
                Our Sunday service runs around an hour and fifteen minutes — just long enough to
                be worth it, not so long you lose the kids.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── NEXT STEP ─────────────────────────────────────────────────────── */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Better together, in person.</h2>
          <p>
            Online is a great start — but there&apos;s nothing like gathering with the family. Come
            join us this Sunday.
          </p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">
              Plan a visit
            </Link>
            <a
              className="btn btn-outline-light btn-lg"
              href="https://www.youtube.com/@HIFVietnam"
              target="_blank"
              rel="noopener noreferrer"
            >
              Keep watching
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
