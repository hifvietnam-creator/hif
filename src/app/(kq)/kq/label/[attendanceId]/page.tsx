import { notFound, redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'

import { getKqUser, canWorkSession } from '@/lib/kq/auth'
import { getLabel } from '@/lib/kq/labels'

import AutoPrint from './AutoPrint'

export const dynamic = 'force-dynamic'

/**
 * Printable tags for one check-in.
 *
 * Two labels per job:
 *
 *   CHILD    — worn by the child. Name large enough to read across a room,
 *              allergy impossible to miss, and the security code.
 *   GUARDIAN — kept by the adult. The SAME code, which is what gets matched at
 *              collection.
 *
 * The code is a convenience for matching, NOT the authorisation. Check-out is
 * still gated on kq.child_guardians.can_pickup — otherwise a printed label
 * becomes a bearer token for a child, and anyone who picked one off the floor
 * could collect them.
 *
 * Rendered as its own route rather than markup inside the station so the print
 * stylesheet governs a page with nothing else on it. The station loads this in
 * a hidden iframe and prints that, so a TA never navigates away mid-queue.
 */
export default async function LabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ attendanceId: string }>
  searchParams: Promise<{ auto?: string }>
}) {
  const { attendanceId: raw } = await params
  const { auto } = await searchParams
  const attendanceId = parseInt(raw, 10)
  if (Number.isNaN(attendanceId)) notFound()

  const user = await getKqUser(await nextHeaders())
  if (!user) redirect('/admin/login')

  const label = await getLabel(attendanceId)
  if (!label) notFound()

  // Same rule as the station: you can only print for a room you work.
  if (!(await canWorkSession(user, label.sessionId))) {
    return <p className="p-6 text-sm">You are not rostered to this room.</p>
  }

  const when = new Date(label.serviceDate + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  })

  return (
    <>
      {auto !== '0' && <AutoPrint />}

      <div className="labels">
        {/* ── Child tag ─────────────────────────────────────────────── */}
        <section className="label">
          <div className="row">
            <span className="group">{label.groupLabel}</span>
            <span className="date">{when}</span>
          </div>
          <div className="name">{label.childName}</div>
          {label.allergies && <div className="allergy">⚠ {label.allergies}</div>}
          <div className="row bottom">
            <span className="who">{label.guardianName ?? 'dropped off'}</span>
            <span className="code">{label.securityCode}</span>
          </div>
        </section>

        {/* ── Guardian claim tag ────────────────────────────────────── */}
        <section className="label">
          <div className="row">
            <span className="group">Collection tag</span>
            <span className="date">{when}</span>
          </div>
          <div className="claim">Collect</div>
          <div className="name small">{label.childName}</div>
          <div className="row bottom">
            <span className="who">{label.groupLabel}</span>
            <span className="code">{label.securityCode}</span>
          </div>
          <div className="note">Keep this. It is matched against your child&rsquo;s tag.</div>
        </section>
      </div>

      {/*
        Sized for 62mm continuous roll stock, the common Brother QL default.
        If yours differs, @page size and .label height are the two numbers to
        change — everything else is relative.
      */}
      <style>{`
        @page { size: 62mm 45mm; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        .labels { font-family: var(--font-inter), system-ui, sans-serif; color: #000; }
        .label {
          width: 62mm; height: 45mm;
          box-sizing: border-box;
          padding: 3mm 3.5mm;
          display: flex; flex-direction: column;
          page-break-after: always; break-after: page;
          border-bottom: 1px dashed #bbb;   /* screen only; invisible on roll */
        }
        .label:last-child { page-break-after: auto; break-after: auto; }
        .row { display: flex; justify-content: space-between; align-items: baseline; }
        .group { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
        .date { font-size: 8pt; }
        .name {
          font-size: 17pt; font-weight: 800; line-height: 1.1;
          margin-top: 1.5mm; overflow-wrap: anywhere;
        }
        .name.small { font-size: 14pt; }
        .claim { font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; margin-top: 1.5mm; }
        /* Allergy is boxed and heavy on purpose: it has to survive being read at
           arm's length by somebody carrying a child. */
        .allergy {
          margin-top: 1.5mm; padding: 1mm 1.5mm;
          border: 1.5pt solid #000; border-radius: 1mm;
          font-size: 10pt; font-weight: 800; text-transform: uppercase;
        }
        .bottom { margin-top: auto; }
        .who { font-size: 8pt; max-width: 34mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .code {
          font-family: ui-monospace, "Courier New", monospace;
          font-size: 20pt; font-weight: 800; letter-spacing: .12em;
        }
        .note { font-size: 6.5pt; margin-top: 1mm; }
        @media screen {
          body { background: #f6f4f1; padding: 16px; }
          .labels { display: flex; gap: 12px; flex-wrap: wrap; }
          .label { background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.15); border-radius: 2mm; }
        }
      `}</style>
    </>
  )
}
