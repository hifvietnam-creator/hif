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
`015` Cognito fields · `016` card codes · `017` corrections.

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

## Agreed and not yet built: guardian entry

This is the next build. The design is settled; the data question below is not.

**Why.** Children on the roster with nobody holding `can_pickup` can be
released to anyone, because there is no list for a TA to check against. The
dashboard's "Needs a look" row counts them live.

**The shape.** "Nobody authorised to collect them" is two problems in one
label, and they must be separated on screen or Ate cannot tell a ten-second fix
from a ten-minute phone call:

1. Guardians on record, none ticked `can_pickup`. She reads "mother", ticks it.
2. No guardian rows at all. Needs a conversation with the parent.

**Run this before building** — the August import set `can_pickup` for whichever
contact the spreadsheet named primary, so most of these are probably case 2,
which makes it an *add a guardian* screen rather than a *tick a box* screen:

```sql
select
  case when exists (select 1 from kq.child_guardians cg where cg.child_id = r.child_id)
       then 'has a guardian, none ticked'
       else 'no guardian on record' end as situation,
  count(*)
from kq.current_roster r
where not exists (
  select 1 from kq.child_guardians cg
   where cg.child_id = r.child_id and cg.can_pickup
)
group by 1;
```

**Decided:**

- No new nav item. A filter on the Children page, reached by making the
  dashboard's "Needs a look" row a link.
- A slide-out panel per child showing guardians: name, relationship, phone, and
  whether each may collect. Guardians only for this build. Not the timeline.
- Every change writes to the child audit table with the actor's name.
- **Teachers may add a guardian too**, not only Ate. She is not in every
  classroom and the right moment to ask is at the door. Teachers already hold
  override, so this is not a new power, but `can_pickup` is longer-lived than
  an override: permanent and silent every Sunday after. So teacher edits are
  logged loudly and surface to Ate as an "authorised by a teacher recently"
  list to confirm, following the existing `placements_to_confirm` pattern.
- Friction only where it earns its place: mother or father, tick and move on.
  Blank, driver, helper, grandparent, anything else, type one line saying where
  the authorisation came from. It goes in the audit.

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
