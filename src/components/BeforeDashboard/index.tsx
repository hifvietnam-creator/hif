import React from 'react'

const BeforeDashboard: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        marginBottom: '8px',
        borderRadius: '6px',
        background: 'rgba(192,30,39,0.08)',
        border: '1px solid rgba(192,30,39,0.18)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#C01E27', marginRight: '4px' }}>
        Quick add:
      </span>
      {[
        { label: '+ Sermon', href: '/admin/collections/sermons/create' },
        { label: '+ Series', href: '/admin/collections/series/create' },
        { label: '+ Team member', href: '/admin/collections/team/create' },
        { label: '🔴 Live Stream', href: '/admin/globals/live-stream' },
        { label: '⚙ Site Settings', href: '/admin/globals/site-settings' },
      ].map((link) => (
        <a
          key={link.href}
          href={link.href}
          style={{
            padding: '4px 12px',
            borderRadius: '20px',
            background: '#fff',
            border: '1px solid #e5e7eb',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#111',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

export default BeforeDashboard
