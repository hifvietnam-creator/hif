import React from 'react'

interface Props {
  className?: string
}

export const Logo = ({ className }: Props) => {
  return (
    <img
      src="/assets/img/logo.png"
      alt="Hanoi International Fellowship"
      style={{ height: '32px', width: 'auto' }}
      className={className}
    />
  )
}
