'use client'

import { useRef, useEffect } from 'react'

// 주차 → 단계(1~10) 매핑
function weekToStage(week: number): number {
  if (week < 8) return 1
  if (week < 12) return 2
  if (week < 16) return 3
  if (week < 20) return 4
  if (week < 24) return 5
  if (week < 28) return 6
  if (week < 32) return 7
  if (week < 36) return 8
  if (week < 40) return 9
  return 10
}

export default function BabyIllust({ week }: { week: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stage = weekToStage(week)

  useEffect(() => {
    const v = videoRef.current
    if (v) {
      v.load()
      v.play().catch(() => {})
    }
  }, [stage])

  return (
    <div
      className="mx-auto"
      style={{
        width: 220,
        height: 220,
        WebkitMaskImage: 'radial-gradient(circle, black 45%, transparent 72%)',
        maskImage: 'radial-gradient(circle, black 45%, transparent 72%)',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain"
      >
        <source src={`/videos/baby/${stage}.webm`} type="video/webm" />
        <source src={`/videos/baby/${stage}.mp4`} type="video/mp4" />
      </video>
    </div>
  )
}
