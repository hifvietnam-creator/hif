import type { GlobalConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: {
    read: () => true,
    update: authenticated,
  },
  fields: [
    // ── Contact ───────────────────────────────────────────────────────────────
    {
      name: 'contact',
      type: 'group',
      label: 'Contact Information',
      fields: [
        {
          name: 'email',
          type: 'email',
          label: 'General Email',
          admin: { description: 'e.g. info@hif.vn' },
        },
        {
          name: 'phone',
          type: 'text',
          admin: { description: 'e.g. +84 24 1234 5678' },
        },
        {
          name: 'address',
          type: 'textarea',
          label: 'Mailing / Primary Address',
        },
      ],
    },
    // ── Social ────────────────────────────────────────────────────────────────
    {
      name: 'social',
      type: 'group',
      label: 'Social Media',
      fields: [
        {
          name: 'facebookURL',
          type: 'text',
          label: 'Facebook URL',
        },
        {
          name: 'youtubeURL',
          type: 'text',
          label: 'YouTube Channel URL',
        },
        {
          name: 'instagramURL',
          type: 'text',
          label: 'Instagram URL',
        },
      ],
    },
    // ── Giving ────────────────────────────────────────────────────────────────
    {
      name: 'givingURL',
      type: 'text',
      label: 'Giving Page URL',
      admin: {
        description: 'The primary giving URL used in header/footer Give button.',
      },
    },
    // ── Service summary ───────────────────────────────────────────────────────
    {
      name: 'servicesSummary',
      type: 'text',
      label: 'Services Summary',
      admin: {
        description:
          'Short service info shown in the footer, e.g. "Sundays 9 AM & 11 AM · Tay Ho & Nam Tu Liem"',
      },
    },
    // ── Restream OAuth tokens (admin-only, managed automatically) ─────────────
    {
      name: 'restream',
      type: 'group',
      label: 'Restream Integration',
      access: {
        read: authenticated,
        update: authenticated,
      },
      admin: {
        description:
          'OAuth tokens managed automatically. Use the "Authorize Restream" link in the Live Stream global to connect.',
      },
      fields: [
        {
          name: 'accessToken',
          type: 'text',
          label: 'Access Token',
          admin: { readOnly: true, description: 'Auto-managed. Do not edit.' },
        },
        {
          name: 'refreshToken',
          type: 'text',
          label: 'Refresh Token',
          admin: { readOnly: true, description: 'Auto-managed. Do not edit.' },
        },
        {
          name: 'expiresAt',
          type: 'text',
          label: 'Access Token Expires At (ISO)',
          admin: { readOnly: true },
        },
        {
          name: 'connectedAt',
          type: 'date',
          label: 'Last Authorized',
          admin: { readOnly: true },
        },
      ],
    },
  ],
}
