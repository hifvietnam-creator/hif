/**
 * Route-group-wide loading fallback.
 *
 * Next shows this during navigation to any route under (site) that does not
 * define its own loading.tsx. Without it, clicking a link leaves the previous
 * page on screen with no feedback until the server has fully rendered the new
 * one — which reads as the site having frozen.
 *
 * Routes with their own loading.tsx (e.g. sermons/[slug]) override this.
 */
export default function SiteLoading() {
  return (
    <>
      <section className="page-hero page-hero-sm">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <div aria-busy="true" aria-label="Loading page">
            <p className="skeleton-text skeleton-on-dark skeleton-sm" />
            <p className="skeleton-text skeleton-on-dark skeleton-title" />
            <p className="skeleton-text skeleton-on-dark skeleton-md" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="page-loading-bar" role="status">
            <span className="sr-only">Loading…</span>
          </div>
        </div>
      </section>
    </>
  )
}
