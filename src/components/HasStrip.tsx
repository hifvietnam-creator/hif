"use client";

import { useEffect } from "react";

/** Adds html.has-strip on mount (homepage only) and removes on unmount. */
export default function HasStrip() {
  useEffect(() => {
    document.documentElement.classList.add("has-strip");
    return () => {
      document.documentElement.classList.remove("has-strip");
    };
  }, []);

  return null;
}
