import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Alpha — Hanoi International Fellowship",
  description:
    "Alpha is a relaxed, no-pressure space to explore the big questions of life and faith — over food, a short talk, and honest conversation. Everyone's welcome, any background or none.",
  openGraph: {
    title: "Alpha — Hanoi International Fellowship",
    description: "Got questions about life and faith? Explore them at Alpha — no pressure, no judgment.",
    type: "website",
  },
};

export default function AlphaPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Alpha
          </p>
          <p className="eyebrow eyebrow-light">Alpha · explore faith</p>
          <h1>
            Got questions?<br />So do we.
          </h1>
          <p className="page-lead">
            Whatever you believe — or don&apos;t — Alpha is a relaxed, open space to explore the big
            questions of life and faith with people from all kinds of perspectives. No pressure, no judgment.
          </p>
          <div className="final-actions" style={{ justifyContent: "flex-start", marginTop: "30px" }}>
            <a
              className="btn btn-primary btn-lg"
              href="https://alphahanoi.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Find an Alpha group
            </a>
            <a className="btn btn-outline-light btn-lg" href="#how">How it works</a>
          </div>
        </div>
      </section>

      {/* WHAT IS ALPHA */}
      <section className="section">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">What is Alpha?</p>
            <h2 className="section-title">A conversation, not a lecture.</h2>
            <p>
              Alpha is a series of relaxed sessions exploring the basics of the Christian faith. Each one
              looks at a different question — and there&apos;s no such thing as a silly one. It&apos;s a safe, open
              space to share your thoughts, hear others&apos; stories, and connect.
            </p>
            <p>
              You don&apos;t need any background in church or the Bible — and you&apos;re free to say exactly what
              you think. Come with a friend or on your own; everyone&apos;s welcome.
            </p>
            <Link className="link-arrow" href="/ministries#try">
              See where Alpha fits the Journey <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="about-media reveal">
            <Image
              className="about-img"
              src="/assets/img/alpha-talk.jpg"
              alt="Friends in honest conversation at Alpha"
              width={600}
              height={450}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">What to expect</p>
            <h2 className="section-title">Every session, three simple things.</h2>
          </div>
          <div className="min-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <article className="min-card">
              <span className="min-bar bar-red"></span>
              <h3>Food</h3>
              <p>Free food and drink to share and break the ice — because everything&apos;s better around a table.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-green"></span>
              <h3>A short talk</h3>
              <p>A thought-provoking video that opens up a question worth thinking about.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-blue"></span>
              <h3>Conversation</h3>
              <p>Honest small-group conversation where every voice matters — agree, disagree, or just listen.</p>
            </article>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <div className="container visit-grid">
          <div className="visit-copy reveal">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title">Alpha Beyond — close-knit and local.</h2>
            <p className="section-intro">
              Our Alpha groups meet in homes and cafés across Hanoi, so you can explore in a warm,
              intimate setting near you.
            </p>
            <ul className="ticks">
              <li>Register for a small group based on the date, time, and location that suit you.</li>
              <li>Each group meets over a series of weekly sessions.</li>
              <li>Groups run in different languages, including English, Vietnamese, and Korean.</li>
              <li>Each season kicks off with an all-Alpha party — a great place to start.</li>
            </ul>
            <div className="visit-actions">
              <a
                className="btn btn-primary"
                href="https://alphahanoi.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                See current groups
              </a>
              <a
                className="btn btn-ghost"
                href="mailto:admin@hif.vn?subject=Alpha%20enquiry"
              >
                Ask a question
              </a>
            </div>
          </div>
          <div className="visit-times reveal">
            <h3 className="times-title">Good to know</h3>
            <div className="time-card">
              <div className="time-loc"><span className="dot dot-red"></span>Who it&apos;s for</div>
              <ul><li><strong>Anyone</strong> <span>any faith background, or none</span></li></ul>
            </div>
            <div className="time-card">
              <div className="time-loc"><span className="dot dot-green"></span>Where</div>
              <ul><li><strong>Homes &amp; cafés</strong> <span>across Hanoi</span></li></ul>
            </div>
            <p className="time-note">
              New season starting soon —{" "}
              <a href="https://alphahanoi.com" target="_blank" rel="noopener noreferrer">find a group →</a>
            </p>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="section about">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div className="kaleido-bg" aria-hidden="true" />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">No question off-limits</p>
              <p className="kaleido-quote-text">Come with your questions.</p>
              <p className="kaleido-quote-sub">
                Is there more to life? Who is Jesus? Why does suffering exist? Bring it all — Alpha is the place to ask.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Give it a try.</h2>
          <p>One evening, good food, real conversation. There&apos;s nothing to lose and a lot to explore.</p>
          <div className="final-actions">
            <a
              className="btn btn-primary btn-lg"
              href="https://alphahanoi.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Find an Alpha group
            </a>
            <Link className="btn btn-outline-light btn-lg" href="/plan-visit">
              Visit on a Sunday first
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
