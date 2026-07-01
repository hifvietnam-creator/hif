import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aftershock Youth — Hanoi International Fellowship",
  description:
    "Aftershock is HIF's youth ministry — a place for teens to belong, have fun, ask honest questions, and grow a faith of their own, with friends from around the world.",
  openGraph: {
    title: "Aftershock Youth — Hanoi International Fellowship",
    description: "A place for teens to belong, become, and believe.",
    type: "website",
  },
};

export default function AftershockPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Aftershock Youth
          </p>
          <p className="eyebrow eyebrow-light">Aftershock · youth</p>
          <h1>
            Belong, become,<br />believe.
          </h1>
          <p className="page-lead">
            Aftershock is HIF&apos;s home for teenagers — a place to have fun, make real friends from
            around the world, ask the big questions, and grow a faith that&apos;s truly your own.
          </p>
        </div>
      </section>

      {/* INTRO */}
      <section className="section">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">For teens</p>
            <h2 className="section-title">You don&apos;t have to have it all figured out.</h2>
            <p>
              Being a teenager far from &ldquo;home&rdquo; — or growing up between cultures — isn&apos;t always easy.
              Aftershock is a space to be yourself, be accepted, and belong. We play hard, talk
              honestly about life and faith, and look out for each other.
            </p>
            <p>
              You don&apos;t need to know anything about the Bible or church to fit in. Just come as you
              are, bring a friend, and see what it&apos;s about.
            </p>
            <Link className="link-arrow" href="/plan-visit">
              Come check it out <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="about-media reveal">
            <Image
              className="about-img"
              src="/assets/img/youth.jpg"
              alt="HIF Aftershock youth together"
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
            <p className="eyebrow">What it&apos;s like</p>
            <h2 className="section-title">A typical Aftershock.</h2>
          </div>
          <div className="min-grid">
            <article className="min-card">
              <span className="min-bar bar-red"></span>
              <h3>Hang out</h3>
              <p>Games, food, and time to just be together — no pressure, all welcome.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-purple"></span>
              <h3>Worship</h3>
              <p>Music and a chance to connect with God in a way that&apos;s real, not forced.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-green"></span>
              <h3>Real talk</h3>
              <p>Honest conversations about life, faith, identity, and the things that actually matter.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-blue"></span>
              <h3>Small groups</h3>
              <p>A smaller circle to ask questions, be known, and grow with friends your age.</p>
            </article>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="section">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div className="kaleido-bg" aria-hidden="true" />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">For every teen</p>
              <p className="kaleido-quote-text">There&apos;s a place for you here.</p>
              <p className="kaleido-quote-sub">
                Whatever your background, language, or story — you belong at Aftershock.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOR PARENTS */}
      <section className="section about">
        <div className="container visit-grid">
          <div className="visit-copy reveal">
            <p className="eyebrow">For parents</p>
            <h2 className="section-title">Your teen is in good hands.</h2>
            <p className="section-intro">
              We want Aftershock to be a place you&apos;re glad your teenager calls home. Here&apos;s what to know:
            </p>
            <ul className="ticks">
              <li>Caring, screened, trained leaders who genuinely love young people.</li>
              <li>A safe, welcoming environment built on respect and belonging.</li>
              <li>Faith taught in an age-appropriate, question-friendly way.</li>
              <li>Friends and mentors from many nations and walks of life.</li>
              <li>Happy to answer any questions before your teen&apos;s first visit.</li>
            </ul>
            <div className="visit-actions">
              <Link className="btn btn-primary" href="/plan-visit">Plan a visit</Link>
              <a
                className="btn btn-ghost"
                href="mailto:admin@hif.vn?subject=Aftershock%20youth%20question"
              >
                Ask a question
              </a>
            </div>
          </div>
          <div className="visit-times reveal">
            <h3 className="times-title">Good to know</h3>
            <div className="time-card">
              <div className="time-loc"><span className="dot dot-red"></span>Who it&apos;s for</div>
              <ul>
                <li><strong>Grades 6–12</strong> <span>middle &amp; high school</span></li>
              </ul>
            </div>
            <div className="time-card">
              <div className="time-loc"><span className="dot dot-green"></span>When &amp; where</div>
              <ul>
                <li><strong>Weekly</strong> <span>at HIF, Hanoi</span></li>
              </ul>
            </div>
            <p className="time-note">
              Want exact times and the next meet-up?{" "}
              <a href="mailto:admin@hif.vn?subject=Aftershock%20youth%20times">Get in touch →</a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Bring a friend this week.</h2>
          <p>The best way to find your crew is to show up. We&apos;d love to meet you.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">Plan a visit</Link>
            <a
              className="btn btn-outline-light btn-lg"
              href="mailto:admin@hif.vn?subject=Aftershock%20youth"
            >
              Ask about Aftershock
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
