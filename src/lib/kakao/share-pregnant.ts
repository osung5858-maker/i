const SITE_URL = 'https://dodam.life'

function sendKakao(params: { title: string; description: string; link?: string; buttonTitle?: string }) {
  if (typeof window === 'undefined') return
  if (window.Kakao && !window.Kakao.isInitialized()) {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    if (key) window.Kakao.init(key)
  }
  if (!window.Kakao?.isInitialized()) {
    if (navigator.share) { navigator.share({ title: params.title, text: params.description, url: params.link || SITE_URL }).catch(() => {}); return }
    navigator.clipboard.writeText(`${params.title}\n${params.description}\n${params.link || SITE_URL}`).then(() => alert('공유 내용이 복사되었어요!')).catch(() => {})
    return
  }
  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: params.title,
      description: params.description,
      imageUrl: `${SITE_URL}/icon-512x512.png`,
      link: { mobileWebUrl: params.link || SITE_URL, webUrl: params.link || SITE_URL },
    },
    buttons: [{ title: params.buttonTitle || '도담 열기', link: { mobileWebUrl: params.link || SITE_URL, webUrl: params.link || SITE_URL } }],
  })
}

export function shareFetalSize(week: number, fruit: string, name: string, length: string, weight: string, daysLeft: number) {
  sendKakao({
    title: `${fruit} 임신 ${week}주차 — D-${daysLeft}`,
    description: `지금 아기는 ${name}만해요!\n📏 ${length} / ⚖️ ${weight}\n\n만나는 날까지 ${daysLeft}일 남았어요 💛`,
    buttonTitle: '태아 성장 보기',
    link: `${SITE_URL}/pregnant`,
  })
}

export function shareDday(week: number, daysLeft: number, fruit: string) {
  sendKakao({
    title: `🤰 임신 ${week}주차 — D-${daysLeft}`,
    description: `${fruit} 우리 아기를 만나는 날까지\n${daysLeft}일 남았어요!\n\n도담하게 함께 준비하고 있어요`,
    buttonTitle: '도담 열기',
    link: `${SITE_URL}/pregnant`,
  })
}
