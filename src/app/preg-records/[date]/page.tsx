'use client'

import { useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronRightIcon } from '@/components/ui/Icons'

function formatDateKr(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

function getDateOffset(dateStr: string, offset: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

const MOOD_LABEL: Record<string, string> = { happy: '행복', calm: '평온', anxious: '불안', sick: '입덧', tired: '피곤' }
const MOOD_COLOR: Record<string, string> = { happy: '#FF8FAB', calm: '#90C8A8', anxious: '#FFC078', sick: '#B8A0D4', tired: '#8EB4D4' }

const EVENT_LABEL: Record<string, string> = {
  preg_water: '물 마시기', preg_walk: '걷기', preg_suppl: '영양제',
  preg_stretch: '스트레칭', preg_fetal_move: '태동',
  preg_weight: '체중', preg_edema: '부종',
}
const EVENT_COLOR: Record<string, string> = {
  preg_water: '#3B82F6', preg_walk: '#10B981', preg_suppl: '#F59E0B',
  preg_stretch: '#8B5CF6', preg_fetal_move: '#5BA882',
  preg_weight: '#D08068', preg_edema: '#4A90D9',
}

export default function PregRecordDetailPage() {
  const params = useParams()
  const dateStr = params.date as string
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]
  const isToday = dateStr === today
  const prevDate = getDateOffset(dateStr, -1)
  const nextDate = getDateOffset(dateStr, 1)
  const canGoNext = nextDate <= today

  const events = useMemo<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(`dodam_preg_events_${dateStr}`) || '[]') } catch { return [] }
  }, [dateStr])

  const mood = useMemo(() => localStorage.getItem(`dodam_preg_mood_${dateStr}`) || '', [dateStr])

  const health = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
      return all[dateStr] || {}
    } catch { return {} }
  }, [dateStr])

  const hasData = events.length > 0 || mood || Object.keys(health).length > 0

  return (
    <div className="min-h-[100dvh] bg-[#F5F1EC]">
      {/* 헤더 */}
      <div className="pt-4 pb-2 px-5 max-w-lg mx-auto w-full flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">뒤로</button>
        <h1 className="text-[15px] font-bold text-[#0A0B0D]">기록 상세</h1>
        <div className="w-8" />
      </div>

      <div className="max-w-lg mx-auto w-full pb-24">
        {/* 날짜 네비게이션 */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push(`/preg-records/${prevDate}`)}
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B] rotate-180" />
          </button>
          <p className="text-sm font-semibold text-[#0A0B0D]">
            {formatDateKr(dateStr)}
            {isToday && <span className="text-[var(--color-primary)] ml-1">오늘</span>}
          </p>
          <button
            onClick={() => canGoNext && router.push(`/preg-records/${nextDate}`)}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
          >
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
          </button>
        </div>

        {/* 요약 칩 */}
        {hasData && (
          <div className="mx-4 mb-3 flex gap-2 overflow-x-auto hide-scrollbar">
            {mood && (
              <div className="shrink-0 px-3 py-2 rounded-xl border" style={{ backgroundColor: MOOD_COLOR[mood] + '20', borderColor: MOOD_COLOR[mood] + '40' }}>
                <p className="text-[12px] font-medium" style={{ color: MOOD_COLOR[mood] }}>기분</p>
                <p className="text-sm font-bold" style={{ color: MOOD_COLOR[mood] }}>{MOOD_LABEL[mood] || mood}</p>
              </div>
            )}
            {health.weight > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-[#FCE4DC] border border-[#F0CABB]">
                <p className="text-[12px] text-[#D08068] font-medium">체중</p>
                <p className="text-sm font-bold text-[#B06040]">{health.weight}kg</p>
              </div>
            )}
            {health.fetalMove > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-[#E8F5EF] border border-[#C8E8D8]">
                <p className="text-[12px] text-[#5BA882] font-medium">태동</p>
                <p className="text-sm font-bold text-[#3D8A66]">{health.fetalMove}회</p>
              </div>
            )}
            {health.water > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-[#E6EFFF] border border-[#C8D8F8]">
                <p className="text-[12px] text-[#3B82F6] font-medium">물 섭취</p>
                <p className="text-sm font-bold text-[#2563EB]">{health.water}잔</p>
              </div>
            )}
            {events.length > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-[#F0EDE8] border border-[#E0DDD8]">
                <p className="text-[12px] text-[#6B6966] font-medium">기록</p>
                <p className="text-sm font-bold text-[#1A1918]">{events.length}건</p>
              </div>
            )}
          </div>
        )}

        {/* 기록 목록 */}
        <div className="mx-4 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          {!hasData ? (
            <div className="py-16 text-center">
              <p className="text-[14px] text-[#9E9A95]">이 날의 기록이 없어요</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {events.map((ev: any, i: number) => (
                <div key={ev.id || i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[12px] text-[#9E9A95] w-11 shrink-0 font-mono">{ev.timeStr || '--:--'}</span>
                  <span
                    className="text-[13px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      color: EVENT_COLOR[ev.type] || '#6B6966',
                      backgroundColor: (EVENT_COLOR[ev.type] || '#6B6966') + '18',
                    }}
                  >
                    {EVENT_LABEL[ev.type] || ev.type}
                  </span>
                  {ev.data?.amount && (
                    <span className="text-[12px] text-[#9E9A95]">{ev.data.amount}</span>
                  )}
                </div>
              ))}
              {/* 건강 수치 행 */}
              {health.weight > 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[12px] text-[#9E9A95] w-11 shrink-0 font-mono">-</span>
                  <span className="text-[13px] font-semibold px-2.5 py-1 rounded-full" style={{ color: '#D08068', backgroundColor: '#D0806818' }}>체중 기록</span>
                  <span className="text-[12px] text-[#9E9A95]">{health.weight}kg</span>
                </div>
              )}
              {health.fetalMove > 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[12px] text-[#9E9A95] w-11 shrink-0 font-mono">-</span>
                  <span className="text-[13px] font-semibold px-2.5 py-1 rounded-full" style={{ color: '#5BA882', backgroundColor: '#5BA88218' }}>태동</span>
                  <span className="text-[12px] text-[#9E9A95]">{health.fetalMove}회</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
