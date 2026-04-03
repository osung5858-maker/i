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
