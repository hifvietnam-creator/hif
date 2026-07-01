import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "KidzQuest — Hanoi International Fellowship",
  description:
    "KidzQuest is HIF's ministry for children — safe, fun, faith-filled Sundays from nursery to teens, with secure check-in and caring, screened volunteers.",
  openGraph: {
    title: "KidzQuest — Hanoi International Fellowship",
    description: "Where kids are known, safe, and loved.",
    type: "website",
  },
};

export default function KidsPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · KidzQuest
          </p>
          <p className="eyebrow eyebrow-light">KidzQuest · kids &amp; families</p>
          <h1>
            Known, safe,<br />and loved.
          </h1>
          <p className="page-lead">
            KidzQuest is where your children discover that God loves them — through fun, friendship,
            and stories that stick. While you worship, they&apos;re cared for by people you can trust.
          </p>
        </div>
      </section>

      {/* INTRO */}
      <section className="section">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">Welcome, families</p>
            <h2 className="section-title">A place your kids will want to come back to.</h2>
            <p>
              Every Sunday, children explore the big story of God&apos;s love at their own level — with
              worship, a Bible story, games, and crafts led by a warm, dedicated team. They&apos;ll make
              friends from around the world and leave with a smile (and usually something they made).
            </p>
            <p>
              Coming for the first time? Arrive about 15 minutes early so we can get your kids checked
              in and settled before the gathering begins.
            </p>
            <Link className="link-arrow" href="/plan-visit">
              Plan your first visit <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="about-media reveal">
            <Image
              className="about-img"
              src="/assets/img/kids.jpg"
              alt="Children enjoying KidzQuest at HIF"
              width={600}
              height={450}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* AGE GROUPS */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">By age</p>
            <h2 className="section-title">Something for every age.</h2>
            <p className="section-intro">
              Programs run during our Sunday gatherings. Exact age bands can vary — just ask our team
              and we&apos;ll point you to the right room.
            </p>
          </div>
          <div className="min-grid">
            <article className="min-card">
              <span className="age-badge" style={{ background: "var(--red)" }}>Nursery</span>
              <h3>Babies &amp; toddlers</h3>
              <p>A safe, gentle space with caring volunteers so the littlest ones are happy and you can relax.</p>
            </article>
            <article className="min-card">
              <span className="age-badge" style={{ background: "var(--purple)" }}>Preschool</span>
              <h3>Little explorers</h3>
              <p>Songs, stories, and play that introduce God&apos;s love in ways small children understand.</p>
            </article>
            <article className="min-card">
              <span className="age-badge" style={{ background: "var(--green-deep)" }}>Primary</span>
              <h3>KidzQuest kids</h3>
              <p>Big-energy worship, Bible adventures, games and crafts — faith that&apos;s fun and real.</p>
            </article>
            <article className="min-card">
              <span className="age-badge" style={{ background: "var(--blue-deep)" }}>Teens</span>
              <h3>Aftershock youth</h3>
              <p>A home for teenagers to belong, ask questions, and grow a faith of their own.</p>
            </article>
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section className="section">
        <div className="container visit-grid">
          <div className="visit-copy reveal">
            <p className="eyebrow">Safety first</p>
            <h2 className="section-title">Care you can trust.</h2>
            <p className="section-intro">Your child&apos;s safety is our priority. Here&apos;s how we look after them:</p>
            <ul className="ticks">
              <li>Secure check-in and check-out — children are only released to a parent or guardian.</li>
              <li>Screened, trained volunteers who genuinely love kids.</li>
              <li>Safe, clean, age-appropriate rooms and activities.</li>
              <li>A way to reach you quickly if your child needs you during the service.</li>
              <li>Allergy and special-needs aware — tell us how we can care for your child best.</li>
            </ul>
            <div className="visit-actions">
              <Link className="btn btn-primary" href="/plan-visit">Plan a visit</Link>
              <a
                className="btn btn-ghost"
                href="mailto:admin@hif.vn?subject=KidzQuest%20question"
              >
                Ask a question
              </a>
            </div>
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

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Bring the whole family.</h2>
          <p>Your kids will be in great hands — come and see for yourself this Sunday.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">Plan a visit</Link>
            <a
              className="btn btn-outline-light btn-lg"
              href="mailto:admin@hif.vn?subject=KidzQuest%20question"
            >
              Ask about KidzQuest
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
