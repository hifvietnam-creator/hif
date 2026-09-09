import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Section, Stat } from '../../../../_components/ui'
import { getCampaign, getCampaignSummary } from '@/lib/queries/reachability'

export const dynamic = 'force-dynamic'

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const [campaign, summary] = await Promise.all([getCampaign(campaignId), getCampaignSummary()])
  if (!campaign) notFound()

  const rate = campaign.click_rate === null ? null : Number(campaign.click_rate)
  const average = summary.recipients > 0 ? (summary.clicks / summary.recipients) * 100 : null
  const vsAverage = rate !== null && average !== null ? rate - average : null

  return (
    <div>
      <p className="text-xs text-neutral-500">
        <Link href="/dashboard/reachability" className="hover:underline">
          Reachability
        </Link>{' '}
        ·{' '}
        <Link href="/dashboard/reachability/campaigns" className="hover:underline">
          Campaigns
        </Link>
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">
        {campaign.subject || campaign.name || '(untitled)'}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {campaign.finished_at ? `Sent ${campaign.finished_at.slice(0, 10)}` : 'Not yet sent'}
        {campaign.name && campaign.subject && campaign.name !== campaign.subject
          ? ` · internal name: ${campaign.name}`
          : ''}
      </p>

      <Section title="Performance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Delivered to" value={campaign.recipients ?? 0} />
          <Stat label="Clicks" value={campaign.clicks_count ?? 0} />
          <Stat
            label="Click rate"
            value={rate === null ? '—' : `${rate.toFixed(1)}%`}
            note={
              vsAverage === null
                ? undefined
                : `${vsAverage >= 0 ? '+' : ''}${vsAverage.toFixed(1)} points vs average`
            }
            tone={vsAverage !== null && vsAverage < -1 ? 'warn' : 'normal'}
          />
          <Stat
            label="Unsubscribes"
            value={campaign.unsubscribes ?? 0}
            tone={(campaign.unsubscribes ?? 0) > 5 ? 'warn' : 'normal'}
          />
          <Stat
            label="Spam complaints"
            value={campaign.spam_count ?? 0}
            note="harms delivery for everyone"
            tone={(campaign.spam_count ?? 0) > 0 ? 'warn' : 'normal'}
          />
          <Stat label="Status" value={campaign.status ?? '—'} />
          <Stat label="Type" value={campaign.type ?? '—'} />
        </div>

        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-neutral-500">
          Opens are recorded ({(campaign.opens_count ?? 0).toLocaleString()}) but not shown as a
          measure. Apple Mail Privacy Protection loads tracking images on the recipient&rsquo;s
          behalf, so a large share of those opens represent nobody reading anything. Clicks require
          a deliberate action and are the only figure here worth comparing between campaigns.
        </p>
      </Section>

      <Section
        title="Content"
        caveat="The message itself lives in MailerLite. Only its performance is mirrored here."
      >
        <a
          href={`https://dashboard.mailerlite.com/campaigns/${campaign.id}/reports/overview`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300"
        >
          Open in MailerLite →
        </a>
      </Section>
    </div>
  )
}
