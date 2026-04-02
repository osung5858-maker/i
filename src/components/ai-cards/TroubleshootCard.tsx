'use client'

import { useState } from 'react'
import { AlertIcon, ThermometerIcon, BottleIcon, MoonIcon, WarningIcon, PhoneIcon } from '@/components/ui/Icons'

interface ChecklistItem {
  item: string
  detail: string
}

interface Step {
  step: number
  action: string
  detail: string
}

interface TroubleshootData {
  title: string
  urgency: 'low' | 'medium' | 'high'
  checklist: ChecklistItem[]
  steps: Step[]
  emergencySign: string
  reassurance: string
  relatedTip: string
}

// 자주 묻는 상황 프리셋
const PRESETS: { Icon: React.FC<{ className?: string }>; label: string; situation: string }[] = [
  { Icon: AlertIcon, label: '오래 울어요', situation: '아이가 30분 이상 울고 달래지지 않아요' },
  { Icon: ThermometerIcon, label: '열이 나요', situation: '아이에게 열이 있어요' },
  { Icon: BottleIcon, label: '먹지 않아요', situation: '아이가 수유/이유식을 거부해요' },
  { Icon: MoonIcon, label: '잠을 안 자요', situation: '아이가 잠들지 못하고 계속 보채요' },
  { Icon: AlertIcon, label: '토해요', situation: '아이가 수유 후 자주 토해요' },
  { Icon: AlertIcon, label: '변비예요', situation: '아이가 며칠째 변을 보지 않아요' },
  { Icon: WarningIcon, label: '발진이에요', situation: '아이 피부에 발진/두드러기가 생겼어요' },
  { Icon: AlertIcon, label: '낯가림 심해요', situation: '아이가 심한 낯가림으로 힘들어요' },
]

interface Props {
  ageMonths?: number
}

