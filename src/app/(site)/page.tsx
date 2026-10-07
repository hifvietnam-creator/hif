import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import configPromise from "@payload-config";
import { getPayload } from "payload";
import ScrollReveal from "@/components/ScrollReveal";
import JourneyStrip from "@/components/JourneyStrip";
import HasStrip from "@/components/HasStrip";
import HeroSlides from "@/components/HeroSlides";

// The page is static apart from the latest-sermon chip in the hero.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Hanoi International Fellowship — Find your spiritual home in Hanoi",
  description:
    "One church family in Hanoi, Vietnam, welcoming people from 100+ nations over the years. Wherever you're starting from — curious, finding your way back, or looking for a church home — there's a place for you here.",
};

/**
 * The homepage carries only the first two stages of the Journey. Someone
 * arriving at the website is at TRY or approaching JOIN; Grow, Serve and Go
 * are for people already here and live on /ministries.
 *
 * Two calls to action, one per stage, repeated top and bottom:
 *   TRY  → "Try something this week"  (the four doors below the hero)
 *   JOIN → "Plan your Sunday visit"   (/plan-visit)
 */

// The hero image first, then the rest in rotation.
const HERO_SLIDES = [
  { src: "/assets/IMG_0555.jpg", position: "center 55%" },
  { src: "/assets/welcome/IMG_0326.jpg", position: "center 35%" },
  { src: "/assets/welcome/3.PNG", position: "center 30%" },
  { src: "/assets/welcome/25.PNG", position: "center 60%" },
  { src: "/assets/welcome/4.PNG", position: "center 35%" },
  { src: "/assets/welcome/40.PNG", position: "center 45%" },
];

// The six fellowships leadership lists under JOIN. Each links to its own row
// on /fellowships (the id there is the first word of the group's name).
const FELLOWSHIPS: { name: string; img?: string }[] = [
  { name: "Korean", img: "/assets/img/fellowship-korean.jpg" },
  { name: "Vietnamese", img: "/assets/img/fellowship-vietnamese.jpg" },
  { name: "Filipino", img: "/assets/img/fellowship-filipino.jpg" },
  { name: "Japanese" },
  { name: "Myanmar" },
  { name: "African", img: "/assets/img/fellowship-african.jpg" },
];

type LatestSermon = { title: string; slug: string };

/**
 * The newest published sermon, for the chip in the hero.
 *
 * Sorted on sortDate, not date: undated archive sermons carry a 1900 sentinel
 * there, and Postgres would otherwise put their NULL dates first. Excluding the
 * sentinel as well means an undated sermon can never be presented as "latest".
 *
 * Never throws — a database problem should cost the homepage a chip, not the
 * whole page.
 */
