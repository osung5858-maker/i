'use client'

import { useState, useEffect, useMemo } from 'react'

// 연속 기록 스트릭 + AI 인사이트 잠금 해제
export default function StreakCard({ mode }: { mode: string }) {
  const [streak, setStreak] = useState(0)
  const [totalDays, setTotalDays] = useState(0)

  useEffect(() => {
    // 모드별 기록 키
    const storageKey = mode === 'preparing' ? 'dodam_suppl_' : mode === 'pregnant' ? 'dodam_preg_mood_' : 'dodam_health_records'

    let consecutiveDays = 0
    let total = 0
    const today = new Date()

    if (mode === 'parenting') {
      // 육아 모드: health_records에서 날짜 키 체크
      try {
        const records = JSON.parse(localStorage.getItem('dodam_health_records') || '{}')
        for (let i = 0; i < 365; i++) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          const ds = d.toISOString().split('T')[0]
          if (records[ds]) total++
        }
        // 연속일 계산
        for (let i = 0; i < 365; i++) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          const ds = d.toISOString().split('T')[0]
          if (records[ds] || (i === 0)) { // 오늘은 아직 기록 안 했을 수 있으니 건너뜀
            if (i === 0 && !records[ds]) continue
            consecutiveDays++
          } else break
        }
      } catch { /* */ }
    } else {
      // 준비/임신 모드: 날짜별 localStorage 키 체크
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        const key = `${storageKey}${ds}`
        if (localStorage.getItem(key)) total++
      }
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        const key = `${storageKey}${ds}`
        if (localStorage.getItem(key) || (i === 0)) {
          if (i === 0 && !localStorage.getItem(key)) continue
          consecutiveDays++
        } else break
      }
    }

    setStreak(consecutiveDays)
    setTotalDays(total)
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
          <span className="text-lg">{streak >= 7 ? '🔥' : streak >= 3 ? '✨' : '🌱'}</span>
          <div>
            <p className="text-[13px] font-bold text-[#1A1918]">
              {streak > 0 ? `${streak}일 연속 기록 중!` : '오늘 첫 기록을 남겨보세요'}
            </p>
            <p className="text-[14px] text-[#6B6966]">총 {totalDays}일 기록</p>
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
            <p className="text-[14px] text-[#6B6966]">
              {aiUnlocked ? '🔓' : '🔒'} {nextUnlock.label}
            </p>
            <p className="text-[14px] text-[var(--color-primary)] font-semibold">{nextUnlock.days}일 남음</p>
          </div>
          <div className="w-full h-1.5 bg-[#E8E4DF] rounded-full">
            <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${(nextUnlock.current / nextUnlock.target) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
