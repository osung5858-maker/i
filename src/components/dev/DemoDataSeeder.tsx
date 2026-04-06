'use client'

/**
 * 앱스토어 스크린샷용 데모 데이터 시더
 * 사용법: /settings 페이지 하단 또는 직접 URL로 접근
 * 개발 환경에서만 노출
 */

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TODAY = new Date().toISOString().split('T')[0]

function timeToday(h: number, m: number) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// 오늘 하루치 리얼한 육아 기록 (기본 6종 타입만 사용: feed, sleep, poop, pee, temp, memo)
function generateParentingEvents(childId: string, userId: string) {
  return [
    // 밤잠 (전날 21:00 ~ 오늘 06:30)
    { child_id: childId, recorder_id: userId, type: 'sleep', start_ts: (() => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(21, 0, 0, 0); return d.toISOString() })(), end_ts: timeToday(6, 30), tags: { sleepType: 'night' }, source: 'quick_button' },
    // 기상 후 수유 07:00
    { child_id: childId, recorder_id: userId, type: 'feed', start_ts: timeToday(7, 0), amount_ml: 180, source: 'quick_button' },
    // 기저귀 07:30
    { child_id: childId, recorder_id: userId, type: 'poop', start_ts: timeToday(7, 30), tags: { status: 'normal' }, source: 'quick_button' },
    // 오전 수유 10:00
    { child_id: childId, recorder_id: userId, type: 'feed', start_ts: timeToday(10, 0), amount_ml: 160, source: 'quick_button' },
    // 낮잠 10:30~12:00
    { child_id: childId, recorder_id: userId, type: 'sleep', start_ts: timeToday(10, 30), end_ts: timeToday(12, 0), tags: { sleepType: 'nap' }, source: 'quick_button' },
    // 점심 모유 수유 12:30
    { child_id: childId, recorder_id: userId, type: 'feed', start_ts: timeToday(12, 30), amount_ml: 200, tags: { side: 'left' }, source: 'quick_button' },
    // 소변 13:00
    { child_id: childId, recorder_id: userId, type: 'pee', start_ts: timeToday(13, 0), source: 'quick_button' },
    // 오후 수유 14:00
    { child_id: childId, recorder_id: userId, type: 'feed', start_ts: timeToday(14, 0), amount_ml: 150, source: 'quick_button' },
    // 오후 낮잠 14:30~15:30
    { child_id: childId, recorder_id: userId, type: 'sleep', start_ts: timeToday(14, 30), end_ts: timeToday(15, 30), tags: { sleepType: 'nap' }, source: 'quick_button' },
    // 소변 16:00
    { child_id: childId, recorder_id: userId, type: 'pee', start_ts: timeToday(16, 0), source: 'quick_button' },
    // 체온 체크 17:00
    { child_id: childId, recorder_id: userId, type: 'temp', start_ts: timeToday(17, 0), tags: { celsius: 36.8 }, source: 'quick_button' },
    // 저녁 수유 18:00
    { child_id: childId, recorder_id: userId, type: 'feed', start_ts: timeToday(18, 0), amount_ml: 190, source: 'quick_button' },
    // 배변 19:00
    { child_id: childId, recorder_id: userId, type: 'poop', start_ts: timeToday(19, 0), tags: { status: 'soft' }, source: 'quick_button' },
  ]
}

// AI 케어 카드 데모 캐시
function generateAiCareCache(eventCount: number) {
  return {
    mainInsight: '오늘 수유 5회(총 900ml), 수면 11시간으로 안정적인 하루예요. 이유식도 잘 먹고 있어요!',
    greeting: '좋은 하루 보내고 계시네요',
    status: '좋음',
    statusEmoji: '😊',
    nextAction: '저녁 8시 전에 마지막 수유 후 밤 수면 루틴을 시작하면 좋겠어요.',
    warning: '',
    feedAnalysis: '하루 총 수유량 900ml — 7개월 평균(800~1000ml) 범위 내. 수유 간격 약 3시간으로 규칙적이에요.',
    sleepAnalysis: '밤잠 9.5시간 + 낮잠 2.5시간 = 총 12시간. 이 월령 권장 수면(12~15시간) 범위 내에서 충분해요.',
    parentTip: '이 시기 아기는 분리 불안이 시작될 수 있어요. 잠시 자리를 비울 때 "다녀올게~" 인사를 해주면 신뢰감이 형성돼요.',
  }
}

// AI 식단 데모 캐시
function generateMealCache() {
  return {
    dishTitle: '당근 닭가슴살 죽',
    cuisine: '이유식',
    breakfast: { name: '쌀미음 + 바나나', kcal: 120 },
    lunch: { name: '당근 닭가슴살 죽', kcal: 180 },
    dinner: { name: '브로콜리 소고기 죽', kcal: 170 },
    snack: { name: '고구마 스틱', kcal: 60 },
    newFood: '브로콜리 (처음이면 소량부터)',
    keyNutrient: '철분 · 비타민A',
    avoid: '꿀, 생우유, 견과류',
    tip: '이유식 후 30분 뒤 물을 조금 줘보세요. 수분 보충과 입안 헹굼에 좋아요.',
  }
}

