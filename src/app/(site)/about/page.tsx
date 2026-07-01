import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import configPromise from "@payload-config";
import { getPayload } from "payload";
import TeamCarousel, { type TeamMemberCard } from "./TeamCarousel";

export const revalidate = 3600; // re-fetch team once per hour

export const metadata: Metadata = {
  title: "Our Story — Hanoi International Fellowship",
  description:
    "From a living room in 1995 to a church family that has welcomed people from 100+ nations across three congregations. Meet HIF — our story, our heart, and the team that serves it.",
  openGraph: {
    title: "Our Story — Hanoi International Fellowship",
    description: "Three decades. A hundred nations. One city to love.",
    type: "website",
  },
};

// ── helpers ───────────────────────────────────────────────────────────────────

const INITIALS_COLORS = [
  "var(--red)",
  "var(--purple)",
  "var(--blue)",
  "var(--charcoal)",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function AboutPage() {
  const payload = await getPayload({ config: configPromise });

  const teamRes = await payload.find({
    collection: "team",
    where: { staffMember: { equals: true } },
    sort: "order",
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });

  // Serialize to plain objects for the client component
  const teamMembers: TeamMemberCard[] = teamRes.docs.map((m, i) => ({
    id: String(m.id),
    name: m.name as string,
    role: m.role as string,
    bio: (m.bio as string | null) ?? null,
    email: (m.email as string | null) ?? null,
    photoUrl:
      m.photo &&
      typeof m.photo === "object" &&
      "url" in m.photo &&
      (m.photo as { url?: string | null }).url
        ? (m.photo as { url: string }).url
        : null,
    initials: getInitials(m.name as string),
    color: INITIALS_COLORS[i % INITIALS_COLORS.length]!,
  }));

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Our Story
          </p>
          <p className="eyebrow eyebrow-light">About HIF · Beyond</p>
          <h1>
            Three decades.<br />
            A hundred nations.<br />
            One city to love.
          </h1>
          <p className="page-lead">
            We&apos;re an international church family in Hanoi — a kaleidoscope of cultures
            learning to follow Jesus and love this city together. Here&apos;s how we got here,
            what we&apos;re about, and who helps lead the way.
          </p>
        </div>
      </section>

      {/* STORY + TIMELINE */}
      <section className="section">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">Our story</p>
            <h2 className="section-title">It started in a living room.</h2>
            <p className="lead-para">
              In August 1995, a dozen people gathered in a Hanoi living room to worship,
              study the Bible, and encourage one another far from home.
            </p>
            <p>
              God grew that little gathering. We moved from a living room to hotel ballrooms
              across the city, and in 2013 into our own home in Detech Tower. Today HIF is a
              family from more than a hundred nations across three congregations — Hanoi,
              Ecopark, and a growing outreach in Thai Nguyen — with our heart still set on the
              same things: knowing Jesus, becoming family, and loving Hanoi.
            </p>
            <a className="link-arrow" href="/#visit">
              Come and see for yourself <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="about-media reveal">
            <Image
              className="about-img"
              src="/assets/img/about-family.jpg"
              alt="The HIF church family from many nations"
              width={600}
              height={450}
              loading="lazy"
            />
          </div>
        </div>

        <div className="container" style={{ marginTop: "clamp(48px, 7vw, 80px)" }}>
          <ol className="timeline reveal">
            <li className="tl-item">
              <div className="tl-year">1995</div>
              <h3>A living room</h3>
              <p>A dozen people begin meeting to worship and study the Bible together.</p>
            </li>
            <li className="tl-item">
              <div className="tl-year">1998 – 2013</div>
              <h3>Hotel ballrooms across Hanoi</h3>
              <p>The church grows through the Daewoo, Bao Son, Intercontinental and Crowne Plaza.</p>
            </li>
            <li className="tl-item">
              <div className="tl-year">2012</div>
              <h3>Love Hanoi begins</h3>
              <p>HIF launches a citywide campaign to serve Hanoi for the common good.</p>
            </li>
            <li className="tl-item">
              <div className="tl-year">2013</div>
              <h3>A home at Detech Tower</h3>
              <p>HIF builds out its own floor — and becomes a hub for the wider Christian community.</p>
            </li>
            <li className="tl-item">
              <div className="tl-year">2017</div>
              <h3>The Love Hanoi Festival</h3>
              <p>More than 30,000 people gather; over 4,500 begin following Jesus.</p>
            </li>
            <li className="tl-item">
              <div className="tl-year">2025 &amp; beyond</div>
              <h3>Three congregations and counting</h3>
              <p>
                30 years on, HIF gathers in Hanoi and Ecopark with an outreach in Thai Nguyen — theme:{" "}
                <strong>Beyond</strong>.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* HISTORY GALLERY */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Through the years</p>
            <h2 className="section-title">From living rooms to landmarks.</h2>
            <p className="section-intro">
              A few glimpses from three decades of God growing this family in Hanoi.
            </p>
          </div>
          <div className="gallery reveal">
            <figure>
              <Image src="/assets/img/history-founding.jpg" alt="HIF in its early years" width={400} height={300} loading="lazy" />
              <figcaption><b>The early years</b> · where it began</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/history-daewoo.jpg" alt="HIF gathered at the Daewoo Hotel" width={400} height={300} loading="lazy" />
              <figcaption><b>Daewoo Hotel</b> · 1998–2003</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/history-daewoo-youth.jpg" alt="Worship in the Daewoo years" width={400} height={300} loading="lazy" />
              <figcaption><b>Worship</b> · the Daewoo years</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/history-baoson.jpg" alt="HIF fellowship at the Bao Son Hotel" width={400} height={300} loading="lazy" />
              <figcaption><b>Bao Son Hotel</b> · 2003–2009</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/history-baoson-worship.jpg" alt="Worship at the Bao Son Hotel" width={400} height={300} loading="lazy" />
              <figcaption><b>Worship</b> · at Bao Son</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/history-bloemberg-2003.jpg" alt="The Bloemberg family in 2003" width={400} height={300} loading="lazy" />
              <figcaption><b>The Bloemberg family</b> · 2003</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* WHAT WE'RE ABOUT */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">What we&apos;re about</p>
            <h2 className="section-title">Four things that shape everything.</h2>
          </div>
          <div className="min-grid">
            <article className="min-card">
              <span className="min-bar bar-red"></span>
              <h3>Jesus at the center</h3>
              <p>We&apos;re not the point — He is. Everything we do points people to real life in Jesus.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-purple"></span>
              <h3>Many nations, one family</h3>
              <p><em>Polypoikilos</em> — the many-colored beauty that appears when different people become one.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-blue"></span>
              <h3>You&apos;re the hero</h3>
              <p>This is your story. We&apos;re the guide, walking with you and pointing the way — no Christianese required.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-green"></span>
              <h3>Sent to love the city</h3>
              <p>We&apos;re outward-facing by design — here to serve Hanoi with our hands and feet.</p>
            </article>
          </div>
        </div>
      </section>

      {/* MOVEMENT */}
      <section className="section kaleido-band">
        <div className="kaleido-bg" aria-hidden="true" />
        <div className="container prose center" style={{ textAlign: "center" }}>
          <p className="eyebrow">A movement, not a moment</p>
          <h2 className="section-title">What started here didn&apos;t stay here.</h2>
          <p>
            Out of the Love Hanoi story, our lead pastor wrote <em>Love Your City</em> — a book
            and a model that has sparked city movements around the world. HIF is a flagship
            church of the Missional International Church Network (MICN), and we&apos;re still
            planting and sending: a second congregation in Ecopark, an outreach in Thai Nguyen,
            and people sent out from Hanoi to the nations.
          </p>
          <p>
            <Link className="link-arrow" href="/ministries">
              See how we live this out <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Leadership</p>
            <h2 className="section-title">Who helps lead the way.</h2>
            <p className="section-intro">
              Meet the team that keeps HIF running — pastors, directors, and staff serving
              this church family every day.
            </p>
          </div>

          {teamMembers.length > 0 ? (
            <TeamCarousel members={teamMembers} />
          ) : (
            /* Fallback — until team members are added in the admin */
            <div className="leaders">
              <div className="leader"><h3>Kester Scandrett</h3><div className="role">Chairman</div></div>
              <div className="leader"><h3>Jody Goodwin</h3><div className="role">Secretary</div></div>
              <div className="leader"><h3>Peter de Fretes</h3><div className="role">Treasurer</div></div>
              <div className="leader"><h3>JV Sundersingh</h3><div className="role">Elder</div></div>
              <div className="leader"><h3>Jimmy Lee</h3><div className="role">Youth &amp; Alpha</div></div>
              <div className="leader"><h3>Michael Walls</h3><div className="role">Outreach</div></div>
            </div>
          )}
        </div>
      </section>

      {/* MEMBERSHIP */}
      <section className="section about">
        <div className="container prose center" style={{ textAlign: "center" }}>
          <p className="eyebrow">Belong</p>
          <h2 className="section-title">Make HIF your church home.</h2>
          <p>
            If HIF has become your family, membership is how you make it official — affirming our shared faith
            and committing to one another. Members agree with HIF&apos;s Statement of Faith and Constitution, are
            active in the life of the church, and are 18 or older; the Elders Team welcomes each one.
          </p>
          <p style={{ marginTop: "22px" }}>
            <Link className="btn btn-primary" href="/next-steps#membership">
              How to become a member
            </Link>
            {" "}
            <Link className="btn btn-ghost" href="/beliefs">
              Read our Statement of Faith
            </Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Come be part of the story.</h2>
          <p>The best way to get to know us is to show up. We&apos;d love to meet you this Sunday.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/#visit">Plan a visit</Link>
            <Link className="btn btn-outline-light btn-lg" href="/next-steps">Take a next step</Link>
            <Link className="btn btn-outline-light btn-lg" href="/ministries">Explore ministries</Link>
          </div>
        </div>
      </section>
    </>
  );
}
