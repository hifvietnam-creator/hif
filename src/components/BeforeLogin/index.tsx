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
    </div>
  )
}

export default BeforeLogin
