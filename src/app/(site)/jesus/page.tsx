import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Who is Jesus? — Hanoi International Fellowship",
  description:
    "Maybe you've only met Jesus on a screen, at Christmas, or never at all. Here's who Jesus is — in plain words — and why he's worth exploring. No pressure, all welcome.",
  openGraph: {
    title: "Who is Jesus? — Hanoi International Fellowship",
    description:
      "The most important person who ever lived — and what he means for you. Explore, no pressure.",
    type: "website",
  },
};

export default function JesusPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero has-photo">
        <div
          className="page-photo"
          style={{
            backgroundImage: "url('/assets/img/jesus-hero.jpg')",
            backgroundPosition: "center 22%",
          }}
          aria-hidden="true"
        />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Who is Jesus?
          </p>
          <p className="eyebrow eyebrow-light">Start here</p>
          <h1>Who is Jesus?</h1>
          <p className="page-lead">
            Maybe you&apos;ve only met Jesus on a screen, at Christmas, or through a friend — or maybe
            you&apos;ve never really thought about him at all. Wherever you&apos;re starting from, here&apos;s who
            he is, in plain words. No pressure, no jargon, all welcome.
          </p>
          <div className="final-actions" style={{ justifyContent: "flex-start", marginTop: "30px" }}>
            <a className="btn btn-primary btn-lg" href="#who">Who he is</a>
            <a
              className="btn btn-outline-light btn-lg"
              href="https://alphahanoi.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Explore at Alpha
            </a>
          </div>
        </div>
        <p className="hero-credit">AI generated, based on Bas Uterwijk&apos;s forensic depiction</p>
      </section>

      {/* NOT WESTERN */}
      <section className="section">
        <div className="container prose center" style={{ textAlign: "center" }}>
          <p className="eyebrow">A surprise to many</p>
          <h2 className="section-title">Jesus wasn&apos;t Western.</h2>
          <p className="lead-para">
            Jesus was born in the Middle East — in Asia — and faith in him spread first across Asia
            and Africa, centuries before it reached the West.
          </p>
          <p>
            Following Jesus isn&apos;t adopting a foreign or Western religion. It&apos;s joining the largest,
            most diverse family on earth — people from every nation, including ours. At HIF, that
            family already speaks a hundred-plus languages.
          </p>
        </div>
      </section>

      {/* WHO JESUS IS */}
      <section className="section about" id="who">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">In plain words</p>
            <h2 className="section-title">Who Jesus is.</h2>
            <p className="section-intro">Six simple things Christians have believed about Jesus for two thousand years.</p>
          </div>
          <div className="min-grid">
            <article className="min-card">
              <span className="min-bar bar-red"></span>
              <h3>A real person</h3>
              <p>Not a myth or a legend. Jesus of Nazareth lived in history — perhaps the most influential person who ever has.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-purple"></span>
              <h3>God, come near</h3>
              <p>Christians believe Jesus is God in human form — God stepping into our world to be known, not from a distance.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-green"></span>
              <h3>Love in action</h3>
              <p>He healed the sick, welcomed outsiders, forgave failures, and showed us exactly what God is like.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-blue"></span>
              <h3>He died for us</h3>
              <p>He gave his life on a cross — taking on himself everything that separates us from God, so we could be forgiven.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-red"></span>
              <h3>He rose again</h3>
              <p>Three days later his followers found the tomb empty and met him alive. It&apos;s the turning point of history.</p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-purple"></span>
              <h3>Alive today</h3>
              <p>Jesus is alive now, and offers a real relationship — not a religion to perform, but a life to receive.</p>
            </article>
          </div>
        </div>
      </section>

      {/* THE GOOD NEWS */}
      <section className="section">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">Why it matters</p>
            <h2 className="section-title">The best news in the world.</h2>
            <p>
              Here&apos;s the heart of it: God made you, and loves you. But all of us have gone our own
              way, and deep down we feel the distance — the guilt, the emptiness, the search for more.
            </p>
            <p>
              Jesus came to close that distance. Through his death and resurrection, he offers
              forgiveness, peace with God, and a life that doesn&apos;t end. And it&apos;s a <em>gift</em> —
              you can&apos;t earn it by being good enough; you receive it by trusting him.
            </p>
            <p>
              That&apos;s why we call it good news. It&apos;s not about religion. It&apos;s about being found, loved,
              and made new.
            </p>
          </div>
          <div className="about-media reveal">
            <Image
              className="about-img"
              src="/assets/img/jesus-king.jpg"
              alt="The risen Jesus — light breaking through"
              width={600}
              height={450}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* NO PRESSURE */}
      <section className="section about">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div
              className="quote-photo"
              style={{
                backgroundImage: "url('/assets/img/alpha-joy.jpg')",
                backgroundPosition: "center 38%",
              }}
              aria-hidden="true"
            />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">Come as you are</p>
              <p className="kaleido-quote-text">You don&apos;t have to have it figured out.</p>
              <p className="kaleido-quote-sub">
                You don&apos;t need to clean yourself up, believe everything yet, or sign anything. Jesus
                welcomed doubters, outsiders, and the curious — and he welcomes you, with all your questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section className="section stories">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow eyebrow-light">Real lives, real change</p>
            <h2 className="section-title">What changes when you meet Jesus.</h2>
          </div>
          <div className="story-grid">
            <figure className="story reveal">
              <blockquote>
                &ldquo;Shaking and in tears, I surrendered everything to Jesus. Almost instantly, His love reigned in my heart — turning my anger and bitterness into peace, love, and compassion.&rdquo;
              </blockquote>
              <figcaption>
                <span className="story-name">Daniella</span>
                <span className="story-meta">South Africa</span>
              </figcaption>
            </figure>
            <figure className="story reveal">
              <blockquote>
                &ldquo;During Covid I started a TikTok channel to share the good news. The first person I connected with became a Christian after two months. Later, ten of my online friends were baptized at HIF.&rdquo;
              </blockquote>
              <figcaption>
                <span className="story-name">Tien</span>
                <span className="story-meta">Vietnam</span>
              </figcaption>
            </figure>
            <figure className="story reveal">
              <blockquote>
                &ldquo;They welcomed me like one of their own — treated me like a brother, even helped me improve my English. But most importantly, they pointed me to Christ.&rdquo;
              </blockquote>
              <figcaption>
                <span className="story-name">Jean Samuel</span>
                <span className="story-meta">Haiti</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* HOW TO BEGIN */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Want to take a step?</p>
            <h2 className="section-title">How to begin.</h2>
            <p className="section-intro">
              Faith starts with a simple turning of the heart toward Jesus. There are no magic words — but
              if you want to respond, you could pray something like this:
            </p>
          </div>
          <div className="callout reveal" style={{ maxWidth: "680px", marginInline: "auto", fontSize: "1.08rem" }}>
            &ldquo;Jesus, I don&apos;t have it all figured out, but I want to know you. Thank you for loving me and
            coming for me. I&apos;m sorry for going my own way. Today I turn to you — please forgive me, fill
            me with your life, and lead me from here. Amen.&rdquo;
          </div>
          <p className="journey-foot reveal" style={{ marginTop: "28px" }}>
            Did you pray that — or want to? We&apos;d love to celebrate with you and help you take your next step.{" "}
            <a href="mailto:admin@hif.vn?subject=I%20want%20to%20know%20more%20about%20Jesus">Tell us →</a>
          </p>
        </div>
      </section>

      {/* NEXT STEPS */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Keep exploring</p>
            <h2 className="section-title">Where to go from here.</h2>
          </div>
          <div className="min-grid">
            <a className="min-card" href="https://alphahanoi.com" target="_blank" rel="noopener noreferrer">
              <span className="min-bar bar-red"></span>
              <h3>Explore at Alpha</h3>
              <p>A relaxed, no-pressure space to ask your questions over food and conversation.</p>
            </a>
            <Link className="min-card" href="/plan-visit">
              <span className="min-bar bar-purple"></span>
              <h3>Come on a Sunday</h3>
              <p>Experience it for yourself — worship, a down-to-earth message, and a warm welcome.</p>
            </Link>
            <Link className="min-card" href="/next-steps#baptism">
              <span className="min-bar bar-green"></span>
              <h3>Get baptized</h3>
              <p>Ready to go public with your faith? Take the next step and celebrate it with the family.</p>
            </Link>
            <Link className="min-card" href="/contact">
              <span className="min-bar bar-blue"></span>
              <h3>Talk to someone</h3>
              <p>Have questions or want to talk it through? A real person on our team would love to help.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true"></div>
        <div className="container final-inner reveal">
          <h2>The best way to meet Jesus is together.</h2>
          <p>Come and see for yourself — there&apos;s a place for you, and people who&apos;d love to walk with you.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">Plan a visit</Link>
            <a
              className="btn btn-outline-light btn-lg"
              href="https://alphahanoi.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Explore at Alpha
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
