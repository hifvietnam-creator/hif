import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Fellowships: CollectionConfig = {
  slug: 'fellowships',
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'language', 'isActive', 'order', 'updatedAt'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'e.g. Korean Fellowship, Vietnamese Fellowship',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Tile Photo',
      admin: {
        description: 'The image shown in the fellowship tile grid.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Short description shown on hover or below the tile.',
      },
    },
    {
      name: 'churchCenterURL',
      type: 'text',
      label: 'Church Center Signup URL',
      admin: {
        description: 'Link to the fellowship signup page on Church Center.',
      },
    },
    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: 'language',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'e.g. Korean, Vietnamese, English',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Active',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Uncheck to hide from the Fellowships page.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 99,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first.',
      },
    },
  ],
}