async function getLatestSermon(): Promise<LatestSermon | null> {
  try {
    const payload = await getPayload({ config: configPromise });
    const res = await payload.find({
      collection: "sermons",
      where: {
        and: [
          { _status: { equals: "published" } },
          { sortDate: { greater_than: "1901-01-01" } },
        ],
      },
      sort: "-sortDate",
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: { title: true, slug: true },
    });
    const doc = res.docs[0];
    if (!doc?.title || !doc.slug) return null;
    return { title: doc.title, slug: doc.slug };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const sermon = await getLatestSermon();

  return (
    <>
      <HasStrip />
      {/* ============ HERO ============ */}
      <section className="hero">
        <HeroSlides slides={HERO_SLIDES} />
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
            Curious, finding your way back, or looking for a church family far from home —
            there&apos;s a place for you here.
          </ScrollReveal>
          <ScrollReveal className="hero-actions">
            <a className="btn btn-primary btn-lg" href="#try">
              Try something this week
            </a>
            <Link className="btn btn-outline-light btn-lg" href="/plan-visit">
              Plan your Sunday visit
            </Link>
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
          {sermon && (
            <ScrollReveal>
              <Link className="sermon-chip" href={`/sermons/${sermon.slug}`}>
                <span className="sermon-chip-play" aria-hidden="true" />
                <span className="sermon-chip-text">
                  <span className="sermon-chip-label">Watch the latest sermon</span>
                  <span className="sermon-chip-title">{sermon.title}</span>
                </span>
              </Link>
            </ScrollReveal>
          )}
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
              <p>
                Four easy ways to meet people from HIF. No commitment, and no belief required.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <section className="section start">
          <div className="container">
            <div className="section-head center">
              <p className="eyebrow">Start anywhere</p>
              <h2 className="section-title">Pick whichever sounds like you.</h2>
              <p className="section-intro">
                You don&apos;t need to have anything figured out. Come once, see who you meet.
              </p>
            </div>
            <div className="min-grid">
              <Link className="min-card" href="/sports">
                <span className="min-bar bar-red" />
                <h3>Sports</h3>
                <p>
                  Pickleball, football and volleyball with players from a dozen-plus countries —
                  beginners and regulars alike.
                </p>
                <span className="min-more">
                  See the games <span aria-hidden="true">→</span>
                </span>
              </Link>
              <Link className="min-card" href="/spotlight">
                <span className="min-bar bar-red" />
                <h3>Spotlight English Club</h3>
                <p>A free, friendly evening to practise English and make friends.</p>
                <span className="min-when">Mondays &amp; Wednesdays · 6:30pm</span>
                <span className="min-more">
                  About Spotlight <span aria-hidden="true">→</span>
                </span>
              </Link>
              <Link className="min-card" href="/alpha">
                <span className="min-bar bar-red" />
                <h3>Alpha</h3>
                <p>
                  A meal, a short talk and an open conversation about life and faith — no question
                  off-limits.
                </p>
                <span className="min-more">
                  Explore Alpha <span aria-hidden="true">→</span>
                </span>
              </Link>
              <Link className="min-card" href="/saranbang">
                <span className="min-bar bar-red" />
                <h3>Saranbang</h3>
                <p>A Korean conversation club — practise Korean and make friends.</p>
                <span className="min-more">
                  About Saranbang <span aria-hidden="true">→</span>
                </span>
              </Link>
            </div>
            <ScrollReveal as="p" className="journey-foot">
              Curious about faith itself?{" "}
              <Link href="/jesus">Start with who Jesus is →</Link>
            </ScrollReveal>
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
              <p>The places you become known — on a Sunday and through the week.</p>
            </div>
          </div>
        </ScrollReveal>

        <section className="section ministries zone-join-cards" id="ministries">
          <div className="container">
            <div className="section-head center">
              <p className="eyebrow">Find your people</p>
              <h2 className="section-title">Three ways to become part of the family.</h2>
            </div>
            <div className="min-grid min-grid-3">
              <a className="min-card" href="#visit">
                <span className="min-bar bar-purple" />
                <h3>Sunday services</h3>
                <p>
                  Music, a down-to-earth message and coffee after — in English, with KidzQuest for
                  children.
                </p>
                <span className="min-more">
                  Times &amp; what to expect <span aria-hidden="true">↓</span>
                </span>
              </a>
              <Link className="min-card" href="/connect">
                <span className="min-bar bar-purple" />
                <h3>Connect Groups</h3>
                <p>Small circles that meet through the week to share life, food and faith.</p>
                <span className="min-more">
                  Find a group <span aria-hidden="true">→</span>
                </span>
              </Link>
              <Link className="min-card" href="/fellowships">
                <span className="min-bar bar-purple" />
                <h3>Ethnic Fellowships</h3>
                <p>
                  Worship and friendship in your heart language — Korean, Vietnamese, Filipino,
                  Japanese, Myanmar and African.
                </p>
                <span className="min-more">
                  Meet the fellowships <span aria-hidden="true">→</span>
                </span>
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
            <div className="fellow-grid fellow-grid-6">
              {FELLOWSHIPS.map((f, i) => (
                <Link
                  key={f.name}
                  className={`fellow${f.img ? "" : ` fellow-plain${i % 2 ? " alt" : ""}`}`}
                  href={`/fellowships#${f.name.toLowerCase()}`}
                >
                  {f.img && (
                    <Image
                      src={f.img}
                      alt={`${f.name} Fellowship`}
                      width={320}
                      height={200}
                      loading="lazy"
                    />
                  )}
                  <span className="fellow-name">{f.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Sunday services */}
        <section className="section visit" id="visit">
          <div className="container">
            <div className="visit-grid">
              <div className="visit-copy reveal">
                <p className="eyebrow">Sunday services</p>
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
                  <Link className="btn btn-primary" href="/plan-visit">
                    Plan your Sunday visit
                  </Link>
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
                  <Link href="/locations">Addresses &amp; directions →</Link>
                  <br />
                  Can&apos;t make it in person? <Link href="/online">Watch live online →</Link>
                </p>
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

      {/* ============ FINAL CTA ============ */}
      <section className="section final-cta" id="give">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Your next step starts here.</h2>
          <p>
            However you came to this page, there&apos;s room for you. Take one small step this week.
          </p>
          <div className="final-actions">
            <a className="btn btn-primary btn-lg" href="#try">
              Try something this week
            </a>
            <Link className="btn btn-outline-light btn-lg" href="/plan-visit">
              Plan your Sunday visit
            </Link>
          </div>
          <p className="give-line">
            Already part of HIF? <Link href="/ministries">Grow, serve and go →</Link>
          </p>
        </div>
      </section>
    </>
  );
}
