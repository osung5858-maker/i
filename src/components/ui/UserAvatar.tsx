'use client'

/**
 * UserAvatar — 시드 해시 기반 그라디언트 아바타
 * userId를 기반으로 고유 색상 조합 생성 → "도", "하" 같은 한 글자보다 자연스러움
 */

const PALETTES = [
  ['#FF6B6B', '#FFE66D'], // coral → yellow
  ['#4ECDC4', '#44A08D'], // mint → green
  ['#A18CD1', '#FBC2EB'], // purple → pink
  ['#667EEA', '#764BA2'], // blue → purple
  ['#F093FB', '#F5576C'], // pink → red
  ['#4FACFE', '#00F2FE'], // blue → cyan
  ['#43E97B', '#38F9D7'], // green → mint
  ['#FA709A', '#FEE140'], // pink → yellow
  ['#A1C4FD', '#C2E9FB'], // sky → light sky
  ['#FCCB90', '#D57EEB'], // peach → violet
  ['#E0C3FC', '#8EC5FC'], // lavender → sky
  ['#F5AF19', '#F12711'], // gold → red
]

const EMOJIS = ['🐻', '🐰', '🦊', '🐱', '🐶', '🐼', '🦁', '🐨', '🐯', '🐸', '🐵', '🐷']

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

interface UserAvatarProps {
  userId?: string
  name?: string | null
  size?: number // px, default 32
  className?: string
}

export default function UserAvatar({ userId, name, size = 32, className = '' }: UserAvatarProps) {
  const hash = hashCode(userId || name || 'anon')
  const palette = PALETTES[hash % PALETTES.length]
  const emoji = EMOJIS[hash % EMOJIS.length]

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
      }}
    >
      <span style={{ fontSize: size * 0.45, lineHeight: 1 }}>{emoji}</span>
    </div>
  )
}
