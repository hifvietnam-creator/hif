import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Give — Hanoi International Fellowship",
  description:
    "Your generosity helps people find Jesus, builds community, cares for the next generation, and loves the city of Hanoi. Here's how to give to HIF.",
  openGraph: {
    title: "Give — Hanoi International Fellowship",
    description: "Fuel the mission. Your giving changes lives in Hanoi and beyond.",
    type: "website",
  },
};

export default function GivePage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Give
          </p>
          <p className="eyebrow eyebrow-light">Generosity</p>
          <h1>Fuel the mission.</h1>
          <p className="page-lead">
            HIF is powered by a generous family who believe Hanoi — and the nations — are worth it.
            When you give, you help people find real life in Jesus, build community far from home,
            care for the next generation, and love this city.
          </p>
          <div className="final-actions" style={{ justifyContent: "flex-start", marginTop: "30px" }}>
            <a className="btn btn-primary btn-lg" href="#ways">See ways to give</a>
            <a
              className="btn btn-outline-light btn-lg"
              href="https://www.paypal.me/hifvn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Give via PayPal
            </a>
          </div>
        </div>
      </section>

      {/* WHY GIVE */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Where it goes</p>
            <h2 className="section-title">Your giving at work.</h2>
            <p className="section-intro">Every gift, of every size, helps move someone forward on the Journey.</p>
          </div>
          <div className="give-ways">
            <article className="give-way">
              <span className="min-bar bar-red"></span>
              <h3>People find Jesus</h3>
              <p>Sunday gatherings, Alpha, English clubs and outreach that introduce people to real, lasting hope.</p>
            </article>
            <article className="give-way">
              <span className="min-bar bar-purple"></span>
              <h3>Community for all</h3>
              <p>Connect Groups, ethnic fellowships, and care that make HIF a family away from home.</p>
            </article>
            <article className="give-way">
              <span className="min-bar bar-green"></span>
              <h3>The next generation</h3>
              <p>Safe, joyful spaces where kids and teens grow a faith of their own.</p>
            </article>
            <article className="give-way">
              <span className="min-bar bar-blue"></span>
              <h3>The city &amp; beyond</h3>
              <p>Love Hanoi, CityPartners, and our congregations in Ecopark and Thai Nguyen.</p>
            </article>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="section about">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">The difference you make</p>
            <h2 className="section-title">Your generosity in action.</h2>
          </div>
          <div className="gallery reveal">
            <figure>
              <Image src="/assets/img/baptism.jpg" alt="A baptism at HIF" width={400} height={300} loading="lazy" />
              <figcaption><b>New believers</b> · finding life in Jesus</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/kids.jpg" alt="KidzQuest children's ministry" width={400} height={300} loading="lazy" />
              <figcaption><b>Kids cared for</b> · the next generation</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/youth.jpg" alt="Aftershock youth ministry" width={400} height={300} loading="lazy" />
              <figcaption><b>Teens growing</b> · a faith of their own</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/visit-welcome.jpg" alt="HIF welcome team" width={400} height={300} loading="lazy" />
              <figcaption><b>Guests welcomed</b> · a family away from home</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/loc-thainguyen.jpg" alt="Thai Nguyen outreach" width={400} height={300} loading="lazy" />
              <figcaption><b>Beyond Hanoi</b> · Ecopark &amp; Thai Nguyen</figcaption>
            </figure>
            <figure>
              <Image src="/assets/img/about-family.jpg" alt="The HIF church family" width={400} height={300} loading="lazy" />
              <figcaption><b>One family</b> · from a hundred nations</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* FUTURE FACILITY */}
      <section className="section about">
        <div className="container about-grid">
          <div className="about-copy reveal">
            <p className="eyebrow">Building for the future</p>
            <h2 className="section-title">A permanent home for the whole community.</h2>
            <p>
              We&apos;re believing for a permanent Christian community center in Hanoi&apos;s new embassy
              quarter — a larger auditorium, more room for kids, and a welcoming hub that local
              churches, students, and the wider community can all use.
            </p>
            <p>
              It&apos;s a bold, long-term vision: a visible, accessible home from which to keep loving
              the city for decades to come. If you&apos;d like to partner with the building project
              specifically, we&apos;d love to tell you more.
            </p>
            <a
              className="link-arrow"
              href="mailto:admin@hif.vn?subject=The%20HIF%20building%20vision"
            >
              Talk to us about the vision <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="city-stats reveal">
            <div className="stat stat-red"><strong>500</strong><span>seats in the planned auditorium</span></div>
            <div className="stat stat-purple"><strong>3</strong><span>congregations to support &amp; grow</span></div>
            <div className="stat stat-green"><strong>100+</strong><span>nations called home at HIF</span></div>
            <div className="stat stat-blue"><strong>1 hub</strong><span>for the whole Christian community</span></div>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="section">
        <div className="container">
          <div className="kaleido-quote reveal">
            <div className="kaleido-bg" aria-hidden="true" />
            <div className="kaleido-quote-inner">
              <p className="eyebrow eyebrow-light">Generosity</p>
              <p className="kaleido-quote-text">Your generosity outlives you.</p>
              <p className="kaleido-quote-sub">
                What you give today keeps reaching people across Hanoi and the nations for years to come.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WAYS TO GIVE */}
      <section className="section" id="ways">
        <div className="container">
          <div className="section-head center">
            <p className="eyebrow">Ways to give</p>
            <h2 className="section-title">Simple ways to be generous.</h2>
            <p className="section-intro">
              Give in person at any Sunday gathering, or use one of the methods below. For designated gifts,
              add a note: <strong>&ldquo;Offering,&rdquo; &ldquo;Future Facility,&rdquo;</strong> or <strong>&ldquo;Ecopark.&rdquo;</strong>
            </p>
          </div>

          {/* DIRECT TO HIF */}
          <h3 className="give-group-title reveal">Give directly to HIF <span>· in Vietnam</span></h3>
          <div className="give-blocks two reveal">
            <div className="give-block">
              <h4><span className="min-bar bar-red"></span>Bank transfer</h4>
              <div className="give-method">
                <dl className="give-dl">
                  <div className="row"><dt>Bank</dt><dd>Techcombank</dd></div>
                  <div className="row"><dt>Account name</dt><dd>Marian Tabjan (VND)</dd></div>
                  <div className="row"><dt>Account no.</dt><dd>19134757397010</dd></div>
                  <div className="row"><dt>Branch</dt><dd>Tran Thai Tong, Cau Giay, Hanoi</dd></div>
                  <div className="row"><dt>SWIFT</dt><dd>VTCBVNVXXXX</dd></div>
                </dl>
                <p className="give-note">
                  Add a note: <strong>&ldquo;Offering,&rdquo; &ldquo;Future Facility,&rdquo;</strong> or <strong>&ldquo;Ecopark.&rdquo;</strong>
                </p>
              </div>
            </div>
            <div className="give-block">
              <h4><span className="min-bar bar-purple"></span>PayPal</h4>
              <div className="give-method">
                <p>Give to HIF&apos;s local account via PayPal.</p>
                <dl className="give-dl">
                  <div className="row">
                    <dt>PayPal</dt>
                    <dd><a href="https://www.paypal.me/hifvn" target="_blank" rel="noopener noreferrer">paypal.me/hifvn</a></dd>
                  </div>
                </dl>
                <p className="give-note">
                  Add a note: <strong>&ldquo;HIF Offering,&rdquo; &ldquo;HIF Future Facility,&rdquo;</strong> or <strong>&ldquo;HIF Ecopark.&rdquo;</strong>
                </p>
                <a
                  className="btn btn-give"
                  href="https://www.paypal.me/hifvn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Give via PayPal
                </a>
              </div>
            </div>
          </div>
          <p className="give-fineprint">
            * HIF is registered with the government of Vietnam as an independent international religious congregation.
            We do not yet have the rights of a religious organization, so we cannot open a bank account in HIF&apos;s name.
            We use a joint account of HIF staff, managed by an accountant under the oversight of our Elder Treasurer,
            and independently audited annually.
          </p>

          {/* TAX-DEDUCTIBLE VIA MICN */}
          <h3 className="give-group-title reveal">Tax-deductible giving <span>· USA &amp; Canada, via MICN</span></h3>
          <p className="give-group-sub reveal">
            Give through the Missional International Church Network (MICN); US &amp; Canadian citizens receive
            tax-deductible receipts. Add a note: <strong>&ldquo;HIF Offering,&rdquo; &ldquo;HIF Future Facility,&rdquo;</strong> or{" "}
            <strong>&ldquo;HIF Ecopark&rdquo;</strong> so your gift arrives as designated.
          </p>
          <div className="give-blocks two reveal">
            {/* USA */}
            <div className="give-block">
              <h4><span className="min-bar bar-blue"></span>United States</h4>
              <div className="give-method">
                <h5>PayPal</h5>
                <a
                  className="btn btn-give"
                  href="https://www.paypal.com/donate/?hosted_button_id=MY9PN2LWPP5FA"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Give via MICN PayPal
                </a>
              </div>
              <div className="give-method">
                <h5>International transfer (SWIFT)</h5>
                <dl className="give-dl">
                  <div className="row"><dt>Beneficiary</dt><dd>Missional Int&apos;l Church Network – USA</dd></div>
                  <div className="row"><dt>Bank</dt><dd>Wells Fargo Bank, 420 Montgomery St, San Francisco, CA 94104</dd></div>
                  <div className="row"><dt>SWIFT</dt><dd>WFBIUS6S</dd></div>
                  <div className="row"><dt>Account no.</dt><dd>6746490959</dd></div>
                </dl>
              </div>
              <div className="give-method">
                <h5>Domestic wire</h5>
                <dl className="give-dl">
                  <div className="row"><dt>Account no.</dt><dd>2818988475</dd></div>
                  <div className="row"><dt>Routing no.</dt><dd>121000248</dd></div>
                </dl>
              </div>
              <div className="give-method">
                <h5>ACH direct deposit</h5>
                <dl className="give-dl">
                  <div className="row"><dt>Bank</dt><dd>Wells Fargo Bank</dd></div>
                  <div className="row"><dt>Account no.</dt><dd>6746490959</dd></div>
                  <div className="row"><dt>Routing no.</dt><dd>031000503</dd></div>
                </dl>
              </div>
              <div className="give-method">
                <h5>Check &amp; Zelle</h5>
                <p className="give-note">
                  <strong>Check:</strong> payable to &ldquo;MICN,&rdquo; c/o Bill Frank, 19011 Cove Manor Dr., Cypress, TX 77433.<br />
                  <strong>Zelle:</strong> payable to MICN — <a href="mailto:bill.f@micn.org">bill.f@micn.org</a>.
                </p>
              </div>
            </div>
            {/* CANADA */}
            <div className="give-block">
              <h4><span className="min-bar bar-green"></span>Canada</h4>
              <div className="give-method">
                <h5>Credit, debit or PayPal</h5>
                <a
                  className="btn btn-give"
                  href="https://www.paypal.com/donate/?hosted_button_id=JCCRT5CGSL9TA"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Give via MICN PayPal
                </a>
              </div>
              <div className="give-method">
                <h5>Interac e-Transfer</h5>
                <dl className="give-dl">
                  <div className="row"><dt>Send to</dt><dd><a href="mailto:canada@micn.org">canada@micn.org</a></dd></div>
                </dl>
              </div>
              <div className="give-method">
                <h5>Cheque</h5>
                <p className="give-note">
                  Payable to &ldquo;MICN,&rdquo; c/o Yolanda Bosma, 77 Willow Green Way, Cochrane, Alberta, Canada T4C 2N3.
                </p>
              </div>
              <div className="give-method">
                <h5>Pre-authorized debit</h5>
                <p className="give-note">
                  Email <a href="mailto:canada@micn.org?subject=Pre-authorized%20debit%20form">canada@micn.org</a> to request the form.
                </p>
              </div>
            </div>
          </div>

          <p className="callout reveal">
            Questions about giving, receipts, or a particular project?{" "}
            <a href="mailto:admin@hif.vn?subject=Giving%20question">Email us</a> and we&apos;ll gladly help.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Thank you for your generosity.</h2>
          <p>Every gift helps someone take their next step toward Jesus — in Hanoi and beyond.</p>
          <div className="final-actions">
            <a className="btn btn-primary btn-lg" href="#ways">See ways to give</a>
            <a
              className="btn btn-outline-light btn-lg"
              href="mailto:admin@hif.vn?subject=Giving%20question"
            >
              Ask a question
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
