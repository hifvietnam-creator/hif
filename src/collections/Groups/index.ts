import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Groups: CollectionConfig = {
  slug: 'groups',
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'groupType', 'schedule', 'enrollmentOpen', 'listed', 'updatedAt'],
    useAsTitle: 'name',
    description: 'Connect Groups and Fellowships synced from Planning Center Online (PCO). Run scripts/pco-sync-groups.ts to refresh.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Auto-filled from PCO. You can override this text.',
      },
    },
    {
      name: 'schedule',
      type: 'text',
      label: 'Schedule',
      admin: {
        description: 'e.g. "Mondays at 7pm" or "Every other Saturday"',
      },
    },
    {
      name: 'imageUrl',
      type: 'text',
      label: 'Header Image URL',
      admin: {
        description: 'S3 URL from Church Center. Auto-filled by sync script.',
      },
    },
    {
      name: 'churchCenterUrl',
      type: 'text',
      label: 'Church Center URL',
      admin: {
        description: 'Public URL on hifvn.churchcenter.com. Used for "Learn more" and "Join" links.',
      },
    },
    {
      name: 'contactEmail',
      type: 'email',
      label: 'Contact Email',
    },
    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: 'pcoId',
      type: 'text',
      label: 'PCO Group ID',
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Planning Center Online group ID — used for upserts. Do not edit.',
      },
    },
    {
      name: 'groupType',
      type: 'select',
      label: 'Group Type',
      required: true,
      options: [
        { label: 'Connect Group', value: 'connect-group' },
        { label: 'Fellowship', value: 'fellowship' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Determines which page this group appears on.',
      },
    },
    {
      name: 'enrollmentOpen',
      type: 'checkbox',
      label: 'Enrollment Open',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Synced from PCO. Controls whether a "Join" button is shown.',
      },
    },
    {
      name: 'listed',
      type: 'checkbox',
      label: 'Publicly Listed',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Only listed groups appear on the website.',
      },
    },
    {
      name: 'membershipsCount',
      type: 'number',
      label: 'Members',
      admin: {
        position: 'sidebar',
        description: 'Auto-synced from PCO.',
      },
    },
  ],
}
