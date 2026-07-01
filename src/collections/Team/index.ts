import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Team: CollectionConfig = {
  slug: 'team',
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'role', 'staffMember', 'order', 'updatedAt'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'text',
      required: true,
      label: 'Role / Title',
      admin: {
        description: 'e.g. Senior Pastor, Worship Director, Kids Ministry Lead',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'textarea',
      admin: {
        description: 'Short bio shown on the About / Team page.',
      },
    },
    {
      name: 'email',
      type: 'email',
      admin: {
        description: 'Optional — only shown if you choose to display it.',
      },
    },
    {
      name: 'campus',
      type: 'select',
      options: [
        { label: 'Tay Ho', value: 'tay-ho' },
        { label: 'Nam Tu Liem', value: 'nam-tu-liem' },
        { label: 'Online', value: 'online' },
        { label: 'All Campuses', value: 'all' },
      ],
      defaultValue: 'all',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'ministryArea',
      type: 'text',
      label: 'Ministry Area',
      admin: {
        position: 'sidebar',
        description: 'e.g. Worship, Children, Connect Groups',
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
    {
      name: 'staffMember',
      type: 'checkbox',
      label: 'Show on About / Team page',
      // Default true so that anyone added through the admin panel appears on the site.
      // The import script explicitly sets this to false for auto-created sermon speakers.
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description:
          'Check for actual HIF staff. Uncheck for guest speakers imported from YouTube — they can still be credited on sermons but won\'t appear on the About page.',
      },
    },
  ],
}
