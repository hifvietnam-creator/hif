import React from 'react'
import Link from 'next/link'

import { Bars, Section, Stat, Table, Warning } from '../../_components/ui'
import BreakdownExplorer, { type BreakdownRow } from '../../_components/BreakdownExplorer'
import {
  getAudiences,
  getBreakdowns,
  getCampaignSummary,
  getCampaignsByMonth,
  getCampaigns,
} from '@/lib/queries/reachability'

export const dynamic = 'force-dynamic'

export default async function ReachabilityPage() {
  const [audiences, campaignSummary, byMonth, campaigns] = await Promise.all([
    getAudiences(),
    getCampaignSummary(),
    getCampaignsByMonth(),
    getCampaigns(),
  ])

  // Precomputed per audience so the explorer can pivot without a round-trip,
  // and so only counts — never names — reach the browser.
  const breakdowns: Record<string, BreakdownRow[]> = {}
  await Promise.all(
    audiences.map(async (a) => {
      breakdowns[a.id] = await getBreakdowns(a.id)
    }),
  )

  const members = audiences.find((a) => a.name.toLowerCase().includes('members'))
  const allPeople = audiences.find((a) => !a.name.toLowerCase().includes('members'))
  const stalest = audiences.reduce<number | null>(
    (max, a) => (a.staleDays !== null && (max === null || a.staleDays > max) ? a.staleDays : max),
    null,
  )

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Reachability</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Who the church can actually contact, by which list, and who is falling through.
      </p>

      {stalest !== null && stalest > 14 && (
        <div className="mt-6">
          <Warning>
            <strong>These audiences are snapshots, not live lists.</strong> Each was exported from
            Planning Center on the date in its name — the oldest is {stalest} days ago. Anyone added
            to Planning Center since then is not in the audience and will not receive anything until
            someone re-exports. The figures below describe who could be reached as of that date.
          </Warning>
        </div>
      )}

      <Section
        title="Audiences"
        caveat="Subscribers and people are different counts on purpose: a shared household address is one subscriber and two or more people. It means the household is reachable, not that you know who read it."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {audiences.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/reachability/${a.id}`}
              className="block rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
            >
              <div className="text-xs uppercase tracking-wide text-neutral-500">{a.name}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">
                  {a.active.toLocaleString()}
                </span>
                <span className="text-sm text-neutral-500">reachable now</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span>{a.subscribers.toLocaleString()} subscribers</span>
                <span>{a.people.toLocaleString()} people</span>
                <span>{a.unsubscribed.toLocaleString()} unsubscribed</span>
                <span className={a.bounced > 0 ? 'text-amber-700 dark:text-amber-500' : ''}>
                  {a.bounced.toLocaleString()} bounced
                </span>
                <span>{a.sharedInboxes.toLocaleString()} shared inboxes</span>
                <span>
                  {a.exportedOn ? `exported ${a.exportedOn}` : 'export date unknown'}
                </span>
              </div>
              <div className="mt-3 text-xs text-neutral-400">View names and gaps →</div>
            </Link>
          ))}

          <Link
            href="/dashboard/reachability/campaigns"
            className="block rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <div className="text-xs uppercase tracking-wide text-neutral-500">Campaigns</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">
                {campaignSummary.campaigns.toLocaleString()}
              </span>
              <span className="text-sm text-neutral-500">sent</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-500">
              <span>{campaignSummary.recipients.toLocaleString()} deliveries</span>
              <span>{campaignSummary.clicks.toLocaleString()} clicks</span>
              <span>{campaignSummary.unsubscribes.toLocaleString()} unsubscribes</span>
              <span>
                {campaignSummary.firstSent
                  ? `since ${campaignSummary.firstSent.slice(0, 10)}`
                  : ''}
              </span>
            </div>
            <div className="mt-3 text-xs text-neutral-400">View per campaign →</div>
          </Link>
        </div>
      </Section>

      <Section
        title="Explore"
        caveat="Pick an audience and a dimension. Everything here is a count — names live on the audience pages."
      >
        <BreakdownExplorer
          audiences={audiences.map((a) => ({ id: a.id, name: a.name, people: a.people }))}
          data={breakdowns}
        />
      </Section>

      {members && allPeople && (
        <Section
          title="Members against everyone"
          caveat="The Members list is the audience staff treat as frequent attenders. Comparing it with the full list shows how much of the church is on the narrower one."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="On the Members list" value={members.people} note="people" />
            <Stat
              label="On the full list only"
              value={Math.max(0, allPeople.people - members.people)}
              note="reachable, not treated as members"
            />
            <Stat
              label="Members reachable now"
              value={members.active}
              note={`of ${members.subscribers} subscribers`}
            />
            <Stat
              label="Bounced on either list"
              value={members.bounced + allPeople.bounced}
              note="dead addresses — fixable"
              tone={members.bounced + allPeople.bounced > 0 ? 'warn' : 'normal'}
            />
          </div>
        </Section>
      )}

      <Section
        title="Campaign clicks by month"
        caveat="Clicks, not opens. Apple Mail pre-fetches images and marks messages opened whether or not anyone read them, which inflates open rates across the whole account and makes them useless for comparison."
      >
        <Bars
          rows={byMonth.map((m) => ({ label: m.label, count: m.clicks }))}
          labelWidth="w-24"
        />
      </Section>

      <Section title="Recent campaigns">
        <Table
          rows={campaigns.slice(0, 15)}
          columns={[
            {
              key: 'finished_at',
              header: 'Sent',
              render: (r) => (r.finished_at ? r.finished_at.slice(0, 10) : '—'),
            },
            {
              key: 'subject',
              header: 'Subject',
              render: (r) => (
                <Link
                  href={`/dashboard/reachability/campaigns/${r.id}`}
                  className="hover:underline"
                >
                  {r.subject || r.name || '(untitled)'}
                </Link>
              ),
            },
            { key: 'recipients', header: 'Sent to', align: 'right', render: (r) => r.recipients ?? '—' },
            { key: 'clicks_count', header: 'Clicks', align: 'right', render: (r) => r.clicks_count ?? '—' },
            {
              key: 'click_rate',
              header: 'Click rate',
              align: 'right',
              render: (r) => (r.click_rate === null ? '—' : `${Number(r.click_rate).toFixed(1)}%`),
            },
          ]}
        />
      </Section>
    </div>
  )
}
