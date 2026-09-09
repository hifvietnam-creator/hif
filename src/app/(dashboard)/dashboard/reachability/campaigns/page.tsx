import React from 'react'
import Link from 'next/link'

import { Bars, Section, Stat, Table } from '../../../_components/ui'
import {
  getCampaignSummary,
  getCampaigns,
  getCampaignsByMonth,
} from '@/lib/queries/reachability'

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const [summary, byMonth, campaigns] = await Promise.all([
    getCampaignSummary(),
    getCampaignsByMonth(),
    getCampaigns(200),
  ])

  const overallClickRate =
    summary.recipients > 0 ? (summary.clicks / summary.recipients) * 100 : null

  // Ranked by click rate rather than clicks, so a small well-targeted send is
  // not buried under a large indifferent one.
  const ranked = campaigns
    .filter((c) => (c.recipients ?? 0) >= 50 && c.click_rate !== null)
    .sort((a, b) => Number(b.click_rate) - Number(a.click_rate))

  return (
    <div>
      <p className="text-xs text-neutral-500">
        <Link href="/dashboard/reachability" className="hover:underline">
          Reachability
        </Link>{' '}
        · Campaigns
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Campaigns</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Everything sent through MailerLite
        {summary.firstSent ? ` since ${summary.firstSent.slice(0, 10)}` : ''}.
      </p>

      <Section
        title="Overall"
        caveat="Click rate is clicks divided by deliveries. Open rate is deliberately not shown: Apple Mail pre-fetches images and marks messages opened whether or not anyone read them, which inflates opens across the whole account and makes campaigns incomparable."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Campaigns" value={summary.campaigns} />
          <Stat label="Deliveries" value={summary.recipients} note="all sends combined" />
          <Stat label="Clicks" value={summary.clicks} />
          <Stat
            label="Click rate"
            value={overallClickRate === null ? '—' : `${overallClickRate.toFixed(1)}%`}
          />
          <Stat
            label="Unsubscribes"
            value={summary.unsubscribes}
            note="across all campaigns"
            tone={summary.unsubscribes > summary.campaigns * 5 ? 'warn' : 'normal'}
          />
        </div>
      </Section>

      <Section title="Campaigns sent per month">
        <Bars rows={byMonth.map((m) => ({ label: m.label, count: m.campaigns }))} labelWidth="w-24" />
      </Section>

      <Section
        title="Clicks per month"
        caveat="Volume, not rate. A tall month may simply be a month with more sends — the table below has the rates."
      >
        <Bars rows={byMonth.map((m) => ({ label: m.label, count: m.clicks }))} labelWidth="w-24" />
      </Section>

      <Section
        title="Best received"
        caveat="Ranked by click rate, limited to campaigns sent to at least 50 people so a handful of clicks on a tiny send does not top the list."
      >
        <Table
          rows={ranked.slice(0, 10)}
          empty="Not enough campaign data to rank."
          columns={[
            {
              key: 'subject',
              header: 'Subject',
              render: (r) => (
                <Link href={`/dashboard/reachability/campaigns/${r.id}`} className="hover:underline">
                  {r.subject || r.name || '(untitled)'}
                </Link>
              ),
            },
            {
              key: 'finished_at',
              header: 'Sent',
              render: (r) => (r.finished_at ? r.finished_at.slice(0, 10) : '—'),
            },
            { key: 'recipients', header: 'Sent to', align: 'right', render: (r) => r.recipients ?? '—' },
            {
              key: 'click_rate',
              header: 'Click rate',
              align: 'right',
              render: (r) => (r.click_rate === null ? '—' : `${Number(r.click_rate).toFixed(1)}%`),
            },
          ]}
        />
      </Section>

      <Section title="All campaigns">
        <Table
          rows={campaigns}
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
                <Link href={`/dashboard/reachability/campaigns/${r.id}`} className="hover:underline">
                  {r.subject || r.name || '(untitled)'}
                </Link>
              ),
            },
            { key: 'recipients', header: 'Sent to', align: 'right', render: (r) => r.recipients ?? '—' },
            { key: 'clicks_count', header: 'Clicks', align: 'right', render: (r) => r.clicks_count ?? '—' },
            {
              key: 'click_rate',
              header: 'Rate',
              align: 'right',
              render: (r) => (r.click_rate === null ? '—' : `${Number(r.click_rate).toFixed(1)}%`),
            },
            {
              key: 'unsubscribes',
              header: 'Unsubs',
              align: 'right',
              render: (r) => (
                <span className={(r.unsubscribes ?? 0) > 5 ? 'text-amber-700 dark:text-amber-500' : ''}>
                  {r.unsubscribes ?? '—'}
                </span>
              ),
            },
          ]}
        />
      </Section>
    </div>
  )
}
