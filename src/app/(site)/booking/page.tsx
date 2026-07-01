import type { Metadata } from "next";
import Link from "next/link";
import BookingForm from "./BookingForm";

export const metadata: Metadata = {
  title: "Book Our Space — Hanoi International Fellowship",
  description:
    "Request to book HIF's Hanoi facility. We're glad to be a hub for the wider Christian community — tell us what you need and our team will be in touch.",
  openGraph: {
    title: "Book Our Space — Hanoi International Fellowship",
    description: "Request to use HIF's facility for your church, charity, or Christian community event.",
    type: "website",
  },
};

export default function BookingPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb"><Link href="/">Home</Link> · Book Our Space</p>
          <p className="eyebrow eyebrow-light">Facility booking</p>
          <h1>Book our space.</h1>
          <p className="page-lead">
            We&apos;re glad to be a hub for the wider Christian community in Hanoi. If you&apos;d like to use our
            facility for a church, charity, or ministry gathering, tell us what you need and our team
            will get back to you.
          </p>
        </div>
      </section>

      {/* BOOKING */}
      <section className="section">
        <div className="container contact-grid">
          {/* Form */}
          <div className="reveal">
            <h2 className="section-title">Request a booking.</h2>
            <p className="section-intro" style={{ marginBottom: "24px" }}>Share the details below and we&apos;ll be in touch to confirm availability. (This opens your email app so you can send the request.)</p>
            <BookingForm />
          </div>

          {/* Details */}
          <div className="reveal">
            <div className="contact-card">
              <h3><span className="min-bar bar-red" style={{ margin: 0 }}></span>Who can book</h3>
              <p>Churches, charities, and Christian community groups are warmly welcome to request the space.</p>
            </div>
            <div className="contact-card">
              <h3><span className="min-bar bar-purple" style={{ margin: 0 }}></span>Where</h3>
              <p>HIF Hanoi — Detech Building, 8 Tôn Thất Thuyết, Cầu Giấy Ward, Hà Nội.<br /><Link href="/locations">See all locations →</Link></p>
            </div>
            <div className="contact-card">
              <h3><span className="min-bar bar-green" style={{ margin: 0 }}></span>How it works</h3>
              <p>Send your request and our team will check availability and reply to confirm the details with you.</p>
            </div>
            <div className="contact-card">
              <h3><span className="min-bar bar-blue" style={{ margin: 0 }}></span>Prefer to email?</h3>
              <p><a href="mailto:admin@hif.vn?subject=Facility%20booking%20request">admin@hif.vn</a> &nbsp;·&nbsp; <a href="tel:+842432006666">+84 24 3200 6666</a></p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>Questions before you book?</h2>
          <p>We&apos;re happy to help you find the right time and space for your gathering.</p>
          <div className="final-actions">
            <a className="btn btn-primary btn-lg" href="mailto:admin@hif.vn?subject=Facility%20booking%20question">Email our team</a>
            <Link className="btn btn-outline-light btn-lg" href="/contact">Other ways to reach us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
