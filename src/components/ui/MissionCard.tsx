'use client'

import { useState, useEffect, memo } from 'react'
import { HeartFilledIcon } from '@/components/ui/Icons'
import { fetchUserRecords, insertUserRecord } from '@/lib/supabase/userRecord'
import { getProfile } from '@/lib/supabase/userProfile'
import { createClient } from '@/lib/supabase/client'

type Mode = 'preparing' | 'pregnant' | 'parenting'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dodam.life'

const MISSIONS: Record<Mode, { emoji: string; title: string; desc: string; sendMsg: string }[]> = {
  preparing: [
    { emoji: '🚶', title: '오늘 15분 같이 걷기', desc: '가벼운 산책이 배란 건강에 도움돼요', sendMsg: '오늘 퇴근하고 15분만 같이 걸어요 🚶 건강에도 좋고 둘이 얘기도 나눠요!' },
    { emoji: '💊', title: '비타민 챙겨주기', desc: '파트너가 엽산을 먹었는지 확인해주세요', sendMsg: '오늘 엽산 챙겼어요? 💊 같이 챙겨먹어요!' },
    { emoji: '🍳', title: '오늘 저녁 같이 요리하기', desc: '영양 가득한 식사를 함께 만들어요', sendMsg: '오늘 저녁 같이 만들어볼까요? 🍳 재료 생각해놓을게요!' },
    { emoji: '📖', title: '임신 준비 책 10분 함께 읽기', desc: '같이 공부하면 더 든든해요', sendMsg: '오늘 10분만 같이 읽어요 📖 같이 공부하면 더 든든하잖아요 💛' },
    { emoji: '🌙', title: '일찍 함께 잠들기', desc: '규칙적인 수면이 임신 준비의 기본이에요', sendMsg: '오늘은 일찍 같이 자요 🌙 수면이 제일 중요하대요!' },
    { emoji: '☕', title: '카페인 줄이기 도전', desc: '오늘 하루 커피 1잔 이하로 함께 줄여봐요', sendMsg: '오늘 커피 1잔만 마시기 도전! ☕ 나도 같이 줄여볼게요 💪' },
    { emoji: '📅', title: '병원 예약 같이 잡기', desc: '산전 검사 일정을 함께 잡아보세요', sendMsg: '오늘 병원 예약 같이 잡아볼까요? 📅 언제 시간 돼요?' },
    { emoji: '🧘', title: '5분 명상 함께하기', desc: '마음의 여유가 임신에 도움돼요', sendMsg: '자기 전에 5분만 같이 명상해요 🧘 앱 틀어놓을게요!' },
    { emoji: '💬', title: '아이 이름 후보 3개 말하기', desc: '이름 얘기를 나눠보면 기대감이 올라요', sendMsg: '오늘 이름 후보 3개씩 생각해와요 💬 얘기해봐요!' },
    { emoji: '🛁', title: '따뜻한 족욕 함께하기', desc: '혈액순환에 좋아요, 30분이면 충분해요', sendMsg: '오늘 족욕 같이 해요 🛁 30분이면 돼요, 혈액순환에 좋대요!' },
  ],
  pregnant: [
    { emoji: '📖', title: '태담 같이 읽어주기', desc: '파트너 목소리도 아기가 느껴요', sendMsg: '오늘 자기 전에 아기한테 같이 말 걸어줘요 📖 목소리 들린대요 💛' },
    { emoji: '🦶', title: '발 마사지 10분 해주기', desc: '부종에 최고예요, 발바닥부터 천천히', sendMsg: '오늘 발 마사지 10분만 해줄 수 있어요? 🦶 부종이 심해서요ㅠ' },
    { emoji: '🍎', title: '과일 간식 깎아주기', desc: '달콤한 마음도 함께 전달돼요', sendMsg: '오늘 과일 깎아줄 수 있어요? 🍎 달콤한 거 먹고 싶어요!' },
    { emoji: '🎵', title: '태교 음악 같이 30분 듣기', desc: '클래식이나 잔잔한 음악 추천해요', sendMsg: '오늘 저녁에 태교 음악 같이 들어요 🎵 30분만요!' },
    { emoji: '📸', title: '배 사진 한 장 찍어주기', desc: '소중한 순간, 나중에 보물이 돼요', sendMsg: '오늘 배 사진 한 장 찍어줄 수 있어요? 📸 나중에 보물이 될 것 같아서요 💛' },
    { emoji: '🛒', title: '출산 준비물 목록 함께 점검', desc: '준비가 되어 있으면 마음이 놓여요', sendMsg: '오늘 출산 준비물 같이 점검해봐요 🛒 리스트 만들어 놨어요!' },
    { emoji: '🌳', title: '공원 산책 20분 함께하기', desc: '신선한 공기가 엄마와 아기 모두에게 좋아요', sendMsg: '오늘 공원 20분만 같이 걸어요 🌳 셋이서 산책해요!' },
    { emoji: '💆', title: '어깨 마사지 해주기', desc: '임신 중 어깨와 등이 많이 피곤해요', sendMsg: '어깨가 너무 뭉쳤어요 💆 마사지 좀 해줄 수 있어요?' },
    { emoji: '🍽️', title: '오늘 저녁 파트너가 담당하기', desc: '설거지까지 해주면 만점이에요', sendMsg: '오늘 저녁이랑 설거지 부탁해도 돼요? 🍽️ 너무 힘들어서요ㅠ 고마워요 💛' },
    { emoji: '🌙', title: '자기 전 태담 3분 하기', desc: '"오늘도 잘 자라줘서 고마워" 한마디부터', sendMsg: '자기 전에 아기한테 한마디 해줄 수 있어요? 🌙 3분이면 돼요!' },
  ],
  parenting: [
    { emoji: '🛁', title: '목욕 역할 바꾸기', desc: '오늘은 평소와 다른 사람이 목욕 담당해요', sendMsg: '오늘 목욕은 당신이 담당해줄 수 있어요? 🛁 나 좀 쉬고 싶어요ㅠ' },
    { emoji: '📸', title: '아기 사진 1장 서로에게 보내기', desc: '귀여운 순간을 공유해요', sendMsg: '오늘 아기 귀여운 순간 포착하면 나한테 사진 보내줘요 📸 나도 보낼게요!' },
    { emoji: '🌙', title: '재우기 역할 바꾸기', desc: '오늘 밤은 파트너가 재워볼게요', sendMsg: '오늘 재우기는 당신이 해줄 수 있어요? 🌙 내가 너무 힘들어서요ㅠ' },
    { emoji: '☕', title: '파트너 쉬는 시간 30분 만들기', desc: '아기를 맡고 파트너가 쉬게 해주세요', sendMsg: '오늘 30분만 아기 봐줄 수 있어요? ☕ 잠깐 쉬고 싶어요!' },
    { emoji: '🎶', title: '아기와 같이 노래 부르기', desc: '자장가든 동요든 함께 불러봐요', sendMsg: '오늘 같이 아기한테 노래 불러줘요 🎶 뭐 부를지 생각해와요!' },
    { emoji: '💬', title: '오늘 하루 육아 소감 나누기', desc: '힘들었던 것, 뿌듯했던 것 5분만 얘기해요', sendMsg: '오늘 자기 전에 5분만 얘기해요 💬 힘든 것도 뿌듯한 것도 다요!' },
    { emoji: '📖', title: '그림책 1권 같이 읽어주기', desc: '목소리를 들려주면 언어 발달에 좋아요', sendMsg: '오늘 같이 그림책 읽어줘요 📖 같이 읽어주면 더 좋잖아요 💛' },
    { emoji: '🍼', title: '수유/분유 역할 한 번 바꾸기', desc: '교대하면 둘 다 쉴 수 있어요', sendMsg: '오늘 수유 한 번만 당신이 해줄 수 있어요? 🍼 교대해요!' },
    { emoji: '🧸', title: '20분 바닥 놀이 함께하기', desc: '쭈그리고 아기 눈높이에서 놀아줘요', sendMsg: '오늘 같이 바닥 놀이 20분만 해요 🧸 나 혼자 하기 힘들어서요ㅠ' },
    { emoji: '🫂', title: '파트너에게 수고했어 전하기', desc: '"오늘도 수고했어" 한마디가 큰 힘이 돼요', sendMsg: '오늘도 수고했어요 🫂 당신 덕분에 버텨요, 진짜로요 💛' },
  ],
}

