import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

/**
 * Saranbang — "a Korean-speaking club like Spotlight, but Korean", for people
 * learning Korean. Thursdays 6:30–8:30pm at HIF. Cost and a named contact have
 * not been supplied, so the page does not state either.
 */

export const metadata: Metadata = {
  title: "Saranbang Korean Club — Hanoi International Fellowship",
  description:
    "Saranbang is HIF's Korean conversation club for people learning Korean — practise, make friends, and feel at home in Hanoi. Thursdays, 6:30–8:30pm.",
  openGraph: {
    title: "Saranbang Korean Club — Hanoi International Fellowship",
    description: "Practise Korean, make friends, and connect — every Thursday, 6:30–8:30pm.",
    type: "website",
  },
};

const CONTACT = "mailto:admin@hif.vn?subject=Saranbang%20Korean%20Club";

const DETAILS = [
  {
    bar: "bar-red",
    title: "When",
    body: "Every Thursday, 6:30pm to 8:30pm.",
  },
  {
    bar: "bar-purple",
    title: "Where",
    body: "HIF Hanoi — Detech Building, 8 Tôn Thất Thuyết, Cầu Giấy.",
  },
  {
    bar: "bar-green",
    title: "Who it's for",
    body: "Anyone learning Korean — all levels, all nations. Just bring yourself, and a friend if you like.",
  },
];

export default function SaranbangPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · <Link href="/ministries">Ministries</Link> · Saranbang
          </p>
          <p className="eyebrow eyebrow-light">Saranbang Korean Club · everyone welcome</p>
          <h1>
            Practise Korean.
            <br />
            Make friends.
          </h1>
          <p className="page-lead">
            Saranbang is a friendly conversation club for anyone learning Korean — a relaxed way
            to practise, meet people, and feel at home in Hanoi. No church background needed, just
            come as you are.
          </p>
        </div>
      </section>

      {/* INTRO */}
      <section className="section">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">What it is</p>
            <h2 className="section-title">Real conversation, real friendships.</h2>
            <p>
              Think of it as the Korean sister of our Spotlight English Clubs. Every Thursday
              evening we gather to talk, laugh, and practise Korean together. Whatever your level, you&apos;ll find an
              encouraging space and friendly conversation partners.
            </p>
            <p>
              It&apos;s one of the easiest ways to step into the HIF community. Come once, come
              every week — there&apos;s no pressure, just a warm welcome.
            </p>
            <Link className="link-arrow" href="/spotlight">
              Looking for English instead? Spotlight English Clubs <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="about-media reveal">
            <Image
              className="about-img"
              src="/assets/img/fellowship-korean.jpg"
              alt="Members of HIF's Korean community together"
              width={600}
              height={450}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* DETAILS */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">The details</p>
            <h2 className="section-title">When &amp; where to join us.</h2>
            <p className="section-intro">We meet at our Hanoi (Detech) location — everyone is welcome, every time.</p>
          </div>
          <div className="min-grid min-grid-3">
            {DETAILS.map((d) => (
              <article key={d.title} className="min-card">
                <span className={`min-bar ${d.bar}`} />
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Come and say 안녕하세요.</h2>
          <p>Thursdays, 6:30pm to 8:30pm at HIF Hanoi — bring a friend and practise Korean together.</p>
          <div className="final-actions">
            <a className="btn btn-primary btn-lg" href={CONTACT}>
              Ask us anything
            </a>
            <Link className="btn btn-outline-light btn-lg" href="/fellowships#korean">
              Korean Fellowship
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
