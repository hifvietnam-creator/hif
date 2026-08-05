import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resources & Practical Help — Hanoi International Fellowship",
  description:
    "Helpful resources for the HIF family — Right Now Media, discipleship studies, our wider church network, international churches across Vietnam, and practical help for living in Hanoi.",
  openGraph: {
    title: "Resources & Practical Help — Hanoi International Fellowship",
    description: "Grow your faith, find your church family, and get practical help for life in Hanoi.",
    type: "website",
  },
};

export default function ResourcesPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb"><Link href="/">Home</Link> · Resources</p>
          <p className="eyebrow eyebrow-light">Resources &amp; practical help</p>
          <h1>Resources for<br />the journey.</h1>
          <p className="page-lead">
            A few things to help you grow in faith, find your church family wherever you are, and settle into
            life in Hanoi.
          </p>
        </div>
      </section>

      {/* GROW YOUR FAITH */}
      {/* <section className="section" id="grow">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Grow your faith</p>
            <h2 className="section-title">Keep growing, all week.</h2>
            <p className="section-intro">Free, trustworthy studies and tools to help you follow Jesus between Sundays.</p>
          </div>
          <div className="min-grid">
            <a className="min-card" href="https://www.rightnowmedia.org/Account/Invite/hif" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-green"></span><h3>Right Now Media ↗</h3><p>HIF&apos;s free video library — thousands of Bible-focused studies for adults, kids, and families. Register with our church invite.</p></a>
            <a className="min-card" href="http://multiplymovement.com" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-green"></span><h3>Multiply ↗</h3><p>Francis Chan &amp; David Platt&apos;s free disciple-making resource — great for one-to-one or small groups.</p></a>
            <a className="min-card" href="https://www.bible.com/reading-plans/" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-green"></span><h3>Bible reading plans ↗</h3><p>Simple guided plans to build a daily rhythm in Scripture (YouVersion).</p></a>
            <a className="min-card" href="https://replicate.org/" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-green"></span><h3>Replicate ↗</h3><p>Discipleship reading plans and tools for going deeper and helping others grow.</p></a>
            <a className="min-card" href="https://www.churchoftheopendoor.com" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-green"></span><h3>Growing in Grace ↗</h3><p>A foundational study for new and growing believers.</p></a>
            <article className="min-card"><span className="min-bar bar-green"></span><h3>Design for Discipleship</h3><p>The Navigators&apos; classic study series — ask our team how to get started with a group.</p></article>
          </div>
        </div>
      </section> */}

      {/* WIDER CHURCH FAMILY */}
      <section className="section about" id="family">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Our wider church family</p>
            <h2 className="section-title">You&apos;re part of something bigger.</h2>
            <p className="section-intro">HIF belongs to a global network — and there&apos;s a church family for you in cities across Vietnam.</p>
          </div>
          <div className="min-grid">
            <a className="min-card" href="https://micn.org/" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-purple"></span><h3>International Church Worldwide — MICN ↗</h3><p>We&apos;re a flagship of the Missional International Church Network, connecting international churches worldwide with resources, conferences, and pastoral care.</p></a>
            <article className="min-card"><span className="min-bar bar-purple"></span><h3>International churches in Vietnam</h3><p>Moving cities? <strong>Ho Chi Minh City:</strong> TTIS, The Well, The River ICA, IGA, ICF, Immanuel Fellowship. <strong>Da Nang:</strong> <a href="https://www.difvn.org" target="_blank" rel="noopener noreferrer">Danang International Fellowship ↗</a>. Ask us and we&apos;ll help you connect.</p></article>
          </div>
        </div>
      </section>

      {/* PRACTICAL HELP */}
      <section className="section" id="help">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">New to Hanoi?</p>
            <h2 className="section-title">Practical help &amp; emergencies.</h2>
            <p className="section-intro">A few trusted contacts for living far from home. In a life-threatening emergency, call <strong>115</strong> (ambulance) or <strong>113</strong> (police) first.</p>
          </div>
          <div className="min-grid">
            <a className="min-card" href="https://www.vietnammedicalpractice.com" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-red"></span><h3>Family Medical Practice ↗</h3><p>International medical care in Hanoi.<br />+84 24 3843 0748</p></a>
            <a className="min-card" href="https://www.drkimsclinic.org" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-red"></span><h3>Kim&apos;s Clinic ↗</h3><p>Trusted local clinic.<br />+84 24 6128 1041</p></a>
            <a className="min-card" href="https://www.crosspoint.vn" target="_blank" rel="noopener noreferrer"><span className="min-bar bar-red"></span><h3>Crosspoint Counseling ↗</h3><p>Professional, faith-sensitive counseling.<br />+84 24 375 8681</p></a>
          </div>
          <div className="howto-note" style={{ marginTop: "24px" }}>
            <p style={{ color: "var(--ink-2)", lineHeight: 1.6 }}>
              <strong>When to reach out to our team:</strong> an accident, illness, a birth, a death in the family,
              a personal or financial crisis, a move, marriage planning, or simply when you need prayer — we&apos;re here.
              Email <a href="mailto:admin@hif.vn">admin@hif.vn</a>, call <a href="tel:+842432006666">+84 24 3200 6666</a>,
              or <Link href="/contact">get in touch</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Can&apos;t find what you need?</h2>
          <p>Ask us — a real person on our team is glad to help point you in the right direction.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/contact">Contact us</Link>
            <Link className="btn btn-outline-light btn-lg" href="/plan-visit">Plan a visit</Link>
          </div>
        </div>
      </section>
    </>
  );
}
