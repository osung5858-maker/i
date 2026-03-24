'use client'

import { useState, useMemo } from 'react'
import type { CareEvent } from '@/types'

interface Props {
  events: CareEvent[]
  childName: string
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${year}년 ${month}월 ${day}일 ${weekday}요일`
}

function generateAIDiary(events: CareEvent[], childName: string): string {
  if (events.length === 0) return ''

  const feedCount = events.filter((e) => e.type === 'feed').length
  const totalMl = events.filter((e) => e.type === 'feed' && e.amount_ml).reduce((a, e) => a + (e.amount_ml || 0), 0)
  const sleepEvents = events.filter((e) => e.type === 'sleep' && e.end_ts)
  const totalSleepMin = sleepEvents.reduce((a, e) => {
    const diff = (new Date(e.end_ts!).getTime() - new Date(e.start_ts).getTime()) / 60000
    return a + (diff > 0 && diff < 1440 ? diff : 0)
  }, 0)
  const sleepH = Math.floor(totalSleepMin / 60)
  const sleepM = Math.round(totalSleepMin % 60)
  const poopCount = events.filter((e) => e.type === 'poop').length
  const peeCount = events.filter((e) => e.type === 'pee').length

  const parts: string[] = []
  parts.push(`${childName}이는 오늘`)

  const stats: string[] = []
  if (feedCount > 0) stats.push(`수유 ${feedCount}회${totalMl > 0 ? `(총 ${totalMl}ml)` : ''}`)
  if (sleepH > 0 || sleepM > 0) stats.push(`수면 ${sleepH > 0 ? `${sleepH}시간` : ''}${sleepM > 0 ? ` ${sleepM}분` : ''}`)
  if (poopCount > 0) stats.push(`배변 ${poopCount}회`)

  if (stats.length > 0) {
    parts.push(stats.join(', '))
  }

  if (events.length >= 5) {
    parts.push('으로 바쁜 하루를 보냈어요.')
  } else if (events.length >= 3) {
    parts.push('으로 규칙적인 하루를 보냈어요.')
  } else {
    parts.push('의 기록이 있어요.')
  }

  // 마일스톤
  const milestones: string[] = []
  if (feedCount >= 6) milestones.push('하루 수유 6회 이상!')
  if (totalSleepMin >= 720) milestones.push('12시간 이상 수면!')
  if (sleepEvents.some((e) => {
    const h = new Date(e.start_ts).getHours()
    const diff = (new Date(e.end_ts!).getTime() - new Date(e.start_ts).getTime()) / 3600000
    return h >= 20 && diff >= 6
  })) {
    milestones.push('통잠 성공! 🎉')
  }

  let result = parts.join(' ')
  if (milestones.length > 0) {
    result += ` ${milestones.join(' ')}`
  }

  return result
}

export default function DiaryView({ events, childName }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [memo, setMemo] = useState('')
  const [editingMemo, setEditingMemo] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])

  // 날짜별 메모 + 사진 localStorage 저장/복원
  const dateKey = selectedDate.toISOString().split('T')[0]
  const loadDayData = (date: string) => {
    const saved = localStorage.getItem(`dodam_diary_${date}`)
    if (saved) {
      try {
        const d = JSON.parse(saved)
        setMemo(d.memo || '')
        setPhotos(d.photos || [])
      } catch { setMemo(''); setPhotos([]) }
    } else { setMemo(''); setPhotos([]) }
  }
  const saveDayData = (m: string, p: string[]) => {
    localStorage.setItem(`dodam_diary_${dateKey}`, JSON.stringify({ memo: m, photos: p }))
  }

  // 사진 추가 (파일 → base64)
  const handleAddPhoto = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'; input.multiple = true
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files) return
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = () => {
          setPhotos(prev => {
            const updated = [...prev, reader.result as string].slice(0, 10)
            saveDayData(memo, updated)
            return updated
          })
        }
        reader.readAsDataURL(file)
      })
    }
    input.click()
  }

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      saveDayData(memo, updated)
      return updated
    })
  }

  const dateStr = selectedDate.toISOString().split('T')[0]
  const dayEvents = useMemo(
    () => events.filter((e) => e.start_ts.startsWith(dateStr)),
    [events, dateStr]
  )

  const aiDiary = useMemo(
    () => generateAIDiary(dayEvents, childName),
    [dayEvents, childName]
  )

  const navigateDay = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    if (d <= new Date()) {
      setSelectedDate(d)
      loadDayData(d.toISOString().split('T')[0])
    }
  }

  // 초기 로드
  useState(() => { loadDayData(dateKey) })

  // 오늘의 감정 태그 (기록 기반 자동 생성)
  const emotionTags = useMemo(() => {
    const tags: string[] = []
    if (dayEvents.filter((e) => e.type === 'feed').length >= 4) tags.push('🍼 잘 먹은 날')
    const sleepMin = dayEvents.filter((e) => e.type === 'sleep' && e.end_ts).reduce((a, e) => {
      return a + (new Date(e.end_ts!).getTime() - new Date(e.start_ts).getTime()) / 60000
    }, 0)
    if (sleepMin >= 600) tags.push('😴 푹 잔 날')
    if (dayEvents.length >= 8) tags.push('📝 기록 많은 날')
    if (dayEvents.some((e) => e.type === 'temp' && Number(e.tags?.celsius) >= 37.5)) tags.push('🌡️ 컨디션 주의')
    return tags
  }, [dayEvents])

  return (
    <div className="space-y-4 px-5 pb-8">
      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-between pt-3">
        <button onClick={() => navigateDay(-1)} className="p-2 text-[#868B94] active:opacity-50">
          ←
        </button>
        <p className="text-[14px] font-semibold text-[#212124]">{formatDate(selectedDate)}</p>
        <button
          onClick={() => navigateDay(1)}
          className={`p-2 active:opacity-50 ${dateStr >= new Date().toISOString().split('T')[0] ? 'text-[#ECECEC]' : 'text-[#868B94]'}`}
          disabled={dateStr >= new Date().toISOString().split('T')[0]}
        >
          →
        </button>
      </div>

      {/* 사진 영역 */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {photos.map((src, i) => (
          <div key={i} className="relative shrink-0 w-24 h-24">
            <img src={src} alt="" className="w-full h-full object-cover rounded-xl" />
            <button onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
              <span className="text-white text-[10px]">✕</span>
            </button>
          </div>
        ))}
        {photos.length < 10 && (
          <button onClick={handleAddPhoto} className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-[#ECECEC] flex flex-col items-center justify-center gap-1 active:bg-[#F7F8FA]">
            <span className="text-xl text-[#AEB1B9]">📷</span>
            <span className="text-[10px] text-[#AEB1B9]">사진 추가</span>
          </button>
        )}
      </div>

      {/* 감정 태그 */}
      {emotionTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {emotionTags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-[#F0F9F4] text-[11px] font-medium text-[#3D8A5A]">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 메모 */}
      <div className="bg-white rounded-2xl border border-[#f0f0f0] p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-[#868B94]">메모</h3>
          <button onClick={() => {
            if (editingMemo) saveDayData(memo, photos)
            setEditingMemo(!editingMemo)
          }} className="text-[11px] text-[#3D8A5A] font-semibold">
            {editingMemo ? '저장' : '✏️ 편집'}
          </button>
        </div>
        {editingMemo ? (
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘 하루를 기록해보세요..."
            className="w-full h-20 text-[13px] text-[#212124] bg-[#F7F8FA] rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#3D8A5A]"
            maxLength={500}
          />
        ) : (
          <p className="text-[13px] text-[#868B94]">
            {memo || '오늘 하루를 기록해보세요...'}
          </p>
        )}
      </div>

      {/* AI 자동일기 */}
      {aiDiary && (
        <div className="bg-white rounded-2xl border-l-4 border-l-[#3D8A5A] border border-[#f0f0f0] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">🤖</span>
            <span className="text-[11px] font-bold text-[#3D8A5A]">AI 오늘의 요약</span>
          </div>
          <p className="text-[13px] text-[#212124] leading-relaxed">{aiDiary}</p>
        </div>
      )}

      {/* 오늘 기록 요약 */}
      {dayEvents.length > 0 ? (
        <div className="bg-white rounded-2xl border border-[#f0f0f0] p-4">
          <h3 className="text-[13px] font-semibold text-[#868B94] mb-3">오늘의 기록 ({dayEvents.length}건)</h3>
          <div className="space-y-2">
            {dayEvents.slice(0, 5).map((e) => {
              const time = new Date(e.start_ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
              const labels: Record<string, string> = { feed: '🍼 수유', sleep: '💤 수면', poop: '💩 대변', pee: '💧 소변', temp: '🌡️ 체온', memo: '📝 메모' }
              return (
                <div key={e.id} className="flex items-center gap-2 text-[12px]">
                  <span className="text-[#AEB1B9] w-10 shrink-0">{time}</span>
                  <span className="text-[#212124]">{labels[e.type] || e.type}</span>
                  {e.amount_ml && <span className="text-[#868B94]">{e.amount_ml}ml</span>}
                </div>
              )
            })}
            {dayEvents.length > 5 && (
              <p className="text-[11px] text-[#AEB1B9] text-center">+ {dayEvents.length - 5}건 더</p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-[28px] mb-2">📝</p>
          <p className="text-[13px] text-[#AEB1B9]">이 날은 기록이 없어요</p>
        </div>
      )}
    </div>
  )
}
