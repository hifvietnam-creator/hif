import { SERMONS_PER_PAGE } from './SermonGrid'

/**
 * Shown while the sermon query runs. Its job is to make a filter click feel
 * acknowledged instantly — the previous behaviour left the old results on
 * screen with no indication anything was happening.
 */
export default function SermonGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      <p className="sermons-count skeleton-text" aria-hidden="true">
        &nbsp;
      </p>
      <div className="sermon-grid" aria-busy="true" aria-label="Loading sermons">
        {Array.from({ length: Math.min(count, SERMONS_PER_PAGE) }).map((_, i) => (
          <article className="sermon-card" key={i}>
            <div className="sermon-thumb skeleton-block" />
            <div className="sermon-meta">
              <p className="skeleton-text skeleton-sm" />
              <p className="skeleton-text skeleton-lg" />
              <p className="skeleton-text skeleton-md" />
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
