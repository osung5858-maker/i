'use client'

import { useState, useEffect, useMemo } from 'react'
import { SparkleIcon, SproutIcon, UnlockIcon, LockIcon } from '@/components/ui/Icons'
import { fetchUserRecords } from '@/lib/supabase/userRecord'

// 연속 기록 스트릭 + AI 인사이트 잠금 해제
export default function StreakCard({ mode }: { mode: string }) {
  const [streak, setStreak] = useState(0)
  const [totalDays, setTotalDays] = useState(0)

  useEffect(() => {
    async function loadStreak() {
      try {
        const type = mode === 'parenting' ? 'health_records' : mode === 'pregnant' ? 'mood_history' : 'supplement'
        const rows = await fetchUserRecords([type])
        if (!rows.length) return

        // Get unique dates from DB records
        const dates = new Set(rows.map(r => r.record_date))
        const today = new Date()
        let consecutiveDays = 0
        let total = dates.size

        // Calculate streak
        for (let i = 0; i < 365; i++) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          const ds = d.toISOString().split('T')[0]
          if (dates.has(ds) || (i === 0)) {
            if (i === 0 && !dates.has(ds)) continue
            consecutiveDays++
          } else break
        }

        setStreak(consecutiveDays)
        setTotalDays(total)
      } catch { /* */ }
    }
    loadStreak()
  }, [mode])

  // AI 인사이트 잠금 상태
  const aiUnlocked = totalDays >= 3
  const nextUnlock = useMemo(() => {
    if (totalDays >= 14) return null // 모든 인사이트 해금
    if (totalDays >= 7) return { days: 14 - totalDays, label: '월간 AI 리포트', current: totalDays, target: 14 }
    if (totalDays >= 3) return { days: 7 - totalDays, label: '주간 AI 패턴 분석', current: totalDays, target: 7 }
    return { days: 3 - totalDays, label: 'AI 맞춤 조언', current: totalDays, target: 3 }
  }, [totalDays])

  if (streak === 0 && totalDays === 0) return null

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-3">
      <div className="flex items-center justify-between">
        {/* 스트릭 */}
        <div className="flex items-center gap-2">
          {streak >= 3 ? <SparkleIcon className="w-5 h-5 text-[var(--color-primary)]" /> : <SproutIcon className="w-5 h-5 text-[var(--color-primary)]" />}
          <div>
            <p className="text-body font-bold text-primary">
              {streak > 0 ? `${streak}일 연속 기록 중!` : '오늘 첫 기록을 남겨보세요'}
            </p>
            <p className="text-body-emphasis text-secondary">총 {totalDays}일 기록</p>
          </div>
        </div>

        {/* 스트릭 불꽃 */}
        {streak >= 3 && (
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
              <div key={i} className="w-1.5 h-4 rounded-full bg-[var(--color-primary)]" style={{ opacity: 0.4 + (i / 7) * 0.6 }} />
            ))}
          </div>
        )}
      </div>

      {/* AI 인사이트 잠금 해제 프로그레스 */}
      {nextUnlock && (
        <div className="mt-2 pt-2 border-t border-[#E8E4DF]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-body-emphasis text-secondary">
              <span className="inline-flex items-center gap-1">{aiUnlocked ? <UnlockIcon className="w-3.5 h-3.5 inline" /> : <LockIcon className="w-3.5 h-3.5 inline" />} {nextUnlock.label}</span>
            </p>
            <p className="text-body-emphasis text-[var(--color-primary)] font-semibold">{nextUnlock.days}일 남음</p>
          </div>
          <div className="w-full h-1.5 bg-[#E8E4DF] rounded-full">
            <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${(nextUnlock.current / nextUnlock.target) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
