'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EnvelopeIcon, CheckCircleIcon, SproutIcon } from '@/components/ui/Icons'
import IllustVideo from '@/components/ui/IllustVideo'
import { setSecure, getSecure } from '@/lib/secureStorage'
import { createClient } from '@/lib/supabase/client'
import { fetchUserRecords } from '@/lib/supabase/userRecord'
import { fetchPrepRecords } from '@/lib/supabase/prepRecord'
import Confetti from '@/components/ui/Confetti'

export default function CelebrationPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  // 기본값: 현재 날짜 + 9개월 (클라이언트에서만 계산)
  const [dueY, setDueY] = useState(2027)
  const [dueM, setDueM] = useState(1)
  const [dueD, setDueD] = useState(1)

  useEffect(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 9)
    setDueY(d.getFullYear())
    setDueM(d.getMonth() + 1)
    setDueD(d.getDate())
    setMounted(true)
  }, [])

  const dueDate = `${dueY}-${String(dueM).padStart(2, '0')}-${String(dueD).padStart(2, '0')}`

  // 준비 여정 데이터
  const [journey, setJourney] = useState({ letters: 0, days: 0, supplements: 0, checks: 0 })
  useEffect(() => {
    const loadJourney = async () => {
      const [letterRows, checkRows] = await Promise.all([
        fetchUserRecords(['letters']),
        fetchPrepRecords(['checklist']),
      ])
      const lastPeriod = await getSecure('dodam_last_period')
      const days = lastPeriod ? Math.max(1, Math.floor((Date.now() - new Date(lastPeriod).getTime()) / 86400000) + 1) : 0
      setJourney({ letters: letterRows.length, days, supplements: 0, checks: checkRows.length })
    }
    loadJourney().catch(() => {})
  }, [])

  const handleComplete = async () => {
    if (dueDate) {
      await setSecure('dodam_due_date', dueDate)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) supabase.from('user_profiles').upsert({ user_id: user.id, due_date: dueDate }).then(() => {})
    }
    localStorage.setItem('dodam_mode', 'pregnant')
    router.push('/pregnant')
  }

  // Step 0: 축하 + 여정 회고 통합
  if (step === 0) {
    return (
      <div className="h-[100dvh] bg-white flex flex-col relative overflow-hidden">
        {/* 축하 꽃가루 */}
        {mounted && <Confetti count={60} duration={5000} />}

        <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 py-5 overflow-hidden">
          <IllustVideo src="/images/illustrations/celebration-hero.webm" className="w-40 h-40 mx-auto mb-4" />

          <h1 className="text-heading-1 font-bold text-primary mb-1 text-center">
            축하해요!
          </h1>
          <p className="text-heading-3 text-[var(--color-primary)] font-semibold mb-2 text-center">
            새 생명이 찾아왔어요
          </p>
          <p className="text-body-emphasis text-secondary leading-relaxed max-w-[280px] mx-auto text-center">
            기다리고, 준비하고, 소망했던<br />
            그 작은 생명이 드디어 인사를 건넸어요
          </p>

          {/* 여정 통계 */}
          <div className="w-full max-w-xs mt-6 space-y-2.5">
            <p className="text-body text-secondary text-center">함께 걸어온 길</p>

            <div className="flex items-center justify-center gap-2">
              <span className="text-heading-1 text-[var(--color-primary)] font-bold">{journey.days}일</span>
              <span className="text-body-emphasis text-secondary">함께 준비한 날들</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[var(--color-primary-bg)] rounded-xl py-3 px-2 text-center">
                <EnvelopeIcon className="w-5 h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                <p className="text-heading-3 text-primary">{journey.letters}</p>
                <p className="text-xs text-secondary">편지</p>
              </div>
              <div className="bg-[var(--color-primary-bg)] rounded-xl py-3 px-2 text-center">
                <CheckCircleIcon className="w-5 h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                <p className="text-heading-3 text-primary">{journey.checks}/8</p>
                <p className="text-xs text-secondary">체크리스트</p>
              </div>
              <div className="bg-[var(--color-primary-bg)] rounded-xl py-3 px-2 text-center">
                <SproutIcon className="w-5 h-5 mx-auto mb-1 text-[var(--color-primary)]" />
                <p className="text-body font-semibold text-[var(--color-primary)]">
                  {journey.letters >= 30 ? '큰 나무' : journey.letters >= 10 ? '푸른 잎' : '작은 새싹'}
                </p>
                <p className="text-xs text-secondary">사랑의 나무</p>
              </div>
            </div>

            {journey.letters > 0 && (
              <p className="text-body text-[var(--color-primary)] font-semibold text-center">
                편지들은 아이가 태어나면 함께 읽어보세요
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 bg-white">
          <button
            onClick={() => setStep(1)}
            className="w-full py-3.5 bg-[var(--color-primary)] rounded-2xl shadow-[0_4px_20px_var(--color-fab-shadow)] active:scale-[0.98] transition-all"
            style={{ fontSize: 15, color: '#FFFFFF', fontWeight: 700 }}
          >
            새로운 여정 시작하기
          </button>
        </div>
      </div>
    )
  }

  // Step 1: 출산 예정일 설정 + 모드 전환
  return (
    <div className="h-[100dvh] bg-white flex flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col items-center px-6 py-8">
        <IllustVideo src="/images/illustrations/celebration-new-start.webm" className="w-48 h-48 mb-4" />

        <h2 className="text-heading-2 font-bold text-primary mb-1 text-center">새로운 시작</h2>
        <p className="text-body-emphasis text-secondary mb-8 text-center">
          이제 도담이 임신 여정을 함께할게요
        </p>

        <div className="w-full max-w-xs space-y-5">
          <div>
            <p className="text-body-emphasis text-secondary mb-2">출산 예정일</p>
            <div className="flex gap-2">
              <select
                value={dueY}
                onChange={(e) => setDueY(Number(e.target.value))}
                className="flex-1 h-12 rounded-xl border border-[#E8E4DF] px-3 bg-white focus:outline-none focus:border-[var(--color-primary)]"
                style={{ fontSize: 16 }}
              >
                {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                value={dueM}
                onChange={(e) => setDueM(Number(e.target.value))}
                className="flex-1 h-12 rounded-xl border border-[#E8E4DF] px-3 bg-white focus:outline-none focus:border-[var(--color-primary)]"
                style={{ fontSize: 16 }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
              <select
                value={dueD}
                onChange={(e) => setDueD(Number(e.target.value))}
                className="flex-1 h-12 rounded-xl border border-[#E8E4DF] px-3 bg-white focus:outline-none focus:border-[var(--color-primary)]"
                style={{ fontSize: 16 }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </div>
            <p className="text-body-emphasis text-tertiary mt-1">모르면 나중에 설정할 수 있어요</p>
          </div>

          <div className="bg-[#F0F9F4] rounded-xl p-4">
            <p className="text-body font-semibold text-[var(--color-primary)] mb-2">앞으로 도담이 도와줄 것들</p>
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
                  <p className="text-body-emphasis text-primary">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 bg-white">
        <button
          onClick={handleComplete}
          className="w-full py-3.5 bg-[var(--color-primary)] rounded-2xl shadow-[0_4px_20px_var(--color-fab-shadow)] active:scale-[0.98] transition-all"
          style={{ fontSize: 15, color: '#FFFFFF', fontWeight: 700 }}
        >
          임신 여정 시작하기
        </button>
      </div>
    </div>
  )
}
