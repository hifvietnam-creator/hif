/**
 * Sync MailerLite into the `ml` schema.
 *
 * Analytics mirror only. Nothing here may drive a congregation count —
 * MailerLite status says whether someone can be REACHED, never whether they
 * belong. Membership comes from Planning Center alone.
 *
 * Two API quirks handled below:
 *   - Subscribers use cursor pagination; groups and campaigns use page numbers.
 *   - /groups/{id}/subscribers defaults to filter[status]=active, silently
 *     omitting unsubscribed members — who are exactly the people we care
 *     about. Every status is requested explicitly.
 *
 * READ ONLY against MailerLite.
 */

import {
  MAX_LIMIT,
  get,
  paginateCursor,
  paginatePage,
  type MailerLiteCampaign,
  type MailerLiteGroup,
  type MailerLiteStatus,
  type MailerLiteSubscriber,
} from '../mailerlite'
import { getPool, nullIfEmpty, toDate, upsert, withSyncState, type SyncResult } from '../db'

const ALL_STATUSES: MailerLiteStatus[] = [
  'active',
  'unsubscribed',
  'unconfirmed',
  'bounced',
  'junk',
]

// ── Subscribers ──────────────────────────────────────────────────────────────

const SUBSCRIBER_COLUMNS = [
  'id',
  'email',
  'status',
  'source',
  'sent',
  'opens_count',
  'clicks_count',
  'open_rate',
  'click_rate',
  'name',
  'last_name',
  'phone',
  'country',
  'city',
  'subscribed_at',
  'unsubscribed_at',
  'ml_created_at',
  'ml_updated_at',
  'synced_at',
]

export async function syncSubscribers(): Promise<SyncResult> {
  return withSyncState('ml.subscribers', async () => {
    const db = getPool()
    let seen = 0
    let buffer: unknown[][] = []

    const flush = async () => {
      if (buffer.length === 0) return
      await upsert(db, 'ml.subscribers', SUBSCRIBER_COLUMNS, buffer)
      buffer = []
    }

    // The default listing returns every status, but request each explicitly so
    // a change in that default can't silently drop the unsubscribed.
    for (const status of ALL_STATUSES) {
      for await (const batch of paginateCursor<MailerLiteSubscriber>(
        '/subscribers',
        { 'filter[status]': status },
        MAX_LIMIT,
      )) {
        for (const s of batch) {
          const f = s.fields ?? {}
          buffer.push([
            String(s.id),
            s.email.trim().toLowerCase(),
            s.status,
            nullIfEmpty(s.source),
            s.sent ?? null,
            s.opens_count ?? null,
            s.clicks_count ?? null,
            s.open_rate ?? null,
            s.click_rate ?? null,
            nullIfEmpty(f.name),
            nullIfEmpty(f.last_name),
            nullIfEmpty(f.phone),
            nullIfEmpty(f.country),
            nullIfEmpty(f.city),
            toDate(s.subscribed_at),
            toDate(s.unsubscribed_at),
            toDate(s.created_at),
            toDate(s.updated_at),
            new Date(),
          ])
          seen++
        }
        await flush()
        process.stdout.write(`\r  subscribers: ${seen}`)
      }
    }

    await flush()
    process.stdout.write('\r' + ' '.repeat(40) + '\r')
    return { recordsSeen: seen }
  })
}

// ── Groups ───────────────────────────────────────────────────────────────────

export async function syncGroups(): Promise<SyncResult> {
  return withSyncState('ml.groups', async () => {
    const rows: unknown[][] = []

    for await (const batch of paginatePage<MailerLiteGroup>('/groups')) {
      for (const g of batch) {
        rows.push([
          String(g.id),
          g.name,
          g.active_count ?? null,
          g.sent_count ?? null,
          g.opens_count ?? null,
          g.open_rate?.float ?? null,
          g.clicks_count ?? null,
          g.click_rate?.float ?? null,
          g.unsubscribed_count ?? null,
          g.unconfirmed_count ?? null,
          g.bounced_count ?? null,
          g.junk_count ?? null,
          toDate(g.created_at),
          new Date(),
        ])
      }
    }

    await upsert(
      getPool(),
      'ml.groups',
      ['id', 'name', 'active_count', 'sent_count', 'opens_count', 'open_rate', 'clicks_count', 'click_rate', 'unsubscribed_count', 'unconfirmed_count', 'bounced_count', 'junk_count', 'ml_created_at', 'synced_at'],
      rows,
    )
    return { recordsSeen: rows.length }
  })
}

/**
 * Group membership. One request set per group per status.
 *
 * The explicit status loop matters here: the endpoint defaults to `active`,
 * so without it every unsubscribed group member would vanish — and "which
 * segment do our unsubscribed people belong to" is a question worth asking.
 */
