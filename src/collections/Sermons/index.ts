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

export const Sermons: CollectionConfig = {
  slug: 'sermons',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'speaker', 'series', 'date', 'updatedAt'],
    useAsTitle: 'title',
    preview: (doc) => {
      if (!doc?.slug) return null
      return `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/sermons/${doc.slug}`
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    // ── Tabs ──────────────────────────────────────────────────────────────────
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'description',
              type: 'textarea',
              label: 'Short Description',
              admin: {
                description: '2–3 sentence summary shown on the sermon listing page.',
              },
            },
            {
              name: 'youtubeURL',
              type: 'text',
              label: 'YouTube URL',
              admin: {
                description: 'Full YouTube watch URL, e.g. https://www.youtube.com/watch?v=...',
              },
            },
            {
              name: 'audioURL',
              type: 'text',
              label: 'Audio URL (MP3)',
              admin: {
                description:
                  'For archive sermons that pre-date the YouTube channel and exist only as an MP3. Leave empty when a video exists.',
              },
            },
            {
              name: 'thumbnail',
              type: 'upload',
              relationTo: 'media',
              label: 'Thumbnail',
              admin: {
                description: 'Sermon card image for the listing page.',
              },
            },
            // ── Discussion Questions ─────────────────────────────────────────
            {
              name: 'discussionQuestions',
              type: 'group',
              label: 'Discussion Questions',
              admin: {
                description: 'Shown above the video on the sermon page. Use a link (OneDrive, Google Docs…), upload a PDF, or type the questions directly to display them as an accordion.',
              },
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  defaultValue: 'none',
                  options: [
                    { label: 'None', value: 'none' },
                    { label: 'External link (OneDrive, Google Docs, Dropbox…)', value: 'url' },
                    { label: 'Upload PDF', value: 'upload' },
                    { label: 'Type questions here (accordion on page)', value: 'inline' },
                  ],
                },
                {
                  name: 'url',
                  type: 'text',
                  label: 'Link URL',
                  admin: {
                    condition: (_, siblingData) => siblingData?.type === 'url',
                    description: 'Paste the share link — OneDrive, Google Docs, Dropbox, etc.',
                  },
                },
                {
                  name: 'file',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'PDF File',
                  admin: {
                    condition: (_, siblingData) => siblingData?.type === 'upload',
                  },
                },
                {
                  name: 'questionsText',
                  type: 'textarea',
                  label: 'Questions',
                  admin: {
                    condition: (_, siblingData) => siblingData?.type === 'inline',
                    description: 'Type your discussion questions. Displayed as a collapsible accordion on the sermon page.',
                    rows: 10,
                  },
                },
              ],
            },
            // ── Sermon PDF ───────────────────────────────────────────────────
            {
              name: 'sermonPDF',
              type: 'upload',
              relationTo: 'media',
              label: 'Sermon Notes PDF (upload)',
              admin: {
                description: 'Upload a PDF directly to Payload. Use the URL field below for OneDrive / cloud links.',
              },
            },
            {
              name: 'sermonPdfUrl',
              type: 'text',
              label: 'Sermon Notes PDF (external URL)',
              admin: {
                description: 'Paste an OneDrive, Google Drive, or Dropbox share link to the PDF. Used instead of uploading.',
              },
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
    // ── Sidebar fields ────────────────────────────────────────────────────────
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
        description: 'Sermon date — used for year filter and sorting.',
      },
    },
    {
      name: 'speaker',
      type: 'relationship',
      relationTo: 'team',
      admin: {
        position: 'sidebar',
        description: 'Drives the speaker filter on /sermons.',
      },
    },
    {
      name: 'series',
      type: 'relationship',
      relationTo: 'series',
      admin: { position: 'sidebar' },
    },
    {
      name: 'scripture',
      type: 'text',
      label: 'Scripture Reference',
      admin: {
        position: 'sidebar',
        description: 'e.g. John 3:16–21',
      },
    },
    {
      name: 'duration',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'e.g. 44 min',
      },
    },
    slugField(),
  ],
  versions: {
    drafts: true,
  },
}
