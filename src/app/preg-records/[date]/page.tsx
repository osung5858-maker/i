'use client'

import { useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ChevronRightIcon, PillIcon, VitaminIcon, WalkIcon, StretchIcon,
  ActivityIcon, DropletIcon, ChartIcon,
  MoodHappyIcon, MoodCalmIcon, MoodAnxiousIcon, MoodSickIcon, MoodTiredIcon,
} from '@/components/ui/Icons'

function formatDateKr(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

function getDateOffset(dateStr: string, offset: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + offset)
  const n = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return n.toISOString().split('T')[0]
}

type IconFC = React.FC<{ className?: string }>

const MOOD_CONFIG: Record<string, { label: string; Icon: IconFC; bg: string; color: string }> = {
  happy:   { label: '행복', Icon: MoodHappyIcon,   bg: '#FFE8F4', color: '#FF8FAB' },
  calm:    { label: '평온', Icon: MoodCalmIcon,    bg: '#E8F5EF', color: '#90C8A8' },
  anxious: { label: '불안', Icon: MoodAnxiousIcon, bg: '#FFF3E0', color: '#FFC078' },
  sick:    { label: '입덧', Icon: MoodSickIcon,    bg: '#EDE9FF', color: '#B8A0D4' },
  tired:   { label: '피곤', Icon: MoodTiredIcon,   bg: '#E8F0F8', color: '#8EB4D4' },
}

const EDEMA_LABEL: Record<string, string> = { none: '없음', mild: '약함', severe: '심함' }
const SUPPL_LABEL: Record<string, string> = { folic: '엽산', iron: '철분', dha: 'DHA', calcium: '칼슘', multi: '종합', etc: '기타' }

function getEventCfg(ev: any): { cat: string; label: string; Icon: IconFC; bg: string; color: string } {
  const t: string = ev.type || ''
  const tags = ev.data?.tags || {}

  if (t === 'preg_mood') {
    const m = MOOD_CONFIG[tags.mood]
    return m ? { cat: '기분', label: m.label, Icon: m.Icon, bg: m.bg, color: m.color }
             : { cat: '기분', label: '', Icon: MoodHappyIcon, bg: '#FFE8F4', color: '#FF8FAB' }
  }
  if (t === 'preg_fetal_move') return { cat: '태동', label: '+1', Icon: ActivityIcon, bg: '#E8F5EF', color: '#5BA882' }
  if (t === 'preg_weight') return { cat: '체중', label: `${tags.kg ?? ''}kg`, Icon: ChartIcon, bg: '#FCE4DC', color: '#D08068' }
  if (t === 'preg_edema') return { cat: '부종', label: EDEMA_LABEL[tags.level] || '', Icon: DropletIcon, bg: '#FFF3E0', color: '#F59E0B' }
  if (t === 'preg_water') return { cat: '수분', label: '물 마시기', Icon: DropletIcon, bg: '#E6EFFF', color: '#3B82F6' }
  if (t === 'preg_walk') return { cat: '운동', label: '걷기', Icon: WalkIcon, bg: '#E8F5EF', color: '#10B981' }
  if (t === 'preg_suppl') {
    const sub = SUPPL_LABEL[tags.subtype] || tags.subtype || ''
    return { cat: '영양제', label: sub, Icon: PillIcon, bg: '#FEF3C7', color: '#D97706' }
  }
  if (t === 'preg_stretch') return { cat: '운동', label: '스트레칭', Icon: StretchIcon, bg: '#EDE9FF', color: '#8B5CF6' }
  return { cat: t, label: '', Icon: ActivityIcon, bg: '#F0EDE8', color: '#6B6966' }
}

