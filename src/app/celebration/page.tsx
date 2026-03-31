'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PregnantIcon, EnvelopeIcon, CheckCircleIcon, SproutIcon, RainbowIcon } from '@/components/ui/Icons'
import IllustVideo from '@/components/ui/IllustVideo'
import { setSecure, getSecure } from '@/lib/secureStorage'

// confetti 파티클은 클라이언트에서만 생성 (hydration mismatch 방지)
const CONFETTI = Array.from({ length: 40 }, () => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: Math.random() * 2,
  duration: 1.5 + Math.random() * 2,
  size: 12 + Math.random() * 16,
  opacity: 0.7 + Math.random() * 0.3,
  char: ['*', '+', '·', ':', '*', '+', '·', ':'][Math.floor(Math.random() * 8)],
}))

export default function CelebrationPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [showConfetti, setShowConfetti] = useState(true)

  // 준비 여정 데이터
  const [journey, setJourney] = useState({ letters: 0, days: 0, supplements: 0, checks: 0 })
  useEffect(() => {
    const letters = (() => { try { return JSON.parse(localStorage.getItem('dodam_letters') || '[]').length } catch { return 0 } })()
    const appointments = (() => { try { return Object.keys(JSON.parse(localStorage.getItem('dodam_appointments') || '{}')).length } catch { return 0 } })()
    const checks = (() => { try { return Object.values(JSON.parse(localStorage.getItem('dodam_preparing_checks') || '{}')).filter(Boolean).length } catch { return 0 } })()
    getSecure('dodam_last_period').then(lastPeriod => {
      const days = lastPeriod ? Math.floor((Date.now() - new Date(lastPeriod).getTime()) / 86400000) : 0
      setJourney({ letters, days, supplements: appointments, checks })
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleComplete = async () => {
    if (dueDate) {
      await setSecure('dodam_due_date', dueDate)
    }
    localStorage.setItem('dodam_mode', 'pregnant')
    router.push('/pregnant')
  }

  // Step 0: 축하 화면
  if (step === 0) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* 축하 파티클 */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {CONFETTI.map((p, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  fontSize: `${p.size}px`,
                  opacity: p.opacity,
                }}
              >
                {p.char}
              </div>
            ))}
          </div>
        )}

        <div className="relative z-10 text-center">
          <div className="mb-6">
            <IllustVideo src="/images/illustrations/celebration-hero.webm" className="w-56 h-56 mx-auto" />
          </div>

          <h1 className="text-[28px] font-bold text-[#1A1918] mb-2">
            축하해요!
          </h1>
          <p className="text-[18px] text-[var(--color-primary)] font-semibold mb-4">
            새 생명이 찾아왔어요
          </p>
          <p className="text-[14px] text-[#6B6966] leading-relaxed max-w-[280px] mx-auto">
            기다리고, 준비하고, 소망했던<br />
            그 작은 생명이 엄마 아빠에게<br />
            드디어 인사를 건넸어요
          </p>

          <div className="mt-8 p-4 bg-[#FFF8F3] rounded-2xl max-w-[260px] mx-auto">
            <p className="text-[13px] text-[#1A1918] italic leading-relaxed">
              "엄마 아빠, 드디어 만났어요.<br />
              그동안 보내준 사랑, 다 느끼고 있었어요.<br />
              이제부터 함께예요."
            </p>
            <p className="text-[13px] text-[#9E9A95] mt-2">— 아이가</p>
          </div>

          <button
            onClick={() => setStep(1)}
            className="mt-10 px-8 py-3 bg-[var(--color-primary)] text-white text-[15px] font-semibold rounded-2xl shadow-[0_4px_20px_rgba(61,138,90,0.3)] active:scale-[0.98] transition-all"
          >
            우리의 여정 돌아보기
          </button>
        </div>
      </div>
    )
  }

  // Step 1: 여정 회고
  if (step === 1) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-page-bg)] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-[13px] text-[#6B6966] mb-2">임신 준비 여정</p>
          <h2 className="text-[22px] font-bold text-[#1A1918] mb-8">함께 걸어온 길</h2>

          <div className="w-full max-w-xs space-y-4">
            {/* 준비 기간 */}
            <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <p className="text-[15px] font-bold text-[var(--color-primary)] mb-2">D-day</p>
              <p className="text-[24px] font-bold text-[var(--color-primary)]">{journey.days}일</p>
              <p className="text-[13px] text-[#6B6966]">함께 준비한 날들</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 편지 */}
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <EnvelopeIcon className="w-6 h-6 mx-auto mb-1 text-[#6B6966]" />
                <p className="text-[20px] font-bold text-[#1A1918]">{journey.letters}</p>
                <p className="text-[13px] text-[#6B6966]">아이에게 보낸 편지</p>
              </div>

              {/* 검사 완료 */}
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <CheckCircleIcon className="w-6 h-6 mx-auto mb-1 text-[#6B6966]" />
                <p className="text-[20px] font-bold text-[#1A1918]">{journey.supplements}</p>
                <p className="text-[13px] text-[#6B6966]">완료한 검사</p>
              </div>

              {/* 체크리스트 */}
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <CheckCircleIcon className="w-6 h-6 mx-auto mb-1 text-[var(--color-primary)]" />
                <p className="text-[20px] font-bold text-[#1A1918]">{journey.checks}/8</p>
                <p className="text-[13px] text-[#6B6966]">준비 체크리스트</p>
              </div>

              {/* 성장 시각화 */}
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                <SproutIcon className="w-6 h-6 mx-auto mb-1 text-[var(--color-primary)]" />
                <p className="text-[13px] font-semibold text-[var(--color-primary)]">
                  {journey.letters >= 30 ? '큰 나무' : journey.letters >= 10 ? '푸른 잎' : '작은 새싹'}
                </p>
                <p className="text-[13px] text-[#6B6966]">사랑으로 자란 나무</p>
              </div>
            </div>

            {journey.letters > 0 && (
              <div className="bg-[#FFF8F3] rounded-2xl p-4 text-center">
                <p className="text-[14px] text-[#6B6966] mb-1">보낸 편지들은 소중히 보관돼요</p>
                <p className="text-[13px] text-[var(--color-primary)] font-semibold">아이가 태어나면 함께 읽어보세요</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            className="mt-8 px-8 py-3 bg-[var(--color-primary)] text-white text-[15px] font-semibold rounded-2xl active:scale-[0.98] transition-all"
          >
            새로운 여정 시작하기
          </button>
        </div>
      </div>
    )
  }

  // Step 2: 출산 예정일 설정 + 모드 전환
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
      <IllustVideo src="/images/illustrations/celebration-new-start.webm" className="w-48 h-48 mb-4" />

      <h2 className="text-[22px] font-bold text-[#1A1918] mb-1">새로운 시작</h2>
      <p className="text-[14px] text-[#6B6966] mb-8 text-center">
        이제 도담이 임신 여정을 함께할게요
      </p>

      <div className="w-full max-w-xs space-y-5">
        <div>
          <p className="text-[14px] font-semibold text-[#6B6966] mb-2">출산 예정일</p>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-12 rounded-xl border border-[#E8E4DF] px-4 text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <p className="text-[14px] text-[#9E9A95] mt-1">모르면 나중에 설정할 수 있어요</p>
        </div>

        <div className="bg-[#F0F9F4] rounded-xl p-4">
          <p className="text-[13px] font-semibold text-[var(--color-primary)] mb-2">앞으로 도담이 도와줄 것들</p>
          <div className="space-y-2">
            {[
              '주차별 태아 크기 · 발달 정보',
              '트리메스터별 체크리스트',
              '엄마 건강 관리 · AI 케어',
              '태교 일기 · 감정 기록',
              '가족과 함께 공유',
            ].map((text) => (
              <div key={text} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                <p className="text-[14px] text-[#1A1918]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleComplete}
        className="mt-8 w-full max-w-xs py-3.5 bg-[var(--color-primary)] text-white text-[15px] font-semibold rounded-2xl shadow-[0_4px_20px_rgba(61,138,90,0.3)] active:scale-[0.98] transition-all"
      >
        {dueDate ? '임신 여정 시작하기' : '나중에 설정할게요'}
      </button>
    </div>
  )
}
