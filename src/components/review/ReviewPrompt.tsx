'use client'

import { useState, useEffect, useCallback } from 'react'
import { trackEvent } from '@/lib/analytics'

const STORAGE_KEY = 'dodam_review_prompt'
const MIN_DAYS = 3
const MIN_RECORDS = 10
const SNOOZE_DAYS = 14
const STORE_URL = 'https://dodam.life' // TODO: 앱스토어 URL로 교체

type ReviewState = {
  dismissed?: number   // timestamp
  completed?: boolean
  firstSeen?: number   // 앱 첫 사용 timestamp
  recordCount?: number
}

function getState(): ReviewState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

function setState(patch: Partial<ReviewState>) {
  const prev = getState()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...patch }))
}

export default function ReviewPrompt({ eventCount }: { eventCount: number }) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<'ask' | 'stars' | 'thanks' | 'feedback'>('ask')
  const [rating, setRating] = useState(0)

  useEffect(() => {
    const state = getState()

    // 이미 리뷰 완료
    if (state.completed) return

    // 스누즈 기간
    if (state.dismissed) {
      const daysSince = (Date.now() - state.dismissed) / 86400000
      if (daysSince < SNOOZE_DAYS) return
    }

    // 첫 사용일 기록
    if (!state.firstSeen) {
      setState({ firstSeen: Date.now() })
      return
    }

    // 최소 3일 사용
    const daysSinceFirst = (Date.now() - state.firstSeen) / 86400000
    if (daysSinceFirst < MIN_DAYS) return

    // 최소 10건 기록
    if (eventCount < MIN_RECORDS) return

    // 조건 충족 → 1.5초 후 노출
    const timer = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [eventCount])

  const dismiss = useCallback(() => {
    setState({ dismissed: Date.now() })
    setVisible(false)
    trackEvent('push_prompt_dismissed', { type: 'review' })
  }, [])

  const handleRating = useCallback((stars: number) => {
    setRating(stars)
    trackEvent('share_clicked', { type: 'review_rating', rating: stars })
    if (stars >= 4) {
      // 높은 별점 → 스토어로
      setStep('thanks')
      setState({ completed: true })
      setTimeout(() => {
        window.open(STORE_URL, '_blank')
        setVisible(false)
      }, 1200)
    } else {
      // 낮은 별점 → 피드백 폼
      setStep('feedback')
    }
  }, [])

  const handleFeedbackDone = useCallback(() => {
    setState({ completed: true })
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center" onClick={dismiss}>
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-2xl animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-8">
          {/* 닫기 */}
          <button onClick={dismiss} className="absolute top-4 right-4 text-xl text-gray-400 leading-none" aria-label="닫기">
            &times;
          </button>

          {step === 'ask' && (
            <div className="text-center space-y-4">
              <div className="text-4xl">🍼</div>
              <h3 className="text-subtitle font-bold text-primary">도담이 도움이 되고 있나요?</h3>
              <p className="text-body text-secondary">소중한 의견을 들려주세요</p>
              <button
                onClick={() => setStep('stars')}
                className="w-full py-3 rounded-xl font-bold text-white text-body-emphasis"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                별점 남기기
              </button>
              <button
                onClick={dismiss}
                className="w-full py-2.5 text-body text-tertiary"
              >
                나중에 할게요
              </button>
            </div>
          )}

          {step === 'stars' && (
            <div className="text-center space-y-5">
              <h3 className="text-subtitle font-bold text-primary">도담에 몇 점을 주시겠어요?</h3>
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    className="text-3xl transition-transform active:scale-110"
                    aria-label={`${star}점`}
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              <p className="text-body text-tertiary">탭해서 별점을 선택하세요</p>
            </div>
          )}

          {step === 'thanks' && (
            <div className="text-center space-y-3 py-4">
              <div className="text-4xl">🎉</div>
              <h3 className="text-subtitle font-bold text-primary">감사합니다!</h3>
              <p className="text-body text-secondary">스토어로 이동합니다...</p>
            </div>
          )}

          {step === 'feedback' && (
            <FeedbackForm rating={rating} onDone={handleFeedbackDone} onSkip={dismiss} />
          )}
        </div>

        {/* 하단 안전 영역 */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  )
}

function FeedbackForm({ rating, onDone, onSkip }: { rating: number; onDone: () => void; onSkip: () => void }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      // Supabase에 피드백 저장 (테이블 없으면 무시)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('user_records').insert({
        user_id: user?.id,
        record_date: new Date().toISOString().split('T')[0],
        type: 'app_feedback',
        value: { rating, text: text.trim() },
      }).catch(() => {})
      trackEvent('share_completed', { type: 'review_feedback', rating })
    } catch { /* */ }
    setSent(true)
    setTimeout(onDone, 1000)
  }

  if (sent) {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="text-4xl">💌</div>
        <h3 className="text-subtitle font-bold text-primary">피드백 감사합니다!</h3>
        <p className="text-body text-secondary">더 좋은 도담이 되겠습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-subtitle font-bold text-primary">어떤 점이 아쉬우셨나요?</h3>
      <p className="text-body text-secondary">의견을 남겨주시면 개선에 반영할게요</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="불편하셨던 점이나 바라는 점을 자유롭게 적어주세요"
        className="w-full h-24 p-3 rounded-xl border border-[#E8E4DF] text-body text-primary placeholder:text-tertiary resize-none focus:outline-none focus:border-[var(--color-primary)]"
        maxLength={500}
      />
      <div className="flex gap-2">
        <button
          onClick={onSkip}
          className="flex-1 py-3 rounded-xl text-body font-semibold text-tertiary bg-gray-100 active:bg-gray-200"
        >
          건너뛰기
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || sending}
          className="flex-1 py-3 rounded-xl text-body-emphasis font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {sending ? '보내는 중...' : '보내기'}
        </button>
      </div>
    </div>
  )
}
