import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

/**
 * MOCKUP — drafted from hanoisports.vn, the sports ministry's own site.
 *
 * Days, times, venues and prices are deliberately absent: hanoisports.vn does
 * not publish them on its public pages, and each sport runs its schedule
 * through its own sign-up page or chat group. Every "join" link therefore goes
 * to hanoisports.vn rather than repeating details here that would go stale.
 */

export const metadata: Metadata = {
  title: "Sports — Hanoi International Fellowship",
  description:
    "Hanoi Sports is the sports ministry of HIF — weekly pickleball, football and volleyball for beginners and seasoned players from across the world.",
  openGraph: {
    title: "Sports — Hanoi International Fellowship",
    description:
      "Weekly pickleball, football and volleyball in Hanoi. Stay active, meet people, improve your game.",
    type: "website",
  },
};

const SITE = "https://hanoisports.vn";

const SPORTS = [
  {
    name: "Pickleball",
    bar: "bar-red",
    blurb:
      "Hanoi's most active and inclusive pickleball community — weekly drop-in sessions, club games and quarterly training, with balanced court rotation for players rated 2.0 to 4.0+.",
    href: `${SITE}/pickleball-games/`,
    cta: "Pickleball sessions",
  },
  {
    name: "Football",
    bar: "bar-green",
    blurb:
      "Organised, small-sided games where fair play and team spirit come first. After-work kickers and weekend warriors from over a dozen countries.",
    href: `${SITE}/football/`,
    cta: "Join the football group",
  },
  {
    name: "Volleyball",
    bar: "bar-blue",
    blurb:
      "Friendly, international and full of energy. Beginners, returning players and regulars — structured but relaxed games in a social setting.",
    href: `${SITE}/volleyball/`,
    cta: "Join the volleyball group",
  },
  {
    name: "Basketball",
    bar: "bar-purple",
    blurb: "Coming soon. Details will be posted as soon as sessions are confirmed.",
    href: `${SITE}/basketball/`,
    cta: "Check for updates",
  },
];

const PHOTOS = [
  {
    src: "/assets/sports/pickleball-group.jpg",
    alt: "A large group of pickleball players with paddles, gathered on an indoor court",
    sport: "Pickleball",
  },
  {
    src: "/assets/sports/pickleball-play.jpg",
    alt: "Players mid-rally in a doubles pickleball game",
    sport: "Pickleball",
  },
  {
    src: "/assets/sports/volleyball-team.jpg",
    alt: "Volleyball players from many countries posing together in a sports hall",
    sport: "Volleyball",
  },
  {
    src: "/assets/sports/volleyball-court.jpg",
    alt: "A volleyball group lined up on an indoor court",
    sport: "Volleyball",
  },
];

export default function SportsPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero has-photo">
        <div
          className="page-photo"
          style={{
            backgroundImage: "url('/assets/sports/pickleball-play.jpg')",
            backgroundPosition: "center 40%",
          }}
          aria-hidden="true"
        />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · <Link href="/ministries">Ministries</Link> · Sports
          </p>
          <p className="eyebrow eyebrow-light">Hanoi Sports · everyone welcome</p>
          <h1>
            Join the fun.
            <br />
            Find your team.
          </h1>
          <p className="page-lead">
            Whether you&apos;re a beginner or a seasoned player, our weekly sports sessions are an
            easy way to stay active, meet people from around the world, and improve your game — no
            church background needed.
          </p>
          <div className="final-actions" style={{ justifyContent: "flex-start", marginTop: "30px" }}>
            <a className="btn btn-primary btn-lg" href="#sports">
              Choose your sport
            </a>
            <a
              className="btn btn-outline-light btn-lg"
              href={SITE}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit hanoisports.vn
            </a>
          </div>
        </div>
      </section>

      {/* THE SPORTS */}
      <section className="section" id="sports">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">What we play</p>
            <h2 className="section-title">Pick a sport, secure your spot.</h2>
            <p className="section-intro">
              Each sport runs its own weekly schedule. Follow the link to see this week&apos;s
              sessions and sign up.
            </p>
          </div>
          <div className="min-grid">
            {SPORTS.map((s) => (
              <a
                key={s.name}
                className="min-card"
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={`min-bar ${s.bar}`} />
                <h3>{s.name}</h3>
                <p>{s.blurb}</p>
                <span className="min-more">
                  {s.cta} <span aria-hidden="true">↗</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* PHOTOS */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">On court</p>
            <h2 className="section-title">A few of our regulars.</h2>
          </div>
          <div className="gallery gallery-2 reveal">
            {PHOTOS.map((p) => (
              <figure key={p.src}>
                <Image src={p.src} alt={p.alt} width={1200} height={750} loading="lazy" />
                <figcaption>
                  <b>{p.sport}</b>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="section about">
        <div className="container visit-grid">
          <div className="visit-copy reveal">
            <p className="eyebrow">What to expect</p>
            <h2 className="section-title">Good games, better company.</h2>
            <p className="section-intro">
              Turning up alone to a new group can feel like a lot. Here&apos;s how we play:
            </p>
            <ul className="ticks">
              <li>Inclusion, respect and enjoyment — no rough play, no cliques.</li>
              <li>Fair rotation, so everyone gets time on court or pitch.</li>
              <li>Beginners, returning players and regulars all welcome.</li>
              <li>Players from a dozen-plus countries, and friendly faces to introduce you.</li>
              <li>Social events, mini-tournaments and seasonal competitions through the year.</li>
            </ul>
          </div>
          <div className="visit-times reveal">
            <h3 className="times-title">How it works</h3>
            <div className="time-card">
              <div className="time-loc">
                <span className="dot dot-red" />
                1 · Choose a sport
              </div>
              <p>Pickleball, football or volleyball — basketball is on its way.</p>
            </div>
            <div className="time-card">
              <div className="time-loc">
                <span className="dot dot-green" />
                2 · Join the group
              </div>
              <p>
                Weekly schedules, venues and sign-up sheets are shared in each sport&apos;s group.
              </p>
            </div>
            <div className="time-card">
              <div className="time-loc">
                <span className="dot dot-red" />
                3 · Come and play
              </div>
              <p>Bring a friend if you like. Come once, or every week.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Come and play this week.</h2>
          <p>
            Hanoi Sports is the sports ministry of Hanoi International Fellowship. Everyone is
            welcome, whatever you believe.
          </p>
          <div className="final-actions">
            <a
              className="btn btn-primary btn-lg"
              href={SITE}
              target="_blank"
              rel="noopener noreferrer"
            >
              See this week&apos;s games
            </a>
            <Link className="btn btn-outline-light btn-lg" href="/#try">
              Other ways to try HIF
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
