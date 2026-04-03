export interface CheckupSchedule {
  checkup_id: string
  title: string
  week?: number
  scheduled_date?: string
  scheduled_time?: string
  hospital?: string
  memo?: string
  completed: boolean
  completed_date?: string
  is_custom: boolean
}

export interface ScheduleFormData {
  checkup_id: string
  title: string
  week?: number
  scheduled_date: string
  scheduled_time?: string
  hospital?: string
  memo?: string
  is_custom: boolean
}

export type CheckupStatus = 'normal' | 'observe' | 'abnormal'

export interface CheckupMedia {
  type: 'image' | 'video'
  path: string
  url?: string
  thumbnail_url?: string
  uploaded_at: string
}

export interface CheckupResult {
  checkup_id: string
  date: string
  hospital?: string
  doctor?: string
  status: CheckupStatus
  memo?: string
  measurements?: Record<string, number>
  media: CheckupMedia[]
}

export interface CheckupResultFormData {
  checkup_id: string
  date: string
  hospital: string
  doctor: string
  status: CheckupStatus
  memo: string
  next_checkup_id?: string
  next_date?: string
  next_time?: string
}
