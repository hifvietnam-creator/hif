'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

/**
 * The homepage hero background, as a slow crossfade of photographs.
 *
 * The first slide is the hero image and is the only one in the initial HTML —
 * it is what a visitor sees, so it loads with priority. The rest are added
 * after mount, one ahead of the slide on screen, so a visitor who scrolls
 * straight past the hero never downloads six full-width photographs.
 *
 * The photographs are decoration behind the headline, hence the empty alt text
 * and aria-hidden wrapper. The controls sit outside that wrapper so they stay
 * reachable: anything that moves on its own needs a way to stop it.
 */

export type HeroSlide = {
  src: string
  /** CSS object-position — where the crop should hold when the frame is tight. */
  position?: string
}

const INTERVAL = 7000
const ARM_AFTER = 2000

export default function HeroSlides({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0)
  // Highest slide shown so far: slides up to one past it are in the DOM.
  const [reached, setReached] = useState(0)
  // False until the page has settled, so the later photographs never compete
  // with the first one for bandwidth.
  const [armed, setArmed] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [hidden, setHidden] = useState(false)

  const show = (next: number) => {
    setIndex(next)
    setReached((r) => Math.max(r, next))
  }

  useEffect(() => {
    const settle = setTimeout(() => {
      setArmed(true)
      // Honour the OS setting: stay on the first photograph rather than animate
      // over someone who has asked us not to. The dots still work.
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPlaying(false)
    }, ARM_AFTER)

    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(settle)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    if (!playing || hidden || slides.length < 2) return
    const t = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % slides.length
        setReached((r) => Math.max(r, next))
        return next
      })
    }, INTERVAL)
    return () => clearInterval(t)
  }, [playing, hidden, slides.length])

  const multiple = slides.length > 1

  return (
    <>
      <div className="hero-photo" aria-hidden="true">
        {slides.map((slide, i) => {
          if (i > 0 && (!armed || i > reached + 1)) return null
          return (
            <Image
              key={slide.src}
              className={`hero-slide${i === index ? ' is-active' : ''}`}
              src={slide.src}
              alt=""
              fill
              sizes="100vw"
              priority={i === 0}
              style={{ objectPosition: slide.position ?? 'center' }}
            />
          )
        })}
      </div>

      {multiple && (
        <div className="hero-dots" role="group" aria-label="Background photographs">
          <button
            type="button"
            className="hero-pause"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause the rotating photographs' : 'Play the rotating photographs'}
          >
            <span className={playing ? 'hero-pause-icon' : 'hero-play-icon'} aria-hidden="true" />
          </button>
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              className={`hero-dot${i === index ? ' is-active' : ''}`}
              onClick={() => {
                show(i)
                setPlaying(false)
              }}
              aria-label={`Photograph ${i + 1} of ${slides.length}`}
              aria-current={i === index}
            />
          ))}
        </div>
      )}
    </>
  )
}
