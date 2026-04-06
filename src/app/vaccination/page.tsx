'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRemoteContent } from '@/lib/useRemoteContent'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageLayout'
import { SyringeIcon } from '@/components/ui/Icons'
import { shareVaccination } from '@/lib/kakao/share-parenting'
import { fetchUserRecords, upsertUserRecord } from '@/lib/supabase/userRecord'
import { getSecure } from '@/lib/secureStorage'

// --- Vaccine Schedule ---
const DEFAULT_SCHEDULE = [
  { month: 0, id: 'bcg', name: 'BCG (결핵)', desc: '생후 4주 이내', required: true, detail: '부작용: 접종 부위 궤양·딱지 (정상 반응, 2~3개월 소요) | 지연: 생후 4주 이내 권장, 이후에도 접종 가능' },
  { month: 0, id: 'hepb_1', name: 'B형간염 1차', desc: '출생 시', required: true, detail: '부작용: 접종 부위 통증, 미열 | 지연: 출생 후 가능한 빨리 (24시간 이내 권장)' },
  { month: 1, id: 'hepb_2', name: 'B형간염 2차', desc: '생후 1개월', required: true, detail: '부작용: 접종 부위 통증, 미열 | 지연: 1차 접종 후 최소 4주 간격' },
  { month: 2, id: 'dtap_1', name: 'DTaP 1차', desc: '디프테리아·파상풍·백일해', required: true, detail: '부작용: 발열, 접종 부위 붓기·발적, 보챔 | 지연: 최소 생후 6주부터 접종 가능' },
  { month: 2, id: 'ipv_1', name: 'IPV 1차', desc: '폴리오', required: true, detail: '부작용: 접종 부위 통증·발적 (경미) | 지연: 최소 생후 6주부터 접종 가능' },
  { month: 2, id: 'hib_1', name: 'Hib 1차', desc: 'b형 헤모필루스 인플루엔자', required: true, detail: '부작용: 접종 부위 발적·부종, 미열 | 지연: 최소 생후 6주부터 접종 가능' },
  { month: 2, id: 'pcv_1', name: 'PCV 1차', desc: '폐렴구균', required: true, detail: '부작용: 발열, 접종 부위 통증, 보챔, 식욕 감소 | 지연: 최소 생후 6주부터 접종 가능' },
  { month: 2, id: 'rv_1', name: '로타바이러스 1차', desc: '경구 투여', required: false, detail: '부작용: 보챔, 구토, 설사 (경미) | 지연: 생후 15주 이전 1차 접종 권장, 이후 시작 불가' },
  { month: 4, id: 'dtap_2', name: 'DTaP 2차', desc: '생후 4개월', required: true, detail: '부작용: 발열, 접종 부위 붓기 (1차보다 반응 클 수 있음) | 지연: 1차 후 최소 4주 간격' },
  { month: 4, id: 'ipv_2', name: 'IPV 2차', desc: '생후 4개월', required: true, detail: '부작용: 접종 부위 통증·발적 | 지연: 1차 후 최소 4주 간격' },
  { month: 4, id: 'hib_2', name: 'Hib 2차', desc: '생후 4개월', required: true, detail: '부작용: 접종 부위 발적 | 지연: 1차 후 최소 4주 간격' },
  { month: 4, id: 'pcv_2', name: 'PCV 2차', desc: '생후 4개월', required: true, detail: '부작용: 발열, 접종 부위 통증 | 지연: 1차 후 최소 4주 간격' },
  { month: 4, id: 'rv_2', name: '로타바이러스 2차', desc: '경구 투여', required: false, detail: '부작용: 보챔, 경미한 설사 | 지연: 1차 후 최소 4주 간격, 생후 8개월 이전 완료' },
  { month: 6, id: 'dtap_3', name: 'DTaP 3차', desc: '생후 6개월', required: true, detail: '부작용: 발열, 접종 부위 붓기·경결 | 지연: 2차 후 최소 4주 간격' },
  { month: 6, id: 'ipv_3', name: 'IPV 3차', desc: '생후 6개월', required: true, detail: '부작용: 접종 부위 통증 (경미) | 지연: 2차 후 최소 4주 간격, 6~18개월 사이 권장' },
  { month: 6, id: 'hepb_3', name: 'B형간염 3차', desc: '생후 6개월', required: true, detail: '부작용: 접종 부위 통증, 미열 | 지연: 1차 후 최소 16주, 2차 후 최소 8주 간격' },
  { month: 6, id: 'hib_3', name: 'Hib 3차', desc: '생후 6개월 (제품에 따라)', required: true, detail: '부작용: 접종 부위 발적 (경미) | 지연: 제품에 따라 3차 불필요할 수 있음' },
  { month: 6, id: 'pcv_3', name: 'PCV 3차', desc: '생후 6개월 (제품에 따라)', required: true, detail: '부작용: 발열, 보챔 | 지연: 제품에 따라 3차 불필요할 수 있음' },
  { month: 6, id: 'flu', name: '인플루엔자', desc: '매년 접종 (6개월~)', required: true, detail: '부작용: 접종 부위 통증, 미열, 근육통 | 지연: 매년 유행 전(9~10월) 접종 권장' },
  { month: 12, id: 'mmr_1', name: 'MMR 1차', desc: '홍역·유행성이하선염·풍진', required: true, detail: '부작용: 접종 후 7~10일 발열·발진 가능 | 지연: 생후 12개월 이후 가능한 빨리' },
  { month: 12, id: 'var_1', name: '수두 1차', desc: '생후 12~15개월', required: true, detail: '부작용: 접종 부위 발적, 미열, 드물게 수두 유사 발진 | 지연: 12개월 이후 가능한 빨리' },
  { month: 12, id: 'hepa_1', name: 'A형간염 1차', desc: '생후 12~23개월', required: true, detail: '부작용: 접종 부위 통증, 두통, 피로감 | 지연: 12개월 이후 언제든 시작 가능' },
  { month: 12, id: 'hib_4', name: 'Hib 추가', desc: '생후 12~15개월', required: true, detail: '부작용: 접종 부위 발적 (경미) | 지연: 3차 후 최소 2개월 간격' },
  { month: 12, id: 'pcv_4', name: 'PCV 추가', desc: '생후 12~15개월', required: true, detail: '부작용: 발열, 접종 부위 통증 | 지연: 3차 후 최소 2개월 간격' },
  { month: 15, id: 'dtap_4', name: 'DTaP 4차', desc: '생후 15~18개월', required: true, detail: '부작용: 발열, 접종 부위 붓기·통증 (이전 차수보다 클 수 있음) | 지연: 3차 후 최소 6개월 간격' },
  { month: 18, id: 'hepa_2', name: 'A형간염 2차', desc: '1차 접종 후 6개월 이상', required: true, detail: '부작용: 접종 부위 통증 (경미) | 지연: 1차 후 6~18개월 간격 권장' },
  { month: 24, id: 'je_1', name: '일본뇌염 1차', desc: '사백신 기준', required: true, detail: '부작용: 접종 부위 통증, 발열, 두통 | 지연: 만 12개월 이후 시작 가능' },
  { month: 24, id: 'je_2', name: '일본뇌염 2차', desc: '1차 후 7~30일', required: true, detail: '부작용: 접종 부위 통증 | 지연: 1차 후 7~30일 간격 권장' },
  { month: 36, id: 'je_3', name: '일본뇌염 3차', desc: '2차 접종 후 12개월', required: true, detail: '부작용: 접종 부위 통증 (경미) | 지연: 2차 후 12개월 간격 권장' },
  { month: 48, id: 'dtap_5', name: 'DTaP 5차', desc: '만 4~6세', required: true, detail: '부작용: 접종 부위 붓기·통증, 발열 | 지연: 만 4세 이후 취학 전까지' },
  { month: 48, id: 'ipv_4', name: 'IPV 4차', desc: '만 4~6세', required: true, detail: '부작용: 접종 부위 통증 (경미) | 지연: 만 4세 이후 취학 전까지' },
  { month: 48, id: 'mmr_2', name: 'MMR 2차', desc: '만 4~6세', required: true, detail: '부작용: 접종 후 발열·발진 가능 (1차보다 경미) | 지연: 만 4세 이후 취학 전까지' },
]

