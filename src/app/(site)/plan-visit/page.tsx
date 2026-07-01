import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Plan a Visit — Hanoi International Fellowship",
  description:
    "First time at HIF? Here's everything you need — what to expect on a Sunday, service times, how to find us, care for your kids, and answers to common questions.",
  openGraph: {
    title: "Plan a Visit — Hanoi International Fellowship",
    description: "We can't wait to meet you. Here's everything you need for your first Sunday.",
    type: "website",
  },
};

export default function PlanVisitPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero has-photo">
        <div
          className="page-photo"
          style={{
            backgroundImage: "url('/assets/img/visit-welcome.jpg')",
            backgroundPosition: "center 30%",
          }}
          aria-hidden="true"
        />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Plan a Visit
          </p>
          <p className="eyebrow eyebrow-light">Plan your visit</p>
          <h1>
            We can&apos;t wait<br />
            to meet you.
          </h1>
          <p className="page-lead">
            Thinking about coming for the first time? Relax — here&apos;s everything you need to know,
            so all you have to do is show up. You&apos;ll be welcome exactly as you are.
          </p>
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="section">
        <div className="container">
          <div className="visit-grid">
            <div className="visit-copy reveal">
              <p className="eyebrow">What to expect</p>
              <h2 className="section-title">What a Sunday looks like.</h2>
              <ul className="ticks">
                <li>Come exactly as you are — there&apos;s no dress code.</li>
                <li>Friendly faces at the door will help you find your way and your seat.</li>
                <li>Brilliant, safe care for your kids — from nursery to teens.</li>
                <li>About 75 minutes: music, a down-to-earth message, and coffee after.</li>
                <li>Everything is in English, with a warm welcome for every nation.</li>
                <li>No pressure to give, sign up, or stand out — just come and see.</li>
              </ul>
              <div className="visit-actions">
                <a
                  className="btn btn-primary"
                  href="mailto:admin@hif.vn?subject=I'd%20like%20to%20visit%20HIF"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Let us know you&apos;re coming
                </a>
                <a className="btn btn-ghost" href="#locations">See locations &amp; times</a>
              </div>
            </div>
            <div className="visit-times reveal">
              <h3 className="times-title">Service times</h3>
              <div className="time-card">
                <div className="time-loc">
                  <span className="dot dot-red"></span>Hanoi · Detech Tower
                </div>
                <ul>
                  <li><strong>8:30 AM</strong> <span>Gathering</span></li>
                  <li><strong>10:00 AM</strong> <span>Gathering + KidzQuest</span></li>
                  <li><strong>11:30 AM</strong> <span>Vietnamese Fellowship</span></li>
                </ul>
              </div>
              <div className="time-card">
                <div className="time-loc">
                  <span className="dot dot-green"></span>Ecopark
                </div>
                <ul>
                  <li><strong>10:00 AM</strong> <span>Gathering on-site</span></li>
                </ul>
              </div>
              <p className="time-note">
                Can&apos;t make it in person?{" "}
                <Link href="/#watch">Watch live online →</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOR YOUR KIDS */}
      <section className="section about">
        <div className="container about-grid">
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
          <div className="about-copy reveal">
            <p className="eyebrow">Bringing the family?</p>
            <h2 className="section-title">Your kids are in great hands.</h2>
            <p>
              From nursery to teens, we have safe, fun, age-appropriate programs running during our
              gatherings — with a secure check-in and screened, caring volunteers. Your children will
              be loved and looked after while you worship.
            </p>
            <Link className="link-arrow" href="/kids">
              Learn about KidzQuest <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* LOCATIONS */}
      <section className="section locations" id="locations">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Getting here</p>
            <h2 className="section-title">Find your nearest gathering.</h2>
          </div>
          <div className="loc-grid">
            <article className="loc-card reveal">
              <Image
                className="loc-img"
                src="/assets/img/loc-hanoi.jpg"
                alt="HIF Hanoi congregation"
                width={400}
                height={240}
                loading="lazy"
              />
              <div className="loc-body">
                <h3>Hanoi</h3>
                <p className="loc-addr">Detech Building, 8 Tôn Thất Thuyết, Cầu Giấy Ward, Hà Nội 10000</p>
                <p className="loc-time">Sundays · 8:30, 10:00 &amp; 11:30 AM</p>
                <a
                  className="link-arrow"
                  href="https://maps.google.com/?q=Detech+Tower+Ton+That+Thuyet+Hanoi"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
            <article className="loc-card reveal">
              <Image
                className="loc-img"
                src="/assets/img/loc-ecopark.jpg"
                alt="HIF Ecopark congregation"
                width={400}
                height={240}
                loading="lazy"
              />
              <div className="loc-body">
                <h3>Ecopark</h3>
                <p className="loc-addr">146 Thuy Nguyen, Ecopark, Hung Yen</p>
                <p className="loc-time">Sundays · 10:00 AM</p>
                <a
                  className="link-arrow"
                  href="https://maps.google.com/?q=Ecopark+Hung+Yen+Vietnam"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
            <article className="loc-card reveal">
              <Image
                className="loc-img"
                src="/assets/img/loc-thainguyen.jpg"
                alt="HIF Thai Nguyen outreach"
                width={400}
                height={240}
                loading="lazy"
              />
              <div className="loc-body">
                <h3>Thai Nguyen <span className="loc-badge">Outreach</span></h3>
                <p className="loc-addr">A growing community for international students and workers.</p>
                <p className="loc-time">Get in touch for times</p>
                <a
                  className="link-arrow"
                  href="mailto:admin@hif.vn?subject=Thai%20Nguyen%20gathering"
                >
                  Ask about Thai Nguyen <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Good to know</p>
            <h2 className="section-title">Your questions, answered.</h2>
          </div>
          <div className="faq reveal">
            <details>
              <summary>What should I wear?</summary>
              <p>Whatever&apos;s comfortable. You&apos;ll see everything from smart to casual — come as you are.</p>
            </details>
            <details>
              <summary>I&apos;m not religious / I&apos;ve never been to church. Is that okay?</summary>
              <p>Completely. Many people here are exploring for the first time. There&apos;s no pressure and nothing you need to know or do in advance — just come and see.</p>
            </details>
            <details>
              <summary>How long is a service?</summary>
              <p>Around 75 minutes, followed by coffee and conversation if you&apos;d like to stay.</p>
            </details>
            <details>
              <summary>What about my kids?</summary>
              <p>We have safe, fun programs from nursery to teens during the gathering, with secure check-in.{" "}
                <Link href="/kids">Learn more about KidzQuest →</Link>
              </p>
            </details>
            <details>
              <summary>Is everything in English?</summary>
              <p>Yes — our gatherings are in English, with a warm welcome for people from every nation. We also have a Vietnamese Fellowship and other heart-language fellowships.</p>
            </details>
            <details>
              <summary>Will I be asked to give money or sign up for anything?</summary>
              <p>No. Giving is part of our family&apos;s worship, but there&apos;s never any pressure on guests. Just relax and enjoy your visit.</p>
            </details>
            <details>
              <summary>How do I find you / where do I park?</summary>
              <p>See the locations above for maps and directions. When you arrive, look for our welcome team — they&apos;ll help you with parking and getting to the right place.</p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Tell us you&apos;re coming.</h2>
          <p>Drop us a quick note and we&apos;ll look out for you — and have someone ready to say hello.</p>
          <div className="final-actions">
            <a
              className="btn btn-primary btn-lg"
              href="mailto:admin@hif.vn?subject=I'd%20like%20to%20visit%20HIF&body=Hi%20HIF%20team%2C%20I'd%20like%20to%20plan%20a%20visit.%20Here's%20a%20bit%20about%20me%3A"
            >
              Let us know you&apos;re coming
            </a>
            <Link className="btn btn-outline-light btn-lg" href="/#watch">
              Watch online first
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
