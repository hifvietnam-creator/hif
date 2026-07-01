import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Events — Hanoi International Fellowship",
  description:
    "What's happening at HIF — our weekly rhythm of gatherings plus seasonal celebrations and events. See the full calendar and join in.",
  openGraph: {
    title: "Events — Hanoi International Fellowship",
    description: "Our weekly rhythm and what's coming up at HIF.",
    type: "website",
  },
};

export default function EventsPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb"><Link href="/">Home</Link> · Events</p>
          <p className="eyebrow eyebrow-light">What&apos;s happening</p>
          <h1>There&apos;s always<br />something on.</h1>
          <p className="page-lead">
            From our weekly rhythm of gatherings to seasonal celebrations and serve days, there&apos;s
            always a way to connect. Here&apos;s the regular shape of life at HIF — see the full calendar for dates.
          </p>
          <div className="final-actions" style={{ justifyContent: "flex-start", marginTop: "30px" }}>
            <a className="btn btn-primary btn-lg" href="https://hifvn.churchcenter.com/calendar" target="_blank" rel="noopener noreferrer">View full calendar</a>
            <a className="btn btn-outline-light btn-lg" href="#weekly">Weekly rhythm</a>
          </div>
        </div>
      </section>

      {/* WEEKLY RHYTHM */}
      <section className="section" id="weekly">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Every week</p>
            <h2 className="section-title">Our weekly rhythm.</h2>
            <p className="section-intro">The regular gatherings you can count on. Check the calendar for exact times and any changes.</p>
          </div>
          <div className="min-grid">
            <Link className="min-card" href="/plan-visit"><span className="min-bar bar-red"></span><h3>Sunday Gatherings</h3><p>Hanoi at 8:30, 10:00 &amp; 11:30 AM; Ecopark at 10:00 AM. Worship, a message, and welcome.</p></Link>
            <Link className="min-card" href="/kids"><span className="min-bar bar-green"></span><h3>KidzQuest</h3><p>Sundays during the 10:00 gathering in Hanoi — fun, safe, faith-filled time for kids.</p></Link>
            <Link className="min-card" href="/connect"><span className="min-bar bar-purple"></span><h3>Connect Groups</h3><p>Through the week in homes and cafés across the city — share life, food, and faith.</p></Link>
            <Link className="min-card" href="/alpha"><span className="min-bar bar-blue"></span><h3>Alpha</h3><p>Seasonal small groups exploring life and faith — relaxed, honest, no pressure.</p></Link>
            <Link className="min-card" href="/aftershock"><span className="min-bar bar-red"></span><h3>Aftershock Youth</h3><p>A weekly home for teens (grades 6–12) to belong and grow.</p></Link>
            <Link className="min-card" href="/spotlight"><span className="min-bar bar-green"></span><h3>Spotlight English Clubs</h3><p>Midweek — practice English, make friends, and connect with the community.</p></Link>
          </div>
        </div>
      </section>

      {/* SEASONAL */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Through the year</p>
            <h2 className="section-title">Celebrations &amp; special events.</h2>
          </div>
          <div className="min-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <article className="min-card"><span className="min-bar bar-red"></span><h3>Christmas</h3><p>Our biggest welcome of the year — services and celebrations across the city.</p></article>
            <article className="min-card"><span className="min-bar bar-purple"></span><h3>Easter</h3><p>Marking the heart of our faith together as one family.</p></article>
            <article className="min-card"><span className="min-bar bar-blue"></span><h3>Baptisms</h3><p>Celebrating new life throughout the year. <Link href="/next-steps#baptism">Sign up →</Link></p></article>
            <article className="min-card"><span className="min-bar bar-green"></span><h3>Community Serve Day</h3><p>Rolling up our sleeves to bless Hanoi with CityPartners.</p></article>
          </div>
        </div>
      </section>

      {/* FULL CALENDAR */}
      <section className="section">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div className="kaleido-bg" aria-hidden="true" />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">Dates &amp; details</p>
              <p className="kaleido-quote-text">See the full calendar.</p>
              <p className="kaleido-quote-sub">Up-to-date times, special events, and registrations all live in our Church Center calendar.</p>
              <div className="final-actions" style={{ marginTop: "26px" }}>
                <a className="btn btn-primary btn-lg" href="https://hifvn.churchcenter.com/calendar" target="_blank" rel="noopener noreferrer">Open the calendar</a>
                <a className="btn btn-outline-light btn-lg" href="https://hifvn.churchcenter.com/registrations/events" target="_blank" rel="noopener noreferrer">Event registrations</a>
                <a className="btn btn-outline-light btn-lg" href="https://hifvn.churchcenter.com/people/forms/373350" target="_blank" rel="noopener noreferrer">Stay connected</a>
              </div>
              <p className="kaleido-quote-sub" style={{ marginTop: "14px" }}>Get HIF updates, events, and next steps by email — tap <strong>Stay connected</strong>.</p>
              <p className="kaleido-quote-sub" style={{ marginTop: "18px", fontSize: ".85rem", opacity: 0.7 }}>Opens in Church Center, our secure events platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Come be part of it.</h2>
          <p>The best place to start is a Sunday gathering — we&apos;d love to welcome you.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">Plan a visit</Link>
            <a className="btn btn-outline-light btn-lg" href="https://hifvn.churchcenter.com/calendar" target="_blank" rel="noopener noreferrer">View calendar</a>
          </div>
        </div>
      </section>
    </>
  );
}
