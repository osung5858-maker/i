'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageLayout'
import { createClient } from '@/lib/supabase/client'
import type { Child } from '@/types'

interface GrowthResult {
  targetAge: string
  physical: {
    height: string
    weight: string
    changes: string[]
  }
  milestones: string[]
  funFacts: string[]
  parentTip: string
}

const TARGET_OPTIONS = [
  { label: '6개월 후', months: 6 },
  { label: '1년 후', months: 12 },
  { label: '3년 후', months: 36 },
]

function getAgeMonths(birthdate: string): number {
  const birth = new Date(birthdate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

export default function GrowthSimPage() {
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [result, setResult] = useState<GrowthResult | null>(null)
  const [error, setError] = useState('')
  const [currentAge, setCurrentAge] = useState(3)
  const [selectedTarget, setSelectedTarget] = useState(6)
  const [motherHeight, setMotherHeight] = useState(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('dodam_mother_height')) || 0
    return 0
  })
  const [fatherHeight, setFatherHeight] = useState(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('dodam_father_height')) || 0
    return 0
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }

      const { data: children } = await supabase
        .from('children').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1)

      if (children && children.length > 0) {
        const c = children[0] as Child
        setChild(c)
        const months = getAgeMonths(c.birthdate)
        if (months >= 0) setCurrentAge(months)
      }
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function predict() {
    setPredicting(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/ai-growth-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentAgeMonths: currentAge,
          childName: child?.name || '',
          targetMonths: selectedTarget,
          sex: child?.sex || '',
          motherHeight: motherHeight || undefined,
          fatherHeight: fatherHeight || undefined,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: '예측에 실패했어요' }))
        setError(d.error || '예측에 실패했어요')
        setPredicting(false)
        return
      }

      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch {
      setError('예측 중 오류가 발생했어요')
    }
    setPredicting(false)
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-page-bg)] flex flex-col">
        <PageHeader title="성장 예측" showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const futureAge = currentAge + selectedTarget
  const futureLabel = futureAge >= 12
    ? `${Math.floor(futureAge / 12)}년 ${futureAge % 12 ? futureAge % 12 + '개월' : ''}`
    : `${futureAge}개월`

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="성장 예측" showBack />
      <div className="flex-1 max-w-lg mx-auto w-full px-5 pb-28 space-y-5">

        {/* Intro + Form */}
        {!result && !predicting && (
          <div className="pt-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="text-5xl">🌱</div>
              <h2 className="text-[18px] font-bold text-[#1A1918]">
                AI가 알려주는 우리 아이 미래
              </h2>
              <p className="text-[14px] text-[#6B6966] leading-relaxed">
                현재 월령과 예측 시점을 선택하면<br />발달 변화를 예측해드려요
              </p>
            </div>

            {/* Current Age */}
            <div className="bg-white rounded-xl border border-[#D5D0CA] p-5 space-y-3">
              <label className="text-[14px] font-semibold text-[#1A1918]">현재 월령</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentAge(Math.max(0, currentAge - 1))}
                  className="w-10 h-10 rounded-xl border border-[#D5D0CA] flex items-center justify-center text-[18px] text-[#6B6966] active:bg-[#F0EDE8]"
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  <span className="text-[28px] font-bold text-[#1A1918]">{currentAge}</span>
                  <span className="text-[14px] text-[#6B6966] ml-1">개월</span>
                </div>
                <button
                  onClick={() => setCurrentAge(Math.min(72, currentAge + 1))}
                  className="w-10 h-10 rounded-xl border border-[#D5D0CA] flex items-center justify-center text-[18px] text-[#6B6966] active:bg-[#F0EDE8]"
                >
                  +
                </button>
              </div>
              {child && (
                <p className="text-[12px] text-[#9E9A95] text-center">
                  {child.name}의 생년월일 기준으로 자동 설정됨
                </p>
              )}
            </div>

            {/* Target Selection */}
            <div className="bg-white rounded-xl border border-[#D5D0CA] p-5 space-y-3">
              <label className="text-[14px] font-semibold text-[#1A1918]">예측 시점</label>
              <div className="grid grid-cols-3 gap-2">
                {TARGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.months}
                    onClick={() => setSelectedTarget(opt.months)}
                    className={`py-3 rounded-xl text-[14px] font-semibold transition-colors ${
                      selectedTarget === opt.months
                        ? 'text-white'
                        : 'bg-[#F0EDE8] text-[#6B6966] active:bg-[#E8E4DF]'
                    }`}
                    style={selectedTarget === opt.months ? { backgroundColor: 'var(--color-primary)' } : undefined}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[13px] text-[#9E9A95] text-center">
                {futureLabel} 때의 모습을 예측해요
              </p>
            </div>

            {/* Parent Heights (optional) */}
            <div className="bg-white rounded-xl border border-[#D5D0CA] p-5 space-y-3">
              <label className="text-[14px] font-semibold text-[#1A1918]">부모 키 (선택)</label>
              <p className="text-[12px] text-[#9E9A95]">입력하면 유전적 예상 최종 키도 계산해요</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[12px] text-[#6B6966] mb-1">엄마 키</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={motherHeight || ''}
                      onChange={e => { const v = Number(e.target.value); setMotherHeight(v); localStorage.setItem('dodam_mother_height', String(v)) }}
                      placeholder="162"
                      className="w-full h-10 px-3 rounded-lg border border-[#E8E4DF] text-[14px] text-center focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <span className="text-[13px] text-[#9E9A95] shrink-0">cm</span>
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-[#6B6966] mb-1">아빠 키</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={fatherHeight || ''}
                      onChange={e => { const v = Number(e.target.value); setFatherHeight(v); localStorage.setItem('dodam_father_height', String(v)) }}
                      placeholder="175"
                      className="w-full h-10 px-3 rounded-lg border border-[#E8E4DF] text-[14px] text-center focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <span className="text-[13px] text-[#9E9A95] shrink-0">cm</span>
                  </div>
                </div>
              </div>
              {motherHeight > 0 && fatherHeight > 0 && (
                <div className="bg-[var(--color-primary-bg)] rounded-lg p-3 text-center">
                  <p className="text-[12px] text-[#6B6966]">유전적 예상 최종 키</p>
                  <p className="text-[16px] font-bold text-[var(--color-primary)]">
                    {child?.sex === 'female'
                      ? `약 ${Math.round((motherHeight + fatherHeight - 13) / 2)}cm`
                      : `약 ${Math.round((motherHeight + fatherHeight + 13) / 2)}cm`
                    }
                  </p>
                  <p className="text-[11px] text-[#9E9A95] mt-0.5">CMH 공식 기반 (±5cm 오차 가능)</p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-[#FFF5F5] border border-[#FFCCC7] rounded-xl p-4 text-[13px] text-[#D05050]">
                {error}
              </div>
            )}

            <button
              onClick={predict}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-[15px]"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              예측하기
            </button>
          </div>
        )}

        {/* Predicting */}
        {predicting && (
          <div className="pt-16 text-center space-y-4">
            <div className="text-5xl animate-bounce">🔮</div>
            <p className="text-[15px] font-semibold text-[#1A1918]">성장을 예측하고 있어요...</p>
            <p className="text-[13px] text-[#6B6966]">WHO 성장 기준 데이터를 분석 중</p>
            <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Header Card */}
            <div className="pt-4">
              <div className="rounded-2xl p-6 text-center space-y-2" style={{ backgroundColor: 'var(--color-primary-bg)' }}>
                <div className="text-4xl">🌱</div>
                <h2 className="text-[18px] font-bold text-[#1A1918]">
                  {selectedTarget <= 6 ? `${selectedTarget}개월 후` : selectedTarget <= 12 ? '1년 후' : '3년 후'} ({result.targetAge})
                </h2>
                {child?.name && (
                  <p className="text-[14px] text-[#6B6966]">{child.name}의 예측 성장 모습</p>
                )}
              </div>
            </div>

            {/* Physical Changes */}
            <div className="bg-white rounded-xl border border-[#D5D0CA] p-5 space-y-4">
              <h3 className="text-[15px] font-bold text-[#1A1918]">📏 신체 변화</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F0EDE8] rounded-xl p-3 text-center">
                  <p className="text-[12px] text-[#6B6966]">키</p>
                  <p className="text-[16px] font-bold text-[#1A1918]">{result.physical.height}</p>
                </div>
                <div className="bg-[#F0EDE8] rounded-xl p-3 text-center">
                  <p className="text-[12px] text-[#6B6966]">몸무게</p>
                  <p className="text-[16px] font-bold text-[#1A1918]">{result.physical.weight}</p>
                </div>
              </div>
              {result.physical.changes && result.physical.changes.length > 0 && (
                <div className="space-y-2">
                  {result.physical.changes.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[var(--color-primary)] mt-0.5 shrink-0">·</span>
                      <p className="text-[14px] text-[#4A4845]">{c}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Milestones */}
            <div className="bg-white rounded-xl border border-[#D5D0CA] p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-[#1A1918]">🎯 발달 마일스톤</h3>
              <div className="space-y-2">
                {result.milestones.map((m, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="bg-[var(--color-primary-bg)] text-[var(--color-primary)] text-[12px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[14px] text-[#4A4845]">{m}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fun Facts */}
            <div className="bg-[#FFF8F0] rounded-xl p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-[#1A1918]">✨ 재미있는 사실</h3>
              <div className="space-y-2">
                {result.funFacts.map((f, i) => (
                  <p key={i} className="text-[13px] text-[#8B7355]">· {f}</p>
                ))}
              </div>
            </div>

            {/* Parent Tip */}
            <div className="bg-[var(--color-primary-bg)] rounded-xl p-4">
              <p className="text-[13px] text-[var(--color-primary)] font-semibold">💡 육아 팁</p>
              <p className="text-[14px] text-[#4A4845] mt-1">{result.parentTip}</p>
            </div>

            {/* Retry */}
            <button
              onClick={() => { setResult(null) }}
              className="w-full py-3 rounded-xl font-semibold text-[var(--color-primary)] border-2 border-[var(--color-primary)] text-[15px]"
            >
              다시 예측하기
            </button>
          </>
        )}
      </div>
    </div>
  )
}
