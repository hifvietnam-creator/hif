import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Next Steps — Hanoi International Fellowship",
  description:
    "Wherever you are on the journey, there's a next step — from your first visit to baptism and membership. Here's how to take yours at HIF.",
  openGraph: {
    title: "Next Steps — Hanoi International Fellowship",
    description: "Take your next step — visit, explore, belong, be baptized, become a member, serve.",
    type: "website",
  },
};

export default function NextStepsPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb"><Link href="/">Home</Link> · <Link href="/about">About</Link> · Next Steps</p>
          <p className="eyebrow eyebrow-light">Next Steps</p>
          <h1>Take your<br />next step.</h1>
          <p className="page-lead">
            Following Jesus is a journey, not a single leap. Wherever you are, there&apos;s one next step
            in front of you — and people ready to take it with you. Here&apos;s how to take yours.
          </p>
        </div>
      </section>

      {/* STEP CARDS */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Find your next step</p>
            <h2 className="section-title">One step at a time.</h2>
            <p className="section-intro">These follow our HIF Journey — Try → Join → Grow → Serve → Go. Start wherever you are.</p>
          </div>
          <div className="min-grid">
            <Link className="min-card" href="/plan-visit"><span className="min-bar bar-red"></span><h3>Visit HIF</h3><p>New here? Come and see. Plan your first visit and we&apos;ll help you feel at home.</p></Link>
            <Link className="min-card" href="/alpha"><span className="min-bar bar-red"></span><h3>Explore faith — Alpha</h3><p>Curious or have questions? Explore the big questions of life and faith, no pressure.</p></Link>
            <Link className="min-card" href="/connect"><span className="min-bar bar-purple"></span><h3>Join a Connect Group</h3><p>Move from the crowd into community — share life with people through the week.</p></Link>
            <a className="min-card" href="#baptism"><span className="min-bar bar-green"></span><h3>Get baptized</h3><p>Put your faith in Jesus? Take the next step of obedience and celebrate it with your family.</p></a>
            <a className="min-card" href="#membership"><span className="min-bar bar-purple"></span><h3>Become a member</h3><p>Ready to call HIF home? Make it official and belong to the family.</p></a>
            <Link className="min-card" href="/ministries#serve"><span className="min-bar bar-blue"></span><h3>Serve &amp; go</h3><p>Use your gifts on a team, bless the city with CityPartners, and join the mission.</p></Link>
          </div>
        </div>
      </section>

      {/* BAPTISM */}
      <section className="section about" id="baptism">
        <div className="container about-grid">
          <div className="about-media reveal">
            <Image className="about-img" src="/assets/img/baptism.jpg" alt="A baptism at HIF" width={600} height={450} loading="lazy" />
          </div>
          <div className="about-copy reveal">
            <p className="eyebrow">Baptism</p>
            <h2 className="section-title">Go public with your faith.</h2>
            <p>
              If you&apos;ve put your faith in Jesus, baptism is your next step — a step of obedience to His
              command, and a testimony of your new life to God, the church, and the world (Matthew 28:18-20).
            </p>
            <p>
              Baptism doesn&apos;t save us — we&apos;re saved by grace through faith — but it&apos;s a beautiful, visible
              picture of being united with Jesus in His death and resurrection (Romans 6), and of belonging
              to His family from every nation. As your church family in Hanoi, we&apos;d love to celebrate this
              step with you. Sign up and an elder or pastor will be in touch about the next baptism class.
            </p>
            <div className="visit-actions">
              <a className="btn btn-primary" href="https://hifvn.churchcenter.com/people/forms/86472" target="_blank" rel="noopener noreferrer">Sign up for baptism</a>
              <Link className="btn btn-ghost" href="/alpha">Still exploring? Try Alpha</Link>
            </div>
          </div>
        </div>
      </section>

      {/* MEMBERSHIP */}
      <section className="section" id="membership">
        <div className="container visit-grid">
          <div className="visit-copy reveal">
            <p className="eyebrow">Membership</p>
            <h2 className="section-title">Make HIF your home.</h2>
            <p>
              HIF can be your spiritual family too — a &ldquo;home away from home,&rdquo; especially far from your
              passport country. If you expect to be in Hanoi for more than a year, we&apos;d love you to join
              the HIF family of faith. (Becoming a member doesn&apos;t require you to give up membership at a
              home church elsewhere.)
            </p>
            <p>To become a member you&apos;ll need to agree with HIF&apos;s Statement of Faith, follow the HIF Constitution, be an active participant, and be at least 18. The Elders Team reviews and approves each request.</p>
            <div className="visit-actions">
              <a className="btn btn-primary" href="https://hifvn.churchcenter.com/people/forms/75808" target="_blank" rel="noopener noreferrer">Membership form</a>
              <a className="btn btn-ghost" href="https://www.hif.vn/wp-content/uploads/2020/04/HIF_Constitution_2019.pdf" target="_blank" rel="noopener noreferrer">Read the Constitution</a>
            </div>
          </div>
          <div className="visit-times reveal">
            <h3 className="times-title">How to join</h3>
            <div className="time-card">
              <div className="time-loc"><span className="dot dot-red"></span>Three simple steps</div>
              <ul>
                <li><strong>1.</strong> <span>Read the HIF Constitution (incl. our Statement of Faith)</span></li>
                <li><strong>2.</strong> <span>Fill out the <a href="https://hifvn.churchcenter.com/people/forms/65509" target="_blank" rel="noopener noreferrer">HIF People form</a></span></li>
                <li><strong>3.</strong> <span>Complete the <a href="https://hifvn.churchcenter.com/people/forms/75808" target="_blank" rel="noopener noreferrer">Membership form</a></span></li>
              </ul>
            </div>
            <p className="time-note">Once approved by the Elders, the HIF office will be in touch to affirm your membership. Questions? <a href="mailto:admin@hif.vn?subject=HIF%20Membership">Email us →</a></p>
          </div>
        </div>
      </section>

      {/* PURPOSE QUOTE */}
      <section className="section about">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div className="kaleido-bg" aria-hidden="true" />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">Why we exist</p>
              <p className="kaleido-quote-text">To glorify God among the nations.</p>
              <p className="kaleido-quote-sub">Through Christ-centered worship, genuine relationships, and transformational outreach — in Hanoi and beyond.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Not sure which step is yours?</h2>
          <p>That&apos;s completely normal — and we&apos;re glad to help you figure it out. Reach out and let&apos;s talk.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">Plan a visit</Link>
            <a className="btn btn-outline-light btn-lg" href="mailto:admin@hif.vn?subject=My%20next%20step%20at%20HIF">Talk to someone</a>
          </div>
        </div>
      </section>
    </>
  );
}
