'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'

interface HealthRecord {
  date: string
  sleep: number
  stress: number
  steps: number
  weight: number
  heartRate: number
  note: string
  source: 'manual' | 'google_fit' | 'mixed'
}

interface GoogleFitData {
  connected: boolean
  today?: { steps: number; weight: number; heartRate: number; sleep: number }
  days?: Record<string, { steps: number; weight: number; heartRate: number; sleep: number }>
}

const STRESS_LABELS = ['좋음', '보통', '높음', '매우높음']
const STRESS_EMOJI = ['😊', '😐', '😰', '🤯']

function getAIAdvice(record: HealthRecord | null, mode: string, gfit: GoogleFitData | null): string[] {
  const data = record || (gfit?.today ? {
    sleep: gfit.today.sleep,
    stress: 0,
    steps: gfit.today.steps,
    weight: gfit.today.weight,
  } : null)

  if (!data) return ['건강 데이터를 연동하거나 직접 기록해보세요. AI가 맞춤 조언을 드릴게요.']
  const advice: string[] = []

  if (data.sleep > 0 && data.sleep < 4) {
    advice.push('어젯밤 수면이 많이 부족해요. 오늘은 낮잠이라도 꼭 쉬세요 💤')
    if (mode === 'parenting') advice.push('파트너에게 1회 수유를 맡겨보는 건 어때요?')
  } else if (data.sleep > 0 && data.sleep < 6) {
    advice.push('수면이 조금 부족해요. 아이 낮잠 시간에 함께 쉬어보세요')
  } else if (data.sleep >= 7) {
    advice.push('충분히 잘 주무셨어요! 좋은 컨디션이에요 ✨')
  }

  if (data.stress >= 3) {
    advice.push('스트레스가 높아요. 5분만 깊게 호흡해보세요 🧘')
    if (mode === 'preparing') advice.push('스트레스는 임신에 영향을 줄 수 있어요. 자신을 위한 시간을 가져보세요')
  } else if (data.stress >= 2) {
    advice.push('조금 지쳐있는 것 같아요. 좋아하는 음악을 들어보세요 🎵')
  }

  if (data.steps > 0 && data.steps < 3000) {
    advice.push('오늘 활동량이 적어요. 10분만 가볍게 산책해보세요 🚶')
  } else if (data.steps >= 8000) {
    advice.push('활동적인 하루였어요! 잘 하고 있어요 👏')
  }

  if (mode === 'pregnant' && data.weight > 0) {
    advice.push('체중 변화를 꾸준히 기록하면 건강한 임신에 도움이 돼요')
  }

  if (gfit?.today?.heartRate && gfit.today.heartRate > 100) {
    advice.push('심박수가 높아요. 잠시 휴식을 취해보세요 💓')
  }

  if (advice.length === 0) {
    advice.push('오늘도 도담하게 잘 지내고 있어요 💚')
  }

  return advice.slice(0, 3)
}

