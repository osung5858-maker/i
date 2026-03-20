// 영유아 건강검진 + 국가 예방접종 일정 (질병관리청 기준)

export interface ScheduleItem {
  type: 'checkup' | 'vaccine'
  name: string
  startMonth: number // 시작 개월
  endMonth: number   // 종료 개월
  description: string
}

export const CHECKUP_SCHEDULE: ScheduleItem[] = [
  // 영유아 건강검진
  { type: 'checkup', name: '1차 건강검진', startMonth: 4, endMonth: 6, description: '신체계측, 발달평가, 안전사고 예방' },
  { type: 'checkup', name: '2차 건강검진', startMonth: 9, endMonth: 12, description: '신체계측, 발달평가, 영양/수면' },
  { type: 'checkup', name: '3차 건강검진', startMonth: 18, endMonth: 24, description: '신체계측, 발달평가, 구강검진' },
  { type: 'checkup', name: '4차 건강검진', startMonth: 30, endMonth: 36, description: '신체계측, 발달평가, 시력/청력' },
  { type: 'checkup', name: '5차 건강검진', startMonth: 42, endMonth: 48, description: '신체계측, 발달평가, 비만' },
  { type: 'checkup', name: '6차 건강검진', startMonth: 54, endMonth: 60, description: '신체계측, 발달평가, 취학준비' },
  { type: 'checkup', name: '7차 건강검진', startMonth: 66, endMonth: 71, description: '신체계측, 발달평가, 종합' },

  // 주요 예방접종
  { type: 'vaccine', name: 'BCG (결핵)', startMonth: 0, endMonth: 1, description: '생후 4주 이내' },
  { type: 'vaccine', name: 'B형간염 1차', startMonth: 0, endMonth: 0, description: '출생 시' },
  { type: 'vaccine', name: 'B형간염 2차', startMonth: 1, endMonth: 1, description: '생후 1개월' },
  { type: 'vaccine', name: 'DTaP 1차', startMonth: 2, endMonth: 2, description: '디프테리아/파상풍/백일해' },
  { type: 'vaccine', name: 'IPV 1차 (소아마비)', startMonth: 2, endMonth: 2, description: '생후 2개월' },
  { type: 'vaccine', name: 'DTaP 2차', startMonth: 4, endMonth: 4, description: '생후 4개월' },
  { type: 'vaccine', name: 'B형간염 3차', startMonth: 6, endMonth: 6, description: '생후 6개월' },
  { type: 'vaccine', name: 'MMR 1차', startMonth: 12, endMonth: 15, description: '홍역/유행성이하선염/풍진' },
  { type: 'vaccine', name: '수두', startMonth: 12, endMonth: 15, description: '생후 12~15개월' },
  { type: 'vaccine', name: 'A형간염 1차', startMonth: 12, endMonth: 23, description: '생후 12~23개월' },
  { type: 'vaccine', name: '일본뇌염 1차', startMonth: 12, endMonth: 23, description: '생후 12~23개월' },
]

export function getUpcomingSchedule(birthdate: string, limit: number = 5): (ScheduleItem & { dueDate: string; daysUntil: number; status: 'upcoming' | 'due' | 'overdue' })[] {
  const birth = new Date(birthdate)
  const now = new Date()
  const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())

  return CHECKUP_SCHEDULE
    .map((item) => {
      const dueDate = new Date(birth)
      dueDate.setMonth(dueDate.getMonth() + item.startMonth)
      const endDate = new Date(birth)
      endDate.setMonth(endDate.getMonth() + item.endMonth)

      const daysUntil = Math.round((dueDate.getTime() - now.getTime()) / 86400000)

      let status: 'upcoming' | 'due' | 'overdue' = 'upcoming'
      if (ageMonths >= item.startMonth && ageMonths <= item.endMonth) status = 'due'
      else if (ageMonths > item.endMonth) status = 'overdue'

      return {
        ...item,
        dueDate: dueDate.toISOString().split('T')[0],
        daysUntil,
        status,
      }
    })
    .filter((item) => item.status === 'due' || (item.status === 'upcoming' && item.daysUntil <= 90))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit)
}
