// ===== 도담 (Dodam) 핵심 타입 정의 =====

// --- 회원 ---
export interface User {
  id: string
  provider: 'kakao' | 'google' | 'apple'
  email: string
  nickname: string
  region?: string
  push_token?: string
  status: 'active' | 'suspended' | 'withdrawn'
  created_at: string
  updated_at: string
}

// --- 아기 프로필 ---
export interface Child {
  id: string
  user_id: string
  name: string
  birthdate: string // YYYY-MM-DD
  sex?: 'male' | 'female' | 'not_specified'
  notes?: string
  photo_url?: string
  created_at: string
}

// --- 육아 이벤트 ---
export type EventType = 'feed' | 'sleep' | 'poop' | 'pee' | 'temp' | 'memo'
export type EventSource = 'quick_button' | 'gesture' | 'manual'

export interface CareEvent {
  id: string
  child_id: string
  recorder_id: string
  type: EventType
  start_ts: string
  end_ts?: string
  amount_ml?: number
  tags?: Record<string, unknown>
  source: EventSource
  synced?: boolean
  created_at: string
}

// --- 공동양육자 ---
export interface Caregiver {
  id: string
  child_id: string
  user_id: string
  role: 'primary' | 'caregiver'
  permissions: {
    record: boolean
    view: boolean
    edit: boolean
    delete: boolean
  }
  invite_token?: string
  invite_expires_at?: string
  accepted_at?: string
}

// --- AI 예측 ---
export interface Prediction {
  id: string
  child_id: string
  target: 'feed_next' | 'sleep_next'
  predicted_ts: string
  ci_low?: string
  ci_high?: string
  actual_ts?: string
  model_version: string
  created_at: string
}

// --- 이상 감지 ---
export type AnomalySeverity = 'info' | 'major' | 'critical'

export interface Anomaly {
  id: string
  child_id: string
  metric: 'feed_amount' | 'sleep_duration' | 'temperature' | 'record_gap'
  delta?: number
  severity: AnomalySeverity
  suggestion?: string
  acknowledged: boolean
  created_at: string
}

// --- 성장 기록 ---
export interface GrowthRecord {
  id: string
  child_id: string
  measured_at: string
  height_cm?: number
  weight_kg?: number
  head_cm?: number
  created_at: string
}

// --- 장소 ---
export type PlaceCategory =
  | 'pediatric'
  | 'kids_cafe'
  | 'nursing_room'
  | 'playground'
  | 'pharmacy'
  | 'culture_center'

export interface Place {
  id: string
  name: string
  category: PlaceCategory
  address: string
  location: { lat: number; lng: number }
  phone?: string
  hours?: Record<string, string>
  tags?: string[]
  avg_rating: number
  review_count: number
  source: 'api' | 'user' | 'admin'
  verified: boolean
  distance_km?: number // 클라이언트 계산
}

// --- 리뷰 ---
export interface Review {
  id: string
  place_id: string
  user_id: string
  rating: number // 1~5
  content: string // 10~500자
  tags?: string[]
  photos?: string[]
  child_age_months?: number
  created_at: string
  updated_at?: string
  user?: Pick<User, 'nickname'> // JOIN
}

// --- 퀵 버튼 ---
export interface QuickButtonConfig {
  type: EventType
  icon: string
  label: string
  color: string
}

// --- AI 제안 카드 ---
export type CardType = 'routine' | 'health' | 'emotion'

export interface AICard {
  id: string
  type: CardType
  title: string
  body: string
  disclaimer?: string
  action?: { label: string; href: string }
  dismissed: boolean
}
