'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useDebounce } from '@/utilities/useDebounce'

export default function SiteSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const [value, setValue] = useState(initialQuery)
  const router = useRouter()
  const debouncedValue = useDebounce(value, 400)

  useEffect(() => {
    router.push(`/search${debouncedValue ? `?q=${encodeURIComponent(debouncedValue)}` : ''}`)
  }, [debouncedValue, router])

  return (
    <form
      className="site-search-form"
      onSubmit={(e) => {
        e.preventDefault()
        router.push(`/search${value ? `?q=${encodeURIComponent(value)}` : ''}`)
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        Search sermons and content
      </label>
      <div className="site-search-wrap">
        <span className="site-search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          id="site-search"
          className="site-search-input"
          type="search"
          placeholder="Search sermons, speakers, scripture…"
          autoComplete="off"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className="site-search-clear"
            aria-label="Clear search"
            onClick={() => setValue('')}
          >
            ✕
          </button>
        )}
      </div>
    </form>
  )
}
