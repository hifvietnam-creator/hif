import Link from 'next/link'

/**
 * Shown by Next while the sermon detail page's data is fetched. Mirrors the real
 * layout — dark hero, then the video block — so the page doesn't visibly jump
 * when the content arrives.
 *
 * The breadcrumb is real rather than a placeholder: it is the one thing that is
 * already known at this point, and it gives an immediate way back.
 */
export default function SermonLoading() {
  return (
    <>
      <section className="page-hero page-hero-sm">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · <Link href="/media">Watch &amp; Listen</Link> ·{' '}
            <Link href="/sermons">Sermons</Link>
          </p>
          <div aria-busy="true" aria-label="Loading sermon">
            <p className="skeleton-text skeleton-on-dark skeleton-sm" />
            <p className="skeleton-text skeleton-on-dark skeleton-title" />
            <p className="skeleton-text skeleton-on-dark skeleton-md" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container sermon-detail">
          <div className="sermon-resources">
            <span className="skeleton-block skeleton-btn" />
            <span className="skeleton-block skeleton-btn" />
          </div>
          <div className="video-embed skeleton-block" />
        </div>
      </section>
    </>
  )
}
