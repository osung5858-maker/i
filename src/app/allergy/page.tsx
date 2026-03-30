'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'

// --- Types ---
interface DayLog {
  symptoms: string[]
  notes: string
}

interface AllergyEntry {
  id: string
  food: string
  startDate: string // YYYY-MM-DD
  day1: DayLog
  day2: DayLog
  day3: DayLog
  result: 'safe' | 'reaction' | 'pending'
}

// --- Constants ---
const STORAGE_KEY = 'dodam_allergy_tracker'

const COMMON_FOODS = [
  '달걀', '우유', '밀', '대두', '땅콩', '견과류',
  '새우', '게', '조개', '생선', '복숭아', '토마토',
  '키위', '메밀', '돼지고기', '소고기', '닭고기',
]

const SYMPTOM_OPTIONS = ['발진', '두드러기', '구토', '설사', '부기', '호흡곤란', '없음']

// --- Helpers ---
function load(): AllergyEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function save(data: AllergyEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function daysSince(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86400000)
}

function autoResult(entry: AllergyEntry): 'safe' | 'reaction' | 'pending' {
  const days = daysSince(entry.startDate)
  if (days < 3) return 'pending'
  const allSymptoms = [
    ...entry.day1.symptoms,
    ...entry.day2.symptoms,
    ...entry.day3.symptoms,
  ].filter(s => s !== '없음')
  return allSymptoms.length > 0 ? 'reaction' : 'safe'
}

function currentDayIndex(startDate: string): number {
  return Math.min(daysSince(startDate), 2) // 0, 1, 2
}