export async function syncGroupSubscribers(): Promise<SyncResult> {
  return withSyncState('ml.group_subscribers', async () => {
    const db = getPool()

    const { rows: groups } = await db.query<{ id: string; name: string }>(
      'select id, name from ml.groups order by id',
    )
    const { rows: subRows } = await db.query<{ id: string }>('select id from ml.subscribers')
    const known = new Set(subRows.map((r) => r.id))

    let seen = 0
    let skipped = 0
    let buffer: unknown[][] = []

    const flush = async () => {
      if (buffer.length === 0) return
      await upsert(
        db,
        'ml.group_subscribers',
        ['group_id', 'subscriber_id', 'synced_at'],
        buffer,
        ['group_id', 'subscriber_id'],
      )
      buffer = []
    }

    for (const g of groups) {
      for (const status of ALL_STATUSES) {
        for await (const batch of paginateCursor<MailerLiteSubscriber>(
          `/groups/${g.id}/subscribers`,
          { 'filter[status]': status },
          MAX_LIMIT,
        )) {
          for (const s of batch) {
            if (!known.has(String(s.id))) {
              skipped++
              continue
            }
            buffer.push([String(g.id), String(s.id), new Date()])
            seen++
          }
          await flush()
        }
      }
      process.stdout.write(`\r  group memberships: ${seen}`)
    }

    await flush()
    process.stdout.write('\r' + ' '.repeat(45) + '\r')
    if (skipped > 0) {
      console.log(`  \x1b[2m${skipped} skipped — subscriber not in ml.subscribers\x1b[0m`)
    }
    return { recordsSeen: seen }
  })
}

// ── Campaigns ────────────────────────────────────────────────────────────────

type CampaignStats = {
  sent?: number
  opens_count?: number
  unique_opens_count?: number
  open_rate?: { float?: number }
  clicks_count?: number
  unique_clicks_count?: number
  click_rate?: { float?: number }
  unsubscribes_count?: number
  spam_count?: number
}

export async function syncCampaigns(): Promise<SyncResult> {
  return withSyncState('ml.campaigns', async () => {
    const rows: unknown[][] = []

    for (const status of ['sent', 'draft', 'ready']) {
      try {
        for await (const batch of paginatePage<MailerLiteCampaign>('/campaigns', {
          'filter[status]': status,
        })) {
          for (const c of batch) {
            const stats = (c.stats ?? {}) as CampaignStats
            const emails = (c.emails ?? []) as Array<{ subject?: string }>

            rows.push([
              String(c.id),
              nullIfEmpty(c.name),
              nullIfEmpty(c.type),
              nullIfEmpty(c.status),
              nullIfEmpty(emails[0]?.subject),
              toDate(c.scheduled_for),
              toDate(c.finished_at),
              stats.sent ?? null,
              stats.unique_opens_count ?? stats.opens_count ?? null,
              stats.unique_clicks_count ?? stats.clicks_count ?? null,
              stats.open_rate?.float ?? null,
              stats.click_rate?.float ?? null,
              stats.unsubscribes_count ?? null,
              stats.spam_count ?? null,
              // The payload is deeply nested and only partly mapped above.
              // Keep the original so it can be mined later without re-syncing.
              JSON.stringify(c),
              new Date(),
            ])
          }
        }
      } catch (err) {
        console.log(
          `  \x1b[2mcampaigns filter[status]=${status}: ` +
            `${err instanceof Error ? err.message.slice(0, 80) : err}\x1b[0m`,
        )
      }
    }

    await upsert(
      getPool(),
      'ml.campaigns',
      ['id', 'name', 'type', 'status', 'subject', 'scheduled_for', 'finished_at', 'recipients', 'opens_count', 'clicks_count', 'open_rate', 'click_rate', 'unsubscribes', 'spam_count', 'raw', 'synced_at'],
      rows,
    )
    return { recordsSeen: rows.length }
  })
}

// ── Linking ──────────────────────────────────────────────────────────────────

/**
 * Build hif.email_links by exact email match against ALL PCO addresses.
 *
 * Exact matching only — no fuzzy name matching. A false link silently
 * corrupts every downstream number; a missing link is merely a gap. Prefer gaps.
 *
 * Deliberately many-to-many: ~748 PCO addresses are shared between people
 * (couples and families on one inbox). Those links are flagged ambiguous,
 * because a shared inbox tells you the household is reachable, not which
 * person read the email.
 */
export async function buildEmailLinks(): Promise<SyncResult> {
  return withSyncState('hif.email_links', async () => {
    const db = getPool()

    await db.query('truncate hif.email_links')

    const { rowCount } = await db.query(`
      with matches as (
        select s.id            as subscriber_id,
               e.person_id     as person_id,
               e.address       as email,
               count(*) over (partition by e.address) as sharing
          from ml.subscribers s
          join pco.emails e on e.address = s.email
      )
      insert into hif.email_links
        (mailerlite_subscriber_id, pco_person_id, email, match_type,
         is_ambiguous, people_sharing_address, confidence)
      select distinct
             subscriber_id, person_id, email, 'exact',
             sharing > 1, sharing,
             case when sharing > 1 then 0.5 else 1.0 end
        from matches
      on conflict do nothing
    `)

    // Subscribers with no PCO person are findings, not errors: people in your
    // audience who have never been entered into Planning Center.
    await db.query('truncate hif.unmatched_subscribers')
    await db.query(`
      insert into hif.unmatched_subscribers
        (mailerlite_subscriber_id, email, status, clicks_count)
      select s.id, s.email, s.status, s.clicks_count
        from ml.subscribers s
        left join hif.email_links l on l.mailerlite_subscriber_id = s.id
       where l.mailerlite_subscriber_id is null
    `)

    return { recordsSeen: rowCount ?? 0 }
  })
}

export async function syncMailerLiteAll(): Promise<Record<string, SyncResult>> {
  const subscribers = await syncSubscribers()
  const groups = await syncGroups()
  const groupSubscribers = await syncGroupSubscribers()
  const campaigns = await syncCampaigns()
  const links = await buildEmailLinks()
  return { subscribers, groups, groupSubscribers, campaigns, links }
}
