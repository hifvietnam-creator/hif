'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'

export interface TeamMemberCard {
  id: string
  name: string
  role: string
  bio: string | null
  email: string | null
  photoUrl: string | null
  initials: string
  color: string
}

const BIO_LIMIT = 110

export default function TeamCarousel({ members }: { members: TeamMemberCard[] }) {
  const [modal, setModal] = useState<TeamMemberCard | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!modal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null) }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [modal])

  const scroll = useCallback((dir: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('.tc-card')
    const cardW = card ? card.offsetWidth + 20 : 300
    track.scrollBy({ left: dir * cardW, behavior: 'smooth' })
  }, [])

  if (members.length === 0) return null

  const lead = members[0]!
  const rest = members.slice(1)

  const leadBioShort =
    lead.bio && lead.bio.length > BIO_LIMIT
      ? lead.bio.slice(0, BIO_LIMIT).trimEnd() + '…'
      : lead.bio
  const leadHasMore = Boolean(lead.bio && lead.bio.length > BIO_LIMIT)

  return (
    <>
      {/* ── Featured lead pastor ───────────────────────────────────────── */}
      <div className="pastor reveal" style={{ marginBottom: 'clamp(40px, 6vw, 64px)' }}>
        {/* Left: photo or kaleido gradient card */}
        {lead.photoUrl ? (
          <div className="pastor-photo">
            <Image
              src={lead.photoUrl}
              alt={`Photo of ${lead.name}`}
              fill
              sizes="(max-width: 860px) 100vw, 35vw"
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>
        ) : (
          <div className="pastor-card">
            <div className="pastor-initials" aria-hidden="true">
              {lead.initials}
            </div>
            <div className="p-name">{lead.name}</div>
            <div className="p-role">{lead.role}</div>
          </div>
        )}

        {/* Right: bio copy */}
        <div className="about-copy">
          <h3 style={{ fontSize: '1.35rem', marginBottom: '4px' }}>{lead.name}</h3>
          <p style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: '16px' }}>{lead.role}</p>
          {leadBioShort ? (
            <p>{leadBioShort}</p>
          ) : (
            <p style={{ color: 'var(--muted)' }}>Bio coming soon.</p>
          )}
          {leadHasMore && (
            <button
              className="tc-readmore"
              style={{ marginTop: '14px' }}
              onClick={() => setModal(lead)}
              aria-label={`Read more about ${lead.name}`}
            >
              Read more →
            </button>
          )}
          {lead.email && (
            <a className="tc-contact" style={{ display: 'block', marginTop: '14px' }} href={`mailto:${lead.email}`}>
              {lead.email}
            </a>
          )}
        </div>
      </div>

      {/* ── Carousel for the rest of the team ─────────────────────────── */}
      {rest.length > 0 && (
        <>
          <h3 className="recent-title" style={{ color: 'var(--ink)', marginBottom: '24px' }}>
            Our Team
          </h3>
          <div className="tc-wrap">
            <button className="tc-arrow tc-prev" onClick={() => scroll(-1)} aria-label="Previous team members">‹</button>

            <div className="tc-track" ref={trackRef} role="list">
              {rest.map((m) => {
                const truncated =
                  m.bio && m.bio.length > BIO_LIMIT
                    ? m.bio.slice(0, BIO_LIMIT).trimEnd() + '…'
                    : m.bio
                const hasMore = Boolean(m.bio && m.bio.length > BIO_LIMIT)

                return (
                  <article key={m.id} className="tc-card" role="listitem">
                    <div className="tc-photo">
                      {m.photoUrl ? (
                        <Image
                          src={m.photoUrl}
                          alt={`Photo of ${m.name}`}
                          fill
                          sizes="280px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="tc-initials" style={{ background: m.color }} aria-hidden="true">
                          {m.initials}
                        </div>
                      )}
                    </div>
                    <div className="tc-info">
                      <div className="tc-name">{m.name}</div>
                      <div className="tc-role">{m.role}</div>
                      {truncated && <p className="tc-bio">{truncated}</p>}
                      {hasMore && (
                        <button
                          className="tc-readmore"
                          onClick={() => setModal(m)}
                          aria-label={`Read more about ${m.name}`}
                        >
                          Read more →
                        </button>
                      )}
                      {m.email && !hasMore && (
                        <a className="tc-contact" href={`mailto:${m.email}`}>{m.email}</a>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            <button className="tc-arrow tc-next" onClick={() => scroll(1)} aria-label="Next team members">›</button>
          </div>
        </>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modal && (
        <div
          className="tc-backdrop"
          onClick={() => setModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`About ${modal.name}`}
        >
          <div
            className="tc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky close */}
            <div className="tc-modal-bar">
              <button
                className="tc-close"
                onClick={() => setModal(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Photo */}
            <div className="tc-modal-photo">
              {modal.photoUrl ? (
                <Image
                  src={modal.photoUrl}
                  alt={`Photo of ${modal.name}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 520px"
                  style={{ objectFit: 'cover' }}
                  priority
                />
              ) : (
                <div
                  className="tc-initials tc-initials-lg"
                  style={{ background: modal.color }}
                  aria-hidden="true"
                >
                  {modal.initials}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="tc-modal-body">
              <h2 className="tc-modal-name">{modal.name}</h2>
              <p className="tc-modal-role">{modal.role}</p>
              {modal.email && (
                <a className="tc-contact tc-modal-email" href={`mailto:${modal.email}`}>
                  {modal.email}
                </a>
              )}
              {modal.bio && (
                <p className="tc-modal-bio">{modal.bio}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