const MILESTONES = [
  { day: 7,  emoji: '🌟', title: '7일 연속 전송!',  msg: '일주일 내내 서로 챙겼어요\n정말 든든한 파트너예요',  badge: '든든한 파트너' },
  { day: 14, emoji: '💫', title: '14일 연속 전송!', msg: '2주 연속! 두 분의 호흡이\n정말 잘 맞아요',          badge: '호흡 맞는 커플' },
  { day: 30, emoji: '👑', title: '30일 연속 전송!', msg: '한 달을 함께 해냈어요\n두 분은 전설이에요',        badge: '전설의 커플' },
]

function getLevel(streak: number): string {
  if (streak >= 30) return '👑 전설의 커플'
  if (streak >= 14) return '💫 호흡 맞는 커플'
  if (streak >= 7)  return '🌟 든든한 파트너'
  if (streak >= 4)  return '💛 다정한 파트너'
  return ''
}

function getDailyMissionIdx(mode: Mode): number {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return seed % MISSIONS[mode].length
}

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function sendMission(mission: { emoji: string; title: string; sendMsg: string }, provider: 'kakao' | 'google' | '') {
  const text = `${mission.emoji} 오늘의 부부 미션\n\n${mission.sendMsg}\n\n— 도담 앱에서 보냄`
  const url = SITE_URL

  if (typeof window === 'undefined') return

  // 구글 로그인 → FCM 푸시로 파트너에게 전송
  if (provider === 'google') {
    try {
      const res = await fetch('/api/push/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${mission.emoji} 오늘의 부부 미션: ${mission.title}`,
          body: mission.sendMsg,
          url,
          tag: 'mission',
        }),
      })
      const data = await res.json()
      if (data.sent > 0) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '파트너에게 푸시 알림을 보냈어요!' } }))
      } else if (data.reason === 'no_partner') {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '연결된 파트너가 없어요. 초대해보세요!' } }))
      } else {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '파트너의 알림 설정을 확인해주세요.' } }))
      }
    } catch {
      // FCM 실패 시 Web Share 폴백
      if (navigator.share) {
        navigator.share({ title: `${mission.emoji} 오늘의 부부 미션`, text, url }).catch(() => {})
      }
    }
    return
  }

  // 카카오 로그인 → 카카오톡 공유
  if (window.Kakao && !window.Kakao.isInitialized()) {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    if (key) window.Kakao.init(key)
  }

  if (window.Kakao?.isInitialized()) {
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `${mission.emoji} 오늘의 부부 미션: ${mission.title}`,
        description: mission.sendMsg,
        imageUrl: `${url}/icon-512x512.png`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: '도담 열기', link: { mobileWebUrl: url, webUrl: url } }],
    })
    return
  }

  // 폴백: Web Share → 클립보드
  if (navigator.share) {
    navigator.share({ title: `${mission.emoji} 오늘의 부부 미션`, text, url }).catch(() => {})
    return
  }

  navigator.clipboard.writeText(text).then(() => {
    window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '미션이 클립보드에 복사됐어요!' } }))
  }).catch(() => {})
}

