"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// The homepage carries only the first two stages: a visitor arriving here is
// at TRY or approaching JOIN. The rest of the Journey lives on /ministries.
const stages = [
  { id: "try",  num: "1", name: "Try",  desc: "Come & see", cls: "js-try"  },
  { id: "join", num: "2", name: "Join", desc: "Belong",     cls: "js-join" },
];

export default function JourneyStrip() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sectionIds = stages.map((s) => s.id);

    const observers = sectionIds.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActive(id);
          });
        },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      observer.observe(el);
      return observer;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return (
    <nav className="journey-strip" id="journeyStrip" aria-label="The HIF Journey">
      <div className="container journey-strip-inner">
        {stages.map((s) => (
          <a
            key={s.id}
            className={`js-stage ${s.cls}${active === s.id ? " active" : ""}`}
            href={`#${s.id}`}
          >
            <span className="js-num">{s.num}</span>
            <span className="js-name">{s.name}</span>
            <span className="js-desc">{s.desc}</span>
          </a>
        ))}
        <Link className="js-more" href="/ministries">
          <span className="js-more-label">Already part of HIF?</span>
          <span className="js-more-link">
            Grow · Serve · Go <span aria-hidden="true">→</span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
