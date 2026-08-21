/**
 * KidzQuest child shapes and constants — no database access.
 *
 * These live apart from `children.ts` because client components need them.
 * `children.ts` imports the Postgres pool, and a `'use client'` file importing
 * anything from it drags the whole `pg` driver into the browser bundle, which
 * fails to build on `require('dns')`.
 *
 * Rule of thumb: values a client component needs go here; anything that
 * touches the database stays in `children.ts`.
 */

export type ChildRow = {
  childId: number
  enrollmentId: number
  firstName: string
  lastName: string
  preferredName: string | null
  gender: string | null
  birthdate: string | null
  grade: number | null
  groupCode: string
  groupManual: boolean
  provisional: boolean
  allergies: string | null
  careNotes: string | null
  photoConsent: boolean | null
  active: boolean
  status: ChildStatus
  leftOn: string | null
  statusNote: string | null
  guardians: {
    id: number
    fullName: string
    relationship: string | null
    canPickup: boolean
    isPrimary: boolean
    email: string | null
    phone: string | null
  }[]
}

/**
 * Flat fields a cell may edit. Anything not here is rejected by the API.
 *
 * `active` is deliberately absent — it is a generated column now. Leaving is
 * expressed through setChildStatus, which also records why and closes the
 * enrolment.
 */
export const EDITABLE_CHILD_FIELDS = [
  'first_name', 'last_name', 'preferred_name',
  'gender', 'birthdate', 'allergies', 'care_notes',
  'photo_consent',
] as const
export type EditableChildField = (typeof EDITABLE_CHILD_FIELDS)[number]

export const CHILD_STATUSES = [
  'active', 'left_hanoi', 'stopped_attending', 'moved_to_aftershock', 'duplicate',
] as const
export type ChildStatus = (typeof CHILD_STATUSES)[number]

export const STATUS_LABEL: Record<ChildStatus, string> = {
  active: 'Active',
  left_hanoi: 'Left Hanoi',
  stopped_attending: 'Stopped attending',
  moved_to_aftershock: 'Moved to Aftershock',
  duplicate: 'Duplicate record',
}
