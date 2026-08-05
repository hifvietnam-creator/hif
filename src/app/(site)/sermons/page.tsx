import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'

import SermonGrid, { type SermonFilters } from './SermonGrid'
import SermonGridSkeleton from './SermonGridSkeleton'
import FilterSidebar, { FilterSidebarSkeleton } from './FilterSidebar'

export const metadata: Metadata = {
  title: 'Sermons — Hanoi International Fellowship',
  description:
    'Browse HIF sermons by speaker, series, or year. Watch, download notes, and dig deeper with discussion questions.',
  openGraph: {
    title: 'Sermons — Hanoi International Fellowship',
    description: 'Watch and listen to messages from HIF — searchable by speaker, series, and year.',
    type: 'website',
  },
}

type PageProps = {
  searchParams: Promise<SermonFilters>
}

/**
 * Nothing is awaited here except searchParams, which resolves immediately.
 *
 * That matters: anything awaited in this component blocks the whole HTML shell,
 * so the hero could not paint until the facet query finished — no header, no
 * skeleton, nothing. Both data-dependent regions are behind their own Suspense
 * boundary, so the shell streams first and each region fills in when ready.
 */
export default async function SermonsPage({ searchParams }: PageProps) {
  const filters = await searchParams

  // Re-suspend the grid whenever the filters or page change, so a click shows
  // the skeleton immediately instead of leaving stale results on screen.
  const gridKey = `${filters.series ?? ''}|${filters.year ?? ''}|${filters.speaker ?? ''}|${filters.page ?? '1'}`

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · <Link href="/media">Watch &amp; Listen</Link> · Sermons
          </p>
          <p className="eyebrow eyebrow-light">Sermons</p>
          <h1>
            Every message,
            <br />
            on demand.
          </h1>
          <p className="page-lead">
            Watch HIF sermons, download notes, and dig deeper with discussion questions — all in one
            place.
          </p>
        </div>
      </section>

      {/* FILTERS + GRID */}
      <section className="section">
        <div className="container">
          <div className="sermons-layout">
            <Suspense fallback={<FilterSidebarSkeleton />}>
              <FilterSidebar filters={filters} />
            </Suspense>

            <div className="sermons-main">
              <Suspense key={gridKey} fallback={<SermonGridSkeleton />}>
                <SermonGrid filters={filters} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
