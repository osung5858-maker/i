'use client'

import { useState, useEffect } from 'react'

const COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF9FF3',
  '#54A0FF', '#FF6348', '#FFC048', '#A29BFE', '#FD79A8',
  '#00CEC9', '#E17055', '#FDCB6E', '#6C5CE7', '#55E6C1',
]

const SHAPES = ['circle', 'rect', 'rect-tall'] as const

interface Particle {
  x: number
  delay: number
  duration: number
  size: number
  color: string
  shape: typeof SHAPES[number]
  rotation: number
  swingAmp: number
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    rotation: Math.random() * 360,
    swingAmp: 20 + Math.random() * 40,
  }))
}

export default function Confetti({ count = 60, duration = 5000 }: { count?: number; duration?: number }) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setParticles(makeParticles(count))
    const timer = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timer)
  }, [count, duration])

  if (!visible || particles.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(calc(100dvh + 20px)) rotate(720deg); opacity: 0; }
        }
        @keyframes confetti-swing {
          0%, 100% { margin-left: 0; }
          25% { margin-left: var(--swing); }
          75% { margin-left: calc(var(--swing) * -1); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: -20,
              ['--swing' as string]: `${p.swingAmp}px`,
              animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards, confetti-swing ${p.duration * 0.5}s ${p.delay}s ease-in-out infinite`,
            }}
          >
            <div
              style={{
                width: p.shape === 'rect-tall' ? p.size * 0.5 : p.size,
                height: p.shape === 'circle' ? p.size : p.size * (p.shape === 'rect-tall' ? 1.5 : 0.6),
                backgroundColor: p.color,
                borderRadius: p.shape === 'circle' ? '50%' : 2,
                transform: `rotate(${p.rotation}deg)`,
              }}
            />
          </div>
        ))}
      </div>
    </>
  )
}
