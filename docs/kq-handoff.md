# KidzQuest — handoff

State as of 6 October 2026. Written to end one chat and start another without
losing the decisions. Next service is Sunday 11 October.

Deployed at https://hif-mauve.vercel.app. Last KidzQuest commit `c9ba4ea`,
build green, `/kq/login` verified live.

---

## What this is

Sunday check-in and check-out for the children's ministry at Hanoi
International Fellowship. Built inside the existing Next.js 16 + Payload 3.85 +
Neon Postgres repo. **It is not PCO Check-Ins and must not become it.** We built
our own deliberately.

The app is the system of record for everything in the `kq` schema. Nothing
mirrors back to PCO.

## Who uses it

| Person | Role | Reaches |
| --- | --- | --- |
| HIF (hifvietnam@gmail.com) | `siteAdmin` | the CMS at `/admin`, and all of `/kq` |
| Ate | `kqRole: admin` | all of `/kq`, and **never** the CMS |
| Teachers | `kqRole: teacher` | `/kq`, station, register. Can override a pick-up |
| Assistants | `kqRole: ta` | `/kq`, station, register, for their rostered room only |

Emails and passwords are already assigned and in use. **Do not change
credentials or the sign-in flow without saying so explicitly first.** They use
this every Sunday.

Volunteers sign in at `/kq/login`. `/admin/login` is the CMS and now carries a
link across to the right door, because volunteers bookmarked it when it was the
only way in.

## Standing instructions from the user

- Mobile friendly at all cost. Most volunteers are holding a phone.
- **Discuss before building.** Share a plan, get it reviewed, then write code.
  This has been asked for more than once and ignored more than once.
- No em dashes in anything a volunteer reads. Warm, not commanding. Don't write
  "it isn't that we don't trust you" or anything in that register.
- These are teachers, not technicians. Guides need pictures, not prose.
- Run `pnpm check:types` before pushing. Three deploys failed in a row for
  errors it would have caught.
- Stage files by name. `git add -A` picks up `tn_songs/`, `wl_songs_scraper/`,
  `wp_playlist/` and a parallel session's uncommitted work.

## Migrations

`migrations/analytics/NNN_name.sql`, applied by `scripts/db-migrate.ts`,
tracked in `hif.schema_migrations` by filename and checksum. **An applied file
can never be edited.** Write a new one.

`010` the `kq` schema · `011` year bounds · `012` session key (NULLs don't
collide in a unique constraint) · `013` child audit · `014` child status ·
`015` Cognito fields · `016` card codes · `017` corrections · `018` guardian
entry (**not applied yet**).

## Traps that have already cost a day each

- **Postgres DATE in UTC+7.** node-postgres returns DATE as a JS Date at local
  midnight, so `.toISOString()` shifts it back a day. Use `isoDate()` in
  `src/lib/db.ts`. This silently zeroed the whole Register page.
- **`[].every()` is `true`.** A nameless row matched every unmatched child.
- **NULLs don't collide in unique constraints.** `unique(a, b, campus_id)` never
  dedupes while `campus_id` is NULL. Gave us duplicate Explorers rooms.
- **Tailwind v4 `@source`.** A directory created after the dev server started is
  the case auto-detection misses. Every utility silently fails to generate and
  the page renders as unstyled HTML. `src/app/(kq)/kq.css` names its sources.
- **`kqActive` as `=== false`, not falsy.** Existing rows have NULL and must
  pass through the `beforeLogin` hook, or every volunteer is locked out.
- **Throw `APIError`, not `Error`, from Payload hooks.** A bare Error becomes a
  500 and "Something went wrong", which sends a volunteer to the site admin
  about a server fault instead of to Ate about their account.
- **Grades drive groups, not ages.** Grade 0 Explorers · 1-2 Voyagers ·
  3-4 Trailblazers · 5-7 Pathfinders. Children move up together on the first
  Sunday of August, never on their birthdays.

---

## Guardian entry: built 6 October, not yet committed or deployed

**The query was run.** All 42 children nobody could collect had **no guardian
on record**. Zero had a guardian with nothing ticked. 42 of 169 on the roster:
Pathfinders 17, Trailblazers 12, Explorers 7, Voyagers 6. So this is an *add an
adult* build. `node scripts/kq-guardian-split.mjs` reruns it, read-only.

**Before pushing, in this order:**

1. `pnpm db:migrate:kq` to apply `018_kidzquest_guardian_entry.sql`. It only
   adds columns, a view and an event type, so the live code keeps working with
   it applied. The new code does **not** work without it.
