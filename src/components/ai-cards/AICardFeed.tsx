'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import type { CareEvent } from '@/types'
import { predictNextEvent, detectAnomalies } from '@/lib/ai/prediction-engine'

interface AICard {
  id: string
  type: 'routine' | 'health' | 'emotion' | 'info'
  colorBar: string
  icon: string
  body: string
  disclaimer?: string
}

function formatTimeRemaining(ts: string): string {
  const diff = new Date(ts).getTime() - Date.now()
  if (diff < 0) return '곧'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins}분 후`
  const hrs = Math.floor(mins / 60)
  const m = mins % 60
  return `${hrs}시간 ${m}분 후`
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

interface Props {
  events: CareEvent[]
}

export default function AICardFeed({ events }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<Record<string, 'helpful' | 'not_helpful'>>({})

  const cards = useMemo<AICard[]>(() => {
    const result: AICard[] = []

    // 루틴 예보
    const feedPred = predictNextEvent(events, 'feed')
    if (feedPred) {
      result.push({
        id: 'pred-feed',
        type: 'routine',
        colorBar: 'bg-[#0052FF]',
        icon: '🍼',
        body: `다음 수유는 ${formatTimeRemaining(feedPred.predicted_ts)}예요 (${formatTime(feedPred.predicted_ts)} ±${feedPred.ci_minutes}분)`,
      })
    }

    const sleepPred = predictNextEvent(events, 'sleep')
    if (sleepPred) {
      result.push({
        id: 'pred-sleep',
        type: 'routine',
        colorBar: 'bg-indigo-500',
        icon: '💤',
        body: `다음 낮잠은 ${formatTimeRemaining(sleepPred.predicted_ts)}예요 (${formatTime(sleepPred.predicted_ts)} ±${sleepPred.ci_minutes}분)`,
      })
    }

    // 이상 감지
    const anomalies = detectAnomalies(events)
    anomalies.forEach((a, i) => {
      result.push({
        id: `anomaly-${i}`,
        type: a.severity === 'info' ? 'info' : 'health',
        colorBar: a.severity === 'critical' ? 'bg-red-500' : a.severity === 'major' ? 'bg-orange-500' : 'bg-[#9B9B9B]',
        icon: a.severity === 'critical' ? '🚨' : a.severity === 'major' ? '⚠️' : 'ℹ️',
        body: a.message,
        disclaimer: a.severity !== 'info' ? '참고용 정보예요. 걱정되시면 소아과 상담을 추천드려요.' : undefined,
      })
    })

    return result
  }, [events])

  // 위치 기반 소아과 카드 (이상 감지 시)
  const [locationCard, setLocationCard] = useState<AICard | null>(null)

  useEffect(() => {
    const anomalies = detectAnomalies(events)
    const hasCritical = anomalies.some((a) => a.severity === 'critical')
    const hasMajor = anomalies.some((a) => a.metric === 'temperature')
    if (!hasCritical && !hasMajor) return

    // 위치 기반 카드 생성
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationCard({
            id: 'location-clinic',
            type: 'health',
            colorBar: hasCritical ? 'bg-red-500' : 'bg-orange-500',
            icon: '🏥',
            body: '근처 소아과를 확인해보세요. 지도에서 실시간 진료 가능한 소아과를 찾을 수 있어요.',
            disclaimer: '응급 상황 시 119에 연락하세요.',
          })
        },
        () => {
          // 위치 권한 거부 시에도 일반 카드 표시
          setLocationCard({
            id: 'location-clinic',
            type: 'health',
            colorBar: hasCritical ? 'bg-red-500' : 'bg-orange-500',
            icon: '🏥',
            body: '체온이 높아요. 가까운 소아과를 확인해보세요.',
          })
        },
        { timeout: 5000 }
      )
    }
  }, [events])

  // Gemini AI 감정 카드 (비동기)
  const [aiCard, setAiCard] = useState<AICard | null>(null)

  useEffect(() => {
    if (events.length < 5) return
    const todayCount = events.filter((e) => new Date(e.start_ts).toDateString() === new Date().toDateString()).length
    if (todayCount < 3) return

    fetch('/api/ai-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ageMonths: 0, // 부모 컴포넌트에서 전달 필요 시 추가
        cardType: 'emotion',
        context: `오늘 ${todayCount}건 기록, 수유 ${events.filter(e => e.type === 'feed').length}회, 수면 ${events.filter(e => e.type === 'sleep').length}회`,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.text) {
          setAiCard({
            id: 'ai-emotion',
            type: 'emotion',
            colorBar: 'bg-green-500',
            icon: '🤖',
            body: data.text,
          })
        }
      })
      .catch(() => {
        // 폴백: 템플릿
        setAiCard({
          id: 'ai-emotion',
          type: 'emotion',
          colorBar: 'bg-green-500',
          icon: '💛',
          body: '오늘 기록이 꾸준해요. 도담하게 잘하고 있어요!',
        })
      })
  }, [events])

  const extraCards = [locationCard, aiCard].filter(Boolean) as AICard[]
  const allCards = [...cards, ...extraCards]
  const visibleCards = allCards.filter((c) => !dismissed.has(c.id)).slice(0, 5)

  if (visibleCards.length === 0) return null

  return (
    <div className="px-4 space-y-2 mb-3">
      {visibleCards.map((card) => (
        <div
          key={card.id}
          className="flex rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden"
        >
          {/* 좌측 컬러 바 */}
          <div className={`w-1 ${card.colorBar} shrink-0`} />

          {/* 내용 */}
          <div className="flex-1 p-3.5">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#0A0B0D] leading-relaxed">
                  {card.body}
                </p>
                {card.disclaimer && (
                  <p className="text-[14px] text-[#9B9B9B] mt-1.5">⚠️ {card.disclaimer}</p>
                )}
                {card.type === 'health' && !feedback[card.id] && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setFeedback((p) => ({ ...p, [card.id]: 'helpful' }))}
                      className="text-[12px] px-2.5 py-1 rounded-full bg-[#E8F5EE] text-[#2D7A4A] font-medium"
                    >
                      도움이 됐어요
                    </button>
                    <button
                      onClick={() => setFeedback((p) => ({ ...p, [card.id]: 'not_helpful' }))}
                      className="text-[12px] px-2.5 py-1 rounded-full bg-[#F5F3F0] text-[#7A7672] font-medium"
                    >
                      아니요
                    </button>
                  </div>
                )}
                {feedback[card.id] && (
                  <p className="text-[12px] text-[#9E9A95] mt-2">
                    {feedback[card.id] === 'helpful' ? '피드백 감사해요! 더 정확해질게요.' : '알겠어요, 참고할게요.'}
                  </p>
                )}
                {card.id === 'location-clinic' && (
                  <Link href="/emergency" className="inline-block mt-2 text-[13px] font-semibold text-red-600">
                    가까운 소아과 찾기 →
                  </Link>
                )}
              </div>
              <button
                onClick={() => setDismissed((prev) => new Set(prev).add(card.id))}
                className="text-[#c0c0c0] hover:text-[#9B9B9B] shrink-0 text-xs p-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
