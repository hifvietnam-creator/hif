import { BeforeSync, DocToSync } from '@payloadcms/plugin-search/types'

export const beforeSyncWithSearch: BeforeSync = async ({ req, originalDoc, searchDoc }) => {
  const {
    doc: { relationTo: collection },
  } = searchDoc

  const { slug, id, categories, title, meta } = originalDoc

  // ── Sermons ──────────────────────────────────────────────────────────────
  // Sermons don't have categories; use description for meta.description
  if (collection === 'sermons') {
    const speakerName =
      originalDoc.speaker && typeof originalDoc.speaker === 'object'
        ? (originalDoc.speaker as { name?: string }).name
        : null

    return {
      ...searchDoc,
      slug,
      meta: {
        title: meta?.title || title,
        description:
          meta?.description ||
          originalDoc.description ||
          (speakerName ? `Message by ${speakerName}` : undefined),
        image: meta?.image?.id || meta?.image || originalDoc.thumbnail?.id || originalDoc.thumbnail,
      },
      categories: [],
    } as DocToSync
  }

  // ── Posts / Pages (default behaviour) ────────────────────────────────────
  const modifiedDoc: DocToSync = {
    ...searchDoc,
    slug,
    meta: {
      ...meta,
      title: meta?.title || title,
      image: meta?.image?.id || meta?.image,
      description: meta?.description,
    },
    categories: [],
  }

  if (categories && Array.isArray(categories) && categories.length > 0) {
    const populatedCategories: { id: string | number; title: string }[] = []
    for (const category of categories) {
      if (!category) continue

      if (typeof category === 'object') {
        populatedCategories.push(category)
        continue
      }

      const doc = await req.payload.findByID({
        collection: 'categories',
        id: category,
        disableErrors: true,
        depth: 0,
        select: { title: true },
        req,
      })

      if (doc !== null) {
        populatedCategories.push(doc)
      } else {
        console.error(
          `Failed. Category not found when syncing collection '${collection}' with id: '${id}' to search.`,
        )
      }
    }

    modifiedDoc.categories = populatedCategories.map((each) => ({
      relationTo: 'categories',
      categoryID: String(each.id),
      title: each.title,
    }))
  }

  return modifiedDoc
}
