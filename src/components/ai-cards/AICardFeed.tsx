'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import type { CareEvent } from '@/types'
import { predictNextEvent, detectAnomalies } from '@/lib/ai/prediction-engine'
import { BottleIcon, MoonIcon, AlertIcon, HospitalIcon, SparkleIcon, HeartIcon, HeartFilledIcon, XIcon } from '@/components/ui/Icons'

interface AICard {
  id: string
  type: 'routine' | 'health' | 'emotion' | 'info'
  colorBar: string
  icon: React.ReactNode
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
  childName?: string
  ageMonths?: number
  mood?: string
}

export default function AICardFeed({ events, childName, ageMonths, mood }: Props) {
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
        icon: <BottleIcon className="w-4 h-4" />,
        body: `다음 수유는 ${formatTimeRemaining(feedPred.predicted_ts)}예요 (${formatTime(feedPred.predicted_ts)} ±${feedPred.ci_minutes}분)`,
      })
    }

    const sleepPred = predictNextEvent(events, 'sleep')
    if (sleepPred) {
      result.push({
        id: 'pred-sleep',
        type: 'routine',
        colorBar: 'bg-indigo-500',
        icon: <MoonIcon className="w-4 h-4" />,
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
        icon: <AlertIcon className={`w-4 h-4 ${a.severity === 'critical' ? 'text-red-500' : a.severity === 'major' ? 'text-orange-500' : 'text-tertiary'}`} />,
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
            icon: <HospitalIcon className="w-4 h-4" />,
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
            icon: <HospitalIcon className="w-4 h-4" />,
            body: '체온이 높아요. 가까운 소아과를 확인해보세요.',
          })
        },
        { timeout: 5000 }
      )
    }
  }, [events])

  // Gemini AI 감정 카드 (고도화 — 부모 mood + 상세 데이터)
  const [aiCard, setAiCard] = useState<AICard | null>(null)

  useEffect(() => {
    if (events.length < 5) return
    const today = new Date().toDateString()
    const todayEvents = events.filter((e) => new Date(e.start_ts).toDateString() === today)
    if (todayEvents.length < 3) return

    const feedEvents = todayEvents.filter(e => e.type === 'feed')
    const sleepEvents = todayEvents.filter(e => e.type === 'sleep')
    const poopEvents = todayEvents.filter(e => e.type === 'poop')
    const feedTotal = feedEvents.reduce((s, e) => s + (e.amount_ml || 0), 0)
    const sleepTotal = sleepEvents.reduce((s, e) => {
      if (!e.end_ts) return s
      return s + Math.round((new Date(e.end_ts).getTime() - new Date(e.start_ts).getTime()) / 60000)
    }, 0)
    const sleepActive = sleepEvents.some(e => !e.end_ts)

    const colorMap: Record<string, string> = { warm: 'bg-orange-400', calm: 'bg-blue-400', energy: 'bg-green-500', cozy: 'bg-purple-400' }

    fetch('/api/ai-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardType: 'emotion',
        ageMonths: ageMonths || 0,
        childName: childName || '',
        feedCount: feedEvents.length,
        sleepCount: sleepEvents.length,
        poopCount: poopEvents.length,
        feedTotal: feedTotal || undefined,
        sleepTotal: sleepTotal || undefined,
        sleepActive,
        mood: mood || undefined,
        hour: new Date().getHours(),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.title && data.body) {
          setAiCard({
            id: 'ai-emotion',
            type: 'emotion',
            colorBar: colorMap[data.colorTag] || 'bg-green-500',
            icon: <HeartFilledIcon className="w-5 h-5 text-[#2D7A4A]" />,
            body: `${data.title} — ${data.body}`,
          })
        } else if (data.text) {
          setAiCard({
            id: 'ai-emotion',
            type: 'emotion',
            colorBar: 'bg-green-500',
            icon: <SparkleIcon className="w-4 h-4" />,
            body: data.text,
          })
        }
      })
      .catch(() => {
        setAiCard({
          id: 'ai-emotion',
          type: 'emotion',
          colorBar: 'bg-green-500',
          icon: <HeartIcon className="w-4 h-4 text-[#C4A35A]" />,
          body: '오늘 기록이 꾸준해요. 도담하게 잘하고 있어요!',
        })
      })
  }, [events, childName, ageMonths, mood])

  const extraCards = [locationCard, aiCard].filter(Boolean) as AICard[]
  const allCards = [...cards, ...extraCards]
  const visibleCards = allCards.filter((c) => !dismissed.has(c.id)).slice(0, 5)

  if (visibleCards.length === 0) return null

  return (
    <>
      <div className="px-4 space-y-3 mb-4">
        {visibleCards.map((card, idx) => {
          const isRoutine = card.type === 'routine'
          const isEmotion = card.type === 'emotion'
          const isHealth = card.type === 'health'
          const isCritical = card.colorBar.includes('red')

          // 카드 타입별 그라데이션 (테마 변수 적용)
          const gradientMap: Record<string, string> = {
            routine: 'from-blue-50 to-white',
            emotion: 'from-[var(--color-primary-bg)] to-white',
            health: isCritical ? 'from-red-50 to-white' : 'from-orange-50 to-white',
            info: 'from-[var(--color-surface-alt)] to-white',
          }

          return (
            <div
              key={card.id}
              className={`rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-gradient-to-b ${gradientMap[card.type]} border border-[#E8E4DF] dodam-ai-card`}
              style={{
                animation: `dodam-slideUp 0.3s ease-out ${idx * 0.1}s both`
              }}
            >
              {/* 헤더 영역 */}
              <div className="relative px-5 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  {/* 아이콘 */}
                  <div className={`w-12 h-12 rounded-2xl ${
                    isRoutine ? 'bg-blue-50 shadow-[0_2px_8px_rgba(0,82,255,0.15)]' :
                    isEmotion ? 'bg-[var(--color-primary-bg)] shadow-[0_2px_8px_var(--color-card-shadow)]' :
                    isHealth ? (isCritical ? 'bg-red-50 shadow-[0_2px_8px_rgba(239,68,68,0.15)]' : 'bg-orange-50 shadow-[0_2px_8px_rgba(245,158,11,0.15)]') :
                    'bg-[var(--color-surface-alt)]'
                  } flex items-center justify-center shrink-0`}>
                    <span className="text-xl">{card.icon}</span>
                  </div>

                  {/* 텍스트 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label font-bold ${
                        isRoutine ? 'bg-blue-100 text-blue-700' :
                        isEmotion ? 'bg-pink-100 text-pink-700' :
                        isHealth ? (isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700') :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {isRoutine ? '루틴 예보' : isEmotion ? 'AI 케어' : isHealth ? (isCritical ? '긴급' : '건강') : '정보'}
                      </span>
                    </div>
                    <p className="text-subtitle text-primary leading-snug mt-1.5">
                      {card.body}
                    </p>
                  </div>

                  {/* 닫기 버튼 */}
                  <button
                    onClick={() => setDismissed((prev) => new Set(prev).add(card.id))}
                    className="text-muted hover:text-secondary shrink-0 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* 프로그레스 바 (루틴 예보만) */}
                {isRoutine && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-white rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full ${card.colorBar} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: '65%' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 푸터 영역 */}
              {(card.disclaimer || card.type === 'health' || card.id === 'location-clinic') && (
                <div className="px-5 pb-4">
                  {card.disclaimer && (
                    <p className="text-body text-secondary leading-relaxed bg-white/60 px-3 py-2 rounded-xl border border-[#E8E4DF]/50">
                      💡 {card.disclaimer}
                    </p>
                  )}

                  {card.type === 'health' && !feedback[card.id] && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setFeedback((p) => ({ ...p, [card.id]: 'helpful' }))}
                        className="flex-1 text-body px-4 py-2.5 rounded-xl bg-white border border-[#E8E4DF] text-[var(--color-primary)] font-semibold active:bg-[#FAFAF8] transition-colors shadow-sm"
                      >
                        👍 도움됐어요
                      </button>
                      <button
                        onClick={() => setFeedback((p) => ({ ...p, [card.id]: 'not_helpful' }))}
                        className="flex-1 text-body px-4 py-2.5 rounded-xl bg-white border border-[#E8E4DF] text-secondary font-medium active:bg-[#FAFAF8] transition-colors"
                      >
                        아니요
                      </button>
                    </div>
                  )}

                  {feedback[card.id] && (
                    <p className="text-body text-[var(--color-primary)] mt-3 font-medium">
                      {feedback[card.id] === 'helpful' ? '✨ 피드백 감사해요! 더 정확해질게요.' : '알겠어요, 참고할게요.'}
                    </p>
                  )}

                  {card.id === 'location-clinic' && (
                    <Link href="/emergency" className="flex items-center justify-center gap-2 mt-3 px-4 py-3 rounded-xl bg-red-500 text-white text-body-emphasis font-bold active:bg-red-600 transition-colors shadow-lg">
                      <HospitalIcon className="w-4 h-4" />
                      가까운 소아과 찾기 →
                    </Link>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        @keyframes dodam-slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