export default function TroubleshootCard({ ageMonths }: Props) {
  const [result, setResult] = useState<TroubleshootData | null>(null)
  const [loading, setLoading] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

  const fetchTroubleshoot = async (situation: string) => {
    setLoading(true)
    setResult(null)
    setCheckedItems(new Set())

    try {
      const res = await fetch('/api/ai-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType: 'troubleshoot',
          situation,
          ageMonths: ageMonths || 0,
          details: '',
        }),
      })
      const data = await res.json()
      if (data.title) setResult(data)
    } catch { /* */ }
    setLoading(false)
  }

  const toggleCheck = (i: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const urgencyColors = {
    low: { bg: 'bg-[#F0F9F4]', border: 'border-[#D5E8DC]', text: 'text-[#2D7A4A]', label: '안심' },
    medium: { bg: 'bg-[#FFF8E8]', border: 'border-[#F5E6C0]', text: 'text-[#C4A35A]', label: '관찰 필요' },
    high: { bg: 'bg-[#FDE8E8]', border: 'border-[#F5C6C6]', text: 'text-[#D05050]', label: '주의' },
  }

  // 결과 화면
  if (result) {
    const uc = urgencyColors[result.urgency]
    return (
      <div className="space-y-3">
        {/* 헤더 */}
        <div className={`${uc.bg} ${uc.border} border rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-subtitle text-primary">{result.title}</p>
            <span className={`px-2.5 py-0.5 rounded-full text-label font-semibold ${uc.text} ${uc.bg}`}>
              {uc.label}
            </span>
          </div>
          <p className="text-body text-[#2D7A4A]">{result.reassurance}</p>
        </div>

        {/* 체크리스트 */}
        <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
          <p className="text-body font-bold text-primary mb-3">먼저 확인하세요</p>
          <div className="space-y-2">
            {result.checklist.map((item, i) => (
              <label key={i} className="flex items-start gap-3 py-1.5 cursor-pointer active:opacity-70">
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    checkedItems.has(i)
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                      : 'border-[#D1D5DB] bg-white'
                  }`}
                  onClick={() => toggleCheck(i)}
                >
                  {checkedItems.has(i) && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div onClick={() => toggleCheck(i)}>
                  <p className={`text-body font-medium ${checkedItems.has(i) ? 'text-tertiary line-through' : 'text-primary'}`}>{item.item}</p>
                  <p className="text-caption text-secondary">{item.detail}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 단계별 대응 */}
        <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
          <p className="text-body font-bold text-primary mb-3">단계별 대응 가이드</p>
          <div className="space-y-3">
            {result.steps.map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--color-accent-bg)] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-caption font-bold text-[var(--color-primary)]">{s.step}</span>
                </div>
                <div>
                  <p className="text-body font-semibold text-primary">{s.action}</p>
                  <p className="text-caption text-secondary leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 응급 신호 */}
        {result.emergencySign && (
          <div className="bg-[#FDE8E8] rounded-2xl border border-[#F5C6C6] p-4">
            <p className="text-body font-bold text-[#D05050] mb-1">이럴 때는 즉시 병원으로</p>
            <p className="text-body text-[#8B4513]">{result.emergencySign}</p>
            <a href="tel:119" className="inline-flex items-center gap-1 mt-2 text-body font-semibold text-[#D05050]"><PhoneIcon className="w-3.5 h-3.5" /> 119 전화하기</a>
          </div>
        )}

        {/* 추가 팁 */}
        {result.relatedTip && (
          <div className="p-3 rounded-xl bg-[#F0F4FF] border border-[#D5DFEF]">
            <p className="text-caption text-[#4A6FA5]">{result.relatedTip}</p>
          </div>
        )}

        <p className="text-label text-tertiary text-center">참고용 정보예요. 걱정되시면 소아과 상담을 추천드려요.</p>

        {/* 공유하기 + 다른 상황 보기 */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              const text = `${result.title}\n\n체크리스트:\n${result.checklist.map(c => `- ${c.item}`).join('\n')}\n\n${result.reassurance}\n\n— 도담 AI 트러블슈팅`
              if (navigator.share) navigator.share({ title: result.title, text }).catch(() => {})
              else if (navigator.clipboard) navigator.clipboard.writeText(text)
            }}
            className="flex-1 py-2.5 text-body text-[var(--color-primary)] font-semibold text-center"
          >
            공유하기
          </button>
          <button
            onClick={() => { setResult(null); setShowCustom(false) }}
            className="flex-1 py-2.5 text-body text-[var(--color-primary)] font-semibold text-center"
          >
            다른 상황 보기
          </button>
        </div>
      </div>
    )
  }

  // 로딩
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-5 text-center">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-body text-secondary">AI가 대응 가이드를 준비하고 있어요...</p>
      </div>
    )
  }

  // 상황 선택
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <WarningIcon className="w-4 h-4 text-[#D05050]" />
          <h3 className="text-body-emphasis font-bold text-primary">어떤 상황인가요?</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => fetchTroubleshoot(preset.situation)}
              className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-page-bg)] border border-transparent hover:border-[var(--color-primary)]/30 active:bg-[#E8E4DF] text-left transition-colors"
            >
              <preset.Icon className="w-5 h-5 shrink-0 text-secondary" />
              <span className="text-body text-primary font-medium">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 직접 입력 */}
      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
          className="w-full py-2.5 bg-white rounded-2xl border border-[#D5D0CA] text-body text-secondary text-center active:bg-[#F5F1EC]"
        >
          다른 상황 직접 입력하기
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="예: 아이가 밤에 자꾸 깨서 울어요..."
            className="w-full h-20 text-body bg-[var(--color-page-bg)] rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            maxLength={200}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowCustom(false)} className="px-3 py-1.5 text-body text-secondary">취소</button>
            <button
              onClick={() => { if (customInput.trim()) fetchTroubleshoot(customInput.trim()) }}
              disabled={!customInput.trim()}
              className="px-4 py-1.5 bg-[var(--color-primary)] text-white rounded-lg font-semibold disabled:opacity-40"
            >
              AI 분석
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
