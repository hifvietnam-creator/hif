"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

type MegaGroup = {
  id: string;
  label: string;
  links: { href: string; label: string; external?: boolean }[];
};

const megaGroups: MegaGroup[] = [
  {
    id: "mega-new",
    label: "I'm New",
    links: [
      { href: "/jesus", label: "Who is Jesus?" },
      { href: "/plan-visit", label: "Plan a Visit" },
      { href: "/", label: "The Journey" },
      { href: "/next-steps", label: "Next Steps" },
      { href: "/resources#help", label: "FAQ & Practical Help" },
    ],
  },
  {
    id: "mega-about",
    label: "About",
    links: [
      { href: "/about", label: "Our Story" },
      { href: "/stories", label: "Stories" },
      { href: "/beliefs", label: "What We Believe" },
      { href: "/next-steps#membership", label: "Become a Member" },
      { href: "/locations", label: "Locations" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    id: "mega-ministries",
    label: "Ministries",
    links: [
      { href: "/ministries", label: "All Ministries" },
      { href: "/alpha", label: "Alpha" },
      { href: "/spotlight", label: "Spotlight English Clubs" },
      { href: "/kids", label: "KidzQuest" },
      { href: "/aftershock", label: "Aftershock Youth" },
      { href: "/connect", label: "Connect Groups" },
      { href: "/fellowships", label: "Fellowships" },
      { href: "/citypartners", label: "CityPartners" },
    ],
  },
  {
    id: "mega-media",
    label: "Media & Resources",
    links: [
      { href: "/media", label: "Watch & Listen" },
      { href: "/events", label: "Events" },
      { href: "/news", label: "News & Updates" },
      { href: "/resources", label: "Resources" },
      { href: "/give", label: "Give" },
      {
        href: "https://hifvn.churchcenter.com/people/forms/373350",
        label: "Subscribe",
        external: true,
      },
    ],
  },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mega-panel on outside click
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    },
    []
  );

  useEffect(() => {
    if (openPanel) {
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openPanel, handleOutsideClick]);

  const togglePanel = (id: string) =>
    setOpenPanel((prev) => (prev === id ? null : id));

  return (
    <header
      ref={headerRef}
      className={`site-header${scrolled ? " scrolled" : ""}`}
      id="siteHeader"
    >
      <div className="container header-inner">
        {/* Brand */}
        <Link className="brand" href="/" aria-label="Hanoi International Fellowship home">
          <Image
            className="brand-logo"
            src="/assets/img/logo.png"
            alt="Hanoi International Fellowship"
            width={160}
            height={44}
            priority
          />
          <span className="brand-sub">
            Hanoi
            <br />
            International
            <br />
            Fellowship
          </span>
        </Link>

        {/* Desktop mega-nav */}
        <nav className="mega-nav" aria-label="Primary">
          <ul className="mega-list">
            {megaGroups.map((group) => (
              <li
                key={group.id}
                className={`mega-item${openPanel === group.id ? " open" : ""}`}
              >
                <button
                  className="mega-top"
                  type="button"
                  aria-expanded={openPanel === group.id}
                  aria-controls={group.id}
                  onClick={() => togglePanel(group.id)}
                >
                  {group.label}
                  <span className="mega-caret" aria-hidden="true" />
                </button>
                <div className="mega-panel" id={group.id}>
                  {group.links.map((link) =>
                    link.external ? (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpenPanel(null)}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpenPanel(null)}
                      >
                        {link.label}
                      </Link>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop CTA buttons */}
        <div className="header-actions">
          <Link className="header-search-btn" href="/search" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>
          <Link className="btn btn-give" href="/give">
            Give
          </Link>
          <Link className="btn btn-primary" href="/plan-visit">
            Visit
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="nav-toggle"
          id="navToggle"
          aria-expanded={mobileOpen}
          aria-controls="mobileNav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile nav */}
      <div className="mobile-nav" id="mobileNav" hidden={!mobileOpen}>
        <div className="menu-cta">
          <Link className="btn btn-primary" href="/plan-visit" onClick={() => setMobileOpen(false)}>
            Visit
          </Link>
          <Link className="btn btn-give" href="/give" onClick={() => setMobileOpen(false)}>
            Give
          </Link>
        </div>
        <div className="menu-acc">
          {megaGroups.map((group) => (
            <details key={group.id} className="m-group">
              <summary>
                {group.label}
                <span className="m-caret" aria-hidden="true" />
              </summary>
              <div className="m-links">
                {group.links.map((link) =>
                  link.external ? (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </header>
  );
}
