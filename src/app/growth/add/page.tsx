'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddGrowthPage() {
  const [childId, setChildId] = useState<string | null>(null)
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().split('T')[0])
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [headCm, setHeadCm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }

      const { data: children } = await supabase
        .from('children')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (children && children.length > 0) setChildId(children[0].id)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!childId) return
    if (!weightKg && !heightCm && !headCm) {
      setError('하나 이상의 값을 입력해주세요.')
      return
    }

    // 비현실적 수치 체크
    if (weightKg && (Number(weightKg) < 1 || Number(weightKg) > 30)) {
      setError('몸무게를 확인해주세요 (1~30kg)')
      return
    }
    if (heightCm && (Number(heightCm) < 30 || Number(heightCm) > 130)) {
      setError('키를 확인해주세요 (30~130cm)')
      return
    }
    if (headCm && (Number(headCm) < 20 || Number(headCm) > 60)) {
      setError('머리둘레를 확인해주세요 (20~60cm)')
      return
    }

    setLoading(true)
    setError(null)

    const { error: insertError } = await supabase.from('growth_records').insert({
      child_id: childId,
      measured_at: measuredAt,
      weight_kg: weightKg ? Number(weightKg) : null,
      height_cm: heightCm ? Number(heightCm) : null,
      head_cm: headCm ? Number(headCm) : null,
    })

    if (insertError) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    router.push('/growth')
  }

  const hasValue = weightKg || heightCm || headCm

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#0A0B0D] flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">취소</button>
          <h1 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">성장 기록 추가</h1>
          <div className="w-8" />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-6 pt-6 max-w-lg mx-auto w-full">
        {/* 측정일 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#6B6B6B] dark:text-[#9B9B9B] mb-2 uppercase tracking-wide">
            측정일
          </label>
          <input
            type="date"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] text-[15px] text-[#0A0B0D] dark:text-white focus:outline-none focus:border-[#FF6F0F] focus:ring-1 focus:ring-[#FF6F0F] transition-colors"
          />
        </div>

        {/* 몸무게 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#6B6B6B] dark:text-[#9B9B9B] mb-2 uppercase tracking-wide">
            몸무게 (kg)
          </label>
          <input
            type="number"
            step="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="예: 9.8"
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] text-[15px] text-[#0A0B0D] dark:text-white placeholder-[#c0c0c0] focus:outline-none focus:border-[#FF6F0F] focus:ring-1 focus:ring-[#FF6F0F] transition-colors"
          />
        </div>

        {/* 키 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#6B6B6B] dark:text-[#9B9B9B] mb-2 uppercase tracking-wide">
            키 (cm)
          </label>
          <input
            type="number"
            step="0.1"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="예: 76.5"
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] text-[15px] text-[#0A0B0D] dark:text-white placeholder-[#c0c0c0] focus:outline-none focus:border-[#FF6F0F] focus:ring-1 focus:ring-[#FF6F0F] transition-colors"
          />
        </div>

        {/* 머리둘레 */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-[#6B6B6B] dark:text-[#9B9B9B] mb-2 uppercase tracking-wide">
            머리둘레 (cm)
          </label>
          <input
            type="number"
            step="0.1"
            value={headCm}
            onChange={(e) => setHeadCm(e.target.value)}
            placeholder="예: 46.0"
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] text-[15px] text-[#0A0B0D] dark:text-white placeholder-[#c0c0c0] focus:outline-none focus:border-[#FF6F0F] focus:ring-1 focus:ring-[#FF6F0F] transition-colors"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950 text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="flex-1" />

        <div className="pb-10 pt-4">
          <button
            type="submit"
            disabled={loading || !hasValue}
            className="w-full h-[52px] rounded-xl font-semibold text-[15px] transition-all active:scale-[0.98] disabled:opacity-40 bg-[#FF6F0F] text-white shadow-[0_4px_12px_rgba(0,82,255,0.3)]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              '기록 저장'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
