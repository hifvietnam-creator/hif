"use client";

import { useEffect, useState } from "react";

const stages = [
  { id: "try",   num: "1", name: "Try",   desc: "Come & see",  cls: "js-try"   },
  { id: "join",  num: "2", name: "Join",  desc: "Belong",      cls: "js-join"  },
  { id: "grow",  num: "3", name: "Grow",  desc: "In faith",    cls: "js-grow"  },
  { id: "serve", num: "4", name: "Serve", desc: "The city",    cls: "js-serve" },
  { id: "go",    num: "5", name: "Go",    desc: "Be sent",     cls: "js-go"    },
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
      </div>
    </nav>
  );
}
