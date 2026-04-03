/**
 * 검진 관련 배우자 알림 헬퍼
 * /api/push/partner 엔드포인트를 사용하여 배우자에게 검진 알림을 보냅니다.
 */

type CheckupNotifyType = 'scheduled' | 'completed' | 'result' | 'ultrasound'

interface CheckupNotifyParams {
  type: CheckupNotifyType
  checkupTitle: string
  babyNickname?: string
  date?: string
  mediaCount?: number
}

const NOTIFY_MESSAGES: Record<CheckupNotifyType, (p: CheckupNotifyParams) => { title: string; body: string }> = {
  scheduled: (p) => ({
    title: '검진 예약됐어요!',
    body: `${p.babyNickname || '아기'} ${p.checkupTitle} 예약${p.date ? ` (${p.date})` : ''}`,
  }),
  completed: (p) => ({
    title: '검진 완료!',
    body: `${p.babyNickname || '아기'} ${p.checkupTitle} 완료! 결과를 확인해보세요`,
  }),
  result: (p) => ({
    title: '검진 결과가 등록됐어요',
    body: `${p.babyNickname || '아기'} ${p.checkupTitle} 결과를 확인해보세요`,
  }),
  ultrasound: (p) => ({
    title: '새 초음파 사진이 올라왔어요',
    body: `${p.babyNickname || '아기'} ${p.checkupTitle} 초음파 ${p.mediaCount || 1}장`,
  }),
}

export async function notifyPartnerCheckup(params: CheckupNotifyParams): Promise<boolean> {
  try {
    const msg = NOTIFY_MESSAGES[params.type](params)
    const res = await fetch('/api/push/partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: msg.title,
        body: msg.body,
        tag: `checkup_${params.type}`,
        url: '/waiting',
      }),
    })
    if (!res.ok) return false
    const data = await res.json()
    return (data.sent ?? 0) > 0
  } catch {
    return false
  }
}
