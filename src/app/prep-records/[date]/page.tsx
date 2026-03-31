'use client'

import { useMemo } from 'react'
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

const MOOD_LABEL: Record<string, string> = { happy: '행복', calm: '평온', anxious: '불안', tired: '피곤', sad: '슬픔' }
const MOOD_COLOR: Record<string, string> = { happy: '#FF8FAB', calm: '#90C8A8', anxious: '#FFC078', tired: '#8EB4D4', sad: '#A0A8C0' }

const PREP_LABEL: Record<string, string> = {
  prep_folic: '엽산', prep_vitd: '비타민D', prep_iron: '철분', prep_omega3: '오메가3',
  prep_walk: '걷기', prep_stretch: '스트레칭', prep_breath: '심호흡', prep_meditate: '명상', prep_music: '음악감상',
}
const PREP_COLOR: Record<string, string> = {
  prep_folic: '#10B981', prep_vitd: '#10B981', prep_iron: '#10B981', prep_omega3: '#10B981',
  prep_walk: '#F59E0B', prep_stretch: '#F59E0B', prep_breath: '#3B82F6', prep_meditate: '#8B5CF6', prep_music: '#F472B6',
}
const SUPPL_LABEL: Record<string, string> = { folic: '엽산', vitd: '비타민D', iron: '철분', omega3: '오메가3' }

export default function PrepRecordDetailPage() {
  const params = useParams()
  const dateStr = params.date as string
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]
  const isToday = dateStr === today
  const prevDate = getDateOffset(dateStr, -1)
  const nextDate = getDateOffset(dateStr, 1)
  const canGoNext = nextDate <= today

  const done = useMemo<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`dodam_prep_done_${dateStr}`) || '[]') } catch { return [] }
  }, [dateStr])

  const mood = useMemo(() => localStorage.getItem(`dodam_mood_${dateStr}`) || '', [dateStr])

  const suppl = useMemo<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(`dodam_suppl_${dateStr}`) || '{}') } catch { return {} }
  }, [dateStr])

  const journal = useMemo(() => {
    try {
      const raw = localStorage.getItem(`dodam_prep_journal_${dateStr}`)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : null
    } catch { return null }
  }, [dateStr])

  const supplTaken = Object.entries(suppl).filter(([, v]) => v > 0)
  const hasData = done.length > 0 || mood || supplTaken.length > 0 || journal

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
            onClick={() => router.push(`/prep-records/${prevDate}`)}
            className="w-9 h-9 rounded-xl bg-white border border-[#E8E4DF] flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B] rotate-180" />
          </button>
          <p className="text-sm font-semibold text-[#0A0B0D]">
            {formatDateKr(dateStr)}
            {isToday && <span className="text-[var(--color-primary)] ml-1">오늘</span>}
          </p>
          <button
            onClick={() => canGoNext && router.push(`/prep-records/${nextDate}`)}
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
            {done.length > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-[#E8F5EF] border border-[#C8E8D8]">
                <p className="text-[12px] text-[#5BA882] font-medium">완료</p>
                <p className="text-sm font-bold text-[#3D8A66]">{done.length}건</p>
              </div>
            )}
            {supplTaken.length > 0 && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-[#FEF3C7] border border-[#F0D48C]">
                <p className="text-[12px] text-[#D97706] font-medium">영양제</p>
                <p className="text-sm font-bold text-[#B45309]">{supplTaken.length}종</p>
              </div>
            )}
            {journal && (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-[#EDE9FE] border border-[#D4C8F8]">
                <p className="text-[12px] text-[#7C3AED] font-medium">감사일기</p>
                <p className="text-sm font-bold text-[#5B21B6]">{journal.length}개</p>
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
              {/* 완료 활동 */}
              {done.map((key, i) => (
                <div key={key + i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[12px] text-[#9E9A95] w-11 shrink-0 font-mono">-</span>
                  <span
                    className="text-[13px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      color: PREP_COLOR[key] || '#6B6966',
                      backgroundColor: (PREP_COLOR[key] || '#6B6966') + '18',
                    }}
                  >
                    {PREP_LABEL[key] || key}
                  </span>
                  <span className="text-[12px] text-[#9E9A95]">완료</span>
                </div>
              ))}
              {/* 영양제 */}
              {supplTaken.map(([key, val]) => (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[12px] text-[#9E9A95] w-11 shrink-0 font-mono">-</span>
                  <span className="text-[13px] font-semibold px-2.5 py-1 rounded-full text-[#D97706] bg-[#D9770618]">
                    {SUPPL_LABEL[key] || key}
                  </span>
                  <span className="text-[12px] text-[#9E9A95]">{val}정</span>
                </div>
              ))}
              {/* 감사일기 */}
              {journal && journal.map((text: string, i: number) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[12px] text-[#9E9A95] w-11 shrink-0 font-mono mt-0.5">-</span>
                    <div>
                      <span className="text-[13px] font-semibold px-2.5 py-1 rounded-full text-[#7C3AED] bg-[#7C3AED18] mb-1.5 inline-block">감사일기 {i + 1}</span>
                      <p className="text-[13px] text-[#4A4744] leading-relaxed mt-1">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