function MissionCard({ mode }: { mode: Mode }) {
  const idx = getDailyMissionIdx(mode)
  const mission = MISSIONS[mode][idx]
  const [dismissed, setDismissed] = useState(false)
  const [sent, setSent] = useState(false)
  const [streak, setStreak] = useState(0)
  const [milestone, setMilestone] = useState<typeof MILESTONES[number] | null>(null)
  const [myRole, setMyRole] = useState<'mom' | 'dad' | null>(null)
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [authProvider, setAuthProvider] = useState<'kakao' | 'google' | ''>('')

  useEffect(() => {
    getProfile().then(p => {
      if (p?.my_role) setMyRole(p.my_role as 'mom' | 'dad')
    }).catch(() => {}).finally(() => setRoleLoaded(true))

    // OAuth provider 감지
    createClient().auth.getUser().then(({ data: { user } }: { data: { user: { app_metadata?: Record<string, string> } | null } }) => {
      if (user) {
        const provider = user.app_metadata?.provider || ''
        if (provider === 'kakao') setAuthProvider('kakao')
        else if (provider === 'google') setAuthProvider('google')
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem(`dodam_mission_dismissed_${mode}`) === '1') { setDismissed(true); return }
    fetchUserRecords(['mission_sent']).then(rows => {
      const today = getTodayKey()
      const modeRows = rows.filter(r => (r.value as any).mode === mode)
      const todayRow = modeRows.find(r => r.record_date === today)
      if (todayRow) setSent(true)

      // Calculate streak
      let count = 0
      const dates = new Set(modeRows.map(r => r.record_date))
      const d = new Date()
      for (let i = 1; i <= 30; i++) {
        d.setDate(d.getDate() - 1)
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (dates.has(ds)) count++
        else break
      }
      setStreak(count)
    }).catch(() => {})
  }, [mode])

  const handleSend = () => {
    sendMission(mission, authProvider)

    if (!sent) {
      const today = getTodayKey()
      insertUserRecord(today, 'mission_sent', { mode }).catch(() => {})
      setSent(true)
      const newStreak = streak + 1
      setStreak(newStreak)
      const hit = MILESTONES.find(m => m.day === newStreak)
      if (hit) setTimeout(() => setMilestone(hit), 600)
    }
  }

  const level = getLevel(streak)

  // 배우자 미등록 시 카드 숨김
  if (roleLoaded && !myRole) return null
  if (dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(`dodam_mission_dismissed_${mode}`, '1')
    setDismissed(true)
  }

  return (
    <>
      <div
        className={`rounded-2xl border transition-all duration-300 ${sent ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary)]/30' : 'dodam-card-flat'}`}
        style={{ padding: 'var(--spacing-4)', boxShadow: 'var(--shadow-sm)' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-3)' }}>
          <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
            <HeartFilledIcon className="w-4 h-4 text-[var(--color-primary)]" />
            <p className="text-body-emphasis">오늘의 부부 미션</p>
          </div>
          <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
            {level && <span className="text-label" style={{ color: 'var(--neutral-400)' }}>{level}</span>}
            {streak > 0 && (
              <span
                className="text-label rounded-full"
                style={{
                  padding: '2px var(--spacing-2)',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  backgroundColor: 'var(--color-primary-bg)',
                }}
              >
                🔥 {streak}일 연속
              </span>
            )}
            <button
              onClick={handleDismiss}
              className="w-6 h-6 flex items-center justify-center rounded-full active:bg-[var(--surface-tertiary)]"
              style={{ color: 'var(--neutral-300)' }}
              aria-label="미션 카드 닫기"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 미션 내용 */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-display leading-none">{mission.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-subtitle text-primary">{mission.title}</p>
            <p className="text-caption text-secondary mt-0.5">{mission.desc}</p>
          </div>
        </div>

        {/* 미리보기 말풍선 */}
        <div className="bg-[#F5F1EC] rounded-xl rounded-tl-sm px-3 py-2 mb-3">
          <p className="text-caption text-secondary leading-relaxed">{mission.sendMsg}</p>
        </div>

        {/* 전송 버튼 */}
        <button
          onClick={handleSend}
          className={`w-full py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 ${
            sent ? 'border border-[var(--color-primary)]/30' : 'bg-[var(--color-primary)]'
          }`}
          style={sent
            ? { fontSize: 14, fontWeight: 700, backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }
            : { fontSize: 14, fontWeight: 700, color: '#FFFFFF' }
          }
        >
          {sent
            ? '✓ 전송했어요 · 다시 보내기'
            : `${authProvider === 'google' ? '🔔' : '💌'} ${myRole === 'mom' ? '남편' : myRole === 'dad' ? '아내' : '파트너'}에게 보내기`
          }
        </button>
      </div>

      {/* 마일스톤 팝업 */}
      {milestone && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30" onClick={() => setMilestone(null)}>
          <div
            className="w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[48px] mb-2">{milestone.emoji}</p>
            <p className="text-heading-2 text-primary mb-1">{milestone.title}</p>
            <p className="text-body-emphasis text-secondary whitespace-pre-line mb-4">{milestone.msg}</p>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full mb-5" style={{ backgroundColor: 'var(--color-primary-bg)' }}>
              <span className="font-bold" style={{ fontSize: 14, color: 'var(--color-primary)' }}>🏷️ {milestone.badge} 달성</span>
            </div>
            <button
              onClick={() => setMilestone(null)}
              className="w-full py-3 bg-[var(--color-primary)] rounded-2xl active:opacity-80"
              style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 700 }}
            >
              계속 이어가기
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default memo(MissionCard)
