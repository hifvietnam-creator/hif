import type { CollectionConfig } from 'payload'

import { isKqAdmin, isKqAdminField, isSelfOrKqAdmin } from '../../access/kq'

/**
 * Every operation here used to be `authenticated`, which was fine while the
 * only accounts were staff building the site. It stops being fine the moment
 * KidzQuest volunteers get logins: `authenticated` on `delete` means any TA can
 * delete any other user, and `admin: authenticated` puts them inside the CMS
 * with the sermons, media and site settings.
 *
 * So: admins manage users, everyone else can see and edit only themselves, and
 * nobody but an admin reaches /admin at all. TAs and teachers work through the
 * /kq station routes, which are ordinary front-end pages gated on kqRole.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    // Reaching the Payload admin panel. A TA has no business in here.
    admin: isKqAdmin,
    create: isKqAdmin,
    delete: isKqAdmin,
    // Returns a query constraint for non-admins, so a TA listing users gets
    // back exactly one row — their own — rather than everyone's email address.
    read: isSelfOrKqAdmin,
    update: isSelfOrKqAdmin,
  },
  admin: {
    defaultColumns: ['name', 'email', 'kqRole'],
    useAsTitle: 'name',
  },
  auth: true,
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
          'Administrator manages the roster and reaches the CMS. Teacher can check ' +
          'in, check out and approve a collection override. Teaching assistant can ' +
          'check in and out for their assigned room only.',
      },
      // No default. An account with no role can sign in but can do nothing —
      // which is the right outcome for a half-finished invitation, and much
      // better than silently defaulting someone into a permission.
      access: {
        // Only an admin may set or change a role. Without this, a TA could edit
        // their own record — which isSelfOrKqAdmin allows, correctly, so they
        // can change their password — and promote themselves to admin.
        //
        // Field access has its own signature in Payload, hence the separate
        // isKqAdminField rather than reusing the collection-level check.
        create: isKqAdminField,
        update: isKqAdminField,
      },
    },
  ],
  timestamps: true,
}