// --- Component ---
export default function AllergyPage() {
  const [entries, setEntries] = useState<AllergyEntry[]>([])
  const [showSheet, setShowSheet] = useState(false)
  const [customFood, setCustomFood] = useState('')
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editingDay, setEditingDay] = useState<number | null>(null)

  useEffect(() => {
    const loaded = load()
    // auto-update results
    const updated = loaded.map(e => ({ ...e, result: autoResult(e) }))
    setEntries(updated)
    save(updated)
  }, [])

  const updateEntries = useCallback((next: AllergyEntry[]) => {
    setEntries(next)
    save(next)
  }, [])

  const addFood = (food: string) => {
    if (!food.trim()) return
    const entry: AllergyEntry = {
      id: Date.now().toString(36),
      food: food.trim(),
      startDate: new Date().toISOString().split('T')[0],
      day1: { symptoms: [], notes: '' },
      day2: { symptoms: [], notes: '' },
      day3: { symptoms: [], notes: '' },
      result: 'pending',
    }
    updateEntries([entry, ...entries])
    setShowSheet(false)
    setCustomFood('')
  }

  const toggleSymptom = (entryId: string, day: number, symptom: string) => {
    const next = entries.map(e => {
      if (e.id !== entryId) return e
      const dayKey = `day${day + 1}` as 'day1' | 'day2' | 'day3'
      const dayLog = { ...e[dayKey] }

      if (symptom === '없음') {
        dayLog.symptoms = ['없음']
      } else {
        const filtered = dayLog.symptoms.filter(s => s !== '없음')
        if (filtered.includes(symptom)) {
          dayLog.symptoms = filtered.filter(s => s !== symptom)
        } else {
          dayLog.symptoms = [...filtered, symptom]
        }
      }

      const updated = { ...e, [dayKey]: dayLog }
      updated.result = autoResult(updated)
      return updated
    })
    updateEntries(next)
  }

  const updateNotes = (entryId: string, day: number, notes: string) => {
    const next = entries.map(e => {
      if (e.id !== entryId) return e
      const dayKey = `day${day + 1}` as 'day1' | 'day2' | 'day3'
      return { ...e, [dayKey]: { ...e[dayKey], notes } }
    })
    updateEntries(next)
  }

  const deleteEntry = (entryId: string) => {
    updateEntries(entries.filter(e => e.id !== entryId))
  }

  const active = entries.filter(e => e.result === 'pending')
  const completed = entries.filter(e => e.result !== 'pending')
  const safeCount = completed.filter(e => e.result === 'safe').length
  const reactionCount = completed.filter(e => e.result === 'reaction').length

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="알레르기 트래커" showBack />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-4">
        {/* Summary */}
        {completed.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 flex items-center justify-around">
            <div className="text-center">
              <p className="text-[20px] font-bold text-[var(--color-primary)]">{safeCount}</p>
              <p className="text-[12px] text-[#6B6966]">안전 식재료</p>
            </div>
            <div className="w-px h-8 bg-[#E8E4DF]" />
            <div className="text-center">
              <p className="text-[20px] font-bold text-[#D05050]">{reactionCount}</p>
              <p className="text-[12px] text-[#6B6966]">주의 식재료</p>
            </div>
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => setShowSheet(true)}
          className="w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-xl text-[14px] active:opacity-80 transition-opacity"
        >
          + 새 식재료 시작
        </button>

        {/* Active tracking */}
        {active.length > 0 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-[#1A1918]">관찰 중 ({active.length})</p>
            {active.map(entry => {
              const curDay = currentDayIndex(entry.startDate)
              const isEditing = editingEntry === entry.id

              return (
                <div key={entry.id} className="bg-white rounded-xl border border-[var(--color-primary)] border-opacity-30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-bold text-[#1A1918]">{entry.food}</p>
                      <p className="text-[12px] text-[#9E9A95]">{entry.startDate} 시작</p>
                    </div>
                    <button onClick={() => deleteEntry(entry.id)} className="text-[12px] text-[#9E9A95] px-2 py-1">삭제</button>
                  </div>

                  {/* Day circles */}
                  <div className="flex gap-2">
                    {[0, 1, 2].map(d => {
                      const dayKey = `day${d + 1}` as 'day1' | 'day2' | 'day3'
                      const dayLog = entry[dayKey]
                      const hasSymptoms = dayLog.symptoms.length > 0 && !dayLog.symptoms.every(s => s === '없음')
                      const noSymptoms = dayLog.symptoms.includes('없음')
                      const isToday = d === curDay
                      const isPast = d < curDay
                      const isFuture = d > curDay

                      return (
                        <button
                          key={d}
                          onClick={() => {
                            if (!isFuture) {
                              setEditingEntry(isEditing && editingDay === d ? null : entry.id)
                              setEditingDay(d)
                            }
                          }}
                          className={`flex-1 py-2.5 rounded-lg border text-center transition-all ${
                            isToday
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
                              : isFuture
                                ? 'border-[#E8E4DF] bg-[#F5F3F0] opacity-50'
                                : 'border-[#E8E4DF] bg-white'
                          }`}
                          disabled={isFuture}
                        >
                          <p className={`text-[12px] font-semibold ${isToday ? 'text-[var(--color-primary)]' : 'text-[#6B6966]'}`}>
                            Day {d + 1}
                          </p>
                          <p className="text-[14px] mt-0.5">
                            {hasSymptoms ? '🔴' : noSymptoms ? '🟢' : isPast ? '⚪' : isToday ? '📝' : '—'}
                          </p>
                        </button>
                      )
                    })}
                  </div>

                  {/* Symptom editor */}
                  {isEditing && editingDay !== null && (
                    <div className="bg-[var(--color-page-bg)] rounded-lg p-3 space-y-2">
                      <p className="text-[13px] font-semibold text-[#1A1918]">Day {editingDay + 1} 증상 기록</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SYMPTOM_OPTIONS.map(s => {
                          const dayKey = `day${editingDay + 1}` as 'day1' | 'day2' | 'day3'
                          const selected = entry[dayKey].symptoms.includes(s)
                          return (
                            <button
                              key={s}
                              onClick={() => toggleSymptom(entry.id, editingDay, s)}
                              className={`px-2.5 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                                selected
                                  ? s === '없음'
                                    ? 'bg-[#E8F5E9] border-[#4CAF50] text-[#2E7D32]'
                                    : 'bg-[#FDE8E8] border-[#D05050] text-[#D05050]'
                                  : 'bg-white border-[#E8E4DF] text-[#6B6966]'
                              }`}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>
                      <input
                        type="text"
                        placeholder="메모 (선택)"
                        value={entry[`day${editingDay + 1}` as 'day1' | 'day2' | 'day3'].notes}
                        onChange={(e) => updateNotes(entry.id, editingDay, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4DF] rounded-lg text-[13px] text-[#1A1918] placeholder:text-[#9E9A95]"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#1A1918]">완료 ({completed.length})</p>
            <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
              {completed.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-[#E8E4DF]' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${entry.result === 'safe' ? 'bg-[#4CAF50]' : 'bg-[#D05050]'}`} />
                    <div>
                      <p className="text-[14px] font-medium text-[#1A1918]">{entry.food}</p>
                      <p className="text-[11px] text-[#9E9A95]">{entry.startDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-semibold ${entry.result === 'safe' ? 'text-[#4CAF50]' : 'text-[#D05050]'}`}>
                      {entry.result === 'safe' ? '안전' : '반응'}
                    </span>
                    <button onClick={() => deleteEntry(entry.id)} className="text-[11px] text-[#9E9A95]">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[40px] mb-3">🥕</p>
            <p className="text-[14px] text-[#6B6966]">새 식재료를 추가하고</p>
            <p className="text-[14px] text-[#6B6966]">3일간 알레르기 반응을 관찰해보세요</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-[#FFF8E1] rounded-xl p-3 space-y-1">
          <p className="text-[13px] font-semibold text-[#8D6E00]">이유식 알레르기 관찰 팁</p>
          <p className="text-[12px] text-[#8D6E00] leading-relaxed">
            새 식재료는 한 번에 한 가지씩, 3일간 관찰 후 다음 식재료를 시도하세요.
            증상이 나타나면 해당 식재료를 중단하고 소아과에 상담하세요.
          </p>
        </div>
      </div>

      {/* Bottom sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => { setShowSheet(false); setCustomFood('') }}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-[430px] bg-white rounded-t-2xl p-5 pb-8 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#E8E4DF] rounded-full mx-auto mb-4" />
            <p className="text-[16px] font-bold text-[#1A1918] mb-4">식재료 선택</p>

            {/* Common allergens grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {COMMON_FOODS.map(food => (
                <button
                  key={food}
                  onClick={() => addFood(food)}
                  className="py-2.5 px-1 bg-[var(--color-page-bg)] rounded-lg text-[13px] font-medium text-[#1A1918] active:bg-[var(--color-primary-bg)] transition-colors border border-[#E8E4DF]"
                >
                  {food}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customFood}
                onChange={e => setCustomFood(e.target.value)}
                placeholder="기타 식재료 직접 입력"
                className="flex-1 px-3 py-2.5 border border-[#E8E4DF] rounded-lg text-[14px] text-[#1A1918] placeholder:text-[#9E9A95]"
                onKeyDown={e => { if (e.key === 'Enter') addFood(customFood) }}
              />
              <button
                onClick={() => addFood(customFood)}
                className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-[14px] font-semibold"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