export default function PregRecordDetailPage() {
  const params = useParams()
  const dateStr = params.date as string
  const router = useRouter()

  const _now = new Date()
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
  const isToday = dateStr === today
  const prevDate = getDateOffset(dateStr, -1)
  const nextDate = getDateOffset(dateStr, 1)
  const canGoNext = nextDate <= today

  const events = useMemo<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(`dodam_preg_events_${dateStr}`) || '[]') } catch { return [] }
  }, [dateStr])

  const moodKey = useMemo(() => localStorage.getItem(`dodam_preg_mood_${dateStr}`) || '', [dateStr])

  const health = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
      return all[dateStr] || {}
    } catch { return {} }
  }, [dateStr])

  const hasData = events.length > 0 || moodKey || Object.keys(health).length > 0
  const moodCfg = moodKey ? MOOD_CONFIG[moodKey] : null

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F1EC] overflow-hidden">
      {/* 헤더 — 고정 */}
      <div className="shrink-0 h-12 px-5 max-w-lg mx-auto w-full flex items-center justify-between bg-[#F5F1EC] border-b border-[#E0DDD8]">
        <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">뒤로</button>
        <h1 className="text-[15px] font-bold text-[#0A0B0D]">기록 상세</h1>
        <div className="w-8" />
      </div>

      {/* 날짜 네비게이션 — 고정 */}
      <div className="shrink-0 max-w-lg mx-auto w-full">
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
      </div>

      {/* 스크롤 바디 */}
      <div className="flex-1 overflow-y-auto overscroll-contain max-w-lg mx-auto w-full pb-4">
        {/* 요약 — 4칸 고정 균등 분배 */}
        <div className="mx-4 mb-3 grid grid-cols-4 gap-2">
          {[
            {
              label: '기분',
              value: moodCfg ? moodCfg.label : '-',
              bg: moodCfg ? moodCfg.color + '20' : '#F5F5F5',
              border: moodCfg ? moodCfg.color + '40' : '#E8E4DF',
              labelColor: moodCfg ? moodCfg.color : '#C4C0BB',
              valueColor: moodCfg ? moodCfg.color : '#C4C0BB',
            },
            {
              label: '체중',
              value: health.weight > 0 ? `${health.weight}kg` : '-',
              bg: '#FCE4DC',
              border: '#F0CABB',
              labelColor: '#D08068',
              valueColor: health.weight > 0 ? '#B06040' : '#C4C0BB',
            },
            {
              label: '태동',
              value: health.fetalMove > 0 ? `${health.fetalMove}회` : '-',
              bg: '#E8F5EF',
              border: '#C8E8D8',
              labelColor: '#5BA882',
              valueColor: health.fetalMove > 0 ? '#3D8A66' : '#C4C0BB',
            },
            {
              label: '물 섭취',
              value: health.water > 0 ? `${health.water}잔` : '-',
              bg: '#E6EFFF',
              border: '#C8D8F8',
              labelColor: '#3B82F6',
              valueColor: health.water > 0 ? '#2563EB' : '#C4C0BB',
            },
          ].map((c) => (
            <div
              key={c.label}
              className="py-2.5 rounded-xl border text-center"
              style={{ backgroundColor: c.bg, borderColor: c.border }}
            >
              <p className="text-[12px] font-medium" style={{ color: c.labelColor }}>{c.label}</p>
              <p className="text-[13px] font-bold mt-0.5" style={{ color: c.valueColor }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* 기록 목록 */}
        <div className="mx-4 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#9E9A95]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 8v4l3 3" strokeLinecap="round" /><circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-[#212124]">이 날의 기록이 없어요</p>
            </div>
          ) : (
            <div className="flex flex-col px-4 gap-2 pb-4 pt-2">
              {/* FAB 이벤트 목록 */}
              {events.map((ev: any, i: number) => {
                const cfg = getEventCfg(ev)
                const { Icon, bg, color, cat, label } = cfg
                return (
                  <div key={ev.id || i} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-[#1A1918] truncate">
                        {label ? (
                          <>
                            <span className="text-[#9E9A95] font-normal mr-1">{cat}</span>
                            <span className="font-semibold">{label}</span>
                          </>
                        ) : (
                          <span className="font-semibold">{cat}</span>
                        )}
                      </p>
                      <p className="text-[13px] text-[#6B6966]">{ev.timeStr || ''}</p>
                    </div>
                  </div>
                )
              })}

              {/* 건강 수치 (health 객체) — 이벤트에 없을 때만 표시 */}
              {health.weight > 0 && !events.find((e: any) => e.type === 'preg_weight') && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FCE4DC', color: '#D08068' }}>
                    <ChartIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#1A1918]">
                      <span className="text-[#9E9A95] font-normal mr-1">체중</span>
                      <span className="font-semibold">{health.weight}kg</span>
                    </p>
                    <p className="text-[13px] text-[#6B6966]">체중 기록</p>
                  </div>
                </div>
              )}
              {health.fetalMove > 0 && !events.find((e: any) => e.type === 'preg_fetal_move') && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#E8F5EF', color: '#5BA882' }}>
                    <ActivityIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#1A1918]">
                      <span className="text-[#9E9A95] font-normal mr-1">태동</span>
                      <span className="font-semibold">{health.fetalMove}회</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
