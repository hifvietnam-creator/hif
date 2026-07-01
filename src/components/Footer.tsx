import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        {/* Brand */}
        <div className="footer-brand">
          <Link className="brand" href="/" aria-label="Hanoi International Fellowship home">
            <Image
              className="brand-logo brand-logo-icon"
              src="/assets/img/logo-icon.png"
              alt=""
              width={42}
              height={42}
            />
            <span className="brand-name">Hanoi International Fellowship</span>
          </Link>
          <p className="footer-tag">
            Your family away from home. One church, many nations, loving Hanoi since 1995.
          </p>
          <div className="socials">
            <a
              href="https://www.facebook.com/hifvietnam"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              Facebook
            </a>
            <a
              href="https://www.youtube.com/@HIFVietnam"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
            >
              YouTube
            </a>
            <a
              href="https://www.instagram.com/hifhanoi/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              Instagram
            </a>
          </div>
        </div>

        {/* Explore */}
        <nav className="footer-col" aria-label="Explore">
          <h4>Explore</h4>
          <Link href="/#try">I&apos;m New</Link>
          <Link href="/#join">The Journey</Link>
          <Link href="/about">Our Story</Link>
          <Link href="/beliefs">What We Believe</Link>
          <Link href="/ministries">Ministries</Link>
        </nav>

        {/* Visit */}
        <nav className="footer-col" aria-label="Visit">
          <h4>Visit</h4>
          <Link href="/plan-visit">Plan a Visit</Link>
          <Link href="/kids">KidzQuest</Link>
          <Link href="/locations">Locations</Link>
          <Link href="/media">Watch online</Link>
          <Link href="/give">Give</Link>
        </nav>

        {/* Contact */}
        <div className="footer-col footer-contact">
          <h4>Contact</h4>
          <a href="mailto:admin@hif.vn">admin@hif.vn</a>
          <a href="tel:+842432006666">+84 24 3200 6666</a>
          <p>
            Detech Building, 8 Tôn Thất Thuyết,
            <br />
            Cầu Giấy Ward, Hà Nội 10000
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>
            © {year} Hanoi International Fellowship. A flagship of the Missional
            International Church Network.
          </p>
        </div>
      </div>
    </footer>
  );
}
