'use client'

import { useState, useMemo } from 'react'

interface HealthRecord {
  date: string
  sleep: number
  stress: number
  steps: number
  weight: number
  note: string
}

const STRESS_LABELS = ['좋음', '보통', '높음', '매우높음']
const STRESS_EMOJI = ['😊', '😐', '😰', '🤯']

function getAIAdvice(record: HealthRecord | null, mode: string): string[] {
  if (!record) return ['오늘의 건강을 기록해보세요. AI가 맞춤 조언을 드릴게요.']
  const advice: string[] = []

  // 수면
  if (record.sleep < 4) {
    advice.push('어젯밤 수면이 많이 부족해요. 오늘은 낮잠이라도 꼭 쉬세요 💤')
    if (mode === 'parenting') advice.push('파트너에게 1회 수유를 맡겨보는 건 어때요?')
  } else if (record.sleep < 6) {
    advice.push('수면이 조금 부족해요. 아이 낮잠 시간에 함께 쉬어보세요')
  } else if (record.sleep >= 7) {
    advice.push('충분히 잘 주무셨어요! 좋은 컨디션이에요 ✨')
  }

  // 스트레스
  if (record.stress >= 3) {
    advice.push('스트레스가 높아요. 5분만 깊게 호흡해보세요. 괜찮아요 🧘')
    if (mode === 'preparing') advice.push('스트레스는 임신에 영향을 줄 수 있어요. 자신을 위한 시간을 가져보세요')
  } else if (record.stress >= 2) {
    advice.push('조금 지쳐있는 것 같아요. 좋아하는 음악을 들어보세요 🎵')
  }

  // 걸음수
  if (record.steps > 0 && record.steps < 3000) {
    advice.push('오늘 활동량이 적어요. 10분만 가볍게 산책해보세요 🚶')
  } else if (record.steps >= 8000) {
    advice.push('활동적인 하루였어요! 잘 하고 있어요 👏')
  }

  // 체중 (임신 중일 때)
  if (mode === 'pregnant' && record.weight > 0) {
    advice.push('체중 변화를 꾸준히 기록하면 건강한 임신에 도움이 돼요')
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

  const todayRecord = records[today] || null
  const [sleep, setSleep] = useState(todayRecord?.sleep || 0)
  const [stress, setStress] = useState(todayRecord?.stress || 0)
  const [steps, setSteps] = useState(todayRecord?.steps || 0)
  const [weight, setWeight] = useState(todayRecord?.weight || 0)

  const save = () => {
    const record: HealthRecord = { date: today, sleep, stress, steps, weight, note: '' }
    const next = { ...records, [today]: record }
    setRecords(next)
    localStorage.setItem('dodam_health_records', JSON.stringify(next))
  }

  const advice = useMemo(() => {
    return getAIAdvice(todayRecord, mode)
  }, [todayRecord, mode])

  // 최근 7일 수면 평균
  const weekSleepAvg = useMemo(() => {
    const days: number[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      if (records[ds]?.sleep) days.push(records[ds].sleep)
    }
    return days.length > 0 ? (days.reduce((a, b) => a + b, 0) / days.length).toFixed(1) : null
  }, [records])

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">내 건강</h1>
          <p className="text-[11px] text-[#868B94]">삼성헬스 연동 예정</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28 space-y-3">

        {/* AI 조언 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">✨</span>
            <p className="text-[14px] font-bold text-[#1A1918]">AI 건강 케어</p>
          </div>
          {advice.map((a, i) => (
            <p key={i} className="text-[13px] text-[#1A1918] leading-relaxed mb-1">{a}</p>
          ))}
          {weekSleepAvg && (
            <p className="text-[11px] text-[#868B94] mt-2">최근 7일 평균 수면: {weekSleepAvg}시간</p>
          )}
        </div>

        {/* 수면 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-bold text-[#1A1918]">💤 수면</p>
            <p className="text-[13px] font-bold text-[#3D8A5A]">{sleep}시간</p>
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

        {/* 체중 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-2">⚖️ 체중</p>
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

        {/* 삼성헬스 연동 안내 */}
        <div className="bg-[#F0F9F4] rounded-xl border border-[#C8F0D8] p-4 text-center">
          <p className="text-[13px] font-semibold text-[#3D8A5A] mb-1">삼성헬스 자동 연동 예정</p>
          <p className="text-[11px] text-[#6D6C6A]">네이티브 앱 출시 시 수면·걸음수·스트레스가 자동으로 기록돼요</p>
        </div>
      </div>
    </div>
  )
}