// --- Side Effects Types ---
interface SymptomCheck {
  time: string
  fever: boolean
  fussy: boolean
  swelling: boolean
  appetite: boolean
  rash: boolean
  vomit: boolean
  notes: string
}

interface SideEffectEntry {
  vaccineId: string
  vaccineName: string
  startDate: string // ISO string
  symptoms: SymptomCheck[]
  completed: boolean
}

const SE_TIME_SLOTS = ['2시간', '6시간', '12시간', '24시간', '48시간']
const SE_HOUR_MAP: Record<string, number> = { '2시간': 2, '6시간': 6, '12시간': 12, '24시간': 24, '48시간': 48 }
const SE_SYMPTOM_LABELS: { key: keyof Omit<SymptomCheck, 'time' | 'notes'>; label: string }[] = [
  { key: 'fever', label: '발열' },
  { key: 'fussy', label: '보챔' },
  { key: 'swelling', label: '접종부위 부기' },
  { key: 'appetite', label: '식욕감소' },
  { key: 'rash', label: '발진' },
  { key: 'vomit', label: '구토' },
]

function createSEEntry(vaccineId: string, vaccineName: string): SideEffectEntry {
  return {
    vaccineId,
    vaccineName,
    startDate: new Date().toISOString(),
    completed: false,
    symptoms: SE_TIME_SLOTS.map(time => ({
      time,
      fever: false,
      fussy: false,
      swelling: false,
      appetite: false,
      rash: false,
      vomit: false,
      notes: '',
    })),
  }
}

