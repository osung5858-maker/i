/**
 * 이벤트 관련 타입 정의
 * BottomNav, page.tsx 등에서 공통으로 사용
 */

export interface EventTags {
  // 수유/유축
  side?: 'left' | 'right'
  amount_ml?: number

  // 체온
  celsius?: number

  // 배변
  status?: 'normal' | 'soft' | 'hard' | 'none'
  color?: string

  // 수면
  sleepType?: 'night' | 'nap'

  // 기분
  mood?: 'happy' | 'excited' | 'calm' | 'tired' | 'anxious'

  // 이유식
  subtype?: 'rice' | 'veggie' | 'meat' | 'fruit' | 'etc'

  // 투약
  medicine?: string

  // 기타
  [key: string]: string | number | boolean | undefined
}

export interface FabEventDetail {
  type: string
  tags?: EventTags
  amount_ml?: number
  start_ts?: string
  end_ts?: string
  _handled?: boolean
}

export interface DurationSession {
  type: string
  label: string
  startTime: number
  tags?: EventTags
}
