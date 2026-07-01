'use client'

import { useState, useEffect } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(targetDate: string): TimeLeft | null {
  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

export default function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(targetDate))

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000)
    return () => clearInterval(id)
  }, [targetDate])

  if (!timeLeft) {
    return (
      <p style={{ color: 'rgba(255,255,255,.75)', fontSize: '1.1rem' }}>
        Starting soon — we&apos;re getting ready for you.
      </p>
    )
  }

  const units: [string, number][] = [
    ['Days', timeLeft.days],
    ['Hours', timeLeft.hours],
    ['Mins', timeLeft.minutes],
    ['Secs', timeLeft.seconds],
  ]

  return (
    <div className="countdown">
      {units.map(([label, value]) => (
        <div key={label} className="countdown-item">
          <span className="countdown-num">{String(value).padStart(2, '0')}</span>
          <span className="countdown-label">{label}</span>
        </div>
      ))}
    </div>
  )
}