2. `pnpm check:types`.
3. Stage by name. The files are listed at the end of this section.

**What it does:**

- Dashboard "Needs a look" is two rows now, each a link: no adult on file
  (`/kq/kids?needs=guardian`) and adults on file with none ticked
  (`?needs=unticked`).
- One shared sheet, `src/components/kq/AdultSheet.tsx`: bottom sheet on a
  phone, side panel on a laptop. Mother, Father, Someone else. Mother or father
  is tick and save. Anyone else needs one line, "Who told you they may
  collect?", enforced by the API as well as the form.
- **Teachers add an adult from the Take attendance room list**, on the child's
  row, not inside the check-in pop-up. Only for children in a room they are
  rostered to. Assistants see the adults and are asked to tell a teacher.
- **A teacher's tick is in force straight away.** It appears on the dashboard
  under "Added by a teacher", where Ate confirms it or removes the tick.
- Every add, tick, untick and confirm writes `kq.child_events` with the actor's
  id, name and role, and the source line.
- Teachers cannot change an existing tick. That stays with Ate.

**Two behaviour changes worth knowing:**

- `addGuardian` used to reuse an existing adult on phone or email alone. It now
  needs the name to match too. Families share a phone, and the old rule would
  have authorised whoever was already stored under that number.
- The Children page used to invent an id for a newly added adult, so ticking
  them before a reload saved nothing. It now uses the id the server returns.

**Tested** against a local Postgres 16 with migrations 001 to 018 applied, and
in a browser at 390px and 1280px as teacher, assistant and administrator.
**Not tested against Neon**, which this session could not reach.

**Files:** `migrations/analytics/018_kidzquest_guardian_entry.sql`,
`src/components/kq/AdultSheet.tsx`,
`src/app/(kq)/kq/dashboard/PickupsToConfirm.tsx`,
`src/app/(kq)/kq/dashboard/page.tsx`, `src/app/(kq)/kq/kids/KidsTable.tsx`,
`src/app/(kq)/kq/kids/page.tsx`,
`src/app/(kq)/kq/station/[sessionId]/Station.tsx`,
`src/app/(kq)/kq/station/[sessionId]/page.tsx`,
`src/app/api/kq/children/route.ts`, `src/lib/kq/auth.ts`,
`src/lib/kq/child-fields.ts`, `src/lib/kq/children.ts`,
`src/lib/kq/dashboard.ts`, `scripts/kq-guardian-split.mjs`, and this file.

**Left for later:** the volunteer guides do not show the new button yet, and a
teacher cannot correct their own typo after saving.

## Registration: Cognito or our own form

Open question, **not urgent**, revisit before the next registration push.

Cognito's API and webhooks both exist but are gated to the Pro plan and above,
so check which plan the HIF account is on before costing anything.

The recommendation is **our own form**, and the reason is not the subscription.
Every data problem on this project came from the import boundary: the Grade
field reading "Pre-school" for an eleven-year-old, four birthdays in 2026,
phone numbers missing a leading zero, 35 sheet conflicts, name matching with
four fallback rules. None are bugs in our code. A webhook makes the repair
continuous rather than termly, which is better, but the Grade dropdown will
still default to Pre-school because that is a Cognito field-design fact. A form
in this repo costs nothing extra per month and makes that bug impossible rather
than repaired.

Costs against it, fairly: every published link, QR code and poster has to be
repointed, and a public form taking children's data needs rate limiting and
spam protection that Cognito gives for free.

Not now, because the gap that is actually open closes at the door via teacher
entry, with no parent filling anything.

## Also outstanding

- **`kq.sheet_conflicts`**, 35 items, SQL only. Ate was told to work through it
  with no screen, which is not a real instruction.
- **Card printing.** `kq.cards_outstanding` exists, no screen. Roughly 30
  children have no family name so cannot get a code at all.
- **Family names: parked by the user.** Getting parents to fill another form is
  a weekly argument and not worth the resource right now. Likely overlaps the
  no-card-code set, so check that when cards get built.
- **Cognito Grade field still broken** for every new registration.
- **Resend DNS** pending with the server admins. `RESEND_API_KEY` is not set in
  Vercel, confirmed by the live sign-in page showing its "ask the
  administrator" variant. Password reset by email turns itself on when the key
  lands.
- Deferred: child timeline, mobile card layouts for Register and Kids,
  birthday-based class moves (parked in favour of the August rule).

## Not ours

A parallel session is working on `src/app/api/cron/*`, `src/lib/cron-auth.ts`
and the root `HANDOFF.md`. Leave them alone and never stage them.
