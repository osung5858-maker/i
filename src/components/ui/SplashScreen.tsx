'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface SplashScreenProps {
  onFinish: () => void
  duration?: number // ms
}

export default function SplashScreen({ onFinish, duration = 4000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 100)
    const t2 = setTimeout(() => setPhase('exit'), duration - 600)
    const t3 = setTimeout(() => onFinishRef.current(), duration)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [duration])

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500"
      style={{
        opacity: phase === 'exit' ? 0 : 1,
        background: 'linear-gradient(160deg, #FFF9F5 0%, #FFE8DD 40%, #F5C8B6 100%)',
      }}
    >
      {/* 컨텐츠 */}
      <div
        className="relative z-10 flex flex-col items-center transition-all duration-700 ease-out"
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(20px) scale(0.95)' : 'translateY(0) scale(1)',
        }}
      >
        {/* 앱 아이콘 */}
        <div className="relative mb-6">
          {/* 글로우 */}
          <div
            className="absolute inset-0 rounded-full blur-2xl animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(232,147,122,0.35) 0%, rgba(160,190,160,0.2) 50%, transparent 70%)', transform: 'scale(2.8)' }}
          />
          <Image
            src="/app-icon.png"
            alt="도담"
            width={112}
            height={112}
            priority
            className="relative rounded-[28px] shadow-[0_8px_40px_rgba(232,147,122,0.4)]"
          />
        </div>

        {/* 타이틀 */}
        <h1
          className="text-display font-bold text-[#3D2E26] tracking-tight transition-all duration-500 delay-300"
          style={{
            opacity: phase === 'enter' ? 0 : 1,
            transform: phase === 'enter' ? 'translateY(10px)' : 'translateY(0)',
          }}
        >
          도담
        </h1>

        {/* 서브타이틀 */}
        <p
          className="mt-2 text-subtitle text-[#8B7468] font-medium transition-all duration-500 delay-500"
          style={{
            opacity: phase === 'enter' ? 0 : 1,
            transform: phase === 'enter' ? 'translateY(10px)' : 'translateY(0)',
          }}
        >
          오늘도 도담하게
        </p>

        {/* 파티클 효과 */}
        <div className="absolute -z-10" aria-hidden>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-float"
              style={{
                width: `${6 + i * 3}px`,
                height: `${6 + i * 3}px`,
                background: `rgba(232,147,122,${0.15 + i * 0.05})`,
                left: `${-60 + i * 25}px`,
                top: `${-40 + (i % 3) * 30}px`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
