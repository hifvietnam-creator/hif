"use client";

import { useEffect, useRef, ElementType, ComponentPropsWithoutRef } from "react";

type ScrollRevealProps<T extends ElementType = "div"> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

export default function ScrollReveal<T extends ElementType = "div">({
  as,
  className = "",
  children,
  ...rest
}: ScrollRevealProps<T>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = (as ?? "div") as any;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
