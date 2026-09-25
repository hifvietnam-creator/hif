import type { CollectionConfig } from 'payload'

import {
  isKqAdminField,
  isSelfOrKqAdmin,
  isSiteAdmin,
  isSiteAdminField,
} from '../../access/kq'

/**
 * Two kinds of authority, kept apart.
 *
 *   siteAdmin  runs the website. Reaches this admin panel.
 *   kqRole     runs, teaches in, or helps with KidzQuest.
 *
 * Until September 2026 `admin` here was `isKqAdmin`, so the person who looked
 * after the children's ministry also held the sermons, the pages, the media and
 * every user account. Nothing went wrong, but only because there was one of
 * her.
 *
 * KidzQuest administrators now manage their own volunteers at /kq/people and
 * never come here at all.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    // The CMS. Website only.
    admin: isSiteAdmin,
    create: isSiteAdmin,
    delete: isSiteAdmin,
    // A query constraint for everyone else, so a volunteer listing users gets
    // back one row — themselves — rather than every email in the ministry.
    read: isSelfOrKqAdmin,
    update: isSelfOrKqAdmin,
  },
  admin: {
    defaultColumns: ['name', 'email', 'kqRole', 'siteAdmin'],
    useAsTitle: 'name',
  },
  auth: {
    // Password resets go out through Resend. Without an adapter Payload accepts
    // the request and sends nothing, so this is only honest once RESEND_API_KEY
    // is set in the environment.
    forgotPassword: {
      generateEmailSubject: () => 'Reset your KidzQuest password',
      generateEmailHTML: (args) => {
        const token = (args as { token?: string } | undefined)?.token ?? ''
        const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/admin/reset/${token}`
        return `
          <p>Somebody asked to reset the password for this account.</p>
          <p><a href="${url}">Choose a new password</a></p>
          <p>If that was not you, nothing has changed and you can ignore this.</p>
          <p>Hanoi International Fellowship</p>
        `
      },
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'kqRole',
      type: 'select',
      options: [
        { label: 'Administrator', value: 'admin' },
        { label: 'Teacher', value: 'teacher' },
        { label: 'Teaching assistant', value: 'ta' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'What this person does in KidzQuest. Administrator manages the roster and ' +
          'the volunteers. Teacher can check in, dismiss and approve a pick-up. ' +
          'Teaching assistant can check in and dismiss for their own room.',
      },
      // No default. An account with no role signs in and sees nothing, which is
      // the right outcome for a half-finished invitation and better than being
      // quietly dropped into a permission.
      access: {
        create: isKqAdminField,
        update: isKqAdminField,
      },
    },
    {
      name: 'kqActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description:
          'Unticked for somebody who has stopped serving. They keep their account and ' +
          'their history, but cannot sign in. Tick it again to bring them back.',
      },
      access: {
        create: isKqAdminField,
        update: isKqAdminField,
      },
    },
    {
      name: 'siteAdmin',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Can reach this admin panel and edit the website. Nothing to do with ' +
          'KidzQuest. Grant it sparingly.',
      },
      // Only a site admin can create another one. A KidzQuest administrator
      // has no route to this field: not here, because she cannot reach the CMS,
      // and not through /kq/people, which refuses to touch a siteAdmin at all.
      access: {
        create: isSiteAdminField,
        update: isSiteAdminField,
      },
    },
  ],
  hooks: {
    beforeLogin: [
      ({ user }) => {
        // Refused at the door rather than let into an empty app. Somebody who
        // has stopped serving should be told plainly, not left wondering why
        // every screen is blank.
        const u = user as unknown as { kqActive?: boolean; siteAdmin?: boolean }
        if (u.siteAdmin) return user
        if (u.kqActive === false) {
          throw new Error(
            'This account is no longer active. Please contact the KidzQuest administrator.',
          )
        }
        return user
      },
    ],
  },
  timestamps: true,
}
