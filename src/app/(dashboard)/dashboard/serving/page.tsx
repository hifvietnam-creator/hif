import React from 'react'

import { Bars, Section, Stat, Table, Warning } from '../../_components/ui'
import {
  getAssignedNeverScheduled,
  getMinistryOverview,
  getRecentPlans,
  getRoleInMinistry,
  getSchedulingResponse,
  getServingFrequency,
  getServingHeadline,
  getTeams,
  getVolunteerMinistries,
  getVolunteerSpread,
} from '@/lib/queries/serving'

export const dynamic = 'force-dynamic'

const pct = (n: number, d: number) => (d === 0 ? '—' : `${Math.round((n / d) * 100)}%`)

export default async function ServingPage() {
  const [
    headline,
    ministries,
    teams,
    frequency,
    response,
    ladder,
    volunteer,
    plans,
    assignedNeverScheduled,
    spread,
  ] = await Promise.all([
    getServingHeadline(),
    getMinistryOverview(),
    getTeams(),
    getServingFrequency(),
    getSchedulingResponse(),
    getRoleInMinistry(),
    getVolunteerMinistries(),
    getRecentPlans(),
    getAssignedNeverScheduled(),
    getVolunteerSpread(),
  ])

  const coverage = pct(headline.teamsWithScheduling, headline.teams)

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Serving &amp; Ministry</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Who is on a team, who is actually scheduled, and how they respond.
      </p>

      <div className="mt-6">
        <Warning>
          <strong>Scheduling data covers {headline.teamsWithScheduling} of {headline.teams} teams ({coverage}).</strong>{' '}
          Planning Center Services is used here for worship and media; most ministries do not
          schedule through it. So the scheduling figures below describe those teams only — they are
          not a picture of serving across HIF, and a ministry showing zero is far more likely to be
          absent from Services than inactive.
        </Warning>
      </div>

      <Section
        title="Headline"
        caveat="Two different measures. A team assignment means someone is on the rota; a confirmed scheduling means they turned up to a specific service. They are never added together."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="On a team rota" value={headline.peopleAssigned} note="standing assignments" />
          <Stat
            label="Confirmed at least once"
            value={headline.peopleConfirmed}
            note={`of ${headline.peopleScheduled.toLocaleString()} ever scheduled`}
          />
          <Stat label="Teams" value={headline.teams} note={`${headline.teamsWithScheduling} use scheduling`} tone="warn" />
          <Stat label="Ministries" value={headline.serviceTypes} note="service types" />
          <Stat label="Positions" value={headline.positions} />
          <Stat label="Services planned" value={headline.plans} />
          <Stat label="Schedulings" value={headline.schedulings} note="all statuses" />
          <Stat
            label="On a rota, never confirmed"
            value={assignedNeverScheduled}
            note="stale rota, or team not in Services"
            tone="warn"
          />
        </div>
      </Section>

      <Section
        title="By ministry"
        caveat="People counts come from team rotas and are reliable for every ministry. Plans and schedulings only exist for ministries that use Services."
      >
        <Table
          rows={ministries}
          columns={[
            { key: 'label', header: 'Ministry' },
            { key: 'teams', header: 'Teams', align: 'right' },
            { key: 'people', header: 'On rota', align: 'right' },
            { key: 'plans', header: 'Services', align: 'right' },
            { key: 'schedulings', header: 'Scheduled', align: 'right' },
            {
              key: 'confirmed',
              header: 'Confirmed',
              align: 'right',
              render: (r) => (
                <span>
                  {r.confirmed.toLocaleString()}
                  <span className="ml-2 text-xs text-neutral-500">
                    {r.schedulings > 0 ? pct(r.confirmed, r.schedulings) : '—'}
                  </span>
                </span>
              ),
            },
          ]}
        />
      </Section>

      <Section
        title="Teams"
        caveat="Ordered by how many people are on the rota. A team with people but no schedulings does not use Planning Center Services."
      >
        <Table
          rows={teams}
          columns={[
            { key: 'label', header: 'Team' },
            { key: 'ministry', header: 'Ministry' },
            { key: 'people', header: 'On rota', align: 'right' },
            { key: 'schedulings', header: 'Scheduled', align: 'right' },
            { key: 'confirmed', header: 'Confirmed', align: 'right' },
            {
              key: 'declined',
              header: 'Declined',
              align: 'right',
              render: (r) => (
                <span className={r.declined > r.confirmed && r.declined > 0 ? 'text-amber-700 dark:text-amber-400' : ''}>
                  {r.declined.toLocaleString()}
                </span>
              ),
            },
          ]}
        />
      </Section>

      <Section
        title="How often people serve"
        caveat="Confirmed slots only. Someone scheduled twenty times who declined all twenty has not served, and is counted in the first row rather than among the regulars."
      >
        <Bars rows={frequency} labelWidth="w-56" />
      </Section>

      <Section
        title="Response to being scheduled"
        caveat="A high unconfirmed share usually means the team schedules informally and does not use the confirmation flow — not that people are ignoring requests."
      >
        <Bars rows={response} labelWidth="w-40" />
      </Section>

      <Section
        title="Leadership ladder"
        caveat={`From the "Role in Ministry" fields, filled in for ${ladder.covered.toLocaleString()} people. A person can hold a role in up to three ministries, so each is counted once at their highest rung — otherwise the same leader would appear on several. Shown in ladder order rather than by size, because the shape of the pipeline is the point.`}
      >
        <Bars rows={ladder.rows} labelWidth="w-56" />
      </Section>

      <Section
        title="Volunteering, by ministry"
        caveat={`From the three "Volunteer in Ministry" fields, filled in for ${volunteer.covered.toLocaleString()} people. Someone serving in two ministries appears under both, which is intended. Covers more ministries than Services does, but carries no dates — it records that someone was listed, never when or how often.${
          volunteer.freeText > 0
            ? ` A further ${volunteer.freeText.toLocaleString()} listed extra ministries in a free-text field, not charted here.`
            : ''
        }`}
      >
        <Bars rows={volunteer.rows} labelWidth="w-56" />
      </Section>

      <Section
        title="How many ministries each volunteer serves"
        caveat="Breadth rather than headcount. A congregation where most volunteers serve in one ministry looks very different from one where a few people carry three."
      >
        <Bars rows={spread} labelWidth="w-40" />
      </Section>

      <Section title="Recent services">
        <Table
          rows={plans}
          columns={[
            {
              key: 'sort_date',
              header: 'Date',
              render: (r) => (r.sort_date ? new Date(r.sort_date).toISOString().slice(0, 10) : '—'),
            },
            { key: 'title', header: 'Service' },
            { key: 'ministry', header: 'Ministry' },
            { key: 'scheduled', header: 'Scheduled', align: 'right' },
            { key: 'confirmed', header: 'Confirmed', align: 'right' },
          ]}
        />
      </Section>
    </div>
  )
}
