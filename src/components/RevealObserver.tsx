"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Global scroll-reveal watcher.
 * Mirrors the IntersectionObserver from the original main.js —
 * adds `.in` to every `.reveal` element when it enters the viewport.
 *
 * Depends on `pathname` so it re-runs on every client-side navigation.
 * Without this, the layout never re-mounts and new-page elements stay
 * at opacity:0 indefinitely (fixed by browser reload but not navigation).
 */
export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    // Brief defer so new-page content has finished rendering into the DOM
    const timer = setTimeout(() => {
      document.querySelectorAll(".reveal:not(.in)").forEach((el) =>
        observer.observe(el)
      );
    }, 50);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
