'use client'

import { useState, useEffect } from 'react'
import { BellIcon, XIcon } from '@/components/ui/Icons'
import { subscribePush, isPushSubscribed } from '@/lib/push/subscribe'

const DISMISSED_KEY = 'dodam_push_prompt_dismissed'
const SHOWN_COUNT_KEY = 'dodam_push_prompt_shown'
const MAX_SHOWS = 3 // 최대 3번만 제안

interface Props {
  /** 제안 메시지 커스텀 */
  message?: string
  /** 표시 조건 추가 체크 */
  show?: boolean
}

/**
 * 푸시 알림 동의 프롬프트
 *
 * - 첫 AI 결과 표시 후 등 자연스러운 타이밍에 노출
 * - 이미 구독 중이면 안 보임
 * - 3번 닫으면 더 이상 안 보임
 * - "나중에" 선택 시 다음 세션에서 다시 표시
 */
export default function PushPrompt({ message, show = true }: Props) {
  const [visible, setVisible] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!show) return
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    // 이미 구독 중이면 안 보임
    isPushSubscribed().then(subscribed => {
      if (subscribed) return

      // 이미 권한 거부했으면 안 보임
      if (Notification.permission === 'denied') return

      // 영구 닫기했으면 안 보임
      if (localStorage.getItem(DISMISSED_KEY) === 'permanent') return

      // 표시 횟수 체크
      const shown = Number(localStorage.getItem(SHOWN_COUNT_KEY) || 0)
      if (shown >= MAX_SHOWS) {
        localStorage.setItem(DISMISSED_KEY, 'permanent')
        return
      }

      // 이번 세션에서 이미 닫았으면 안 보임
      if (sessionStorage.getItem(DISMISSED_KEY)) return

      // 약간 딜레이 후 표시 (AI 결과 읽을 시간)
      const timer = setTimeout(() => {
        setVisible(true)
        localStorage.setItem(SHOWN_COUNT_KEY, String(shown + 1))
      }, 2000)

      return () => clearTimeout(timer)
    })
  }, [show])

  const handleSubscribe = async () => {
    setSubscribing(true)
    const ok = await subscribePush()
    setSubscribing(false)

    if (ok) {
      localStorage.setItem(DISMISSED_KEY, 'permanent') // 성공하면 더 이상 안 보임
      setVisible(false)
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '알림이 설정됐어요!' } }))
    } else {
      // 권한 거부 시
      setVisible(false)
      sessionStorage.setItem(DISMISSED_KEY, '1')
    }
  }

  const handleLater = () => {
    setVisible(false)
    sessionStorage.setItem(DISMISSED_KEY, '1') // 이번 세션만 숨김
  }

  const handleNever = () => {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, 'permanent')
  }

  if (!visible) return null

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
          <BellIcon className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-bold text-[#1A1918]">
            {message || '다음 수유 시간을 알려드릴까요?'}
          </p>
          <p className="text-[13px] text-[#6B6966] mt-0.5 leading-relaxed">
            AI가 예측한 수유·수면 시간에 맞춰 알림을 보내드려요
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white text-[13px] font-semibold active:opacity-80"
            >
              {subscribing ? '설정 중...' : '좋아요'}
            </button>
            <button
              onClick={handleLater}
              className="px-3 py-2 rounded-lg text-[13px] text-[#6B6966] active:bg-[#F0EDE8]"
            >
              나중에
            </button>
          </div>

          <button
            onClick={handleNever}
            className="text-[11px] text-[#D0CCC7] mt-2 active:text-[#9E9A95]"
          >
            다시 묻지 않기
          </button>
        </div>
        <button onClick={handleLater} className="text-[#D0CCC7] p-0.5">
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
