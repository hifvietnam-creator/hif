import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
} from '@payloadcms/plugin-seo/fields'

export const Series: CollectionConfig = {
  slug: 'series',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'year', 'isActive', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'description',
              type: 'textarea',
            },
            {
              name: 'artwork',
              type: 'upload',
              relationTo: 'media',
              label: 'Series Artwork',
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({ hasGenerateFn: false }),
            MetaImageField({ relationTo: 'media' }),
            MetaDescriptionField({}),
          ],
        },
      ],
    },
    {
      name: 'year',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'e.g. 2025',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Current Series',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Mark this as the current series. Only one should be active at a time.',
      },
    },
    {
      name: 'youtubePlaylistId',
      type: 'text',
      label: 'YouTube Playlist ID',
      admin: {
        position: 'sidebar',
        description: 'The playlist ID from YouTube — used by yt-fetch-sermons.mjs to sync sermons.',
      },
    },
    slugField(),
  ],
  versions: {
    drafts: true,
  },
}
