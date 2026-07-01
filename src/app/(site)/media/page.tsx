import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import configPromise from "@payload-config";
import { getPayload } from "payload";

export const revalidate = 600;

function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

function YTEmbed({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div className="video-embed">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

export const metadata: Metadata = {
  title: "Watch & Listen — Hanoi International Fellowship",
  description:
    "Watch HIF services, messages, and testimonies online — live or on demand. Catch up on recent teaching from anywhere in the world.",
  openGraph: {
    title: "Watch & Listen — Hanoi International Fellowship",
    description: "Worship and grow with HIF online — services, messages, and testimonies on demand.",
    type: "website",
  },
};

export default async function MediaPage() {
  const payload = await getPayload({ config: configPromise });

  const [sermonsRes, highlights] = await Promise.all([
    payload.find({
      collection: "sermons",
      where: { _status: { equals: "published" } },
      sort: "-date",
      depth: 2,
      limit: 3,
      overrideAccess: false,
    }),
    payload.findGlobal({ slug: "media-highlights" }).catch(() => null),
  ]);

  const latestSermons = sermonsRes.docs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = highlights as any;

  const latestSermon = latestSermons[0] ?? null;
  const latestSermonVideoId = latestSermon ? extractYouTubeId(latestSermon.youtubeURL as string) : null;

  const announcementVideoId = h?.announcement?.videoId || null;
  const announcementTitle = h?.announcement?.title || "Latest Announcement";
  const testimonyVideoId = h?.testimony?.videoId || null;
  const testimonyTitle = h?.testimony?.title || "Latest Testimony";
  const worshipVideoId = h?.worship?.videoId || null;
  const worshipTitle = h?.worship?.title || "Worship & Praise";

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb"><Link href="/">Home</Link> · Watch &amp; Listen</p>
          <p className="eyebrow eyebrow-light">Watch &amp; Listen</p>
          <h1>Catch up,<br />anytime.</h1>
          <p className="page-lead">
            Can&apos;t make it in person? Worship with us online — watch services, messages, and testimonies
            live or on demand, from anywhere in the world.
          </p>
          <div className="final-actions" style={{ justifyContent: "flex-start", marginTop: "30px" }}>
            <a className="btn btn-primary btn-lg" href="https://www.youtube.com/@HIFVietnam" target="_blank" rel="noopener noreferrer">All videos on YouTube</a>
            <a className="btn btn-outline-light btn-lg" href="#recent">Recent messages</a>
          </div>
        </div>
      </section>

      {/* LATEST SERMON — featured embed */}
      <section className="section watch">
        <div className="container watch-inner reveal">
          <div className="watch-copy">
            <p className="eyebrow eyebrow-light">Latest message</p>
            <h2 className="section-title">
              {latestSermon ? (latestSermon.title as string) : "Press play."}
            </h2>
            {latestSermon?.description && (
              <p>{latestSermon.description as string}</p>
            )}
            {!latestSermon && (
              <p>Start here with a recent message or testimony, then explore the full library on YouTube.</p>
            )}
            <div className="watch-actions">
              {latestSermon ? (
                <Link className="btn btn-primary btn-lg" href={`/sermons/${latestSermon.slug}`}>Notes &amp; discussion</Link>
              ) : (
                <a className="btn btn-primary btn-lg" href="https://www.youtube.com/@HIFVietnam" target="_blank" rel="noopener noreferrer">YouTube</a>
              )}
              <Link className="btn btn-outline-light btn-lg" href="/sermons">All sermons</Link>
            </div>
          </div>
          <div className="watch-media">
            {latestSermonVideoId ? (
              <YTEmbed videoId={latestSermonVideoId} title={latestSermon?.title as string ?? "Latest sermon"} />
            ) : (
              <div className="video-embed">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/jtWD5zO7k2Q"
                  title="Latest from HIF"
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* RECENT MESSAGES GRID */}
      <section className="section" id="recent">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">On demand</p>
            <h2 className="section-title">Recent messages.</h2>
            <p className="section-intro">Browse the full library for notes, discussion questions, and more.</p>
          </div>
          {latestSermons.length > 0 ? (
            <div className="msg-grid">
              {latestSermons.map((sermon) => {
                const videoId = extractYouTubeId(sermon.youtubeURL as string | null);
                const thumbnailUrl =
                  sermon.thumbnail && typeof sermon.thumbnail === "object" && "url" in sermon.thumbnail
                    ? (sermon.thumbnail.url as string)
                    : videoId
                      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                      : "/assets/img/sermon1.jpg";
                const speakerName =
                  sermon.speaker && typeof sermon.speaker === "object"
                    ? (sermon.speaker as { name?: string }).name
                    : null;
                return (
                  <Link key={String(sermon.id)} className="msg" href={`/sermons/${sermon.slug}`}>
                    <span className="msg-thumb">
                      <Image
                        src={thumbnailUrl ?? "/assets/img/sermon1.jpg"}
                        alt={`Thumbnail for ${sermon.title}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                      {videoId && <span className="msg-play" aria-hidden="true" />}
                    </span>
                    <span className="msg-title">{sermon.title as string}</span>
                    {speakerName && <span className="msg-speaker">{speakerName}</span>}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="msg-grid">
              <a className="msg" href="https://www.youtube.com/watch?v=jtWD5zO7k2Q" target="_blank" rel="noopener noreferrer">
                <span className="msg-thumb"><img src="/assets/img/yt1.jpg" alt="" loading="lazy" /><span className="msg-play" aria-hidden="true"></span></span>
                <span className="msg-title">Ha&apos;s Baptism Testimony</span>
              </a>
              <a className="msg" href="https://www.youtube.com/watch?v=j6MGVTVM1VY" target="_blank" rel="noopener noreferrer">
                <span className="msg-thumb"><img src="/assets/img/yt2.jpg" alt="" loading="lazy" /><span className="msg-play" aria-hidden="true"></span></span>
                <span className="msg-title">Prayer Workshop</span>
              </a>
              <a className="msg" href="https://www.youtube.com/watch?v=bHAKNOkK01s" target="_blank" rel="noopener noreferrer">
                <span className="msg-thumb"><img src="/assets/img/yt3.jpg" alt="" loading="lazy" /><span className="msg-play" aria-hidden="true"></span></span>
                <span className="msg-title">May 31st Celebration</span>
              </a>
            </div>
          )}
          <p className="journey-foot reveal">
            Want notes and discussion questions?{" "}
            <Link href="/sermons">Browse all sermons →</Link>
          </p>
        </div>
      </section>

      {/* LATEST ANNOUNCEMENT */}
      {announcementVideoId && (
        <section className="section about">
          <div className="container watch-inner reveal">
            <div className="watch-media">
              <YTEmbed videoId={announcementVideoId} title={announcementTitle} />
            </div>
            <div className="watch-copy">
              <p className="eyebrow">What&apos;s happening</p>
              <h2 className="section-title">This week at HIF.</h2>
              <p>Upcoming events, news, and ways to get involved — straight from the HIF team.</p>
              <div className="watch-actions">
                <a
                  className="btn btn-primary btn-lg"
                  href="https://hifvn.churchcenter.com/calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Full calendar
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LATEST TESTIMONY */}
      {testimonyVideoId && (
        <section className="section">
          <div className="container watch-inner reveal">
            <div className="watch-copy">
              <p className="eyebrow eyebrow-light">Changed lives</p>
              <h2 className="section-title">Real stories.</h2>
              <p>
                Faith isn&apos;t just ideas — it changes people. Hear from someone whose life looks different
                because of Jesus.
              </p>
              <div className="watch-actions">
                <a
                  className="btn btn-primary btn-lg"
                  href={`https://www.youtube.com/playlist?list=PL7A2w2jsUkUl4FHTOdR1u3Gtz6y7bC_BE`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  More testimonies
                </a>
              </div>
            </div>
            <div className="watch-media">
              <YTEmbed videoId={testimonyVideoId} title={testimonyTitle} />
            </div>
          </div>
        </section>
      )}

      {/* WORSHIP — only shown once worship playlist is configured */}
      {worshipVideoId && (
        <section className="section about">
          <div className="container watch-inner reveal">
            <div className="watch-media">
              <YTEmbed videoId={worshipVideoId} title={worshipTitle} />
            </div>
            <div className="watch-copy">
              <p className="eyebrow">Worship &amp; praise</p>
              <h2 className="section-title">Sing along.</h2>
              <p>Worship from our Sunday services — songs to carry you through the week.</p>
            </div>
          </div>
        </section>
      )}

      {/* WAYS TO WATCH */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Ways to watch &amp; listen</p>
            <h2 className="section-title">Wherever you are.</h2>
          </div>
          <div className="give-ways">
            <article className="give-way">
              <span className="min-bar bar-red"></span>
              <h3>YouTube</h3>
              <p>Our full library of services, messages, and testimonies — subscribe to never miss one.</p>
              <p><a className="link-arrow" href="https://www.youtube.com/@HIFVietnam" target="_blank" rel="noopener noreferrer">@HIFVietnam <span aria-hidden="true">→</span></a></p>
            </article>
            <article className="give-way">
              <span className="min-bar bar-blue"></span>
              <h3>Facebook</h3>
              <p>Catch services live and follow the latest from our church family through the week.</p>
              <p><a className="link-arrow" href="https://www.facebook.com/hifvietnam" target="_blank" rel="noopener noreferrer">facebook.com/hifvietnam <span aria-hidden="true">→</span></a></p>
            </article>
            <article className="give-way">
              <span className="min-bar bar-green"></span>
              <h3>Right Now Media</h3>
              <p>HIF members get free access to a huge library of video Bible studies for all ages. Ask us for your invite.</p>
              <p><a className="link-arrow" href="mailto:admin@hif.vn?subject=Right%20Now%20Media%20access">Request access <span aria-hidden="true">→</span></a></p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Better together, in person.</h2>
          <p>Online is a great start — but there&apos;s nothing like gathering with the family. Come join us this Sunday.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">Plan a visit</Link>
            <a className="btn btn-outline-light btn-lg" href="https://www.youtube.com/@HIFVietnam" target="_blank" rel="noopener noreferrer">Keep watching</a>
          </div>
        </div>
      </section>
    </>
  );
}
