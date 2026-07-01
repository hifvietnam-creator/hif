import type { GlobalConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { defaultLexical } from '@/fields/defaultLexical'

export const LiveStream: GlobalConfig = {
  slug: 'live-stream',
  label: 'Live Stream',
  access: {
    read: () => true,
    update: authenticated,
  },
  fields: [
    // ── Live state ────────────────────────────────────────────────────────────
    {
      name: 'isLive',
      type: 'checkbox',
      label: 'Currently Live',
      defaultValue: false,
      admin: {
        description:
          'Auto-managed by the Restream polling job. You can also toggle manually. To connect Restream for the first time, visit /api/restream/authorize.',
      },
    },
    {
      name: 'youtubeVideoId',
      type: 'text',
      label: 'YouTube Video ID',
      admin: {
        description:
          'Auto-populated by the Restream polling job. You can also enter it manually — e.g. for https://youtube.com/watch?v=dQw4w9WgXcQ the ID is dQw4w9WgXcQ.',
        condition: (data) => Boolean(data?.isLive),
      },
    },
    {
      name: 'streamTitle',
      type: 'text',
      label: 'Stream Title',
      admin: {
        description: 'Shown above the video player when live, e.g. "Sunday Worship — 9 AM".',
        condition: (data) => Boolean(data?.isLive),
      },
    },
    // ── Not-live state ────────────────────────────────────────────────────────
    {
      name: 'nextServiceDate',
      type: 'date',
      label: 'Next Service Date & Time',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Shown on the /online page when not live. Used for a countdown.',
      },
    },
    {
      name: 'nextServiceTitle',
      type: 'text',
      label: 'Next Service Label',
      admin: {
        description: 'e.g. "Sunday Worship", "Easter Service"',
      },
    },
    {
      name: 'preServiceMessage',
      type: 'richText',
      editor: defaultLexical,
      label: 'Waiting Room Message',
      admin: {
        description: 'Shown on the /online page when not live — welcome message, what to expect, etc.',
      },
    },
  ],
}