export default function DemoDataSeeder() {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 환경 체크
  if (process.env.NODE_ENV === 'production') return null

  const seedData = async () => {
    setLoading(true)
    setStatus('시딩 시작...')
    const supabase = createClient()

    try {
      // 1. 현재 유저 확인
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('로그인이 필요합니다'); setLoading(false); return }
      setStatus('유저 확인 완료: ' + user.email)

      // 2. 아이 정보 확인/생성
      const { data: children } = await supabase.from('children').select('*').eq('user_id', user.id).limit(1)
      let child = children?.[0]

      if (!child) {
        // 7개월 아기 생성 (스크린샷에 적절한 월령)
        const birthdate = new Date()
        birthdate.setMonth(birthdate.getMonth() - 7)
        const bd = birthdate.toISOString().split('T')[0]

        const { data: newChild, error } = await supabase.from('children').insert({
          user_id: user.id,
          name: '도담이',
          birthdate: bd,
          gender: 'female',
        }).select().single()

        if (error) { setStatus('아이 생성 실패: ' + error.message); setLoading(false); return }
        child = newChild
        setStatus('아이 생성 완료: 도담이 (7개월)')
      } else {
        setStatus('기존 아이 사용: ' + child.name)
      }

      // 3. 오늘 이벤트 삭제 (깨끗한 상태)
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const yesterdayNight = new Date(); yesterdayNight.setDate(yesterdayNight.getDate() - 1); yesterdayNight.setHours(20, 0, 0, 0)
      await supabase.from('events').delete().eq('child_id', child.id).gte('start_ts', yesterdayNight.toISOString())
      setStatus('기존 오늘 이벤트 정리 완료')

      // 4. 데모 이벤트 삽입 (하나씩 — 실패 건 건너뜀)
      const events = generateParentingEvents(child.id, user.id)
      let inserted = 0
      for (const evt of events) {
        const { error } = await supabase.from('events').insert(evt)
        if (!error) inserted++
        else console.warn('이벤트 삽입 실패:', evt.type, error.message)
      }
      setStatus(`이벤트 ${inserted}/${events.length}건 삽입 완료`)

      // 5. localStorage 캐시 설정
      // 모드
      localStorage.setItem('dodam_mode', 'parenting')
      // 가이드 완료 (스크린샷에 가이드 안 뜨게)
      localStorage.setItem('dodam_guide_parenting', '1')
      localStorage.setItem('dodam_intro_shown', '1')
      localStorage.setItem('dodam_splash_shown', '1')
      localStorage.setItem('dodam_push_prompt_dismissed', '1')
      // DevPanel 히든 (스크린샷에 D 버튼 안 보이게)
      localStorage.setItem('dodam_dev_hidden', '1')

      // AI 케어 카드 캐시 (이벤트 수에 맞춰)
      const aiCacheKey = `dodam_ai_care_${TODAY}_${events.length}`
      localStorage.setItem(aiCacheKey, JSON.stringify(generateAiCareCache(events.length)))
      // 다양한 이벤트 수에도 캐시되도록 추가
      for (const n of [3, 5, 8, 10, 14]) {
        localStorage.setItem(`dodam_ai_care_${TODAY}_${n}`, JSON.stringify(generateAiCareCache(n)))
      }

      // AI 식단 캐시
      const mealKey = `dodam_meal_v2_7_${TODAY}`
      localStorage.setItem(mealKey, JSON.stringify(generateMealCache()))

      // 동네 설정 (town 페이지용)
      localStorage.setItem('dodam_neighborhood_range', '1000')
      localStorage.setItem('dodam_neighborhood_range_set', '1')

      setStatus('모든 데모 데이터 시딩 완료! 페이지를 새로고침하세요.')
    } catch (err: any) {
      setStatus('에러: ' + (err?.message || String(err)))
    }
    setLoading(false)
  }

  const clearData = async () => {
    setLoading(true)
    setStatus('정리 중...')
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('로그인 필요'); setLoading(false); return }

      // 오늘 이벤트 삭제
      const { data: children } = await supabase.from('children').select('id').eq('user_id', user.id).limit(1)
      if (children?.[0]) {
        const yesterdayNight = new Date(); yesterdayNight.setDate(yesterdayNight.getDate() - 1); yesterdayNight.setHours(20, 0, 0, 0)
        await supabase.from('events').delete().eq('child_id', children[0].id).gte('start_ts', yesterdayNight.toISOString())
      }

      // AI 캐시 삭제
      const keysToRemove = Object.keys(localStorage).filter(k =>
        k.startsWith('dodam_ai_care_') || k.startsWith('dodam_meal_')
      )
      keysToRemove.forEach(k => localStorage.removeItem(k))

      setStatus('데모 데이터 정리 완료! 새로고침하세요.')
    } catch (err: any) {
      setStatus('에러: ' + (err?.message || String(err)))
    }
    setLoading(false)
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
      <p className="text-body-emphasis font-bold text-yellow-800">스크린샷 데모 데이터</p>
      <p className="text-body text-yellow-700">앱스토어 스크린샷용 리얼한 데모 데이터를 생성합니다.</p>
      <div className="flex gap-2">
        <button
          onClick={seedData}
          disabled={loading}
          className="flex-1 py-2.5 bg-yellow-500 text-white rounded-lg font-bold text-body-emphasis disabled:opacity-50"
        >
          {loading ? '처리 중...' : '데모 데이터 생성'}
        </button>
        <button
          onClick={clearData}
          disabled={loading}
          className="px-4 py-2.5 bg-red-100 text-red-600 rounded-lg font-bold text-body-emphasis disabled:opacity-50"
        >
          정리
        </button>
      </div>
      {status && <p className="text-caption text-yellow-800 bg-yellow-100 p-2 rounded-lg">{status}</p>}
    </div>
  )
}
