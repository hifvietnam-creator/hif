import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ministries — Hanoi International Fellowship",
  description:
    "Every HIF ministry is a step on the Journey — Try, Join, Grow, Serve, Go. Find where you (and your family) belong.",
  openGraph: {
    title: "Ministries — Hanoi International Fellowship",
    description: "Find your place. Every ministry is a step on the Journey.",
    type: "website",
  },
};

export default function MinistriesPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Ministries
          </p>
          <p className="eyebrow eyebrow-light">Find your place</p>
          <h1>
            Every ministry is a<br />step on the Journey.
          </h1>
          <p className="page-lead">
            Wherever you are, there&apos;s a next step — and people ready to take it with you.
            Here&apos;s how our ministries follow the HIF Journey:{" "}
            <strong>Try → Join → Grow → Serve → Go.</strong>
          </p>
        </div>
      </section>

      {/* JOURNEY-GROUPED MINISTRIES */}
      <section className="section">
        <div className="container">

          {/* TRY */}
          <div className="jstage jstage-try reveal" id="try">
            <div className="jstage-head">
              <span className="jstage-badge">Try</span>
              <span className="jstage-tag">Come and see — experience it, no strings attached.</span>
            </div>
            <div className="min-grid">
              <article className="min-card">
                <span className="min-bar bar-red"></span>
                <h3>Sunday Gatherings</h3>
                <p>Music, a down-to-earth message, and a warm welcome — in English, for every nation.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-red"></span>
                <h3>Christmas &amp; Easter</h3>
                <p>Our big-celebration moments — the easiest, most joyful time to bring a friend.</p>
              </article>
              <Link className="min-card" href="/spotlight">
                <span className="min-bar bar-red"></span>
                <h3>Spotlight English Clubs</h3>
                <p>Practice English, make friends, and connect with the community midweek.</p>
              </Link>
              <Link className="min-card" href="/alpha">
                <span className="min-bar bar-red"></span>
                <h3>Alpha</h3>
                <p>A relaxed space to explore the big questions of life and faith — no question off-limits.</p>
              </Link>
            </div>
          </div>

          {/* JOIN */}
          <div className="jstage jstage-join reveal" id="join">
            <div className="jstage-head">
              <span className="jstage-badge">Join</span>
              <span className="jstage-tag">Belong — become part of the family.</span>
            </div>
            <div className="min-grid">
              <Link className="min-card" href="/connect">
                <span className="min-bar bar-purple"></span>
                <h3>Connect Groups</h3>
                <p>Small circles that meet through the week to share life, food, and faith.</p>
              </Link>
              <Link className="min-card" href="/fellowships">
                <span className="min-bar bar-purple"></span>
                <h3>Ethnic Fellowships</h3>
                <p>Worship and friendship in your heart language — Vietnamese, Korean, Filipino, African and more.</p>
              </Link>
              <article className="min-card">
                <span className="min-bar bar-purple"></span>
                <h3>Welcome Team</h3>
                <p>Friendly faces who help you find your way, your seat, and your people.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-purple"></span>
                <h3>Newcomers</h3>
                <p>New to Hanoi or to HIF? Start here and we&apos;ll help you get connected.</p>
              </article>
            </div>
          </div>

          {/* GROW */}
          <div className="jstage jstage-grow reveal" id="grow">
            <div className="jstage-head">
              <span className="jstage-badge">Grow</span>
              <span className="jstage-tag">Grow into the person you&apos;re made to be.</span>
            </div>
            <div className="min-grid">
              <Link className="min-card" href="/kids">
                <span className="min-bar bar-green"></span>
                <h3>KidzQuest</h3>
                <p>Fun, safe, faith-filled mornings where kids are known and loved.</p>
              </Link>
              <Link className="min-card" href="/aftershock">
                <span className="min-bar bar-green"></span>
                <h3>Aftershock Youth</h3>
                <p>A home for teens to belong, have fun, and grow a faith of their own.</p>
              </Link>
              <article className="min-card">
                <span className="min-bar bar-green"></span>
                <h3>Prayer Ministry</h3>
                <p>Learn to pray, and be prayed for — building a lifestyle of prayer together.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-green"></span>
                <h3>Bible &amp; Discipleship</h3>
                <p>Go deeper in studies and one-to-one mentoring that help faith take root.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-green"></span>
                <h3>Baptism &amp; Membership</h3>
                <p>Ready for a next step of commitment? Take it publicly with your church family.</p>
              </article>
            </div>
          </div>

          {/* KALEIDOSCOPE QUOTE BAND */}
          <div className="kaleido-quote reveal">
            <div className="kaleido-bg" aria-hidden="true" />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">Our heartbeat</p>
              <p className="kaleido-quote-text">&ldquo;Everyone is helping someone to love God and others.&rdquo;</p>
              <p className="kaleido-quote-sub">
                You weren&apos;t made to watch from the sidelines — there&apos;s a place for you to belong, grow, and make a difference.
              </p>
            </div>
          </div>

          {/* SERVE */}
          <div className="jstage jstage-serve reveal" id="serve">
            <div className="jstage-head">
              <span className="jstage-badge">Serve</span>
              <span className="jstage-tag">Use your gifts to help others and bless the city.</span>
            </div>
            <div className="min-grid">
              <Link className="min-card" href="/citypartners">
                <span className="min-bar bar-blue"></span>
                <h3>CityPartners</h3>
                <p>Serve real needs across Hanoi — bringing hope, skills, and help to the city.</p>
              </Link>
              <article className="min-card">
                <span className="min-bar bar-blue"></span>
                <h3>Worship &amp; Media</h3>
                <p>Use your gifts in music, sound, and media to help people encounter God.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-blue"></span>
                <h3>Hospitality</h3>
                <p>Coffee, welcome, and care — the small things that make HIF feel like home.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-blue"></span>
                <h3>Serve Teams</h3>
                <p>Kids, youth, tech, set-up and more — there&apos;s a team that fits how you&apos;re wired.</p>
              </article>
            </div>
          </div>

          {/* SERVE CTA */}
          <div
            className="serve-cta reveal"
            style={{ textAlign: "center", margin: "clamp(24px,5vw,40px) auto 0", maxWidth: "760px" }}
          >
            <h3 className="section-title" style={{ marginBottom: "10px" }}>Serve with us</h3>
            <p className="section-intro" style={{ marginBottom: "22px" }}>
              Ready to use your gifts? Tell us where you&apos;d like to help — worship, tech &amp; media,
              hospitality, KidzQuest, Aftershock Youth, prayer, CityPartners, or not sure yet — and
              we&apos;ll connect you with the right team.
            </p>
            <a
              className="btn btn-primary btn-lg"
              href="https://hifvn.churchcenter.com/people/forms/79607"
              target="_blank"
              rel="noopener noreferrer"
            >
              Serve with us
            </a>
          </div>

          {/* GO */}
          <div className="jstage jstage-go reveal" id="go">
            <div className="jstage-head">
              <span className="jstage-badge">Go</span>
              <span className="jstage-tag">Be sent — to your workplace, your city, and the nations.</span>
            </div>
            <div className="min-grid">
              <article className="min-card">
                <span className="min-bar bar-grey"></span>
                <h3>Ecopark &amp; Thai Nguyen</h3>
                <p>Be part of a growing congregation and outreach beyond central Hanoi.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-grey"></span>
                <h3>Love Hanoi · Love Your City</h3>
                <p>Join the movement to serve and bless our city alongside local partners.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-grey"></span>
                <h3>Missions &amp; Sending</h3>
                <p>Discover your part in God&apos;s mission — locally and to the nations.</p>
              </article>
            </div>
          </div>

          <p className="callout reveal">
            <strong>Don&apos;t see your group yet?</strong> We&apos;re a vibrant, growing church and this map is
            still filling out. If you lead or attend something that isn&apos;t here, tell us about it and
            where it fits on the Journey —{" "}
            <a href="mailto:admin@hif.vn?subject=Ministry%20for%20the%20website">email us</a>.
          </p>
        </div>
      </section>

      {/* LIFE AT HIF GALLERY */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Life at HIF</p>
            <h2 className="section-title">This is what family looks like.</h2>
          </div>
          <div className="gallery reveal">
            <figure>
              <Image src="/assets/img/loc-hanoi.jpg" alt="HIF Sunday gathering" width={400} height={300} loading="lazy" />
              <figcaption><b>Sunday gatherings</b> · many nations, one family</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/kids.jpg" alt="KidzQuest children's ministry" width={400} height={300} loading="lazy" />
              <figcaption><b>KidzQuest</b> · kids known and loved</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/youth.jpg" alt="Aftershock youth ministry" width={400} height={300} loading="lazy" />
              <figcaption><b>Aftershock</b> · a home for teens</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/baptism.jpg" alt="A baptism at HIF" width={400} height={300} loading="lazy" />
              <figcaption><b>Baptisms</b> · lives changed</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/visit-welcome.jpg" alt="HIF welcome team" width={400} height={300} loading="lazy" />
              <figcaption><b>Welcome team</b> · friendly faces at the door</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/about-family.jpg" alt="The HIF church family" width={400} height={300} loading="lazy" />
              <figcaption><b>One family</b> · from a hundred nations</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Not sure where you fit?</h2>
          <p>Start with a visit — we&apos;ll help you find your next step on the Journey.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/#visit">Plan a visit</Link>
            <a
              className="btn btn-outline-light btn-lg"
              href="mailto:admin@hif.vn?subject=Getting%20connected%20at%20HIF"
            >
              Get connected
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
