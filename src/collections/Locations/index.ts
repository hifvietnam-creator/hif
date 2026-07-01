import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Locations: CollectionConfig = {
  slug: 'locations',
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'isActive', 'order', 'updatedAt'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Campus Name',
      admin: {
        description: 'e.g. Tay Ho Campus, Nam Tu Liem Campus',
      },
    },
    {
      name: 'address',
      type: 'textarea',
      required: true,
    },
    {
      name: 'mapURL',
      type: 'text',
      label: 'Google Maps Embed URL',
      admin: {
        description: 'Use format: https://maps.google.com/maps?q=...&output=embed',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    // ── Service Times ─────────────────────────────────────────────────────────
    {
      name: 'serviceTimes',
      type: 'array',
      label: 'Service Times',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'day',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g. Sunday',
          },
        },
        {
          name: 'time',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g. 9:00 AM',
          },
        },
        {
          name: 'language',
          type: 'text',
          admin: {
            description: 'e.g. English, Vietnamese, Bilingual',
          },
        },
        {
          name: 'notes',
          type: 'text',
          admin: {
            description: 'Optional — e.g. "KidzQuest available", "Simultaneous translation"',
          },
        },
      ],
    },
    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Active',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Uncheck to hide this campus from the Locations page.',
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
