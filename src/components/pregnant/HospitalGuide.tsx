'use client'

import { useState } from 'react'
import { HospitalIcon, AlertIcon } from '@/components/ui/Icons'

interface ScheduledTest {
  name: string
  description: string
  required: boolean
}

interface WarningSignal {
  signal: string
  action: string
}

interface GuideData {
  weekSummary: string
  scheduledTests: ScheduledTest[]
  warningSignals: WarningSignal[]
  questionsForDoctor: string[]
  bodyChanges: string
  mentalTip: string
  partnerTip: string
  nextVisit: string
}

interface Props {
  week: number
}

export default function HospitalGuide({ week }: Props) {
  const [guide, setGuide] = useState<GuideData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const [error, setError] = useState(false)

  const fetchGuide = async () => {
    // 캐시 확인
    const cacheKey = `dodam_hospital_guide_${week}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { data } = JSON.parse(cached)
        if (data?.weekSummary) { setGuide(data); setExpanded(true); return }
      }
    } catch { /* */ }

    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/ai-pregnant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hospital-guide', week }),
      })
      if (!res.ok) {
        console.error('Hospital guide API error:', res.status)
        setError(true)
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.weekSummary) {
        setGuide(data)
        setExpanded(true)
        localStorage.setItem(cacheKey, JSON.stringify({ data }))
      } else if (data.error) {
        console.error('Hospital guide error:', data.error)
        setError(true)
      } else {
        setError(true)
      }
    } catch (e) {
      console.error('Hospital guide fetch failed:', e)
      setError(true)
    }
    setLoading(false)
  }

  if (!guide && !loading) {
    return (
      <button
        onClick={fetchGuide}
        className="w-full bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4 text-left active:bg-[#F5F1EC]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F0F4FF] flex items-center justify-center shrink-0">
            <HospitalIcon className="w-5 h-5 text-[#4A6FA5]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-emphasis font-bold text-primary">{week}주차 병원 가이드</p>
            {error ? (
              <p className="text-caption text-[#D08068]">불러오기 실패 — 탭하여 다시 시도</p>
            ) : (
              <p className="text-caption text-secondary">이번 주 검사, 위험 신호, 의사에게 물어볼 질문</p>
            )}
          </div>
          <span className="text-body text-[var(--color-primary)] font-semibold shrink-0">{error ? '재시도' : '보기'}</span>
        </div>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-5 text-center">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-body text-secondary">{week}주차 병원 가이드 준비 중...</p>
      </div>
    )
  }

  if (!guide) return null

  return (
    <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm overflow-hidden">
      {/* 헤더 */}
      <button onClick={() => setExpanded(v => !v)} className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-[#F5F1EC]">
        <div className="w-10 h-10 rounded-full bg-[#F0F4FF] flex items-center justify-center shrink-0">
          <HospitalIcon className="w-5 h-5 text-[#4A6FA5]" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-body-emphasis font-bold text-primary">{week}주차 병원 가이드</p>
          <p className="text-caption text-[var(--color-primary)]">{guide.weekSummary}</p>
        </div>
        <span className="text-body text-tertiary">{expanded ? '접기' : '펼치기'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* 이번 주 검사 */}
          {guide.scheduledTests.length > 0 && (
            <div>
              <p className="text-caption text-tertiary font-medium mb-2">이번 주 검사 항목</p>
              <div className="space-y-2">
                {guide.scheduledTests.map((test, i) => (
                  <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl ${test.required ? 'bg-[#FFF8F3] border border-[#F0E4D8]' : 'bg-[#F5F3F0]'}`}>
                    <AlertIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${test.required ? 'text-[#D05050]' : 'text-[#C4A35A]'}`} />
                    <div>
                      <p className="text-body font-semibold text-primary">{test.name}</p>
                      <p className="text-caption text-secondary">{test.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 몸의 변화 */}
          <div className="p-3 rounded-xl bg-[#F5F0FF] border border-[#E0D8EF]">
            <p className="text-label text-[#7A6FA0] font-medium mb-1">이번 주 몸의 변화</p>
            <p className="text-body text-[#4A4744] leading-relaxed">{guide.bodyChanges}</p>
          </div>

          {/* 위험 신호 */}
          {guide.warningSignals.length > 0 && (
            <div>
              <p className="text-caption text-tertiary font-medium mb-2">이런 증상이 있다면</p>
              <div className="space-y-1.5">
                {guide.warningSignals.map((ws, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FDE8E8] border border-[#F5C6C6]">
                    <p className="text-body font-semibold text-[#D05050]">{ws.signal}</p>
                    <p className="text-caption text-[#8B4513] mt-0.5">{ws.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 의사에게 물어볼 질문 */}
          {guide.questionsForDoctor.length > 0 && (
            <div>
              <p className="text-caption text-tertiary font-medium mb-2">의사에게 물어보세요</p>
              <div className="space-y-1.5">
                {guide.questionsForDoctor.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 pl-1">
                    <span className="text-caption shrink-0 text-[var(--color-primary)] font-bold mt-0.5">{i + 1}</span>
                    <p className="text-body text-[#4A4744]">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 심리 팁 + 파트너 팁 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-[#F0F9F4] border border-[#D5E8DC]">
              <p className="text-label text-[#2D7A4A] font-medium mb-1">마음 케어</p>
              <p className="text-caption text-[#3D6B4E]">{guide.mentalTip}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FFF8F3] border border-[#F0E4D8]">
              <p className="text-label text-[#C4A35A] font-medium mb-1">파트너에게</p>
              <p className="text-caption text-[#8B7A50]">{guide.partnerTip}</p>
            </div>
          </div>

          {/* 다음 검진 */}
          <div className="p-3 rounded-xl bg-[#F0F4FF] border border-[#D5DFEF]">
            <p className="text-caption text-[#4A6FA5]">{guide.nextVisit}</p>
          </div>

          <p className="text-label text-tertiary text-center">참고용 정보예요. 정확한 검사 일정은 산부인과에 확인하세요.</p>
        </div>
      )}
    </div>
  )
}
