import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Sermon } from '../../../payload-types'

/**
 * The /sermons sidebar (years, speakers, series) is derived from a scan of the
 * whole collection and cached under the `sermons` tag for 5 minutes, because
 * recomputing it per request was what made the page take ~20s.
 *
 * That cache has to be dropped whenever the collection changes, otherwise a
 * newly published sermon can appear in the listing while its year is still
 * missing from the filter beside it.
 */
export const revalidateSermon: CollectionAfterChangeHook<Sermon> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  // Filter facets depend on every sermon, not just this one.
  revalidateTag('sermons')

  if (doc._status === 'published') {
    revalidatePath(`/sermons/${doc.slug}`)
    revalidatePath('/sermons')
  }

  // Unpublishing or renaming leaves the old URL cached otherwise.
  if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
    revalidatePath(`/sermons/${previousDoc.slug}`)
  }
  if (previousDoc?._status === 'published' && doc._status !== 'published') {
    revalidatePath(`/sermons/${previousDoc.slug}`)
    revalidatePath('/sermons')
  }

  payload.logger.info(`Revalidated sermons after change to "${doc.title}"`)
  return doc
}

export const revalidateSermonDelete: CollectionAfterDeleteHook<Sermon> = ({
  doc,
  req: { context },
}) => {
  if (context.disableRevalidate) return doc

  revalidateTag('sermons')
  revalidatePath('/sermons')
  if (doc?.slug) revalidatePath(`/sermons/${doc.slug}`)

  return doc
}
