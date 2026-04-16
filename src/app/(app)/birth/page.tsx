'use client'

import { useState, useEffect } from 'react'
import { getSecure } from '@/lib/secureStorage'
import { useRouter } from 'next/navigation'
import { shareBirth } from '@/lib/kakao/share-parenting'
import { fetchPregRecords } from '@/lib/supabase/pregRecord'
import { fetchUserRecords } from '@/lib/supabase/userRecord'
import IllustVideo from '@/components/ui/IllustVideo'
import { PregnantIcon, PenIcon, HospitalIcon, EnvelopeIcon, BottleIcon, ChartIcon, SyringeIcon, BowlIcon, MoonIcon, SproutIcon } from '@/components/ui/Icons'
import Confetti from '@/components/ui/Confetti'

export default function BirthPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  const [diaryCount, setDiaryCount] = useState(0)
  const [checkupCount, setCheckupCount] = useState(0)
  const [letterCount, setLetterCount] = useState(0)
  const [weekCount, setWeekCount] = useState(40)

  useEffect(() => {
    setMounted(true)

    const loadCounts = async () => {
      const [diaryRows, checkupRows, letterRows] = await Promise.all([
        fetchPregRecords(['diary']),
        fetchPregRecords(['checkup_status']),
        fetchUserRecords(['letters']),
      ])
      setDiaryCount(diaryRows.length)
      setCheckupCount(checkupRows.length)
      setLetterCount(letterRows.length)

      // 임신 주수 계산
      const dueDate = await getSecure('dodam_due_date')
      if (dueDate) {
        const due = new Date(dueDate)
        const now = new Date()
        const diffMs = due.getTime() - now.getTime()
        const weeksLeft = Math.max(0, Math.ceil(diffMs / (7 * 86400000)))
        setWeekCount(Math.max(1, 40 - weeksLeft))
      }
    }
    loadCounts().catch(() => {})

  }, [])

  const handleComplete = () => {
    localStorage.setItem('dodam_mode', 'parenting')
    router.push('/settings/children/add')
  }

  // Step 0: 축하 + 여정 회고 통합 (single scrollable page)
  if (step === 0) {
    return (
      <div className="h-[100dvh] bg-white flex flex-col relative overflow-hidden">
        {/* 축하 꽃가루 */}
        {mounted && <Confetti count={70} duration={6000} />}

        <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 py-5 overflow-y-auto overscroll-contain">
          <IllustVideo src="/images/illustrations/celebration-hero.webm" className="w-40 h-40 mx-auto mb-4" />

          <h1 className="text-heading-1 font-bold text-primary mb-1 text-center">축하해요!</h1>
          <p className="text-heading-3 text-[var(--color-primary)] font-semibold mb-2 text-center">
            우리 아이가 세상에 왔어요
          </p>
          <p className="text-body-emphasis text-secondary leading-relaxed max-w-[280px] mx-auto text-center">
            기다리고, 준비하고, 함께했던<br />
            그 모든 시간이 지금 이 순간을 위한 거였어요
          </p>

          {/* 여정 통계 */}
          <div className="w-full max-w-xs mt-6 space-y-2.5">
            <p className="text-body text-secondary text-center">함께 걸어온 길</p>

            <div className="flex items-center justify-center gap-2">
              <PregnantIcon className="w-6 h-6 text-[var(--color-primary)]" />
              <span className="text-heading-1 text-[var(--color-primary)] font-bold">{weekCount}주</span>
              <span className="text-body-emphasis text-secondary">함께한 임신 여정</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[var(--color-primary-bg)] rounded-xl py-3 px-2 text-center">
                <PenIcon className="w-5 h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                <p className="text-heading-3 text-primary">{diaryCount}</p>
                <p className="text-xs text-secondary">태교 일기</p>
              </div>
              <div className="bg-[var(--color-primary-bg)] rounded-xl py-3 px-2 text-center">
                <HospitalIcon className="w-5 h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                <p className="text-heading-3 text-primary">{checkupCount}</p>
                <p className="text-xs text-secondary">검진 완료</p>
              </div>
              <div className="bg-[var(--color-primary-bg)] rounded-xl py-3 px-2 text-center">
                <EnvelopeIcon className="w-5 h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                <p className="text-heading-3 text-primary">{letterCount}</p>
                <p className="text-xs text-secondary">편지</p>
              </div>
            </div>

            {letterCount > 0 && (
              <div className="bg-[#FFF8F3] rounded-2xl p-3 text-center">
                <SproutIcon className="w-5 h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                <p className="text-body text-[var(--color-primary)] font-semibold">
                  모든 기록은 소중히 보관돼요
                </p>
                <p className="text-body-emphasis text-secondary">아이가 자라면 함께 읽어보세요</p>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 bg-white">
          <button
            onClick={() => setStep(1)}
            className="w-full py-3.5 bg-[var(--color-primary)] rounded-2xl shadow-[0_4px_20px_var(--color-fab-shadow)] active:scale-[0.98] transition-all"
            style={{ fontSize: 15, color: '#FFFFFF', fontWeight: 700 }}
          >
            육아 여정 시작하기
          </button>
        </div>
      </div>
    )
  }

  // Step 1: 육아 소개 + 카톡 공유 + 시작
  return (
    <div className="h-[100dvh] bg-white flex flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col items-center px-6 py-8">
        <IllustVideo src="/images/illustrations/celebration-new-start.webm" className="w-48 h-48 mb-4" />

        <h2 className="text-heading-2 font-bold text-primary mb-1 text-center">새로운 시작</h2>
        <p className="text-body-emphasis text-secondary mb-8 text-center">
          이제 도담이 육아 여정을 함께할게요
        </p>

        <div className="w-full max-w-xs space-y-4">
          <div className="bg-[#F0F9F4] rounded-xl p-4">
            <p className="text-body font-semibold text-[var(--color-primary)] mb-2">도담이 도와줄 것들</p>
            {[
              { Icon: BottleIcon, text: '수유 · 수면 · 배변 기록' },
              { Icon: ChartIcon, text: 'AI 패턴 분석 · 예측' },
              { Icon: SyringeIcon, text: '예방접종 리마인더' },
              { Icon: BowlIcon, text: '이유식 AI 추천' },
              { Icon: MoonIcon, text: '자장가 · 동요 120곡+' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 py-0.5">
                <item.Icon className="w-4 h-4 text-[var(--color-primary)]" />
                <p className="text-body-emphasis text-primary">{item.text}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { shareBirth('우리 아이'); handleComplete() }}
            className="w-full py-3.5 bg-[var(--color-primary)] text-white rounded-2xl shadow-[0_4px_20px_rgba(61,138,90,0.3)] active:scale-[0.98]"
          >
            카톡으로 알리고 시작하기
          </button>
          <button onClick={handleComplete} className="w-full py-2.5 text-body text-secondary">
            조용히 시작할게요
          </button>
        </div>
      </div>
    </div>
  )
}
