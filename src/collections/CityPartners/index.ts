import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { defaultLexical } from '@/fields/defaultLexical'

export const CityPartners: CollectionConfig = {
  slug: 'city-partners',
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'focusArea', 'isActive', 'updatedAt'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Organization Name',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'description',
      type: 'richText',
      editor: defaultLexical,
      label: 'Description',
    },
    {
      name: 'website',
      type: 'text',
      label: 'Website URL',
    },
    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: 'focusArea',
      type: 'text',
      label: 'Focus Area',
      admin: {
        position: 'sidebar',
        description: 'e.g. Education, Healthcare, Community Development',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Active Partner',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Uncheck to hide from the CityPartners page.',
      },
    },
  ],
}
