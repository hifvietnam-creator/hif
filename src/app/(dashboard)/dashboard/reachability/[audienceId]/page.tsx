import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Section, Stat, Table, Warning } from '../../../_components/ui'
import {
  getAudienceById,
  getAudienceGaps,
  getAudienceSubscribers,
  getAudiences,
  getSharedInboxes,
} from '@/lib/queries/reachability'

export const dynamic = 'force-dynamic'

const STATUS_HELP: Record<string, string> = {
  active: 'Reachable. Mail is being delivered.',
  unsubscribed: 'They asked to stop. A deliberate choice — respect it and do not re-add them.',
  bounced: 'The address does not work. This is a data error and is fixable, unlike the others.',
  junk: 'Marked as spam. Continuing to send damages delivery for everyone else on the list.',
  unconfirmed: 'Started subscribing but never confirmed.',
}

type Props = {
  params: Promise<{ audienceId: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function AudiencePage({ params, searchParams }: Props) {
  const { audienceId } = await params
  const { status } = await searchParams

  const group = await getAudienceById(audienceId)
  if (!group) notFound()

  const [audiences, subscribers, shared, gaps] = await Promise.all([
    getAudiences(),
    getAudienceSubscribers(audienceId, status),
    getSharedInboxes(audienceId),
    getAudienceGaps(audienceId),
  ])

  const audience = audiences.find((a) => a.id === audienceId)

  const statuses: Array<{ key: string; label: string; count: number }> = audience
    ? [
        { key: 'active', label: 'Active', count: audience.active },
        { key: 'unsubscribed', label: 'Unsubscribed', count: audience.unsubscribed },
        { key: 'bounced', label: 'Bounced', count: audience.bounced },
        { key: 'junk', label: 'Spam complaints', count: audience.junk },
        { key: 'unconfirmed', label: 'Unconfirmed', count: audience.unconfirmed },
      ].filter((s) => s.count > 0)
    : []

  const exportHref = `/dashboard/reachability/${audienceId}/export${status ? `?status=${status}` : ''}`

  return (
    <div>
      <p className="text-xs text-neutral-500">
        <Link href="/dashboard/reachability" className="hover:underline">
          Reachability
        </Link>{' '}
        · {group.name}
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">{group.name}</h1>
      {audience?.exportedOn && (
        <p className="mt-1 text-sm text-neutral-500">
          Exported from Planning Center on {audience.exportedOn}
          {audience.staleDays !== null ? ` — ${audience.staleDays} days ago` : ''}.
        </p>
      )}

      <div className="mt-6">
        <Warning>
          This page lists people by name and email address. It is the point where this section
          stops being statistics and becomes personal data — including who has asked not to be
          contacted. Please treat it accordingly, and note that access to the dashboard has not yet
          been restricted beyond &ldquo;any signed-in staff account&rdquo;.
        </Warning>
      </div>

      {audience && (
        <Section title="Status">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Subscribers" value={audience.subscribers} />
            <Stat label="Reachable now" value={audience.active} />
            <Stat label="Unsubscribed" value={audience.unsubscribed} note="respect this" />
            <Stat
              label="Bounced"
              value={audience.bounced}
              note="fixable"
              tone={audience.bounced > 0 ? 'warn' : 'normal'}
            />
            <Stat label="People reached" value={audience.people} note={`${audience.sharedInboxes} shared`} />
          </div>
        </Section>
      )}

      <Section
        title="Subscribers"
        caveat="One row per address, not per person: a shared household address appears once with both names, because there is one mailbox."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/reachability/${audienceId}`}
            className={`rounded px-2.5 py-1 text-sm ${
              !status
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'
            }`}
          >
            All
          </Link>
          {statuses.map((s) => (
            <Link
              key={s.key}
              href={`/dashboard/reachability/${audienceId}?status=${s.key}`}
              className={`rounded px-2.5 py-1 text-sm ${
                status === s.key
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900'
              }`}
            >
              {s.label} ({s.count.toLocaleString()})
            </Link>
          ))}
          <a
            href={exportHref}
            className="ml-auto rounded border border-neutral-300 px-2.5 py-1 text-sm text-neutral-600 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
          >
            Download CSV
          </a>
        </div>

        {status && STATUS_HELP[status] && (
          <p className="mb-3 text-xs text-neutral-500">{STATUS_HELP[status]}</p>
        )}

        <Table
          rows={subscribers}
          empty="No subscribers with that status."
          columns={[
            { key: 'email', header: 'Email' },
            {
              key: 'people',
              header: 'Who',
              render: (r) =>
                r.people ? (
                  <span>
                    {r.people}
                    {r.person_count > 1 && (
                      <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        shared
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-500">no church record</span>
                ),
            },
            { key: 'status', header: 'Status' },
            { key: 'sent', header: 'Sent', align: 'right', render: (r) => r.sent ?? '—' },
            {
              key: 'clicks_count',
              header: 'Clicks',
              align: 'right',
              render: (r) => r.clicks_count ?? '—',
            },
          ]}
        />
        {subscribers.length >= 2000 && (
          <p className="mt-2 text-xs text-neutral-500">
            Showing the first 2,000. Use the CSV for the full list.
          </p>
        )}
      </Section>

      {shared.length > 0 && (
        <Section
          title="Shared inboxes"
          caveat="One address, more than one person — usually a couple or a family. Reaching this address means the household is reachable; it does not tell you which of them read it, and neither should any count built on it."
        >
          <Table
            rows={shared}
            columns={[
              { key: 'email', header: 'Email' },
              { key: 'people', header: 'People' },
              { key: 'person_count', header: 'Count', align: 'right' },
              { key: 'status', header: 'Status' },
            ]}
          />
        </Section>
      )}

      <Section
        title="Not on this list"
        caveat="Active people with a working email who are absent from this audience. Because the audience is a frozen export, most of these will simply have joined since that date. Anyone who has unsubscribed or bounced elsewhere is excluded — re-adding them would be futile and unwelcome."
      >
        <Table
          rows={gaps}
          empty="Nobody with a usable email is missing from this audience."
          columns={[
            { key: 'name', header: 'Name', render: (r) => r.name || '—' },
            { key: 'email', header: 'Email', render: (r) => r.email || '—' },
            { key: 'membership', header: 'Status', render: (r) => r.membership || '—' },
            { key: 'campus', header: 'Campus', render: (r) => r.campus || '—' },
          ]}
        />
        {gaps.length >= 500 && (
          <p className="mt-2 text-xs text-neutral-500">Showing the first 500.</p>
        )}
      </Section>
    </div>
  )
}
