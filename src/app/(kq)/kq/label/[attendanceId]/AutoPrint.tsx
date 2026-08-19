'use client'

import { useEffect } from 'react'

/**
 * Fires the print dialog once the page has painted.
 *
 * Guarded against running twice: in React strict mode the effect runs a second
 * time, which would queue two identical print jobs — and on a roll printer that
 * is two wasted labels per child, every child, every Sunday.
 */
export default function AutoPrint() {
  useEffect(() => {
    const w = window as Window & { __kqPrinted?: boolean }
    if (w.__kqPrinted) return
    w.__kqPrinted = true

    // A frame's delay so fonts and layout settle first; printing mid-paint has
    // produced blank labels on some Android tablets.
    const t = window.setTimeout(() => window.print(), 250)
    return () => window.clearTimeout(t)
  }, [])

  return null
}
