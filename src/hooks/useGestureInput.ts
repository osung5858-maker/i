'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import type { EventType } from '@/types'

interface GestureConfig {
  enabled: boolean
  onGesture: (type: EventType) => void
}

// 스와이프 방향 → 이벤트 타입 매핑
// 위: 수유, 아래: 대변, 왼쪽: 수면, 오른쪽: 소변
// 더블탭: 마지막 이벤트 반복
const SWIPE_MAP: Record<string, EventType> = {
  up: 'feed',
  down: 'poop',
  left: 'sleep',
  right: 'pee',
}

const MIN_DISTANCE = 24 // 최소 스와이프 거리 (px)
const MAX_ANGLE = 35 // 최대 허용 각도 (degrees)
const DEBOUNCE_MS = 600 // 제스처 간 최소 간격

interface SwipeResult {
  direction: 'up' | 'down' | 'left' | 'right' | null
  distance: number
}

function detectSwipe(startX: number, startY: number, endX: number, endY: number): SwipeResult {
  const dx = endX - startX
  const dy = endY - startY
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance < MIN_DISTANCE) return { direction: null, distance }

  const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI)

  // 수평 스와이프
  if (angle <= MAX_ANGLE) {
    return { direction: dx > 0 ? 'right' : 'left', distance }
  }
  // 수직 스와이프
  if (angle >= 90 - MAX_ANGLE) {
    return { direction: dy > 0 ? 'down' : 'up', distance }
  }

  return { direction: null, distance }
}

export function useGestureInput({ enabled, onGesture }: GestureConfig) {
  const startPos = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastGestureTime = useRef(0)
  const [lastGesture, setLastGesture] = useState<{ type: EventType; direction: string } | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return
    const touch = e.touches[0]
    startPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }, [enabled])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !startPos.current) return

    const now = Date.now()
    if (now - lastGestureTime.current < DEBOUNCE_MS) return

    const touch = e.changedTouches[0]
    const { direction, distance } = detectSwipe(
      startPos.current.x, startPos.current.y,
      touch.clientX, touch.clientY
    )

    if (direction && distance >= MIN_DISTANCE) {
      const eventType = SWIPE_MAP[direction]
      if (eventType) {
        lastGestureTime.current = now
        onGesture(eventType)

        // 햅틱 피드백
        if (navigator.vibrate) navigator.vibrate([15, 30, 15])

        // 시각적 피드백
        setLastGesture({ type: eventType, direction })
        setShowFeedback(true)
        setTimeout(() => setShowFeedback(false), 800)
      }
    }

    startPos.current = null
  }, [enabled, onGesture])

  useEffect(() => {
    if (!enabled) return
    const opts: AddEventListenerOptions = { passive: true }
    document.addEventListener('touchstart', handleTouchStart, opts)
    document.addEventListener('touchend', handleTouchEnd, opts)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchEnd])

  return { lastGesture, showFeedback }
}

// 제스처 모드 설정 관리
export function getGestureEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('dodam_gesture_mode') === 'true'
}

export function setGestureEnabled(enabled: boolean): void {
  localStorage.setItem('dodam_gesture_mode', enabled ? 'true' : 'false')
}

// 제스처 안내 오버레이용 데이터
export const GESTURE_GUIDE = [
  { direction: '↑ 위로', type: '수유', emoji: '🍼' },
  { direction: '↓ 아래로', type: '대변', emoji: '💩' },
  { direction: '← 왼쪽', type: '수면', emoji: '💤' },
  { direction: '→ 오른쪽', type: '소변', emoji: '💧' },
]
