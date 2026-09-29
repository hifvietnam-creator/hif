'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The welcome banner on the homepage, as a rotating set of photographs.
 *
 * Deliberately plain: a crossfade, dots, and arrows. No carousel library — the
 * whole behaviour is an index and a timer, and a dependency would be larger
 * than the component.
 *
 * Accessibility decisions that are easy to skip and shouldn't be:
 *   · rotation stops on hover, on keyboard focus, and when the tab is hidden
 *   · it never starts at all for anyone who has asked for reduced motion
 *   · the slides live in a labelled region so a screen reader can skip them
 */

export type Slide = { src: string; alt: string }

const INTERVAL = 6000

export default function WelcomeCarousel({
  slides,
  className,
}: {
  slides: Slide[]
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const go = useCallback(
    (next: number) => setIndex((next + slides.length) % slides.length),
    [slides.length],
  )

  useEffect(() => {
    if (slides.length < 2 || paused) return
    // Honour the OS setting rather than animating over someone who has asked
    // us not to. Checked here, not in CSS, so the timer never runs either.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    timer.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [slides.length, paused])

  // A carousel rotating in a background tab is wasted work and leaves the
  // visitor returning to an arbitrary slide.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (slides.length === 0) return null
  if (slides.length === 1) {
    const only = slides[0]!
    return (
      <Image
        className={className}
        src={only.src}
        alt={only.alt}
        width={1180}
        height={410}
        priority={false}
      />
    )
  }

  return (
    <div
      className="carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Life at HIF"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="carousel-frame">
        {slides.map((slide, i) => (
          <Image
            key={slide.src}
            className={`${className ?? ''} carousel-slide${i === index ? ' is-active' : ''}`}
            src={slide.src}
            alt={slide.alt}
            width={1180}
            height={410}
            // The first slide is what visitors see; the rest can wait.
            loading={i === 0 ? 'eager' : 'lazy'}
            aria-hidden={i !== index}
          />
        ))}
      </div>

      <button
        type="button"
        className="carousel-arrow carousel-prev"
        onClick={() => go(index - 1)}
        aria-label="Previous photograph"
      >
        ‹
      </button>
      <button
        type="button"
        className="carousel-arrow carousel-next"
        onClick={() => go(index + 1)}
        aria-label="Next photograph"
      >
        ›
      </button>

      <div className="carousel-dots">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            className={`carousel-dot${i === index ? ' is-active' : ''}`}
            onClick={() => go(i)}
            aria-label={`Photograph ${i + 1} of ${slides.length}`}
            aria-current={i === index}
          />
        ))}
      </div>
    </div>
  )
}
