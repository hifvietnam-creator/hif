import type { GlobalConfig } from 'payload'
import { authenticated } from '../../access/authenticated'

export const MediaHighlights: GlobalConfig = {
  slug: 'media-highlights',
  label: 'Media Highlights',
  access: {
    read: () => true,
    update: authenticated,
  },
  admin: {
    description:
      'Latest featured videos shown on the Watch & Listen page. Run scripts/yt-sync-media.mjs to auto-populate from YouTube.',
  },
  fields: [
    // ── Latest Announcement ───────────────────────────────────────────────────
    {
      name: 'announcement',
      type: 'group',
      label: 'Latest Announcement',
      fields: [
        {
          name: 'videoId',
          type: 'text',
          label: 'YouTube Video ID',
          admin: { description: 'e.g. dQw4w9WgXcQ — auto-set by yt-sync-media.mjs' },
        },
        {
          name: 'title',
          type: 'text',
          label: 'Video Title',
        },
        {
          name: 'publishedAt',
          type: 'date',
          label: 'Published',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    // ── Latest Testimony ─────────────────────────────────────────────────────
    {
      name: 'testimony',
      type: 'group',
      label: 'Latest Testimony',
      fields: [
        {
          name: 'videoId',
          type: 'text',
          label: 'YouTube Video ID',
          admin: { description: 'Auto-set by yt-sync-media.mjs' },
        },
        {
          name: 'title',
          type: 'text',
          label: 'Video Title',
        },
        {
          name: 'publishedAt',
          type: 'date',
          label: 'Published',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    // ── Latest Worship ────────────────────────────────────────────────────────
    {
      name: 'worship',
      type: 'group',
      label: 'Latest Worship / Praise',
      admin: {
        description: 'Add a worship playlist ID to yt-sync-media.mjs to auto-populate this.',
      },
      fields: [
        {
          name: 'videoId',
          type: 'text',
          label: 'YouTube Video ID',
        },
        {
          name: 'title',
          type: 'text',
          label: 'Video Title',
        },
        {
          name: 'publishedAt',
          type: 'date',
          label: 'Published',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
  ],
}
