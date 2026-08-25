/**
 * Queries for the Reachability section.
 *
 * Scope is deliberately narrow: the two MailerLite audiences staff actually
 * send to — "@ll Members List - July 26" and "@ll People List - July 26" —
 * plus campaign performance. The account holds a dozen other groups that are
 * Mailchimp migration leftovers or dated snapshots; the "Members" group alone
 * claims 4,071 people against a real membership list of 324. Including them
 * would make every figure wrong by an order of magnitude.
 *
 * Two counting rules that matter throughout:
 *
 *   Subscribers and people are different numbers. hif.email_links is
 *   many-to-many because ~450 addresses in the All People audience belong to a
 *   couple or a family. A shared inbox means the household is reachable, not
 *   that you know who read it.
 *
 *   Status is never collapsed. active / unsubscribed / bounced / junk mean
 *   four different things: bounced is a fixable data error, unsubscribed is a
 *   decision to respect, junk is a complaint. "Not subscribed" as one number
 *   destroys the only information worth having.
 */

import { getPool } from '../db'

/** The audiences in scope, in display order. */
export const AUDIENCE_NAMES = ['@ll Members List - July 26', '@ll People List - July 26'] as const

const rows = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> => {
  const res = await getPool().query<T>(sql, params)
  return res.rows
}

// ── Audiences ────────────────────────────────────────────────────────────────

export type Audience = {
  id: string
  name: string
  /** These are exports from a PCO list, frozen on the day named in the title. */
  exportedOn: string | null
  staleDays: number | null
  subscribers: number
  matchedSubscribers: number
  people: number
  sharedInboxes: number
  active: number
  unsubscribed: number
  bounced: number
  junk: number
  unconfirmed: number
}

/** "@ll Members List - July 26" → 26 July, resolved against today. */
function parseExportDate(name: string): string | null {
  const m = name.match(
    /-\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*$/i,
  )
  if (!m) return null
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const month = months.indexOf(m[1]!.toLowerCase())
  const day = Number(m[2])
  const now = new Date()
  let year = now.getUTCFullYear()
  // A date in the future means it was last year's export.
  if (Date.UTC(year, month, day) > now.getTime()) year -= 1
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
}

export async function getAudiences(): Promise<Audience[]> {
  const groups = await rows<{ id: string; name: string }>(
    `select id, name from ml.groups where lower(trim(name)) = any($1::text[])`,
    [AUDIENCE_NAMES.map((n) => n.toLowerCase())],
  )

  const out: Audience[] = []
  for (const name of AUDIENCE_NAMES) {
    const g = groups.find((x) => x.name.toLowerCase().trim() === name.toLowerCase())
    if (!g) continue

    const [r] = await rows<Record<string, string>>(
      `
      with subs as (
        select gs.subscriber_id, s.status
          from ml.group_subscribers gs
          join ml.subscribers s on s.id = gs.subscriber_id
         where gs.group_id = $1
      )
      select
        (select count(*) from subs)::text                                              as subscribers,
        (select count(distinct gs.subscriber_id) from ml.group_subscribers gs
           join hif.email_links l on l.mailerlite_subscriber_id = gs.subscriber_id
          where gs.group_id = $1)::text                                                as matched_subscribers,
        (select count(distinct l.pco_person_id) from ml.group_subscribers gs
           join hif.email_links l on l.mailerlite_subscriber_id = gs.subscriber_id
          where gs.group_id = $1)::text                                                as people,
        (select count(distinct gs.subscriber_id) from ml.group_subscribers gs
           join hif.email_links l on l.mailerlite_subscriber_id = gs.subscriber_id
          where gs.group_id = $1 and l.is_ambiguous)::text                             as shared_inboxes,
        (select count(*) from subs where status = 'active')::text                      as active,
        (select count(*) from subs where status = 'unsubscribed')::text                as unsubscribed,
        (select count(*) from subs where status = 'bounced')::text                     as bounced,
        (select count(*) from subs where status = 'junk')::text                        as junk,
        (select count(*) from subs where status = 'unconfirmed')::text                 as unconfirmed
      `,
      [g.id],
    )

    const exportedOn = parseExportDate(g.name)
    out.push({
      id: g.id,
      name: g.name,
      exportedOn,
      staleDays: exportedOn
        ? Math.round((Date.now() - Date.parse(exportedOn)) / 86_400_000)
        : null,
      subscribers: Number(r?.subscribers ?? 0),
      matchedSubscribers: Number(r?.matched_subscribers ?? 0),
      people: Number(r?.people ?? 0),
      sharedInboxes: Number(r?.shared_inboxes ?? 0),
      active: Number(r?.active ?? 0),
      unsubscribed: Number(r?.unsubscribed ?? 0),
      bounced: Number(r?.bounced ?? 0),
      junk: Number(r?.junk ?? 0),
      unconfirmed: Number(r?.unconfirmed ?? 0),
    })
  }
  return out
}

// ── Breakdowns ───────────────────────────────────────────────────────────────

export type BreakdownRow = { dimension: string; label: string; count: number }

