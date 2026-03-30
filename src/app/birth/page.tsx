'use client'

import { useState, useEffect } from 'react'
import { getSecure } from '@/lib/secureStorage'
import { useRouter } from 'next/navigation'
import { shareBirth } from '@/lib/kakao/share-parenting'
import IllustVideo from '@/components/ui/IllustVideo'
import { PregnantIcon, PenIcon, HospitalIcon, EnvelopeIcon, BottleIcon, ChartIcon, SyringeIcon, BowlIcon, MoonIcon, RainbowIcon, BabyIcon } from '@/components/ui/Icons'

export default function BirthPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [showConfetti, setShowConfetti] = useState(true)

  const [dueDate, setDueDate] = useState('')
  const [diaryCount, setDiaryCount] = useState(0)
  const [checkupCount, setCheckupCount] = useState(0)
  const [letterCount, setLetterCount] = useState(0)

  useEffect(() => {
    getSecure('dodam_due_date').then(v => { if (v) setDueDate(v) })
    try { setDiaryCount(JSON.parse(localStorage.getItem('dodam_preg_diary') || '[]').length) } catch { /* */ }
    try { setCheckupCount(Object.values(JSON.parse(localStorage.getItem('dodam_preg_checkups') || '{}')).filter(Boolean).length) } catch { /* */ }
    try { setLetterCount(JSON.parse(localStorage.getItem('dodam_letters') || '[]').length) } catch { /* */ }

    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleComplete = () => {
    localStorage.setItem('dodam_mode', 'parenting')
    router.push('/settings/children/add')
  }

  // Step 0: 축하
  if (step === 0) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} className="absolute animate-bounce"
                style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, animationDuration: `${1.5 + Math.random() * 2}s`, fontSize: `${12 + Math.random() * 20}px`, opacity: 0.7 + Math.random() * 0.3 }}>
                {['*', '+', '·', ':', '*', '+', '·', ':', '+'][Math.floor(Math.random() * 9)]}
              </div>
            ))}
          </div>
        )}

        <div className="relative z-10 text-center">
          <div className="mb-6">
            <IllustVideo src="/images/illustrations/celebration-hero.webm" className="w-56 h-56 mx-auto" />
          </div>

          <h1 className="text-[28px] font-bold text-[#1A1918] mb-2">축하해요!</h1>
          <p className="text-[18px] text-[var(--color-primary)] font-semibold mb-4">우리 아이가 세상에 왔어요</p>
          <p className="text-[14px] text-[#6B6966] leading-relaxed max-w-[280px] mx-auto">
            기다리고, 준비하고, 함께했던<br />
            그 모든 시간이 지금 이 순간을 위한 거였어요
          </p>

          <div className="mt-8 p-4 bg-[#FFF8F3] rounded-2xl max-w-[260px] mx-auto">
            <p className="text-[13px] text-[#1A1918] italic leading-relaxed">
              "드디어 만났어요, 엄마 아빠.<br />
              준비해준 모든 것, 느끼고 있었어요.<br />
              이제 진짜 시작이에요!"
            </p>
            <p className="text-[13px] text-[#9E9A95] mt-2">— 아이가</p>
          </div>

          <button onClick={() => setStep(1)}
            className="mt-10 px-8 py-3 bg-[var(--color-primary)] text-white text-[15px] font-semibold rounded-2xl shadow-[0_4px_20px_rgba(61,138,90,0.3)] active:scale-[0.98] transition-all">
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
          <p className="text-[13px] text-[#6B6966] mb-2">임신 여정</p>
          <h2 className="text-[22px] font-bold text-[#1A1918] mb-8">함께 걸어온 길</h2>

          <div className="w-full max-w-xs space-y-4">
            <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <PregnantIcon className="w-8 h-8 mx-auto mb-2 text-[var(--color-primary)]" />
              <p className="text-[24px] font-bold text-[var(--color-primary)]">40주</p>
              <p className="text-[13px] text-[#6B6966]">함께한 임신 여정</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <PenIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
                <p className="text-[18px] font-bold text-[#1A1918]">{diaryCount}</p>
                <p className="text-[14px] text-[#6B6966]">태교 일기</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <HospitalIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
                <p className="text-[18px] font-bold text-[#1A1918]">{checkupCount}</p>
                <p className="text-[14px] text-[#6B6966]">검진 완료</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <EnvelopeIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
                <p className="text-[18px] font-bold text-[#1A1918]">{letterCount}</p>
                <p className="text-[14px] text-[#6B6966]">편지</p>
              </div>
            </div>

            <div className="bg-[#FFF8F3] rounded-2xl p-4 text-center">
              <p className="text-[14px] text-[#6B6966] mb-1">모든 기록은 소중히 보관돼요</p>
              <p className="text-[13px] text-[var(--color-primary)] font-semibold">아이가 자라면 함께 읽어보세요</p>
            </div>
          </div>

          <button onClick={() => setStep(2)}
            className="mt-8 px-8 py-3 bg-[var(--color-primary)] text-white text-[15px] font-semibold rounded-2xl active:scale-[0.98] transition-all">
            육아 시작하기
          </button>
        </div>
      </div>
    )
  }

  // Step 2: 아기 정보 + 카톡 공유
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
      <IllustVideo src="/images/illustrations/celebration-new-start.webm" className="w-48 h-48 mb-4" />

      <h2 className="text-[22px] font-bold text-[#1A1918] mb-1">새로운 시작</h2>
      <p className="text-[14px] text-[#6B6966] mb-8 text-center">
        이제 도담이 육아 여정을 함께할게요
      </p>

      <div className="w-full max-w-xs space-y-4">
        <div className="bg-[#F0F9F4] rounded-xl p-4">
          <p className="text-[13px] font-semibold text-[var(--color-primary)] mb-2">도담이 도와줄 것들</p>
          {[
            { Icon: BottleIcon, text: '수유 · 수면 · 배변 기록' },
            { Icon: ChartIcon, text: 'AI 패턴 분석 · 예측' },
            { Icon: SyringeIcon, text: '예방접종 리마인더' },
            { Icon: BowlIcon, text: '이유식 AI 추천' },
            { Icon: MoonIcon, text: '자장가 · 동요 120곡+' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 py-0.5">
              <item.Icon className="w-4 h-4 text-[var(--color-primary)]" />
              <p className="text-[14px] text-[#1A1918]">{item.text}</p>
            </div>
          ))}
        </div>

        <button onClick={() => { shareBirth('우리 아이'); handleComplete() }}
          className="w-full py-3.5 bg-[var(--color-primary)] text-white text-[15px] font-semibold rounded-2xl shadow-[0_4px_20px_rgba(61,138,90,0.3)] active:scale-[0.98]">
          카톡으로 알리고 시작하기
        </button>
        <button onClick={handleComplete} className="w-full py-2.5 text-[13px] text-[#6B6966]">
          조용히 시작할게요
        </button>
      </div>
    </div>
  )
}
