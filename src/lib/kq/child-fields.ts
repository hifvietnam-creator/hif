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
  /** Code on their physical card. Null until they have a family name. */
  cardCode: string | null
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

// ── Adults who may collect ───────────────────────────────────────────────────

/**
 * Is this relationship one where a tick needs no explanation?
 *
 * A mother or a father collecting their own child is the ordinary case and
 * should cost one tap. Everybody else, including a blank, is somebody acting on
 * a parent's say-so, and the record should name where that say-so came from.
 *
 * Deliberately a short closed list. "Parent" is not on it: it is what gets
 * typed when nobody asked which one, and that is exactly when the line is worth
 * having.
 */
const PARENT_WORDS = new Set(['mother', 'father', 'mom', 'mum', 'mummy', 'mommy', 'dad', 'daddy'])

export const isParentRelationship = (relationship: string | null | undefined): boolean =>
  PARENT_WORDS.has((relationship ?? '').trim().toLowerCase())

/** Shortest source line the server accepts. Enough for "Mum said so". */
export const PICKUP_SOURCE_MIN = 5

/**
 * Does granting pick-up to this adult need a line saying who authorised it?
 * One rule, used by the form to show the box and by the API to insist on it.
 */
export const needsPickupSource = (relationship: string | null | undefined, canPickup: boolean) =>
  canPickup && !isParentRelationship(relationship)

/** What the add-an-adult form sends, on every screen that has one. */
export type NewAdultInput = {
  fullName: string
  relationship: string | null
  phone: string | null
  email: string | null
  canPickup: boolean
  /** Who said they may collect. Required when needsPickupSource is true. */
  source: string | null
}

/** What the server says back, so the screen shows the row that actually landed. */
export type AddedAdult = {
  guardianId: number
  fullName: string
  relationship: string | null
  phone: string | null
  email: string | null
  canPickup: boolean
  /** True when this adult was already on file, for a brother or sister. */
  alreadyOnFile: boolean
}

/** One line on Ate's list of teacher additions to confirm. */
export type PickupToConfirm = {
  childId: number
  guardianId: number
  childName: string
  groupCode: string
  guardianName: string
  guardianPhone: string | null
  relationship: string | null
  source: string | null
  addedBy: string | null
  addedAt: string | null
}
