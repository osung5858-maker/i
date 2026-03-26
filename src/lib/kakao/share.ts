// 카카오톡 공유 유틸리티 — 임신 준비 모드
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dodam.app'

function sendKakao(params: {
  title: string
  description: string
  imageUrl?: string
  link?: string
  buttonTitle?: string
}) {
  if (typeof window === 'undefined') return

  // SDK 미로딩 시 초기화 시도
  if (window.Kakao && !window.Kakao.isInitialized()) {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    if (key) window.Kakao.init(key)
  }

  if (!window.Kakao?.isInitialized()) {
    // 카카오 SDK 사용 불가 시 웹 공유 폴백
    if (navigator.share) {
      navigator.share({ title: params.title, text: params.description, url: params.link || SITE_URL }).catch(() => {})
      return
    }
    // 클립보드 폴백
    navigator.clipboard.writeText(`${params.title}\n${params.description}\n${params.link || SITE_URL}`)
      .then(() => window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '공유 내용이 복사되었어요!' } })))
      .catch(() => window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '카카오톡 공유를 사용할 수 없어요' } })))
    return
  }

  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: params.title,
      description: params.description,
      imageUrl: params.imageUrl || `${SITE_URL}/icon-512x512.png`,
      link: { mobileWebUrl: params.link || SITE_URL, webUrl: params.link || SITE_URL },
    },
    buttons: [
      {
        title: params.buttonTitle || '도담 열기',
        link: { mobileWebUrl: params.link || SITE_URL, webUrl: params.link || SITE_URL },
      },
    ],
  })
}

// 1. 아기에게 보내는 편지 공유
export function shareLetter(letterText: string, aiReply: string, letterCount: number) {
  sendKakao({
    title: `✉️ 아이에게 보내는 ${letterCount}번째 편지`,
    description: `"${letterText.slice(0, 60)}${letterText.length > 60 ? '...' : ''}"\n\n💌 아이의 답장: "${aiReply.slice(0, 50)}..."`,
    buttonTitle: '편지 보러가기',
    link: `${SITE_URL}/waiting`,
  })
}

// 2. 임신 테스트 양성 축하
export function sharePositiveTest() {
  sendKakao({
    title: '🎉 우리 아이가 찾아왔어요!',
    description: '임신 테스트 양성!\n기다리고 준비한 시간이 드디어 결실을 맺었어요.\n함께 축하해주세요 💛',
    buttonTitle: '축하하러 가기',
    link: `${SITE_URL}/celebration`,
  })
}

// 3. 준비 현황 카드
export function shareProgress(stats: {
  letters: number
  appointments: number
  totalAppointments: number
  supplements: number
  partnerChecks: number
  days: number
}) {
  const lines = [
    `📅 함께 준비한 날: ${stats.days}일`,
    `✉️ 아이에게 보낸 편지: ${stats.letters}통`,
    `🏥 완료한 검사: ${stats.appointments}/${stats.totalAppointments}개`,
    `💊 오늘 영양제: ${stats.supplements}/4`,
    `💑 배우자 건강: ${stats.partnerChecks}/6`,
  ]
  sendKakao({
    title: '📋 우리의 임신 준비 현황',
    description: lines.join('\n'),
    buttonTitle: '함께 준비하기',
    link: `${SITE_URL}/preparing`,
  })
}

// 4. AI 조언 공유
export function shareAIAdvice(greeting: string, mainAdvice: string, phase: string) {
  const phaseLabel: Record<string, string> = {
    fertile: '🔥 가임기', ovulation: '🎯 배란일', tww: '🤞 착상 대기',
    follicular: '🌱 난포기', period: '🔴 생리 중',
  }
  sendKakao({
    title: `✨ 오늘의 AI 케어 — ${phaseLabel[phase] || ''}`,
    description: `${greeting}\n\n${mainAdvice.slice(0, 100)}${mainAdvice.length > 100 ? '...' : ''}`,
    buttonTitle: '자세히 보기',
    link: `${SITE_URL}/preparing`,
  })
}

// 5. 배우자 건강 체크 넛지
export function sharePartnerNudge(done: number, total: number) {
  const remaining = total - done
  const items: Record<string, string> = {
    p_nosmoking: '🚭 금연', p_nodrink: '🍷 금주', p_vitamin: '💊 비타민·아연',
    p_checkup: '🏥 건강검진', p_nosauna: '♨️ 사우나 자제', p_weight: '⚖️ 적정 체중',
  }
  sendKakao({
    title: remaining > 0 ? `💑 건강 체크 ${remaining}개 남았어요!` : '💑 건강 체크 완료! 👏',
    description: remaining > 0
      ? `우리 아이를 위해 건강 체크리스트를 완성해주세요!\n현재 ${done}/${total}개 완료\n\n함께 준비하면 더 좋은 결과가 있을 거예요 💪`
      : `배우자 건강 체크리스트 ${total}개 모두 완료!\n최고예요, 이 조합이면 우리 아이도 건강할 거예요 ✨`,
    buttonTitle: '체크하러 가기',
    link: `${SITE_URL}/preparing`,
  })
}