export default function HealthPage() {
  const today = new Date().toISOString().split('T')[0]

  const [mode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_mode') || 'parenting'
    return 'parenting'
  })

  const [records, setRecords] = useState<Record<string, HealthRecord>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_health_records')
      return s ? JSON.parse(s) : {}
    }
    return {}
  })

  // Google Fit 상태
  const [gfit, setGfit] = useState<GoogleFitData | null>(null)
  const [gfitLoading, setGfitLoading] = useState(false)
  const [gfitError, setGfitError] = useState<string | null>(null)
  const [syncTime, setSyncTime] = useState<string | null>(null)

  const todayRecord = records[today] || null
  const [sleep, setSleep] = useState(todayRecord?.sleep || 0)
  const [stress, setStress] = useState(todayRecord?.stress || 0)
  const [steps, setSteps] = useState(todayRecord?.steps || 0)
  const [weight, setWeight] = useState(todayRecord?.weight || 0)
  const [heartRate, setHeartRate] = useState(todayRecord?.heartRate || 0)

  // Google Fit 데이터 가져오기
  const fetchGoogleFit = useCallback(async () => {
    setGfitLoading(true)
    setGfitError(null)
    try {
      // 먼저 토큰 상태 확인
      const statusRes = await fetch('/api/google-fit/status')
      const status = await statusRes.json()

      if (!status.hasToken && !status.hasRefresh) {
        setGfit({ connected: false })
        setGfitError('토큰 없음 — Google 재로그인 필요')
        setGfitLoading(false)
        return
      }

      const res = await fetch('/api/google-fit?type=week')
      const data = await res.json()

      if (data.error) {
        setGfit({ connected: false })
        setGfitError(`API 오류: ${data.error}`)
        setGfitLoading(false)
        return
      }

      setGfit(data)

      if (data.connected && data.today) {
        if (data.today.steps > 0 && steps === 0) setSteps(data.today.steps)
        if (data.today.sleep > 0 && sleep === 0) setSleep(data.today.sleep)
        if (data.today.weight > 0 && weight === 0) setWeight(data.today.weight)
        if (data.today.heartRate > 0) setHeartRate(Math.round(data.today.heartRate))
        setSyncTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
      }
    } catch (e) {
      setGfit({ connected: false })
      setGfitError(`네트워크 오류: ${e}`)
    }
    setGfitLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchGoogleFit()
  }, [fetchGoogleFit])

  const save = () => {
    const source = gfit?.connected ? 'mixed' : 'manual'
    const record: HealthRecord = { date: today, sleep, stress, steps, weight, heartRate, note: '', source }
    const next = { ...records, [today]: record }
    setRecords(next)
    localStorage.setItem('dodam_health_records', JSON.stringify(next))
  }

  const advice = useMemo(() => {
    return getAIAdvice(todayRecord, mode, gfit)
  }, [todayRecord, mode, gfit])

  // 최근 7일 트렌드
  const weekData = useMemo(() => {
    const result: { date: string; sleep: number; steps: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const dayLabel = d.toLocaleDateString('ko-KR', { weekday: 'short' })

      // Google Fit 데이터 우선, 없으면 로컬 기록
      const gfitDay = gfit?.days?.[ds]
      const localDay = records[ds]

      result.push({
        date: dayLabel,
        sleep: gfitDay?.sleep || localDay?.sleep || 0,
        steps: gfitDay?.steps || localDay?.steps || 0,
      })
    }
    return result
  }, [records, gfit])

  const avgSleep = useMemo(() => {
    const vals = weekData.filter(d => d.sleep > 0).map(d => d.sleep)
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
  }, [weekData])

  const avgSteps = useMemo(() => {
    const vals = weekData.filter(d => d.steps > 0).map(d => d.steps)
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }, [weekData])

  const maxSteps = Math.max(...weekData.map(d => d.steps), 10000)

  const gfitBadge = gfit?.connected ? (
    <span className="flex items-center gap-1 text-[9px] text-[#3D8A5A] bg-[#F0F9F4] px-1.5 py-0.5 rounded-full">
      <span className="w-1 h-1 bg-[#3D8A5A] rounded-full" />Fit
    </span>
  ) : null

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1] flex flex-col">
      <PageHeader title="내 건강" showBack rightAction={gfitBadge} />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">

        {/* 디버그: 연동 오류 표시 */}
        {gfitError && (
          <div className="bg-[#FFF0E6] rounded-xl border border-[#FFDDC8] p-3">
            <p className="text-[12px] text-[#D08068]">{gfitError}</p>
          </div>
        )}

        {/* Google Fit 연동 상태 */}
        {!gfit?.connected && !gfitLoading && (
          <div className="bg-[#F0F9F4] rounded-xl border border-[#C8F0D8] p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#4285F4"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#3D8A5A]">Google Fit 연동하기</p>
                <p className="text-[11px] text-[#6D6C6A]">삼성헬스 · Google Fit 데이터가 자동으로 연동돼요</p>
              </div>
              <a href="/onboarding" className="text-[11px] text-[#3D8A5A] font-semibold">연결 →</a>
            </div>
          </div>
        )}

        {gfitLoading && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" />
            <p className="text-[13px] text-[#868B94]">건강 데이터 가져오는 중...</p>
          </div>
        )}

        {/* AI 조언 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">✨</span>
            <p className="text-[14px] font-bold text-[#1A1918]">AI 건강 케어</p>
          </div>
          {advice.map((a, i) => (
            <p key={i} className="text-[13px] text-[#1A1918] leading-relaxed mb-1">{a}</p>
          ))}
          <div className="flex gap-3 mt-2">
            {avgSleep && <p className="text-[11px] text-[#868B94]">7일 평균 수면: {avgSleep}시간</p>}
            {avgSteps && <p className="text-[11px] text-[#868B94]">7일 평균 걸음: {avgSteps.toLocaleString()}보</p>}
          </div>
        </div>

        {/* 오늘 요약 (Google Fit 연동 시) */}
        {gfit?.connected && gfit.today && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-[#1A1918]">오늘 요약</p>
              <div className="flex items-center gap-1">
                {syncTime && <p className="text-[10px] text-[#AEB1B9]">{syncTime} 동기화</p>}
                <button onClick={fetchGoogleFit} className="text-[10px] text-[#3D8A5A] font-semibold ml-1">새로고침</button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '걸음', value: gfit.today.steps > 0 ? gfit.today.steps.toLocaleString() : '-', unit: '보', icon: '🚶' },
                { label: '수면', value: gfit.today.sleep > 0 ? gfit.today.sleep.toFixed(1) : '-', unit: '시간', icon: '💤' },
                { label: '체중', value: gfit.today.weight > 0 ? gfit.today.weight.toFixed(1) : '-', unit: 'kg', icon: '⚖️' },
                { label: '심박', value: gfit.today.heartRate > 0 ? Math.round(gfit.today.heartRate) : '-', unit: 'bpm', icon: '💓' },
              ].map((item) => (
                <div key={item.label} className="bg-[#F5F4F1] rounded-xl p-2.5 text-center">
                  <p className="text-sm mb-0.5">{item.icon}</p>
                  <p className="text-[14px] font-bold text-[#1A1918]">{item.value}</p>
                  <p className="text-[9px] text-[#868B94]">{item.unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 주간 걸음 차트 */}
        {weekData.some(d => d.steps > 0) && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <p className="text-[14px] font-bold text-[#1A1918] mb-3">🚶 주간 걸음수</p>
            <div className="flex items-end gap-1.5 h-24">
              {weekData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-[#F0F0F0] rounded-t-lg relative" style={{ height: '80px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-[#3D8A5A] rounded-t-lg transition-all"
                      style={{ height: `${Math.max((d.steps / maxSteps) * 100, d.steps > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-[#868B94]">{d.date}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 수면 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-bold text-[#1A1918]">💤 수면</p>
            <div className="flex items-center gap-2">
              {gfit?.connected && gfit.today?.sleep ? (
                <span className="text-[9px] text-[#3D8A5A] bg-[#F0F9F4] px-1.5 py-0.5 rounded">자동</span>
              ) : null}
              <p className="text-[13px] font-bold text-[#3D8A5A]">{sleep}시간</p>
            </div>
          </div>
          <input
            type="range" min={0} max={12} step={0.5} value={sleep}
            onChange={(e) => setSleep(Number(e.target.value))}
            className="w-full accent-[#3D8A5A]"
          />
          <div className="flex justify-between text-[9px] text-[#AEB1B9] mt-1">
            <span>0h</span><span>4h</span><span>8h</span><span>12h</span>
          </div>
        </div>

        {/* 스트레스 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-3">🧘 스트레스</p>
          <div className="flex gap-2">
            {STRESS_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setStress(i)}
                className={`flex-1 py-2.5 rounded-xl text-center ${
                  stress === i ? 'bg-[#3D8A5A]' : 'bg-[#F5F4F1]'
                }`}
              >
                <p className="text-lg">{STRESS_EMOJI[i]}</p>
                <p className={`text-[9px] mt-0.5 ${stress === i ? 'text-white font-semibold' : 'text-[#868B94]'}`}>{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 걸음수 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[14px] font-bold text-[#1A1918]">🚶 걸음수</p>
            {gfit?.connected && gfit.today?.steps ? (
              <span className="text-[9px] text-[#3D8A5A] bg-[#F0F9F4] px-1.5 py-0.5 rounded">자동</span>
            ) : null}
          </div>
          <input
            type="number"
            value={steps || ''}
            onChange={(e) => setSteps(Number(e.target.value))}
            placeholder="오늘 걸음수"
            className="w-full h-10 px-3 rounded-xl border border-[#f0f0f0] text-[14px] focus:outline-none"
          />
          {steps > 0 && (
            <div className="mt-2 h-1.5 bg-[#F0F0F0] rounded-full">
              <div className="h-full bg-[#3D8A5A] rounded-full" style={{ width: `${Math.min((steps / 10000) * 100, 100)}%` }} />
            </div>
          )}
          <p className="text-[10px] text-[#AEB1B9] mt-1">목표: 10,000보</p>
        </div>

        {/* 심박수 (Google Fit 연동 시) */}
        {heartRate > 0 && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold text-[#1A1918]">💓 심박수</p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#3D8A5A] bg-[#F0F9F4] px-1.5 py-0.5 rounded">자동</span>
                <p className="text-[13px] font-bold text-[#3D8A5A]">{heartRate} bpm</p>
              </div>
            </div>
            <p className="text-[11px] text-[#868B94] mt-1">
              {heartRate < 60 ? '안정 상태예요' : heartRate < 100 ? '정상 범위예요' : '조금 높아요. 휴식이 필요해요'}
            </p>
          </div>
        )}

        {/* 체중 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[14px] font-bold text-[#1A1918]">⚖️ 체중</p>
            {gfit?.connected && gfit.today?.weight ? (
              <span className="text-[9px] text-[#3D8A5A] bg-[#F0F9F4] px-1.5 py-0.5 rounded">자동</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" step="0.1"
              value={weight || ''}
              onChange={(e) => setWeight(Number(e.target.value))}
              placeholder="kg"
              className="flex-1 h-10 px-3 rounded-xl border border-[#f0f0f0] text-[14px] focus:outline-none"
            />
            <span className="text-[13px] text-[#868B94]">kg</span>
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={save}
          className="w-full py-3 bg-[#3D8A5A] text-white text-[14px] font-semibold rounded-xl active:opacity-80"
        >
          오늘 건강 기록 저장
        </button>

        {/* 데이터 소스 안내 */}
        <div className="bg-[#F0F9F4] rounded-xl border border-[#C8F0D8] p-4 text-center">
          {gfit?.connected ? (
            <>
              <p className="text-[13px] font-semibold text-[#3D8A5A] mb-1">Google Fit 연동 완료</p>
              <p className="text-[11px] text-[#6D6C6A]">삼성헬스 → Health Connect → Google Fit 데이터가 자동으로 반영돼요</p>
            </>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-[#3D8A5A] mb-1">건강 데이터 자동 연동</p>
              <p className="text-[11px] text-[#6D6C6A]">Google 로그인 시 삼성헬스 · Google Fit 데이터가 자동으로 연동돼요</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
