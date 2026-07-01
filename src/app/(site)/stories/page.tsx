import type { Metadata } from "next";
import Link from "next/link";
import configPromise from "@payload-config";
import { getPayload } from "payload";

export const revalidate = 3600;

// Static fallback stories shown before any testimonies are added to the CMS
const STATIC_STORIES = [
  {
    quote: "Shaking and in tears, I surrendered everything to Jesus. Almost instantly, His love reigned in my heart — turning my anger and bitterness into peace, love, and compassion.",
    name: "Daniella",
    background: "South Africa",
  },
  {
    quote: "During Covid I started a TikTok channel to share the good news. The first person I connected with became a Christian after two months. Later, ten of my online friends were baptized at HIF.",
    name: "Tien",
    background: "Vietnam",
  },
  {
    quote: "They welcomed me like one of their own — treated me like a brother, even helped me improve my English. But most importantly, they pointed me to Christ.",
    name: "Jean Samuel",
    background: "Haiti",
  },
];

export const metadata: Metadata = {
  title: "Stories — Hanoi International Fellowship",
  description:
    "Real lives, real change. Stories of how God is at work in our HIF family — from many nations, in Hanoi and beyond.",
  openGraph: {
    title: "Stories — Hanoi International Fellowship",
    description: "Real lives, real change — stories from our HIF family.",
    type: "website",
  },
};

export default async function StoriesPage() {
  const payload = await getPayload({ config: configPromise });

  // Written testimonies for the quote section
  const writtenResult = await payload.find({
    collection: "testimonies",
    where: { featured: { equals: true } },
    sort: "name",
    depth: 0,
    limit: 9,
    overrideAccess: false,
  });
  const writtenTestimonies = writtenResult.docs;

  // Video testimonies — baptism
  const baptismResult = await payload.find({
    collection: "testimonies",
    where: {
      and: [
        { source: { equals: "youtube" } },
        { category: { equals: "baptism" } },
        { videoFeatured: { equals: true } },
      ],
    },
    sort: "-publishedAt",
    depth: 0,
    limit: 12,
    overrideAccess: false,
  });

  // Video testimonies — advent candle
  const adventResult = await payload.find({
    collection: "testimonies",
    where: {
      and: [
        { source: { equals: "youtube" } },
        { category: { equals: "advent-candle" } },
        { videoFeatured: { equals: true } },
      ],
    },
    sort: "-publishedAt",
    depth: 0,
    limit: 12,
    overrideAccess: false,
  });

  const baptismVideos = baptismResult.docs;
  const adventVideos = adventResult.docs;
  const hasVideos = baptismVideos.length > 0 || adventVideos.length > 0;

  // Featured video for the main embed (first baptism video, or fallback)
  const featuredVideo = baptismVideos[0] ?? null;

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb"><Link href="/">Home</Link> · Stories</p>
          <p className="eyebrow eyebrow-light">Stories · real lives, real change</p>
          <h1>Stories from<br />our family.</h1>
          <p className="page-lead">
            Behind every face on a Sunday is a story. Here are just a few of the ways God has been at work
            in our HIF family — from many nations, in Hanoi and beyond.
          </p>
        </div>
      </section>

      {/* STORY GRID — written quotes */}
      <section className="section stories">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow eyebrow-light">In their own words</p>
            <h2 className="section-title">Changed by Jesus, together.</h2>
          </div>
          <div className="story-grid">
            {(writtenTestimonies.length > 0 ? writtenTestimonies : STATIC_STORIES).map((t, i) => (
              <figure key={i} className="story reveal">
                <blockquote>&ldquo;{t.quote as string}&rdquo;</blockquote>
                <figcaption>
                  <span className="story-name">{t.name as string}</span>
                  {"background" in t && t.background && (
                    <span className="story-meta">{t.background as string}</span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* WATCH STORIES — video section */}
      <section className="section watch" id="watch">
        <div className="container watch-inner reveal">
          <div className="watch-copy">
            <p className="eyebrow eyebrow-light">See &amp; hear them</p>
            <h2 className="section-title">Watch their stories.</h2>
            <p>Baptism testimonies, Advent candle lightings, and more — straight from our HIF family.</p>
            <div className="watch-actions">
              <a className="btn btn-primary btn-lg" href="https://www.youtube.com/@HIFVietnam" target="_blank" rel="noopener noreferrer">More on YouTube</a>
              <a className="btn btn-outline-light btn-lg" href="https://www.facebook.com/hifvietnam" target="_blank" rel="noopener noreferrer">Follow on Facebook</a>
            </div>
          </div>
          <div className="watch-media">
            <div className="video-embed">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${featuredVideo ? (featuredVideo.youtubeId as string) : "jtWD5zO7k2Q"}`}
                title={featuredVideo ? (featuredVideo.name as string) : "HIF Baptism Testimony"}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>

        {/* BAPTISM TESTIMONIES */}
        {baptismVideos.length > 0 && (
          <div className="container" style={{ marginTop: "clamp(40px, 6vw, 64px)" }}>
            <h3 className="recent-title">Baptism Testimonies</h3>
            <div className="testimony-grid">
              {baptismVideos.map((v) => {
                const ytId = v.youtubeId as string;
                return (
                  <a
                    key={String(v.id)}
                    className="testimony-card"
                    href={`https://www.youtube.com/watch?v=${ytId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="testimony-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                        alt={v.name as string}
                        loading="lazy"
                      />
                      <span className="testimony-play" aria-hidden="true">▶</span>
                    </div>
                    <span className="testimony-title">{v.name as string}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* ADVENT CANDLE LIGHTINGS */}
        {adventVideos.length > 0 && (
          <div className="container" style={{ marginTop: "clamp(40px, 6vw, 64px)" }}>
            <h3 className="recent-title">Advent Candle Lighting</h3>
            <div className="testimony-grid">
              {adventVideos.map((v) => {
                const ytId = v.youtubeId as string;
                return (
                  <a
                    key={String(v.id)}
                    className="testimony-card"
                    href={`https://www.youtube.com/watch?v=${ytId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="testimony-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                        alt={v.name as string}
                        loading="lazy"
                      />
                      <span className="testimony-play" aria-hidden="true">▶</span>
                    </div>
                    <span className="testimony-title">{v.name as string}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Fallback if no videos synced yet */}
        {!hasVideos && (
          <div className="container recent-msgs reveal">
            <h3 className="recent-title">More on our channel</h3>
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
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>What&apos;s your story?</h2>
          <p>God may be writing a new chapter in your life right now. We&apos;d love to hear it — or to help you start one.</p>
          <div className="final-actions">
            <a className="btn btn-primary btn-lg" href="mailto:admin@hif.vn?subject=My%20HIF%20story">Share your story</a>
            <Link className="btn btn-outline-light btn-lg" href="/plan-visit">Plan a visit</Link>
          </div>
        </div>
      </section>
    </>
  );
}
