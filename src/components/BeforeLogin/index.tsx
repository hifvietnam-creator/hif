import React from 'react'

const BeforeLogin: React.FC = () => {
  return (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <img
        src="/assets/img/logo.png"
        alt="Hanoi International Fellowship"
        style={{ height: '40px', marginBottom: '12px' }}
      />
      <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
        Sign in to manage <strong>hif.vn</strong>
      </p>
      {/*
        Volunteers bookmarked this page when it was the only way in. Signing in
        here now authenticates them and then refuses the panel, because the CMS
        is closed to anybody without siteAdmin — a cookie, an error, and no way
        through to KidzQuest. This gets them to the right door instead.
      */}
      <p style={{ margin: '14px 0 0', color: '#666', fontSize: '0.85rem' }}>
        Helping with KidzQuest on a Sunday?{' '}
        <a href="/kq/login" style={{ fontWeight: 600 }}>
          Sign in over here
        </a>
        .
      </p>
    </div>
  )
}

export default BeforeLogin
