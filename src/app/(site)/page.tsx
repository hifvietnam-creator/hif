import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import JourneyStrip from "@/components/JourneyStrip";
import HasStrip from "@/components/HasStrip";

export const metadata: Metadata = {
  title: "Hanoi International Fellowship — Find your spiritual home in Hanoi",
  description:
    "One church family in Hanoi, Vietnam, welcoming people from 100+ nations over the years. Wherever you're starting from — curious, finding your way back, or looking for a church home — there's a place for you here.",
};

export default function HomePage() {
  return (
    <>
      <HasStrip />
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="hero-photo" aria-hidden="true" />
        <div className="container hero-inner">
          <ScrollReveal as="p" className="eyebrow eyebrow-light">
            A church family in Hanoi · since 1995
          </ScrollReveal>
          <ScrollReveal as="h1" className="hero-title">
            Find your spiritual
            <br />
            home in Hanoi.
          </ScrollReveal>
          <ScrollReveal as="p" className="hero-lead">
            Whether you&apos;re curious for the first time, finding your way back, or looking for a
            church family far from home — there&apos;s a place for you here. One family, a
            hundred-plus nations, one city to love.
          </ScrollReveal>
          <ScrollReveal className="hero-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">
              Plan your visit
            </Link>
            <a className="btn btn-outline-light btn-lg" href="#watch">
              Watch a service
            </a>
          </ScrollReveal>
          <ScrollReveal as="ul" className="hero-stats" aria-label="At a glance">
            <li>
              <strong>3</strong> locations
            </li>
            <li>
              <strong>100+</strong> nations over the years
            </li>
            <li>
              <strong>30+</strong> years in Hanoi &amp; beyond
            </li>
          </ScrollReveal>
        </div>
        <a className="hero-scroll" href="#try" aria-label="Scroll to explore">
          <span />
        </a>
      </section>

      {/* ============ STICKY JOURNEY STRIP ============ */}
      <JourneyStrip />

      {/* ============================================================= */}
      {/* ===================== TRY ZONE (red) ======================== */}
      {/* ============================================================= */}
      <section className="jzone" id="try">
        <ScrollReveal as="header" className="zone-head zone-try">
          <div className="container zone-head-inner">
            <div className="zone-chevron">
              <span className="zone-num">Step 1</span>
              <span className="zone-name">Try</span>
            </div>
            <div className="zone-lead">
              <h2>Come and see.</h2>
              <p>Join us on a Sunday or online. Just experience it — no strings, no commitment.</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Empathy / three doors */}
        <section className="section start" id="start">
          <div className="container">
            <div className="section-head center">
              <p className="eyebrow">Wherever you&apos;re starting from</p>
              <h2 className="section-title">You&apos;re not meant to do life alone.</h2>
              <p className="section-intro">
                A fast-moving city can leave you stretched thin, far from home, or quietly
                wondering if there&apos;s more. You don&apos;t need to have it all figured out to belong
                here. Tell us where you&apos;re at:
              </p>
            </div>
            <div className="doors">
              <ScrollReveal as="article" className="door door-red">
                <div className="door-tag">I&apos;m curious</div>
                <h3>Exploring for the first time</h3>
                <p>
                  I don&apos;t know much about Jesus, the Bible, or church — but I&apos;m open. I&apos;m looking
                  for hope, peace, or some kind of help my usual routines aren&apos;t giving me.
                </p>
                <Link className="door-link" href="/jesus">
                  Start here <span aria-hidden="true">→</span>
                </Link>
              </ScrollReveal>
              <ScrollReveal as="article" className="door door-purple">
                <div className="door-tag">Finding my way back</div>
                <h3>Reaching for something solid</h3>
                <p>
                  I&apos;ve had some faith or church somewhere in my past. Life moved on — and now
                  I&apos;m reaching for something steady to build on again.
                </p>
                <a className="door-link" href="#visit">
                  Come as you are <span aria-hidden="true">→</span>
                </a>
              </ScrollReveal>
              <ScrollReveal as="article" className="door door-blue">
                <div className="door-tag">Looking for a church home</div>
                <h3>New to Hanoi, finding family</h3>
                <p>
                  I follow Jesus and I&apos;m new in the city. I want a community for my family, real
                  friendships, and a place to keep growing and serving.
                </p>
                <a className="door-link" href="#join">
                  Find your people <span aria-hidden="true">→</span>
                </a>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Visit / what to expect */}
        <section className="section visit" id="visit">
          <div className="container">
            <ScrollReveal>
              <Image
                className="visit-welcome-banner"
                src="/assets/img/visit-welcome.jpg"
                alt="HIF welcome team greeting guests at the door"
                width={1180}
                height={410}
                loading="lazy"
              />
            </ScrollReveal>
            <div className="visit-grid">
              <div className="visit-copy reveal">
                <p className="eyebrow">Plan your visit</p>
                <h2 className="section-title">What a Sunday looks like.</h2>
                <p className="section-intro">
                  First time? Here&apos;s everything you need to know so you can relax and just come.
                </p>
                <ul className="ticks">
                  <li>Come exactly as you are — there&apos;s no dress code.</li>
                  <li>Friendly faces at the door will help you find your way and your seat.</li>
                  <li>Brilliant, safe care for your kids — from nursery to teens.</li>
                  <li>About 75 minutes: music, a down-to-earth message, and coffee after.</li>
                  <li>Everything is in English, with a warm welcome for every nation.</li>
                </ul>
                <div className="visit-actions">
                  <a
                    className="btn btn-primary"
                    href="mailto:admin@hif.vn?subject=I'd%20like%20to%20visit%20HIF&body=Hi%20HIF%20team%2C%20I'd%20like%20to%20plan%20a%20visit.%20Here's%20a%20bit%20about%20me%3A"
                  >
                    Let us know you&apos;re coming
                  </a>
                  <a className="btn btn-ghost" href="#locations">
                    See locations &amp; times
                  </a>
                </div>
              </div>
              <div className="visit-times reveal">
                <h3 className="times-title">Service times</h3>
                <div className="time-card">
                  <div className="time-loc">
                    <span className="dot dot-red" />
                    Hanoi · Detech Tower
                  </div>
                  <ul>
                    <li>
                      <strong>8:30 AM</strong> <span>Gathering</span>
                    </li>
                    <li>
                      <strong>10:00 AM</strong> <span>Gathering + KidzQuest</span>
                    </li>
                    <li>
                      <strong>11:30 AM</strong> <span>Vietnamese Fellowship</span>
                    </li>
                  </ul>
                </div>
                <div className="time-card">
                  <div className="time-loc">
                    <span className="dot dot-green" />
                    Ecopark
                  </div>
                  <ul>
                    <li>
                      <strong>10:00 AM</strong> <span>Gathering on-site</span>
                    </li>
                  </ul>
                </div>
                <p className="time-note">
                  Can&apos;t make it in person?{" "}
                  <a href="#watch">Watch live online →</a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>

      {/* ============================================================= */}
      {/* ==================== JOIN ZONE (purple) ===================== */}
      {/* ============================================================= */}
      <section className="jzone" id="join">
        <ScrollReveal as="header" className="zone-head zone-join">
          <div className="container zone-head-inner">
            <div className="zone-chevron">
              <span className="zone-num">Step 2</span>
              <span className="zone-name">Join</span>
            </div>
            <div className="zone-lead">
              <h2>Belong.</h2>
              <p>Get to know people in a Connect Group and become part of the family.</p>
            </div>
          </div>
        </ScrollReveal>

        {/* About */}
        <section className="section about" id="about">
          <div className="container about-grid">
            <div className="about-media reveal">
              <Image
                className="about-img"
                src="/assets/img/about-family.jpg"
                alt="HIF family from many nations gathered together in Hanoi"
                width={640}
                height={480}
                loading="lazy"
              />
            </div>
            <div className="about-copy reveal">
              <p className="eyebrow">Who we are</p>
              <h2 className="section-title">
                A kaleidoscope of nations,
                <br />
                learning to love one city.
              </h2>
              <p>
                Hanoi International Fellowship began in a living room in 1995 with a dozen people.
                Three decades later we&apos;re a family from more than a hundred nations across three
                congregations — Hanoi, Ecopark, and a growing outreach in Thai Nguyen.
              </p>
              <p>
                We&apos;re not here to serve ourselves. We&apos;re here to help you find real life in
                Jesus, and to love this city with our hands and feet. This is <em>your</em> story
                — we&apos;re simply here to walk with you and point the way.
              </p>
              <blockquote className="pull">
                There&apos;s an old word for what happens here —{" "}
                <strong>polypoikilos</strong>, the &ldquo;many-colored&rdquo; beauty that shows up when
                different people become one. That&apos;s what we&apos;re after.
              </blockquote>
              <Link className="link-arrow" href="/about">
                Read our story <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Fellowships */}
        <section className="section fellowships">
          <div className="container">
            <div className="section-head center">
              <p className="eyebrow eyebrow-light">Worship in your heart language</p>
              <h2 className="section-title">Many nations, one family.</h2>
              <p className="section-intro">
                Find people from home — and make new friends from everywhere else. Our ethnic
                fellowships gather alongside the wider church family.
              </p>
            </div>
            <div className="fellow-grid">
              <Link className="fellow" href="/fellowships">
                <Image
                  src="/assets/img/fellowship-vietnamese.jpg"
                  alt="Vietnamese Fellowship"
                  width={320}
                  height={200}
                  loading="lazy"
                />
                <span className="fellow-name">Vietnamese</span>
              </Link>
              <Link className="fellow" href="/fellowships">
                <Image
                  src="/assets/img/fellowship-korean.jpg"
                  alt="Korean Fellowship"
                  width={320}
                  height={200}
                  loading="lazy"
                />
                <span className="fellow-name">Korean</span>
              </Link>
              <Link className="fellow" href="/fellowships">
                <Image
                  src="/assets/img/fellowship-filipino.jpg"
                  alt="Filipino Fellowship"
                  width={320}
                  height={200}
                  loading="lazy"
                />
                <span className="fellow-name">Filipino</span>
              </Link>
              <Link className="fellow" href="/fellowships">
                <Image
                  src="/assets/img/fellowship-african.jpg"
                  alt="African Fellowship"
                  width={320}
                  height={200}
                  loading="lazy"
                />
                <span className="fellow-name">African</span>
              </Link>
            </div>
            <ScrollReveal as="p" className="journey-foot">
              Find people from home —{" "}
              <Link href="/fellowships">explore our fellowships →</Link>
            </ScrollReveal>
          </div>
        </section>

        {/* Find your people */}
        <section className="section ministries" id="ministries">
          <div className="container">
            <div className="section-head center">
              <p className="eyebrow">Find your people</p>
              <h2 className="section-title">
                There&apos;s a place for every season of life.
              </h2>
              <p className="section-intro">
                From your first questions to lifelong friendships — here&apos;s where to connect.
              </p>
            </div>
            <div className="min-grid">
              <article className="min-card">
                <span className="min-bar bar-purple" />
                <h3>Connect Groups</h3>
                <p>Small circles that meet through the week to share life, food, and faith.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-red" />
                <h3>KidzQuest</h3>
                <p>Fun, safe, faith-filled mornings where kids are known and loved.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-blue" />
                <h3>Aftershock Youth</h3>
                <p>A home for teens to belong, have fun, and grow a faith of their own.</p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-green" />
                <h3>Spotlight English Clubs</h3>
                <p>
                  Practice English, make friends, and connect with the community midweek.
                </p>
              </article>
              <article className="min-card">
                <span className="min-bar bar-purple" />
                <h3>Ethnic Fellowships</h3>
                <p>
                  Worship and friendship in your heart language — Vietnamese, Korean, Filipino,
                  African and more.
                </p>
              </article>
            </div>
            <ScrollReveal as="p" className="journey-foot">
              See how every ministry fits the Journey —{" "}
              <Link href="/ministries">explore all ministries →</Link>
            </ScrollReveal>
          </div>
        </section>
      </section>

      {/* ============================================================= */}
      {/* ==================== GROW ZONE (green) ====================== */}
      {/* ============================================================= */}
      <section className="jzone" id="grow">
        <ScrollReveal as="header" className="zone-head zone-grow">
          <div className="container zone-head-inner">
            <div className="zone-chevron">
              <span className="zone-num">Step 3</span>
              <span className="zone-name">Grow</span>
            </div>
            <div className="zone-lead">
              <h2>Grow in faith.</h2>
              <p>
                Ask honest questions about faith (try Alpha) and grow into who you&apos;re made to be.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <section className="section grow">
          <div className="container">
            <div className="section-head center">
              <p className="eyebrow">Grow in faith</p>
              <h2 className="section-title">
                Explore the big questions — at your pace.
              </h2>
              <p className="section-intro">
                No question is off-limits. Wherever your faith is today, there&apos;s room to ask,
                learn, and keep growing.
              </p>
            </div>
            <div className="duo-grid">
              <article className="min-card">
                <span className="min-bar bar-green" />
                <h3>Alpha</h3>
                <p>
                  A relaxed space to explore the big questions of life and faith — no question
                  off-limits.
                </p>
                <Link className="link-arrow" href="/alpha">
                  Explore Alpha <span aria-hidden="true">→</span>
                </Link>
              </article>
              <article className="min-card">
                <span className="min-bar bar-purple" />
                <h3>What We Believe</h3>
                <p>The heart of the Christian faith, in clear and simple words.</p>
                <Link className="link-arrow" href="/beliefs">
                  What we believe <span aria-hidden="true">→</span>
                </Link>
              </article>
            </div>
            <ScrollReveal as="p" className="journey-foot">
              Ready to take a step?{" "}
              <Link href="/next-steps">Explore Next Steps →</Link>
            </ScrollReveal>
          </div>
        </section>
      </section>

      {/* ============================================================= */}
      {/* ==================== SERVE ZONE (blue) ====================== */}
      {/* ============================================================= */}
      <section className="jzone" id="serve">
        <ScrollReveal as="header" className="zone-head zone-serve">
          <div className="container zone-head-inner">
            <div className="zone-chevron">
              <span className="zone-num">Step 4</span>
              <span className="zone-name">Serve</span>
            </div>
            <div className="zone-lead">
              <h2>Serve.</h2>
              <p>Discover what you&apos;re good at and use it to help others and bless the city.</p>
            </div>
          </div>
        </ScrollReveal>

        <section className="section visit serve">
          <div className="container">
            <div className="section-head center">
              <p className="eyebrow">Serve the city</p>
              <h2 className="section-title">
                Discover what you&apos;re good at — and use it.
              </h2>
              <p className="section-intro">
                Your gifts can bless others and bring real hope to Hanoi. Here&apos;s where to start.
              </p>
            </div>
            <div className="duo-grid">
              <article className="min-card">
                <span className="min-bar bar-blue" />
                <h3>CityPartners</h3>
                <p>Serve real needs across Hanoi — bringing hope, skills, and help to the city.</p>
                <Link className="link-arrow" href="/citypartners">
                  Meet CityPartners <span aria-hidden="true">→</span>
                </Link>
              </article>
              <article className="min-card">
                <span className="min-bar bar-red" />
                <h3>Worship &amp; Media</h3>
                <p>Use your gifts in music, sound, and media to help people encounter God.</p>
                <Link className="link-arrow" href="/ministries">
                  See serve teams <span aria-hidden="true">→</span>
                </Link>
              </article>
            </div>
            <ScrollReveal as="p" className="journey-foot">
              Find where you fit —{" "}
              <Link href="/ministries">explore all ministries →</Link>
            </ScrollReveal>
          </div>
        </section>
      </section>

      {/* ============================================================= */}
      {/* ==================== GO ZONE (charcoal) ===================== */}
      {/* ============================================================= */}
      <section className="jzone" id="go">
        <ScrollReveal as="header" className="zone-head zone-go">
          <div className="container zone-head-inner">
            <div className="zone-chevron">
              <span className="zone-num">Step 5</span>
              <span className="zone-name">Go</span>
            </div>
            <div className="zone-lead">
              <h2>Go.</h2>
              <p>Be sent — to love your workplace, your neighbors, your city, and the nations.</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Love the city */}
        <section className="section city" id="city">
          <div className="container city-grid">
            <div className="city-copy reveal">
              <p className="eyebrow">Bigger than a Sunday</p>
              <h2 className="section-title">We&apos;re here to love this city.</h2>
              <p>
                HIF is a missional church — outward-facing by design. In 2012 we launched{" "}
                <strong>Love Hanoi</strong>, serving our city alongside local churches and partners.
                In 2017 we helped host the Love Hanoi Festival: more than 30,000 people came, and
                over 4,500 began following Jesus.
              </p>
              <p>
                That story didn&apos;t stay in Hanoi. Our lead pastor&apos;s book,{" "}
                <em>Love Your City</em>, sparked a movement now active around the world, and HIF is
                a flagship of the Missional International Church Network. In 2025 we marked 30
                years with one theme: <strong>Beyond</strong>.
              </p>
              <Link className="link-arrow" href="/give">
                Be part of what&apos;s next <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="city-stats reveal">
              <div className="stat stat-red">
                <strong>30,000+</strong>
                <span>gathered at the Love Hanoi Festival</span>
              </div>
              <div className="stat stat-purple">
                <strong>4,500+</strong>
                <span>began following Jesus</span>
              </div>
              <div className="stat stat-green">
                <strong>1 book</strong>
                <span>that grew a global movement</span>
              </div>
              <div className="stat stat-blue">
                <strong>3 sites</strong>
                <span>Hanoi · Ecopark · Thai Nguyen</span>
              </div>
            </div>
          </div>
        </section>
      </section>

      {/* ============ STORIES ============ */}
      <section className="section stories" id="stories">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow eyebrow-light">Real lives, real change</p>
            <h2 className="section-title">Stories from our family.</h2>
          </div>
          <div className="story-grid">
            <ScrollReveal as="figure" className="story">
              <blockquote>
                &ldquo;Shaking and in tears, I surrendered everything to Jesus. Almost instantly, His love
                reigned in my heart — turning my anger and bitterness into peace, love, and
                compassion.&rdquo;
              </blockquote>
              <figcaption>
                <span className="story-name">Daniella</span>
                <span className="story-meta">South Africa</span>
              </figcaption>
            </ScrollReveal>
            <ScrollReveal as="figure" className="story">
              <blockquote>
                &ldquo;During Covid I started a TikTok channel to share the good news. The first person I
                connected with became a Christian after two months. Later, ten of my online friends
                were baptized at HIF.&rdquo;
              </blockquote>
              <figcaption>
                <span className="story-name">Tien</span>
                <span className="story-meta">Vietnam</span>
              </figcaption>
            </ScrollReveal>
            <ScrollReveal as="figure" className="story">
              <blockquote>
                &ldquo;They welcomed me like one of their own — treated me like a brother, even helped me
                improve my English. But most importantly, they pointed me to Christ.&rdquo;
              </blockquote>
              <figcaption>
                <span className="story-name">Jean Samuel</span>
                <span className="story-meta">Haiti</span>
              </figcaption>
            </ScrollReveal>
          </div>
          <ScrollReveal as="p" className="journey-foot" style={{ textAlign: "center" }}>
            More lives, more change —{" "}
            <Link href="/stories">read more stories →</Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ============ LOCATIONS ============ */}
      <section className="section locations" id="locations">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Find us</p>
            <h2 className="section-title">Three places to gather.</h2>
          </div>
          <div className="loc-grid">
            <ScrollReveal as="article" className="loc-card">
              <Image
                className="loc-img"
                src="/assets/img/loc-hanoi.jpg"
                alt="HIF Hanoi congregation gathered on a Sunday"
                width={400}
                height={250}
                loading="lazy"
              />
              <div className="loc-body">
                <h3>Hanoi</h3>
                <p className="loc-addr">
                  Detech Building, 8 Tôn Thất Thuyết, Cầu Giấy Ward, Hà Nội 10000
                </p>
                <p className="loc-time">Sundays · 8:30, 10:00 &amp; 11:30 AM</p>
                <a
                  className="link-arrow"
                  href="https://maps.app.goo.gl/Lkq57WNkrt64A2aCA"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions <span aria-hidden="true">→</span>
                </a>
              </div>
            </ScrollReveal>
            <ScrollReveal as="article" className="loc-card">
              <Image
                className="loc-img"
                src="/assets/img/loc-ecopark.jpg"
                alt="HIF Ecopark congregation gathered for a service"
                width={400}
                height={250}
                loading="lazy"
              />
              <div className="loc-body">
                <h3>Ecopark</h3>
                <p className="loc-addr">
                  146 Đ. Thủy Nguyên, Khu đô thị Ecopark, Phụng Công, Hưng Yên
                </p>
                <p className="loc-time">Sundays · 10:00 AM</p>
                <a
                  className="link-arrow"
                  href="https://maps.app.goo.gl/oHVQucWwUddMYU9E7"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions <span aria-hidden="true">→</span>
                </a>
              </div>
            </ScrollReveal>
            <ScrollReveal as="article" className="loc-card">
              <Image
                className="loc-img"
                src="/assets/img/loc-thainguyen.jpg"
                alt="HIF Thai Nguyen outreach gathering of international students and workers"
                width={400}
                height={250}
                loading="lazy"
              />
              <div className="loc-body">
                <h3>
                  Thai Nguyen <span className="loc-badge">Outreach</span>
                </h3>
                <p className="loc-addr">
                  HTTL Thái Nguyên · ngõ 62 Hoàng Văn Thụ, Phan Đình Phùng, Thái Nguyên
                </p>
                <p className="loc-time">Int&apos;l students &amp; workers · get in touch for times</p>
                <a
                  className="link-arrow"
                  href="https://maps.app.goo.gl/gjPaFqJjbDoRdgr39"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions <span aria-hidden="true">→</span>
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ============ WATCH ============ */}
      <section className="section watch" id="watch">
        <div className="container watch-inner reveal">
          <div className="watch-copy">
            <p className="eyebrow eyebrow-light">Can&apos;t make it in person?</p>
            <h2 className="section-title">Worship with us online.</h2>
            <p>
              Join a live service or catch up on recent messages and testimonies from anywhere in
              the world.
            </p>
            <div className="watch-actions">
              <a
                className="btn btn-primary btn-lg"
                href="https://www.youtube.com/@HIFVietnam"
                target="_blank"
                rel="noopener noreferrer"
              >
                All videos on YouTube
              </a>
              <a
                className="btn btn-outline-light btn-lg"
                href="https://www.facebook.com/hifvietnam"
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch on Facebook
              </a>
            </div>
          </div>
          <div className="watch-media">
            <div className="video-embed">
              <iframe
                src="https://www.youtube-nocookie.com/embed/jtWD5zO7k2Q"
                title="Ha's Baptism Testimony — HIF"
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>

        <div className="container recent-msgs reveal">
          <h3 className="recent-title">Recent from HIF</h3>
          <div className="msg-grid">
            <a
              className="msg"
              href="https://www.youtube.com/watch?v=jtWD5zO7k2Q"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="msg-thumb">
                <Image
                  src="/assets/img/yt1.jpg"
                  alt=""
                  width={320}
                  height={180}
                  loading="lazy"
                />
                <span className="msg-play" aria-hidden="true" />
              </span>
              <span className="msg-title">Ha&apos;s Baptism Testimony</span>
            </a>
            <a
              className="msg"
              href="https://www.youtube.com/watch?v=j6MGVTVM1VY"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="msg-thumb">
                <Image
                  src="/assets/img/yt2.jpg"
                  alt=""
                  width={320}
                  height={180}
                  loading="lazy"
                />
                <span className="msg-play" aria-hidden="true" />
              </span>
              <span className="msg-title">Prayer Workshop</span>
            </a>
            <a
              className="msg"
              href="https://www.youtube.com/watch?v=bHAKNOkK01s"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="msg-thumb">
                <Image
                  src="/assets/img/yt3.jpg"
                  alt=""
                  width={320}
                  height={180}
                  loading="lazy"
                />
                <span className="msg-play" aria-hidden="true" />
              </span>
              <span className="msg-title">May 31st Celebration</span>
            </a>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="section final-cta" id="give">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Your next step starts here.</h2>
          <p>
            However you came to this page, there&apos;s room for you. Take one small step this week.
          </p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">
              Plan a visit
            </Link>
            <a className="btn btn-outline-light btn-lg" href="#watch">
              Watch online
            </a>
            <a
              className="btn btn-outline-light btn-lg"
              href="mailto:admin@hif.vn?subject=I'd%20like%20to%20connect%20with%20HIF"
            >
              Get connected
            </a>
          </div>
          <p className="give-line">
            Want to support the mission?{" "}
            <Link href="/give">Give to HIF →</Link>
          </p>
        </div>
      </section>
    </>
  );
}