/**
 * Every dimension for one audience, in a single pass.
 *
 * "Not recorded" is returned as a category rather than filtered out. A chart
 * that silently drops missing data is the most confident-looking way to
 * mislead: 60% birthdate coverage rendered as a clean pie implies we know
 * everyone's age.
 */
export async function getBreakdowns(groupId: string): Promise<BreakdownRow[]> {
  return rows<BreakdownRow>(
    `
    with aud as (
      select distinct l.pco_person_id as person_id
        from ml.group_subscribers gs
        join hif.email_links l on l.mailerlite_subscriber_id = gs.subscriber_id
       where gs.group_id = $1
    ),
    ppl as (
      select p.id, p.gender, p.membership, p.birthdate, p.primary_campus_id
        from pco.people p
        join aud on aud.person_id = p.id
    )
    select 'gender' as dimension,
           initcap(coalesce(nullif(trim(gender), ''), 'Not recorded')) as label,
           count(*)::int as count
      from ppl group by 2

    union all
    select 'membership',
           coalesce(nullif(trim(membership), ''), 'Not recorded'),
           count(*)::int
      from ppl group by 2

    union all
    select 'campus',
           coalesce(c.name, 'No campus set'),
           count(*)::int
      from ppl left join pco.campuses c on c.id = ppl.primary_campus_id
     group by 2

    union all
    -- Group involvement is a fact about a person, not a field someone forgot
    -- to fill in, so there is no "Not recorded" here: everyone is in exactly
    -- one of these three states.
    select 'involvement',
           case
             when exists (select 1 from pco.group_memberships gm
                           where gm.person_id = ppl.id and lower(gm.role) = 'leader')
               then 'Leads a group'
             when exists (select 1 from pco.group_memberships gm
                           where gm.person_id = ppl.id)
               then 'In a group'
             else 'Not in a group'
           end,
           count(*)::int
      from ppl group by 2

    union all
    select 'age',
           case
             when birthdate is null then 'Not recorded'
             when extract(year from age(birthdate)) < 18 then 'Under 18'
             when extract(year from age(birthdate)) < 25 then '18–24'
             when extract(year from age(birthdate)) < 35 then '25–34'
             when extract(year from age(birthdate)) < 45 then '35–44'
             when extract(year from age(birthdate)) < 55 then '45–54'
             when extract(year from age(birthdate)) < 65 then '55–64'
             else '65+'
           end,
           count(*)::int
      from ppl group by 2
    `,
    [groupId],
  )
}

// ── Campaigns ────────────────────────────────────────────────────────────────

export type CampaignSummary = {
  campaigns: number
  recipients: number
  clicks: number
  opens: number
  unsubscribes: number
  firstSent: string | null
  lastSent: string | null
}

export async function getCampaignSummary(): Promise<CampaignSummary> {
  const [r] = await rows<Record<string, string>>(`
    select count(*)::text                                as campaigns,
           coalesce(sum(recipients), 0)::text            as recipients,
           coalesce(sum(clicks_count), 0)::text          as clicks,
           coalesce(sum(opens_count), 0)::text           as opens,
           coalesce(sum(unsubscribes), 0)::text          as unsubscribes,
           min(finished_at)::text                        as first_sent,
           max(finished_at)::text                        as last_sent
      from ml.campaigns
     where finished_at is not null
  `)
  return {
    campaigns: Number(r?.campaigns ?? 0),
    recipients: Number(r?.recipients ?? 0),
    clicks: Number(r?.clicks ?? 0),
    opens: Number(r?.opens ?? 0),
    unsubscribes: Number(r?.unsubscribes ?? 0),
    firstSent: r?.first_sent ?? null,
    lastSent: r?.last_sent ?? null,
  }
}

export type CampaignMonth = {
  label: string
  campaigns: number
  recipients: number
  clicks: number
  click_rate: number | null
}

export async function getCampaignsByMonth(): Promise<CampaignMonth[]> {
  return rows<CampaignMonth>(`
    select to_char(date_trunc('month', finished_at), 'YYYY-MM') as label,
           count(*)::int                                        as campaigns,
           coalesce(sum(recipients), 0)::int                    as recipients,
           coalesce(sum(clicks_count), 0)::int                  as clicks,
           case when coalesce(sum(recipients), 0) > 0
                then round((sum(clicks_count)::numeric / sum(recipients) * 100), 1)
                else null end                                   as click_rate
      from ml.campaigns
     where finished_at is not null
     group by 1
     order by 1
  `)
}

export type CampaignRow = {
  id: string
  name: string | null
  subject: string | null
  finished_at: string | null
  recipients: number | null
  clicks_count: number | null
  click_rate: number | null
  unsubscribes: number | null
}

export async function getCampaigns(limit = 60): Promise<CampaignRow[]> {
  return rows<CampaignRow>(
    `select id, name, subject, finished_at::text,
            recipients, clicks_count, click_rate, unsubscribes
       from ml.campaigns
      where finished_at is not null
      order by finished_at desc
      limit $1`,
    [limit],
  )
}
