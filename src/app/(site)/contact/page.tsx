import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — Hanoi International Fellowship",
  description:
    "Get in touch with Hanoi International Fellowship — email, phone, address, and a message form. We'd love to hear from you.",
  openGraph: {
    title: "Contact — Hanoi International Fellowship",
    description: "We'd love to hear from you — reach the HIF team anytime.",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb"><Link href="/">Home</Link> · Contact</p>
          <p className="eyebrow eyebrow-light">Contact</p>
          <h1>We&apos;d love to<br />hear from you.</h1>
          <p className="page-lead">
            Questions, prayer requests, or just want to say hello? Reach out any way you like —
            a real person on our team will get back to you.
          </p>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section">
        <div className="container contact-grid">
          {/* Form */}
          <div className="reveal">
            <h2 className="section-title">Send us a message.</h2>
            <p className="section-intro" style={{ marginBottom: "24px" }}>Fill this in and we&apos;ll be in touch. (This opens your email app so you can send it.)</p>
            <ContactForm />
          </div>

          {/* Details + map */}
          <div className="reveal">
            <div className="contact-card">
              <h3><span className="min-bar bar-red" style={{ margin: 0 }}></span>Email</h3>
              <p><a href="mailto:admin@hif.vn">admin@hif.vn</a></p>
            </div>
            <div className="contact-card">
              <h3><span className="min-bar bar-purple" style={{ margin: 0 }}></span>Phone</h3>
              <p><a href="tel:+842432006666">+84 24 3200 6666</a></p>
            </div>
            <div className="contact-card">
              <h3><span className="min-bar bar-green" style={{ margin: 0 }}></span>Visit us</h3>
              <p>Detech Building, 8 Tôn Thất Thuyết, Cầu Giấy Ward, Hà Nội 10000<br /><Link href="/locations">See all locations &amp; times →</Link></p>
            </div>
            <div className="contact-card">
              <h3><span className="min-bar bar-blue" style={{ margin: 0 }}></span>Need prayer?</h3>
              <p><a href="mailto:admin@hif.vn?subject=Prayer%20request">Send a prayer request →</a></p>
            </div>
            <div className="contact-card">
              <h3><span className="min-bar bar-red" style={{ margin: 0 }}></span>Book our space</h3>
              <p>Using our facility for a church or community event? <Link href="/booking">Request a booking →</Link></p>
            </div>
            <div className="map-embed" style={{ marginTop: "8px" }}>
              <iframe
                title="Map to HIF Hanoi"
                src="https://maps.google.com/maps?q=Detech%20Building%208%20Ton%20That%20Thuyet%20Cau%20Giay%20Hanoi&z=15&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>The best hello is in person.</h2>
          <p>Come and see for yourself this Sunday — we&apos;ll save you a seat.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">Plan a visit</Link>
            <Link className="btn btn-outline-light btn-lg" href="/locations">Find a location</Link>
          </div>
        </div>
      </section>
    </>
  );
}
