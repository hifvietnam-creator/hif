import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What We Believe — Hanoi International Fellowship",
  description:
    "The heart of the Christian faith, in plain language — what HIF believes about God, Jesus, the Bible, and the hope we share across a hundred nations.",
  openGraph: {
    title: "What We Believe — Hanoi International Fellowship",
    description: "The heart of the faith, in plain language.",
    type: "website",
  },
};

export default function BeliefsPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · What We Believe
          </p>
          <p className="eyebrow eyebrow-light">What we believe</p>
          <h1>
            What we<br />believe.
          </h1>
          <p className="page-lead">
            You&apos;re welcome here whatever you believe — come as you are, questions and all.
            And if you&apos;d like to know exactly where we stand, here is our Statement of Faith, in full.
          </p>
        </div>
      </section>

      {/* INTRO */}
      <section className="section">
        <div className="container prose center" style={{ textAlign: "center" }}>
          <p className="eyebrow">Where we stand</p>
          <h2 className="section-title">The faith we share.</h2>
          <p className="lead-para">
            People come to HIF from many nations and church backgrounds. What unites us is the
            historic Christian faith — set out in full in our Statement of Faith below.
          </p>
        </div>
      </section>

      {/* STATEMENT OF FAITH — verbatim, do not edit */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">HIF Statement of Faith</p>
            <h2 className="section-title">What we believe, in full.</h2>
          </div>
          <div className="sof">
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About God</h3>
              <p>We believe God has revealed Himself to us in His creation (Genesis 1-2), in the Bible (Isaiah 46:9-10), and in His Son, Jesus Christ (Hebrews 1:1-4). God is to be worshipped, obeyed and enjoyed as the source and Lord of all life. We believe that there is one God, eternally existent in three persons: Father, Son, and Holy Spirit (Isaiah 61:1; Matthew 3:16-17; John 14:16-17).</p>
            </article>
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About Humanity</h3>
              <p>We believe that humanity was originally created in the image of God without sin, but that the first of these fell through the sin of disobedience. All people are therefore sinful by nature, are eternally separated from God, and are in need of reconciliation (Genesis 1-3; 2 Cor. 5:17-21; Romans 5:6-11).</p>
            </article>
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About Jesus Christ</h3>
              <p>We believe that Jesus Christ is God&apos;s unique Son, sent to the world as God in the flesh. He came to reveal God to us and to provide the only way for us to know God personally and have eternal life (John 3:16-21; Acts 4:10-12).</p>
            </article>
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About Salvation</h3>
              <p>We believe that God has graciously provided Salvation only through Jesus Christ, who died on the cross as the substitutionary atonement (substitute punishment) for sin and rose again from the dead to open the way to new life (Luke 23:26-24:53; Romans 6:1-11; Philippians 2:1-11; 2Timothy 2:8-13). All who place their faith in Jesus Christ are saved from their fallen condition into eternal life with God, by His grace alone, apart from works or merit (Ephesians 2:1-10).</p>
            </article>
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About the Holy Spirit</h3>
              <p>We believe that God&apos;s Holy Spirit gives new and eternal spiritual life to all who receive Jesus Christ by faith. The Holy Spirit indwells the believer, providing power for service (1 Corinthians 12:1-11) and enabling a joyful, holy lifestyle (John 16:15; Acts 1:8; Philippians 2:12-13; Galatians 5:15-26; 1Peter 1:13-16; 1Thessalonians 4:3-8).</p>
            </article>
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About the Bible</h3>
              <p>We believe the Bible to be the inspired, infallible, authoritative, and inerrant Word of God. (2 Timothy 3:15-17; 2 Peter 1:19-21).</p>
            </article>
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About God&apos;s Kingdom &amp; Eternity</h3>
              <p>We believe that the Kingdom of God has come to us in the person of Jesus Christ on earth. We believe in the visible, personal return of Jesus Christ in power and great glory to judge both the living and the dead. We believe that the Scriptures set out only two destinies for humanity; the joyful prospect of eternal life in the presence of God for those who have received Christ and the agonizing prospect of eternal separation from God for those who have rejected Him (Jeremiah 31:31-34; Mark 1:14-15; Matthew 5:3-12; Luke 17:20-21; 1Thessalonians 2:12; Revelation 1:7; Daniel 7:14; John 5:28-29; Revelation 20:15).</p>
            </article>
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About the Church</h3>
              <p>We believe the Universal Church is the Body of Christ, composed of all believers, for all time, who have been sealed by the Holy Spirit through faith in Jesus Christ for salvation. The Lord has given the Church two ordinances, which are to continue until Jesus returns: believer&apos;s baptism by immersion and Holy Communion. Water Baptism is not necessary for salvation, and cannot remove sins, but is a picture of the salvation already received by the believer (Ephesians 2:19-22; John 17; 1 Corinthians 12:27).</p>
            </article>
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About Marriage</h3>
              <p>We believe that God created mankind as two distinct sexes: male and female and that each person affirms God&apos;s infinite wisdom by living in alignment with their birth sex (Genesis 1:26-28; Matthew 19:4-5). We believe that marriage is a sacred institution established by God; it is exclusively the uniting of one man and one woman in covenant commitment for a lifetime and the only relationship within which sexual intimacy is to be enjoyed (Matthew 19:4-6; 1 Corinthians 7:9; Ephesians 5:22-24; Colossians 3:18; Titus 2:4-5; 1 Peter 3:1-6).</p>
            </article>
            <article className="sof-item">
              <h3><span className="sof-bar"></span>About Mission</h3>
              <p>We believe in the Great Commission (Jesus&apos; mandate) to share the Gospel with the world and make disciples of all nations (groupings of people) (Acts 1:8; Matthew 28:19-20; Mark 16:15-16), and to love as Jesus modeled and commanded, both through word and deed, demonstrating God&apos;s love and compassion for all people (Matthew 22:37-41; Psalm 112:9; Galatians 2:10, 6:10; James 1:27; Hebrews 10:24; 1 John 3:16-18).</p>
            </article>
          </div>
        </div>
      </section>

      {/* UNITY QUOTE */}
      <section className="section">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div className="kaleido-bg" aria-hidden="true" />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">A church of many nations</p>
              <p className="kaleido-quote-text">&ldquo;In essentials, unity. In non-essentials, liberty. In all things, love.&rdquo;</p>
              <p className="kaleido-quote-sub">
                We come from many countries and church backgrounds. We hold the core of the faith together,
                give each other room on secondary matters, and let love lead.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHERE WE BELONG */}
      <section className="section about">
        <div className="container prose center" style={{ textAlign: "center" }}>
          <p className="eyebrow">Where we belong</p>
          <h2 className="section-title">Part of something bigger.</h2>
          <p>
            HIF is an independent international congregation and a flagship church of the
            Missional International Church Network (MICN). Our lead pastor is ordained with Elim
            Fellowship (NY, USA). Wherever you&apos;re coming from — and whatever your church background —
            you&apos;ll find a home here.
          </p>
          <p>
            <Link className="link-arrow" href="/about">
              Read our story <span aria-hidden="true">→</span>
            </Link>
          </p>
          <p style={{ marginTop: "8px" }}>
            Members of HIF affirm this Statement of Faith and our Constitution.{" "}
            <Link className="link-arrow" href="/next-steps#membership">
              How to become a member <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Still have questions?</h2>
          <p>Good — bring them. Explore faith at your own pace through Alpha, or just come and see.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">Plan a visit</Link>
            <Link className="btn btn-outline-light btn-lg" href="/alpha">Explore with Alpha</Link>
            <a
              className="btn btn-outline-light btn-lg"
              href="mailto:admin@hif.vn?subject=A%20question%20about%20faith"
            >
              Talk to a pastor
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
