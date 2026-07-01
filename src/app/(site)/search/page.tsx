import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import SiteSearch from '@/components/SiteSearch'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search — Hanoi International Fellowship',
  description: 'Search sermons, speakers, series, and more at HIF.',
}

// ── URL builder ───────────────────────────────────────────────────────────────

function resultUrl(doc: { relationTo?: string }, slug: string): string {
  if (doc?.relationTo === 'sermons') return `/sermons/${slug}`
  return `/${slug}`
}

function collectionLabel(relationTo?: string): string {
  if (relationTo === 'sermons') return 'Sermon'
  if (relationTo === 'posts') return 'Post'
  return 'Page'
}

// ── Page ─────────────────────────────────────────────────────────────────────

type PageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q: query } = await searchParams
  const hasQuery = Boolean(query?.trim())

  const payload = await getPayload({ config: configPromise })

  const results = hasQuery
    ? await payload.find({
        collection: 'search',
        depth: 1,
        limit: 20,
        pagination: false,
        where: {
          or: [
            { title: { like: query } },
            { 'meta.description': { like: query } },
            { 'meta.title': { like: query } },
            { slug: { like: query } },
          ],
        },
      })
    : null

  const docs = results?.docs ?? []

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero page-hero-sm">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="eyebrow eyebrow-light">Search</p>
          <h1>Find it.</h1>
          <p className="page-lead">Search sermons, speakers, scripture references, and more.</p>
        </div>
      </section>

      {/* SEARCH BOX + RESULTS */}
      <section className="section">
        <div className="container search-page">
          <Suspense fallback={null}>
            <SiteSearch initialQuery={query ?? ''} />
          </Suspense>

          {hasQuery && (
            <div className="search-results" role="region" aria-label="Search results" aria-live="polite">
              {docs.length === 0 ? (
                <p className="search-no-results">
                  No results for <strong>&ldquo;{query}&rdquo;</strong> — try a different word or speaker name.
                </p>
              ) : (
                <>
                  <p className="search-count">
                    {docs.length} result{docs.length !== 1 ? 's' : ''} for{' '}
                    <strong>&ldquo;{query}&rdquo;</strong>
                  </p>
                  <ul className="search-list">
                    {docs.map((item) => {
                      const slug = (item.slug as string) ?? ''
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const docRef = item.doc as any
                      const url = resultUrl(docRef, slug)
                      const label = collectionLabel(docRef?.relationTo)
                      const meta = item.meta as { title?: string; description?: string } | undefined

                      return (
                        <li key={String(item.id)} className="search-result reveal">
                          <Link href={url} className="search-result-link">
                            <span className="search-result-type">{label}</span>
                            <h2 className="search-result-title">{item.title as string}</h2>
                            {meta?.description && (
                              <p className="search-result-desc">{meta.description}</p>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          )}

          {!hasQuery && (
            <p className="search-prompt">Type above to search sermons, speakers, and content.</p>
          )}
        </div>
      </section>
    </>
  )
}
