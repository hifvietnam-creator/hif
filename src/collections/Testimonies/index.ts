import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Testimonies: CollectionConfig = {
  slug: 'testimonies',
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'source', 'category', 'journeyStage', 'featured', 'videoFeatured', 'updatedAt'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Person\'s name (or video title if YouTube-sourced).',
      },
    },
    {
      name: 'quote',
      type: 'textarea',
      required: false,
      admin: {
        description: 'The testimony in their own words. Required for written testimonies; leave blank for YouTube videos.',
      },
    },
    {
      name: 'background',
      type: 'text',
      label: 'Background Descriptor',
      admin: {
        description: 'e.g. "Vietnamese returnee", "Expat from Germany", "International student"',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Photo (optional)',
      admin: {
        description: 'Used for written testimonies on the homepage stories section.',
      },
    },
    // ── YouTube video fields ──────────────────────────────────────────────────
    {
      name: 'youtubeId',
      type: 'text',
      label: 'YouTube Video ID',
      admin: {
        description: 'The YouTube video ID (e.g. "jtWD5zO7k2Q"). Auto-filled by sync script.',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Published Date',
      admin: {
        description: 'Date the video was published on YouTube. Auto-filled by sync script.',
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'd MMM yyyy',
        },
      },
    },
    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      name: 'source',
      type: 'select',
      label: 'Source',
      defaultValue: 'manual',
      options: [
        { label: 'Manual entry', value: 'manual' },
        { label: 'YouTube (auto-synced)', value: 'youtube' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Manual = written quote. YouTube = video from a playlist sync.',
      },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      options: [
        { label: 'Baptism Testimony', value: 'baptism' },
        { label: 'Advent Candle Lighting', value: 'advent-candle' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Used to group videos on the Stories page.',
      },
    },
    {
      name: 'journeyStage',
      type: 'select',
      label: 'Journey Stage',
      options: [
        { label: 'Try', value: 'try' },
        { label: 'Join', value: 'join' },
        { label: 'Grow', value: 'grow' },
        { label: 'Serve', value: 'serve' },
        { label: 'Go', value: 'go' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Which stage of the HIF Journey does this story best represent?',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Show on Homepage (written quote)',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Featured written testimonies appear in the homepage stories section.',
      },
    },
    {
      name: 'videoFeatured',
      type: 'checkbox',
      label: 'Show on Stories Page (video)',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Video testimonies shown in the Watch section of the Stories page. Uncheck to hide.',
      },
    },
  ],
}
