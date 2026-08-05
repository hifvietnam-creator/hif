'use client'

import { useEffect } from 'react'

/**
 * Global scroll-reveal watcher: adds `.in` to every `.reveal` element as it
 * enters the viewport. `.reveal` starts at opacity 0, so anything this misses
 * stays permanently invisible.
 *
 * It previously re-scanned the DOM once, 50ms after `pathname` changed. That
 * missed two cases:
 *
 *   1. Filter and pagination links change only the query string, not the
 *      pathname, so the effect never re-ran and newly rendered cards were
 *      never observed.
 *   2. Streamed content (anything inside <Suspense>) arrives after the 50ms
 *      window, so it was never picked up at all.
 *
 * A MutationObserver removes the timing guess entirely: whenever a `.reveal`
 * is added to the document, however it got there, it gets observed.
 */
export default function RevealObserver() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      // No animation wanted — just make everything visible and stay out of the way.
      const revealAll = () =>
        document.querySelectorAll('.reveal:not(.in)').forEach((el) => el.classList.add('in'))
      revealAll()
      const mo = new MutationObserver(revealAll)
      mo.observe(document.body, { childList: true, subtree: true })
      return () => mo.disconnect()
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12 },
    )

    const observeWithin = (root: ParentNode) => {
      root.querySelectorAll?.('.reveal:not(.in)').forEach((el) => io.observe(el))
    }

    observeWithin(document)

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue
          if (node.classList.contains('reveal') && !node.classList.contains('in')) {
            io.observe(node)
          }
          observeWithin(node)
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      io.disconnect()
    }
  }, [])

  return null
}
