import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "News & Updates — Hanoi International Fellowship",
  description:
    "The latest from the HIF family — recent highlights and updates. Subscribe to our weekly HIF Bulletin to stay in the loop.",
  openGraph: {
    title: "News & Updates — Hanoi International Fellowship",
    description: "Recent highlights from HIF — and how to get the weekly Bulletin.",
    type: "website",
  },
};

export default function NewsPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb"><Link href="/">Home</Link> · News &amp; Updates</p>
          <p className="eyebrow eyebrow-light">News &amp; updates</p>
          <h1>Latest from HIF.</h1>
          <p className="page-lead">
            A snapshot of recent life across our church family. For everything as it happens, get our weekly
            Bulletin in your inbox.
          </p>
        </div>
      </section>

      {/* SUBSCRIBE BAND */}
      <section className="section">
        <div className="container">
          <div className="howto-card" style={{ background: "var(--mist)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "clamp(24px,4vw,36px)", textAlign: "center" }}>
            <p className="eyebrow" style={{ justifyContent: "center" }}>Never miss what&apos;s on</p>
            <h2 className="section-title" style={{ marginBottom: "10px" }}>Get the weekly HIF Bulletin.</h2>
            <p className="section-intro" style={{ margin: "0 auto 22px", maxWidth: "52ch" }}>Our short weekly email with what&apos;s coming up, ways to get involved, and news from the HIF family — straight to your inbox.</p>
            <a className="btn btn-primary btn-lg" href="https://hifvn.churchcenter.com/people/forms/373350" target="_blank" rel="noopener noreferrer">Subscribe to the Bulletin</a>
          </div>
        </div>
      </section>

      {/* RECENT HIGHLIGHTS */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Recent highlights</p>
            <h2 className="section-title">What&apos;s been happening.</h2>
          </div>
          <div className="min-grid">
            <article className="min-card"><span className="min-bar bar-red"></span><p className="eyebrow" style={{ marginBottom: "8px" }}>24 May 2026</p><h3>Pray Always: Building a Lifestyle of Prayer</h3><p>A workshop exploring everyday prayer — for those just learning and those wanting to go deeper.</p></article>
            <article className="min-card"><span className="min-bar bar-purple"></span><p className="eyebrow" style={{ marginBottom: "8px" }}>24 May 2026</p><h3>Praise Night Jam</h3><p>An evening of music and worship together as a community.</p></article>
            <article className="min-card"><span className="min-bar bar-green"></span><p className="eyebrow" style={{ marginBottom: "8px" }}>24 May 2026</p><h3>The Breath of God</h3><p>A teaching on the trustworthiness of Scripture, from 2 Timothy 3:16.</p></article>
            <article className="min-card"><span className="min-bar bar-blue"></span><p className="eyebrow" style={{ marginBottom: "8px" }}>13 May 2026</p><h3>Handle with Care</h3><p>A message on serving skilfully and keeping a pure heart in ministry.</p></article>
            <article className="min-card"><span className="min-bar bar-purple"></span><p className="eyebrow" style={{ marginBottom: "8px" }}>8 May 2026</p><h3>Pinoy Fellowship Meets Again!</h3><p>The Filipino community&apos;s last gathering before summer — food, fellowship, and devotion.</p></article>
            <article className="min-card"><span className="min-bar bar-red"></span><p className="eyebrow" style={{ marginBottom: "8px" }}>8 May 2026</p><h3>Running Out of Grit?</h3><p>A message on finding strength in God&apos;s grace rather than our own willpower.</p></article>
          </div>
        </div>
      </section>

      {/* FOLLOW ALONG */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Day to day</p>
            <h2 className="section-title">Follow along online.</h2>
            <p className="section-intro">We post photos, sermons, and updates through the week — come say hello.</p>
          </div>
          <div className="min-grid">
            <a className="min-card" href="https://www.facebook.com/hifvietnam" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-blue"></span><h3>Facebook ↗</h3><p>Photos, event updates, and live services.</p></a>
            <a className="min-card" href="https://www.youtube.com/@HIFVietnam" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-red"></span><h3>YouTube ↗</h3><p>Sermons, testimonies, and worship.</p></a>
            <a className="min-card" href="https://www.instagram.com/hifhanoi/" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-purple"></span><h3>Instagram ↗</h3><p>Moments from life across our congregations.</p></a>
            <Link className="min-card" href="/events"><span className="min-bar bar-green"></span><h3>What&apos;s on</h3><p>See upcoming events and our church calendar.</p></Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Stay in the loop.</h2>
          <p>The weekly Bulletin is the easiest way to know what&apos;s coming up at HIF.</p>
          <div className="final-actions">
            <a className="btn btn-primary btn-lg" href="https://hifvn.churchcenter.com/people/forms/373350" target="_blank" rel="noopener noreferrer">Subscribe to the Bulletin</a>
            <Link className="btn btn-outline-light btn-lg" href="/events">See events</Link>
          </div>
        </div>
      </section>
    </>
  );
}
