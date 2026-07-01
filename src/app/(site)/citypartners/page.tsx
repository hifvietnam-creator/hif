import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import configPromise from "@payload-config";
import { getPayload } from "payload";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "CityPartners — Hanoi International Fellowship",
  description:
    "CityPartners is HIF's local outreach ministry — creating partnerships so everyone can flourish. We inspire, network, and connect people and resources to love and serve Hanoi.",
  openGraph: {
    title: "CityPartners — Hanoi International Fellowship",
    description: "Partnering so everyone can flourish — loving and serving Hanoi.",
    type: "website",
  },
};

export default async function CityPartnersPage() {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "city-partners",
    where: { isActive: { not_equals: false } },
    sort: "name",
    depth: 1,
    limit: 50,
    overrideAccess: false,
  });
  const partners = result.docs;

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero has-photo">
        <div
          className="page-photo"
          style={{
            backgroundImage: "url('/assets/img/cp-hero.jpg')",
            backgroundPosition: "center 35%",
          }}
          aria-hidden="true"
        />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · CityPartners
          </p>
          <p className="eyebrow eyebrow-light">CityPartners · love the city</p>
          <h1>
            Partnering so everyone<br />can flourish.
          </h1>
          <p className="page-lead">
            CityPartners is the local outreach ministry of Hanoi International Fellowship. We create
            partnerships so everyone can flourish — connecting people and resources to love and serve Hanoi.
          </p>
        </div>
      </section>

      {/* INTRO */}
      <section className="section">
        <div className="container prose center" style={{ textAlign: "center" }}>
          <p className="eyebrow">Why we exist</p>
          <h2 className="section-title">Here to love our city.</h2>
          <p className="lead-para">
            Our aim is to <strong>inspire</strong> people to love the least, the last and the lost;
            to <strong>network</strong> local and international partners; and to <strong>connect</strong>
            people and resources with opportunities to serve.
          </p>
          <p>
            In so doing, we hope to contribute towards transformational and sustainable change in Hanoi
            and other cities across Vietnam.
          </p>
        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">How we work</p>
            <h2 className="section-title">Inspire. Network. Connect.</h2>
          </div>
          <div className="min-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <article className="min-card">
              <span className="min-bar bar-red"></span>
              <h3>Inspire</h3>
              <p>
                As a church in the city, HIF is called to love our neighbours and love Hanoi. The Love
                Hanoi campaign inspires people, churches, organisations and companies to serve our communities
                and be a blessing to the city.
              </p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-purple"></span>
              <h3>Network</h3>
              <p>
                We work in partnership with local and international organisations, charities and churches —
                co-organising conferences and workshops that create space for partnerships to form and grow.
              </p>
            </article>
            <article className="min-card">
              <span className="min-bar bar-blue"></span>
              <h3>Connect</h3>
              <p>
                HIF has a rich pool of experienced people from 100+ nations. We connect people and resources
                with churches and charities in Hanoi, introducing partners and projects to serve and support.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* PARTNER ORGANISATIONS (dynamic — only shown when CMS has partners) */}
      {partners.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head center">
              <p className="eyebrow">Our partners</p>
              <h2 className="section-title">Working together.</h2>
              <p className="section-intro">
                Churches, charities, and organisations we collaborate with to love and serve Hanoi.
              </p>
            </div>
            <div className="cp-partner-grid">
              {partners.map((p) => {
                const logoUrl =
                  p.logo && typeof p.logo === "object" && "url" in p.logo
                    ? (p.logo.url as string)
                    : null;
                return (
                  <article key={String(p.id)} className="cp-partner reveal">
                    {logoUrl && (
                      <div className="cp-partner-logo">
                        <Image
                          src={logoUrl}
                          alt={`${p.name} logo`}
                          width={120}
                          height={60}
                          style={{ objectFit: "contain" }}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h3 className="cp-partner-name">{p.name as string}</h3>
                    {p.focusArea && (
                      <p className="cp-partner-area">{p.focusArea as string}</p>
                    )}
                    {p.description && (
                      <p className="cp-partner-desc">{
                        /* description is richText — render plain fallback */
                        typeof p.description === "string" ? p.description : ""
                      }</p>
                    )}
                    {p.website && (
                      <a
                        className="link-arrow"
                        href={p.website as string}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit website <span aria-hidden="true">→</span>
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* LOVE YOUR CITY BOOK */}
      <section className="section about">
        <div className="container prose center" style={{ textAlign: "center" }}>
          <p className="eyebrow">From Hanoi to the world</p>
          <h2 className="section-title">The Love Your City book.</h2>
          <p>
            Our Love Hanoi story grew into a book by HIF&apos;s lead pastor, Jacob Bloemberg —
            <em> Love Your City: 5 Steps to Citywide Movements</em> — now helping churches love
            their cities around the world.
          </p>
          <p style={{ marginTop: "18px" }}>
            <a
              className="btn btn-primary btn-lg"
              href="https://bloemberg.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              Explore the book
            </a>
          </p>
        </div>
      </section>

      {/* SCRIPTURE QUOTE */}
      <section className="section">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div
              className="quote-photo"
              style={{
                backgroundImage: "url('/assets/img/cp-hero.jpg')",
                backgroundPosition: "center 35%",
              }}
              aria-hidden="true"
            />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">Jeremiah 29:7</p>
              <p className="kaleido-quote-text">&ldquo;Work for the peace and prosperity of the city where I sent you.&rdquo;</p>
              <p className="kaleido-quote-sub">
                Its welfare will determine your welfare. This is the heart behind everything CityPartners does.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* IN ACTION */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">In action</p>
            <h2 className="section-title">Loving Hanoi, together.</h2>
          </div>
          <div className="gallery reveal">
            <figure>
              <Image src="/assets/img/cp-serve.jpg" alt="HIF volunteers in red vests on a Hanoi clean-up day" width={400} height={300} loading="lazy" />
              <figcaption><b>Serve days</b> · hands and feet for the city</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/cp-playground.jpg" alt="Children playing on a new neighbourhood playground" width={400} height={300} loading="lazy" />
              <figcaption><b>Community spaces</b> · safe places for kids to play</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/cp-christmas.jpg" alt="A large crowd gathered at the Love Hanoi Christmas Festival at night" width={400} height={300} loading="lazy" />
              <figcaption><b>Christmas Festival</b> · the whole city gathers</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/cp-govt.jpg" alt="HIF's lead pastor meeting Hanoi city and religious-affairs leaders" width={400} height={300} loading="lazy" />
              <figcaption><b>Partnership</b> · working with city &amp; community leaders</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/cp-shine.jpg" alt="A young woman honoured at the Night to Shine inclusion event" width={400} height={300} loading="lazy" />
              <figcaption><b>Night to Shine</b> · honouring people of all abilities</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/cp-team.jpg" alt="HIF partners gathered with a local church" width={400} height={300} loading="lazy" />
              <figcaption><b>Partner churches</b> · serving Hanoi together</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* GET INVOLVED */}
      <section className="section about">
        <div className="container visit-grid">
          <div className="visit-copy reveal">
            <p className="eyebrow">Get involved</p>
            <h2 className="section-title">Serve with CityPartners.</h2>
            <p className="section-intro">
              There&apos;s a place for your skills, time, and heart. A few ways people get involved:
            </p>
            <ul className="ticks">
              <li>Join <strong>Love Hanoi</strong> initiatives and our annual Community Serve Day.</li>
              <li>Use a professional skill — medical, education, business, and more — to bless the city.</li>
              <li>Connect your organisation, church, or network as a partner.</li>
              <li>Support a specific project introduced during our Sunday gatherings.</li>
            </ul>
            <div className="visit-actions">
              <a
                className="btn btn-primary"
                href="mailto:citypartners@hif.vn?subject=Serving%20with%20CityPartners"
              >
                Serve with CityPartners
              </a>
              <a
                className="btn btn-ghost"
                href="https://loveyourcity.vn"
                target="_blank"
                rel="noopener noreferrer"
              >
                About Love Hanoi
              </a>
            </div>
          </div>
          <div className="visit-times reveal">
            <h3 className="times-title">Connect with CityPartners</h3>
            <div className="time-card">
              <div className="time-loc"><span className="dot dot-red"></span>Email</div>
              <ul>
                <li><strong><a href="mailto:citypartners@hif.vn">citypartners@hif.vn</a></strong></li>
              </ul>
            </div>
            <div className="time-card">
              <div className="time-loc"><span className="dot dot-green"></span>Each month</div>
              <ul>
                <li><strong>At HIF</strong> <span>partners &amp; projects introduced on Sundays</span></li>
              </ul>
            </div>
            <p className="time-note">
              Want to learn more or partner with us?{" "}
              <a href="mailto:citypartners@hif.vn">Get in touch →</a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div
          className="final-kaleido"
          style={{
            backgroundImage: "url('/assets/img/cp-serve.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
          aria-hidden="true"
        />
        <div className="container final-inner reveal">
          <h2>Let&apos;s love this city together.</h2>
          <p>However God has gifted you, there&apos;s a way to make a difference in Hanoi.</p>
          <div className="final-actions">
            <a
              className="btn btn-primary btn-lg"
              href="mailto:citypartners@hif.vn?subject=CityPartners"
            >
              Get involved
            </a>
            <Link className="btn btn-outline-light btn-lg" href="/give">
              Support the work
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
