const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dodam.app'

function sendKakao(params: { title: string; description: string; link?: string; buttonTitle?: string }) {
  if (typeof window === 'undefined') return
  if (window.Kakao && !window.Kakao.isInitialized()) {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    if (key) window.Kakao.init(key)
  }
  if (!window.Kakao?.isInitialized()) {
    if (navigator.share) { navigator.share({ title: params.title, text: params.description, url: params.link || SITE_URL }).catch(() => {}); return }
    navigator.clipboard.writeText(`${params.title}\n${params.description}\n${params.link || SITE_URL}`).then(() => window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '공유 내용이 복사되었어요!' } }))).catch(() => {})
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

export function shareTodayRecord(childName: string, ageMonths: number, feedCount: number, sleepCount: number, poopCount: number) {
  sendKakao({
    title: `📋 ${childName}의 오늘 (${ageMonths}개월)`,
    description: `🍼 수유 ${feedCount}회 · 💤 수면 ${sleepCount}회 · 🩲 배변 ${poopCount}회\n\n오늘도 도담하게 잘 자라고 있어요 💚`,
    buttonTitle: '기록 보기',
  })
}

export function shareWeeklyReport(childName: string, ageMonths: number, avgFeed: number, avgSleep: number) {
  sendKakao({
    title: `📊 ${childName} 주간 리포트 (${ageMonths}개월)`,
    description: `이번 주 평균\n🍼 수유 ${avgFeed}회/일 · 💤 수면 ${avgSleep}시간/일\n\n꾸준히 기록하면 AI가 패턴을 분석해드려요`,
    buttonTitle: '리포트 보기',
  })
}

export function shareBirth(childName: string) {
  sendKakao({
    title: `🎉 ${childName}이(가) 태어났어요!`,
    description: `드디어 만났어요!\n임신 준비부터 출산까지, 긴 여정을 함께해주셔서 감사해요.\n\n이제 도담하게 함께 자라요 💛`,
    buttonTitle: '축하하러 가기',
  })
}

// === 이름 분석 결과 공유 ===
export function shareNameAnalysis(name: string, hanja: string, score: number, meaning: string) {
  sendKakao({
    title: `✨ ${name}(${hanja}) — ${score}점`,
    description: `${meaning}\n\n도담 AI 성명학 분석으로 이름의 음양오행을 확인해보세요`,
    link: `${SITE_URL}/name`,
    buttonTitle: '이름 분석하기',
  })
}

// === 발달 체크리스트 공유 ===
export function shareDevelopment(childName: string, ageMonths: number, done: number, total: number) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  sendKakao({
    title: `🎯 ${childName} ${ageMonths}개월 발달 체크`,
    description: `${done}/${total}개 달성 (${pct}%)\n\n아이마다 속도가 달라요. 도담하게 잘 자라고 있어요 💚`,
    buttonTitle: '발달 체크하기',
  })
}

// === 예방접종 진행률 공유 ===
export function shareVaccination(doneCount: number, totalCount: number) {
  sendKakao({
    title: `💉 예방접종 ${doneCount}/${totalCount} 완료`,
    description: `우리 아이 예방접종 진행률 ${Math.round((doneCount / totalCount) * 100)}%\n\n도담에서 스케줄 관리하고 있어요`,
    buttonTitle: '접종 스케줄 보기',
  })
}

// === 마음 체크 결과 공유 ===
export function shareMentalCheck(score: number, level: string) {
  sendKakao({
    title: `💚 마음 체크 결과 — ${level}`,
    description: `에든버러 산후우울증 척도(EPDS) ${score}점\n\n도담에서 정기적으로 마음 상태를 확인하고 있어요`,
    buttonTitle: '마음 체크하기',
  })
}

// === AI 이유식 식단 공유 ===
export function shareMealPlan(ageMonths: number, breakfast: string, lunch: string, snack: string) {
  sendKakao({
    title: `🍽️ ${ageMonths}개월 오늘의 이유식`,
    description: `아침: ${breakfast}\n점심: ${lunch}\n간식: ${snack}\n\nAI가 추천하는 맞춤 식단이에요`,
    buttonTitle: '식단 추천받기',
  })
}

// === 운세 공유 ===
export function shareFortune(todayLuck: string) {
  sendKakao({
    title: `🔮 오늘의 운세`,
    description: todayLuck.slice(0, 100) + '...\n\n도담에서 매일 운세를 확인해보세요',
    buttonTitle: '운세 보기',
  })
}

// === 형제자매 비교 공유 ===
export function shareSiblingCompare(insight: string) {
  sendKakao({
    title: `👶👶 형제자매 AI 인사이트`,
    description: insight.slice(0, 100) + '...\n\n도담 AI가 분석한 형제자매 성장 비교예요',
    buttonTitle: '비교 보기',
  })
}
