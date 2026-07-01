import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import configPromise from "@payload-config";
import { getPayload } from "payload";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Connect Groups — Hanoi International Fellowship",
  description:
    "Connect Groups are where HIF becomes family — small circles that meet through the week across Hanoi to share life, food, and faith. Find your group and belong.",
  openGraph: {
    title: "Connect Groups — Hanoi International Fellowship",
    description: "You weren't made to do life alone. Find your group.",
    type: "website",
  },
};

const CONNECT_GROUPS_URL = "https://hifvn.churchcenter.com/groups/connect-groups";

export default async function ConnectPage() {
  const payload = await getPayload({ config: configPromise });

  const result = await payload.find({
    collection: "groups",
    where: {
      and: [
        { groupType: { equals: "connect-group" } },
        { listed: { equals: true } },
      ],
    },
    sort: "name",
    limit: 30,
    depth: 0,
    overrideAccess: false,
  });

  const groups = result.docs;

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Connect Groups
          </p>
          <p className="eyebrow eyebrow-light">Connect Groups · belong</p>
          <h1>
            Life is better<br />together.
          </h1>
          <p className="page-lead">
            Sunday is where we gather; Connect Groups are where we become family. They&apos;re small
            circles that meet through the week across Hanoi to share life, food, and faith.
          </p>
          <div className="final-actions" style={{ justifyContent: "flex-start", marginTop: "30px" }}>
            <a
              className="btn btn-primary btn-lg"
              href={CONNECT_GROUPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Find a group
            </a>
            <a className="btn btn-outline-light btn-lg" href="#groups">Browse groups</a>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="section" id="about-groups">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">Why groups</p>
            <h2 className="section-title">You weren&apos;t made to do life alone.</h2>
            <p>
              It&apos;s hard to really know people — and be known — in a crowd. Connect Groups are where
              friendships grow, faith gets real, and people show up for each other through the ups and
              downs of life far from home.
            </p>
            <p>
              Groups meet in homes and cafés around the city. Some are for men, women, couples, young
              adults, or families; others are based on where you live. Wherever you&apos;re at, there&apos;s a
              place for you.
            </p>
            <a
              className="link-arrow"
              href={CONNECT_GROUPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Browse all groups <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="about-media reveal">
            <Image
              className="about-img"
              src="/assets/img/about.jpg"
              alt="An HIF connect group sharing a meal together"
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
            <p className="eyebrow">What to expect</p>
            <h2 className="section-title">Come as you are.</h2>
          </div>
          <div className="min-grid">
            <article className="min-card">
              <span className="min-bar bar-red"></span>
              <h3>Through the week</h3>
              <p>Most groups meet weekly or fortnightly, in the evenings or on weekends.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-purple"></span>
              <h3>Around the city</h3>
              <p>In homes and cafés near where you live and work — find one that&apos;s convenient for you.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-green"></span>
              <h3>Food &amp; friendship</h3>
              <p>Share a meal or a drink, swap stories, and build real friendships across cultures.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-blue"></span>
              <h3>Faith &amp; prayer</h3>
              <p>Talk honestly about life and faith, and support one another in prayer.</p>
            </article>
          </div>
        </div>
      </section>

      {/* GROUPS GRID */}
      {groups.length > 0 && (
        <section className="section" id="groups">
          <div className="container">
            <div className="section-head center">
              <p className="eyebrow">Our groups</p>
              <h2 className="section-title">Find your people.</h2>
              <p className="section-intro">
                Groups are forming all the time — see what fits your schedule and where you live.
              </p>
            </div>
            <div className="cg-grid">
              {groups.map((g) => {
                const href = (g.churchCenterUrl as string | null) ?? CONNECT_GROUPS_URL;
                const imageUrl = g.imageUrl as string | null;
                const description = g.description as string | null;
                const schedule = g.schedule as string | null;
                const enrollmentOpen = g.enrollmentOpen as boolean;

                return (
                  <article key={String(g.id)} className="cg-card reveal">
                    <div className="cg-img">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={`${g.name} group`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          style={{ objectFit: "cover" }}
                          loading="lazy"
                        />
                      ) : (
                        <div className="cg-img-placeholder kaleido-bg" aria-hidden="true" />
                      )}
                    </div>
                    <div className="cg-body">
                      <h3 className="cg-name">{g.name as string}</h3>
                      {schedule && <p className="cg-schedule">{schedule}</p>}
                      {description && (
                        <p className="cg-desc">
                          {description.length > 130
                            ? description.slice(0, 130).trimEnd() + "…"
                            : description}
                        </p>
                      )}
                      <div className="cg-actions">
                        <a
                          href={href}
                          className="btn btn-sm btn-ghost"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Learn more
                        </a>
                        {enrollmentOpen && (
                          <a
                            href={href}
                            className="btn btn-sm btn-primary"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Join
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FIND A GROUP CTA */}
      <section className="section">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div className="kaleido-bg" aria-hidden="true" />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">Ready to belong?</p>
              <p className="kaleido-quote-text">Find your group.</p>
              <p className="kaleido-quote-sub">
                Browse current groups, see what fits your schedule and stage of life, and sign up — it only takes a minute.
              </p>
              <div className="final-actions" style={{ marginTop: "26px" }}>
                <a
                  className="btn btn-primary btn-lg"
                  href={CONNECT_GROUPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Browse &amp; join a group
                </a>
                <a
                  className="btn btn-outline-light btn-lg"
                  href="mailto:admin@hif.vn?subject=Help%20finding%20a%20Connect%20Group"
                >
                  Need help choosing?
                </a>
              </div>
              <p className="kaleido-quote-sub" style={{ marginTop: "18px", fontSize: ".85rem", opacity: 0.7 }}>
                Our group directory opens in Church Center, our secure groups platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LEAD A GROUP */}
      <section className="section about">
        <div className="container prose center" style={{ textAlign: "center" }}>
          <p className="eyebrow">Go further</p>
          <h2 className="section-title">Could you host or lead?</h2>
          <p>
            Some of the most meaningful growth happens when you open your home and help others belong.
            You don&apos;t need to be an expert — just willing. We&apos;ll train and support you every step of the way.
          </p>
          <p>
            <a
              className="link-arrow"
              href="mailto:admin@hif.vn?subject=Leading%20a%20Connect%20Group"
            >
              Talk to us about leading <span aria-hidden="true">→</span>
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Your people are waiting.</h2>
          <p>Take the next step from the crowd into a community that knows your name.</p>
          <div className="final-actions">
            <a
              className="btn btn-primary btn-lg"
              href={CONNECT_GROUPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Find a group
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
