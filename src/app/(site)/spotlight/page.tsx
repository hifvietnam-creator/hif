import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Spotlight English Clubs — Hanoi International Fellowship",
  description:
    "Spotlight English Clubs at HIF Hanoi — a free, friendly midweek English club. Practice your English, make friends, and connect with the community. Mondays & Wednesdays, 6:30pm.",
  openGraph: {
    title: "Spotlight English Clubs — Hanoi International Fellowship",
    description: "Practice English, make friends, and connect — free, every Monday & Wednesday at 6:30pm.",
    type: "website",
  },
};

export default function SpotlightPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb"><Link href="/">Home</Link> · <Link href="/ministries">Ministries</Link> · Spotlight English Clubs</p>
          <p className="eyebrow eyebrow-light">Spotlight English Clubs · everyone welcome</p>
          <h1>Practice English.<br />Make friends.</h1>
          <p className="page-lead">
            Spotlight English Clubs are a free, friendly way to practice your English, meet people from
            around the world, and feel at home in Hanoi — no church background needed, just come as you are.
          </p>
        </div>
      </section>

      {/* INTRO */}
      <section className="section">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">What it is</p>
            <h2 className="section-title">Real conversation, real friendships.</h2>
            <p>
              Twice a week we gather to talk, laugh, and practice English together. Whatever your level,
              you&apos;ll find a relaxed, encouraging space with friendly conversation partners — many of them
              fluent or native English speakers — and plenty of new friends from many nations.
            </p>
            <p>
              It&apos;s one of the easiest ways to step into the HIF community. Come once, come every week —
              there&apos;s no pressure and no cost, just a warm welcome.
            </p>
            <Link className="link-arrow" href="/locations">Find our Hanoi location <span aria-hidden="true">→</span></Link>
          </div>
          <div className="about-media reveal">
            <Image className="about-img" src="/assets/img/spotlight.jpg" alt="People talking and laughing together at a Spotlight English Club at HIF" width={600} height={450} loading="lazy" />
          </div>
        </div>
      </section>

      {/* DETAILS */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">The details</p>
            <h2 className="section-title">When &amp; where to join us.</h2>
            <p className="section-intro">We meet at our Hanoi (Detech) location — everyone is welcome, every time.</p>
          </div>
          <div className="min-grid">
            <article className="min-card"><span className="min-bar bar-red"></span><h3>When</h3><p>Every <strong>Monday &amp; Wednesday</strong>, <strong>6:30pm</strong>.</p></article>
            <article className="min-card"><span className="min-bar bar-purple"></span><h3>Where</h3><p>HIF Hanoi — Detech Building, 8 Tôn Thất Thuyết, Cầu Giấy.</p></article>
            <article className="min-card"><span className="min-bar bar-green"></span><h3>Cost</h3><p>Completely <strong>free</strong>. Just bring yourself and a friend if you like.</p></article>
            <article className="min-card"><span className="min-bar bar-blue"></span><h3>Who it&apos;s for</h3><p>Anyone who wants to practice English and make friends — all levels, all nations.</p></article>
          </div>
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="section">
        <div className="container visit-grid">
          <div className="visit-copy reveal">
            <p className="eyebrow">What to expect</p>
            <h2 className="section-title">Your first evening.</h2>
            <p className="section-intro">Nervous about coming alone? Don&apos;t be — here&apos;s what a typical club looks like:</p>
            <ul className="ticks">
              <li>A warm welcome and a friendly face to introduce you around.</li>
              <li>Easy conversation in small groups, guided by a theme or fun activity.</li>
              <li>Conversation partners at every level — beginners are very welcome.</li>
              <li>People from many nations, all glad you came.</li>
              <li>No cost, no pressure, and no need to sign up in advance.</li>
            </ul>
            <div className="visit-actions">
              <a className="btn btn-primary" href="mailto:admin@hif.vn?subject=Spotlight%20English%20Clubs">Get in touch</a>
              <Link className="btn btn-ghost" href="/locations">See the location</Link>
            </div>
          </div>
          <div className="about-media reveal">
            <Image className="about-img" src="/assets/img/group.jpg" alt="A diverse group of friends together at HIF" width={600} height={450} loading="lazy" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Come this week.</h2>
          <p>Monday or Wednesday at 6:30pm — bring a friend and practice English with people from across the world.</p>
          <div className="final-actions">
            <a className="btn btn-primary btn-lg" href="mailto:admin@hif.vn?subject=Spotlight%20English%20Clubs">Ask us anything</a>
            <Link className="btn btn-outline-light btn-lg" href="/plan-visit">Plan a Sunday visit too</Link>
          </div>
        </div>
      </section>
    </>
  );
}
