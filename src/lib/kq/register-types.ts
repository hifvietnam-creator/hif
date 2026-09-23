/**
 * Register types, kept apart from the queries.
 *
 * RegisterGrid is a client component. Importing register.ts there would pull
 * the Postgres pool into the browser bundle, so the shapes live here and
 * register.ts imports them too.
 *
 * Same reason child-fields.ts exists alongside children.ts.
 */

export type CellState =
  | 'not_yet'      // before this child was on any register
  | 'absent'       // enrolled, session ran, no record
  | 'paper'        // imported from a spreadsheet tick
  | 'station'      // checked in and out at a station
  | 'still_in'     // checked in, never checked out
  | 'added'        // an administrator said they were there after the fact
  | 'removed'      // there was a record, an administrator said it was wrong

export type RegisterCell = {
  state: CellState
  group: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
}

export type RegisterRow = {
  childId: number
  name: string
  groupCode: string
  grade: number | null
  gender: string | null
  joined: string | null
  cells: RegisterCell[]
  /** Sundays they were here. */
  present: number
  /** Sundays they were on the register at all, so the denominator. */
  possible: number
}
