import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import configPromise from "@payload-config";
import { getPayload } from "payload";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fellowships — Hanoi International Fellowship",
  description:
    "HIF's ethnic fellowships — worship and friendship in your heart language. Vietnamese, Korean, Filipino, African and more, gathering alongside the wider church family.",
  openGraph: {
    title: "Fellowships — Hanoi International Fellowship",
    description: "Worship in your heart language — many nations, one family.",
    type: "website",
  },
};

const FELLOWSHIPS_URL =
  "https://hifvn.churchcenter.com/groups/fellowships?enrollment=open_signup%2Crequest_to_join&filter=enrollment";

// Fallback color tiles when no PCO image is available (cycle by index)
const FALLBACK_COLORS = [
  "var(--red)",
  "var(--purple)",
  "var(--blue)",
  "var(--charcoal)",
  "var(--green)",
];

export default async function FellowshipsPage() {
  const payload = await getPayload({ config: configPromise });

  const result = await payload.find({
    collection: "groups",
    where: {
      and: [
        { groupType: { equals: "fellowship" } },
        { listed: { equals: true } },
      ],
    },
    sort: "name",
    limit: 20,
    depth: 0,
    overrideAccess: false,
  });

  const fellowships = result.docs;

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero has-photo">
        <div
          className="page-photo"
          style={{
            backgroundImage: "url('/assets/img/fellowship-african.jpg')",
            backgroundPosition: "center 38%",
          }}
          aria-hidden="true"
        />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Fellowships
          </p>
          <p className="eyebrow eyebrow-light">Fellowships · belong</p>
          <h1>
            Worship in your<br />heart language.
          </h1>
          <p className="page-lead">
            HIF is one family from a hundred-plus nations. Our fellowships are places to find people
            from home, worship in your heart language, and make new friends from everywhere else.
          </p>
          <div className="final-actions" style={{ justifyContent: "flex-start", marginTop: "30px" }}>
            <a
              className="btn btn-primary btn-lg"
              href={FELLOWSHIPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Find a fellowship
            </a>
            <a className="btn btn-outline-light btn-lg" href="#fellowships">See our fellowships</a>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="section" id="about-fellowships">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">Many nations, one family</p>
            <h2 className="section-title">Home, away from home.</h2>
            <p>
              Living far from your passport country is a gift and a challenge. Our fellowships gather
              people of shared language and culture to worship, share food, pray, and look out for one
              another — a true home away from home.
            </p>
            <p>
              They&apos;re not separate from the church — they&apos;re part of it. We gather as one HIF family on
              Sundays, and our fellowships add an extra place to belong through the week.
            </p>
            <a
              className="link-arrow"
              href={FELLOWSHIPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Browse all fellowships <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="about-media reveal">
            <Image
              className="about-img"
              src="/assets/img/about-family.jpg"
              alt="HIF — one family from many nations"
              width={600}
              height={450}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* THE FELLOWSHIPS — image-left / description-right */}
      <section className="section about" id="fellowships">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Our fellowships</p>
            <h2 className="section-title">Find your people.</h2>
            <p className="section-intro">
              A few of the communities that gather at HIF — with more forming all the time.
            </p>
          </div>

          {fellowships.length > 0 ? (
            <div className="fellowship-list">
              {fellowships.map((f, i) => {
                const imageUrl = f.imageUrl as string | null;
                const description = f.description as string | null;
                const href = (f.churchCenterUrl as string | null) ?? FELLOWSHIPS_URL;
                const enrollmentOpen = f.enrollmentOpen as boolean;
                const fallbackColor = FALLBACK_COLORS[i % FALLBACK_COLORS.length]!;

                return (
                  <article key={String(f.id)} className="fellowship-row reveal">
                    {/* Left: image */}
                    <div className="fellowship-img">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={`${f.name as string} Fellowship`}
                          fill
                          sizes="(max-width: 768px) 100vw, 40vw"
                          style={{ objectFit: "cover" }}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="fellowship-color-block"
                          style={{ background: fallbackColor }}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Right: content */}
                    <div className="fellowship-body">
                      <h3 className="fellowship-name">{f.name as string}</h3>
                      {f.schedule && (
                        <p className="fellowship-schedule">{f.schedule as string}</p>
                      )}
                      {description && (
                        <p className="fellowship-desc">{description}</p>
                      )}
                      {f.contactEmail && (
                        <p className="fellowship-contact">
                          <a href={`mailto:${f.contactEmail as string}`}>{f.contactEmail as string}</a>
                        </p>
                      )}
                      <div className="fellowship-actions">
                        <a
                          href={href}
                          className="btn btn-primary"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {enrollmentOpen ? "Join this fellowship" : "Learn more"}
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Fallback grid if no PCO data yet */
            <div className="fellow-grid">
              {[
                { name: "Vietnamese", img: "/assets/img/fellowship-vietnamese.jpg" },
                { name: "Korean", img: "/assets/img/fellowship-korean.jpg" },
                { name: "Filipino", img: "/assets/img/fellowship-filipino.jpg" },
                { name: "African", img: "/assets/img/fellowship-african.jpg" },
              ].map((f) => (
                <a
                  key={f.name}
                  className="fellow"
                  href={FELLOWSHIPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src={f.img} alt={`${f.name} Fellowship`} width={300} height={300} loading="lazy" />
                  <span className="fellow-name">{f.name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FIND A FELLOWSHIP CTA */}
      <section className="section">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div
              className="quote-photo"
              style={{
                backgroundImage: "url('/assets/img/hero-photo.jpg')",
                backgroundPosition: "center 32%",
              }}
              aria-hidden="true"
            />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">Ready to connect?</p>
              <p className="kaleido-quote-text">Find your fellowship.</p>
              <p className="kaleido-quote-sub">
                See which fellowships are open to join, and sign up — it only takes a minute.
              </p>
              <div className="final-actions" style={{ marginTop: "26px" }}>
                <a
                  className="btn btn-primary btn-lg"
                  href={FELLOWSHIPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Browse &amp; join a fellowship
                </a>
                <a
                  className="btn btn-outline-light btn-lg"
                  href="mailto:admin@hif.vn?subject=Finding%20a%20fellowship"
                >
                  Need help?
                </a>
              </div>
              <p className="kaleido-quote-sub" style={{ marginTop: "18px", fontSize: ".85rem", opacity: 0.7 }}>
                Our directory opens in Church Center, our secure groups platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* START ONE */}
      <section className="section about">
        <div className="container prose center" style={{ textAlign: "center" }}>
          <p className="eyebrow">Don&apos;t see yours?</p>
          <h2 className="section-title">Help start a new one.</h2>
          <p>
            We&apos;re a hundred-plus nations and growing — if there isn&apos;t a fellowship for your community yet,
            we&apos;d love to help you start one. Reach out and let&apos;s talk.
          </p>
          <p>
            <a
              className="link-arrow"
              href="mailto:admin@hif.vn?subject=Starting%20a%20fellowship"
            >
              Talk to us about starting a fellowship <span aria-hidden="true">→</span>
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>You belong here.</h2>
          <p>Come as you are, and find a family that speaks your language — in every sense.</p>
          <div className="final-actions">
            <a
              className="btn btn-primary btn-lg"
              href={FELLOWSHIPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Find a fellowship
            </a>
            <Link className="btn btn-outline-light btn-lg" href="/plan-visit">
              Plan a visit first
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