function saveSE(data: SideEffectEntry[]) {
  const today = new Date().toISOString().split('T')[0]
  upsertUserRecord(today, 'vax_sideeffects', { entries: data })
}

function getElapsedHours(startDate: string): number {
  return (Date.now() - new Date(startDate).getTime()) / 3600000
}

function getNextCheckTime(entry: SideEffectEntry): string | null {
  const elapsed = getElapsedHours(entry.startDate)
  for (const slot of SE_TIME_SLOTS) {
    if (SE_HOUR_MAP[slot] > elapsed) return slot
  }
  return null
}

function hasAnySymptom(check: SymptomCheck): boolean {
  return check.fever || check.fussy || check.swelling || check.appetite || check.rash || check.vomit
}

// --- Page Component ---
export default function VaccinationPage() {
  const schedule = useRemoteContent('vaccination_schedule', DEFAULT_SCHEDULE)
  const [done, setDone] = useState<Record<string, string>>({})
  const [ageMonths, setAgeMonths] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Side effects state
  const [seEntries, setSEEntries] = useState<SideEffectEntry[]>([])
  const [showSEPrompt, setShowSEPrompt] = useState<{ id: string; name: string } | null>(null)
  const [expandedSE, setExpandedSE] = useState<string | null>(null)

  // DB에서 예방접종 데이터 로드
  useEffect(() => {
    fetchUserRecords(['vaccinations']).then(rows => {
      if (rows.length > 0) {
        setDone(rows[0].value as Record<string, string>)
      }
    })
    fetchUserRecords(['vax_sideeffects']).then(rows => {
      if (rows.length > 0) {
        const entries = (rows[0].value as { entries: SideEffectEntry[] }).entries || []
        const updated = entries.map(e => {
          if (!e.completed && getElapsedHours(e.startDate) >= 48) return { ...e, completed: true }
          return e
        })
        setSEEntries(updated)
      }
    })
  }, [])

  useEffect(() => {
    const calcAge = async () => {
      const child = await getSecure('dodam_child_birthdate')
      if (child) {
        const birth = new Date(child)
        const now = new Date()
        setAgeMonths((now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()))
      }
    }
    calcAge()
    window.addEventListener('focus', calcAge)
    return () => window.removeEventListener('focus', calcAge)
  }, [])

  const toggleDone = (id: string) => {
    const next = { ...done }
    const wasUndone = !next[id]
    if (next[id]) {
      delete next[id]
    } else {
      next[id] = new Date().toISOString().split('T')[0]
    }
    setDone(next)
    const today = new Date().toISOString().split('T')[0]
    upsertUserRecord(today, 'vaccinations', next)

    // If marking as done, prompt for side effect tracking
    if (wasUndone) {
      const vaccine = schedule.find(v => v.id === id)
      if (vaccine) {
        // Only prompt if not already tracking this vaccine
        const alreadyTracking = seEntries.some(e => e.vaccineId === id && !e.completed)
        if (!alreadyTracking) {
          setShowSEPrompt({ id, name: vaccine.name })
        }
      }
    }
  }

  const startSETracking = useCallback((vaccineId: string, vaccineName: string) => {
    const entry = createSEEntry(vaccineId, vaccineName)
    const next = [entry, ...seEntries]
    setSEEntries(next)
    saveSE(next)
    setShowSEPrompt(null)
    setExpandedSE(vaccineId)
  }, [seEntries])

  const toggleSESymptom = useCallback((vaccineId: string, slotIndex: number, symptomKey: keyof Omit<SymptomCheck, 'time' | 'notes'>) => {
    const next = seEntries.map(e => {
      if (e.vaccineId !== vaccineId) return e
      const symptoms = [...e.symptoms]
      symptoms[slotIndex] = { ...symptoms[slotIndex], [symptomKey]: !symptoms[slotIndex][symptomKey] }
      return { ...e, symptoms }
    })
    setSEEntries(next)
    saveSE(next)
  }, [seEntries])

  const updateSENotes = useCallback((vaccineId: string, slotIndex: number, notes: string) => {
    const next = seEntries.map(e => {
      if (e.vaccineId !== vaccineId) return e
      const symptoms = [...e.symptoms]
      symptoms[slotIndex] = { ...symptoms[slotIndex], notes }
      return { ...e, symptoms }
    })
    setSEEntries(next)
    saveSE(next)
  }, [seEntries])

  const deleteSE = useCallback((vaccineId: string) => {
    const next = seEntries.filter(e => e.vaccineId !== vaccineId)
    setSEEntries(next)
    saveSE(next)
  }, [seEntries])

  const doneCount = Object.keys(done).length
  const totalRequired = schedule.filter(v => v.required).length
  const activeTrackings = seEntries.filter(e => !e.completed)
  const completedTrackings = seEntries.filter(e => e.completed)

  const groups = useMemo(() => {
    const map = new Map<string, typeof schedule>()
    schedule.forEach(v => {
      const label = v.month === 0 ? '출생' : v.month < 12 ? `${v.month}개월` : `${Math.floor(v.month / 12)}세 (${v.month}개월)`
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(v)
    })
    return Array.from(map.entries())
  }, [])

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="예방접종" showBack rightAction={<span className="text-body text-[var(--color-primary)] font-semibold">{doneCount}/{schedule.length}</span>} />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-4 space-y-3">

        {/* Active side effect tracking cards */}
        {activeTrackings.map(entry => {
          const elapsed = getElapsedHours(entry.startDate)
          const elapsedStr = elapsed < 1 ? `${Math.round(elapsed * 60)}분` : `${Math.round(elapsed)}시간`
          const nextCheck = getNextCheckTime(entry)
          const isExpanded = expandedSE === entry.vaccineId
          // Find the current/next slot index
          const currentSlotIdx = SE_TIME_SLOTS.findIndex(t => SE_HOUR_MAP[t] > elapsed)

          return (
            <div key={entry.vaccineId} className="bg-white rounded-xl border-2 border-[var(--color-primary)] border-opacity-40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                  <div>
                    <p className="text-body-emphasis font-bold text-primary">{entry.vaccineName} 부작용 관찰 중</p>
                    <p className="text-caption text-secondary">경과: {elapsedStr} {nextCheck ? `· 다음 체크: ${nextCheck}` : '· 곧 완료'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedSE(isExpanded ? null : entry.vaccineId)}
                  className="text-caption text-[var(--color-primary)] font-semibold px-2 py-1"
                >
                  {isExpanded ? '접기' : '기록'}
                </button>
              </div>

              {/* Quick status dots */}
              <div className="flex gap-1.5">
                {entry.symptoms.map((s, i) => {
                  const slotHours = SE_HOUR_MAP[s.time]
                  const isPast = elapsed >= slotHours
                  const isCurrent = currentSlotIdx === i
                  const hasSx = hasAnySymptom(s)
                  return (
                    <button
                      key={s.time}
                      onClick={() => setExpandedSE(entry.vaccineId)}
                      className={`flex-1 py-1.5 rounded text-center text-label font-medium border transition-all ${
                        isCurrent
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                          : isPast && hasSx
                            ? 'border-[#FDE8E8] bg-[#FDE8E8] text-[#D05050]'
                            : isPast
                              ? 'border-[#E8F5E9] bg-[#E8F5E9] text-[#4CAF50]'
                              : 'border-[#E8E4DF] bg-[#F5F3F0] text-tertiary'
                      }`}
                    >
                      {s.time}
                    </button>
                  )
                })}
              </div>

              {/* Expanded symptom entry */}
              {isExpanded && (
                <div className="space-y-3">
                  {entry.symptoms.map((s, i) => {
                    const slotHours = SE_HOUR_MAP[s.time]
                    const isAccessible = elapsed >= slotHours - 1 // Allow recording slightly early
                    return (
                      <div key={s.time} className={`rounded-lg p-3 space-y-2 ${isAccessible ? 'bg-[var(--color-page-bg)]' : 'bg-[#F5F3F0] opacity-50'}`}>
                        <p className="text-body font-semibold text-primary">{s.time} 후</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SE_SYMPTOM_LABELS.map(({ key, label }) => (
                            <button
                              key={key}
                              disabled={!isAccessible}
                              onClick={() => toggleSESymptom(entry.vaccineId, i, key)}
                              className={`px-2.5 py-1.5 rounded-full text-caption font-medium border transition-all ${
                                s[key]
                                  ? 'bg-[#FDE8E8] border-[#D05050] text-[#D05050]'
                                  : 'bg-white border-[#E8E4DF] text-secondary'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        {isAccessible && (
                          <input
                            type="text"
                            placeholder="메모 (선택)"
                            value={s.notes}
                            onChange={(e) => updateSENotes(entry.vaccineId, i, e.target.value)}
                            maxLength={200}
                            className="w-full px-3 py-2 bg-white border border-[#E8E4DF] rounded-lg text-caption text-primary placeholder:text-tertiary"
                          />
                        )}
                      </div>
                    )
                  })}
                  <div className="flex gap-2">
                    <Link
                      href="/emergency"
                      className="flex-1 py-2.5 text-center bg-[#FDE8E8] text-[#D05050] rounded-lg text-body font-semibold"
                    >
                      걱정되면 소아과 찾기 &rarr;
                    </Link>
                    <button
                      onClick={() => deleteSE(entry.vaccineId)}
                      className="px-4 py-2.5 text-tertiary rounded-lg text-body border border-[#E8E4DF]"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Completed side effect summaries */}
        {completedTrackings.length > 0 && (
          <div className="space-y-2">
            {completedTrackings.map(entry => {
              const totalSymptoms = entry.symptoms.reduce((sum, s) => sum + (hasAnySymptom(s) ? 1 : 0), 0)
              return (
                <div key={entry.vaccineId} className="bg-white rounded-xl border border-[#E8E4DF] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body font-semibold text-primary">{entry.vaccineName} 관찰 완료</p>
                      <p className="text-label text-secondary">
                        {totalSymptoms === 0 ? '48시간 동안 부작용 없음' : `${totalSymptoms}개 시점에서 증상 기록됨`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-caption font-semibold ${totalSymptoms === 0 ? 'text-[#4CAF50]' : 'text-[#D08068]'}`}>
                        {totalSymptoms === 0 ? '양호' : '확인'}
                      </span>
                      <button onClick={() => deleteSE(entry.vaccineId)} className="text-label text-tertiary">삭제</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 프로그레스 */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-body-emphasis font-bold text-primary flex items-center gap-1"><SyringeIcon className="w-4 h-4" /> 접종 현황</p>
            <p className="text-body-emphasis text-[var(--color-primary)] font-semibold">{Math.round((doneCount / schedule.length) * 100)}%</p>
          </div>
          <div className="w-full h-2 bg-[#E8E4DF] rounded-full">
            <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${(doneCount / schedule.length) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-body-emphasis text-secondary">필수 {schedule.filter(v => v.required && done[v.id]).length}/{totalRequired}</p>
            <p className="text-body-emphasis text-secondary">선택 {schedule.filter(v => !v.required && done[v.id]).length}/{schedule.filter(v => !v.required).length}</p>
          </div>
          <button onClick={() => shareVaccination(doneCount, schedule.length)} className="w-full mt-2 text-caption text-[var(--color-primary)] font-semibold">카톡 공유</button>
        </div>

        {/* 접종 목록 */}
        {groups.map(([label, vaccines]) => {
          const groupMonth = vaccines[0].month
          const isPast = groupMonth <= ageMonths
          const isCurrent = groupMonth <= ageMonths && groupMonth >= ageMonths - 2
          const hasUndone = vaccines.some(v => !done[v.id] && v.required)

          return (
            <div key={label} className={`bg-white rounded-xl border p-4 ${isCurrent && hasUndone ? 'border-[var(--color-accent-bg)]' : 'border-[#E8E4DF]'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-body font-bold text-primary">{label}</p>
                  {isCurrent && hasUndone && <span className="text-body px-1.5 py-0.5 rounded bg-[#FDE8E8] text-[#D08068] font-semibold">접종 시기</span>}
                  {isPast && !hasUndone && <span className="text-body text-[var(--color-primary)]">✓</span>}
                </div>
                <p className="text-body-emphasis text-tertiary">{vaccines.filter(v => done[v.id]).length}/{vaccines.length}</p>
              </div>
              {vaccines.map(v => (
                <div key={v.id}>
                  <div className="flex items-center gap-2.5 py-2">
                    <button onClick={() => toggleDone(v.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${done[v.id] ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : isPast && v.required ? 'border-[#D08068]' : 'border-[#AEB1B9]'}`}>
                      {done[v.id] && <span className="text-white text-body-emphasis">✓</span>}
                    </button>
                    <button onClick={() => setExpandedId(expandedId === v.id ? null : v.id)} className="flex-1 text-left active:bg-[var(--color-page-bg)] rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-body-emphasis font-medium ${done[v.id] ? 'text-tertiary line-through' : 'text-primary'}`}>{v.name}</span>
                        {!v.required && <span className="text-body px-1 rounded bg-[var(--color-page-bg)] text-secondary">선택</span>}
                        <span className="text-label text-tertiary">{expandedId === v.id ? '▲' : '▼'}</span>
                      </div>
                      <p className="text-body-emphasis text-secondary">{v.desc}</p>
                    </button>
                    {done[v.id] && <span className="text-body text-[var(--color-primary)] shrink-0">{done[v.id]}</span>}
                  </div>
                  {expandedId === v.id && v.detail && (
                    <div className="ml-8 mb-2 p-2.5 rounded-lg bg-[var(--color-page-bg)] border border-[#E8E4DF]">
                      <p className="text-caption text-secondary leading-relaxed">{v.detail}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })}

        <div className="bg-[#F0F9F4] rounded-xl p-3 text-center">
          <p className="text-body text-[var(--color-primary)]">예방접종 도우미 1544-4774</p>
          <a href="https://nip.kdca.go.kr" target="_blank" rel="noopener noreferrer" className="text-body-emphasis text-secondary">질병관리청 예방접종 도우미 →</a>
        </div>
      </div>

      {/* Side effect prompt toast */}
      {showSEPrompt && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center" onClick={() => setShowSEPrompt(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-[430px] bg-white rounded-t-2xl p-5 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#E8E4DF] rounded-full mx-auto mb-4" />
            <p className="text-subtitle text-primary mb-2">{showSEPrompt.name} 접종 완료!</p>
            <p className="text-body text-secondary mb-4">48시간 동안 부작용을 관찰하면서 기록할까요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => startSETracking(showSEPrompt.id, showSEPrompt.name)}
                className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl text-body-emphasis"
              >
                부작용 관찰 시작
              </button>
              <button
                onClick={() => setShowSEPrompt(null)}
                className="px-6 py-3 bg-[var(--color-page-bg)] text-secondary rounded-xl text-body-emphasis"
              >
                괜찮아요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
