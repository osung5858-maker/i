export const DEFAULT_CHECKUPS = [
  { id: 'first_visit', week: 4, title: '첫 방문 (임신 확인)' },
  { id: 'first_us', week: 8, title: '첫 초음파 (심박 확인)' },
  { id: 'nt_scan', week: 11, title: 'NT 검사 (목덜미 투명대)' },
  { id: 'quad_test', week: 16, title: '쿼드 검사 (기형아 검사)' },
  { id: 'detailed_us', week: 20, title: '정밀 초음파' },
  { id: 'glucose_test', week: 24, title: '임신성 당뇨 검사' },
  { id: 'nst_1', week: 28, title: 'NST 검사 (1차)' },
  { id: 'nst_2', week: 32, title: 'NST 검사 (2차)' },
  { id: 'nst_3', week: 36, title: 'NST 검사 (3차)' },
] as const

export type DefaultCheckupId = (typeof DEFAULT_CHECKUPS)[number]['id']
