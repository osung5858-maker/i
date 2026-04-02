'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { SparkleIcon, HospitalIcon, RunnerIcon, HandIcon, SpeechIcon, HeartIcon, BrainIcon, StethoscopeIcon, HeartFilledIcon, TargetIcon } from '@/components/ui/Icons'
import { shareDevelopment } from '@/lib/kakao/share-parenting'

interface Props {
  ageMonths: number
}

interface Milestone {
  id: string
  label: string
  category: 'gross_motor' | 'fine_motor' | 'language' | 'social' | 'cognitive'
}

const CATEGORY_ICONS: Record<string, { label: string; Icon: React.FC<{ className?: string }> }> = {
  gross_motor: { label: '대근육', Icon: RunnerIcon },
  fine_motor: { label: '소근육', Icon: HandIcon },
  language: { label: '언어', Icon: SpeechIcon },
  social: { label: '사회성', Icon: HeartIcon },
  cognitive: { label: '인지', Icon: BrainIcon },
}

const MILESTONES_BY_MONTH: Record<number, Milestone[]> = {
  1: [
    { id: 'm1-1', label: '엎드리면 머리를 잠깐 들어요', category: 'gross_motor' },
    { id: 'm1-2', label: '손을 꽉 쥐어요', category: 'fine_motor' },
    { id: 'm1-3', label: '큰 소리에 반응해요', category: 'language' },
    { id: 'm1-4', label: '얼굴을 가까이 하면 쳐다봐요', category: 'social' },
    { id: 'm1-5', label: '움직이는 물체를 눈으로 따라가요', category: 'cognitive' },
  ],
  2: [
    { id: 'm2-1', label: '엎드리면 머리를 45도 들어요', category: 'gross_motor' },
    { id: 'm2-2', label: '손을 펴기 시작해요', category: 'fine_motor' },
    { id: 'm2-3', label: '"아~", "우~" 소리를 내요', category: 'language' },
    { id: 'm2-4', label: '사회적 미소를 지어요', category: 'social' },
    { id: 'm2-5', label: '소리 나는 쪽으로 고개를 돌려요', category: 'cognitive' },
  ],
  3: [
    { id: 'm3-1', label: '엎드리면 머리를 90도 들어요', category: 'gross_motor' },
    { id: 'm3-2', label: '장난감을 손에 쥐어요', category: 'fine_motor' },
    { id: 'm3-3', label: '옹알이를 해요', category: 'language' },
    { id: 'm3-4', label: '소리 내어 웃어요', category: 'social' },
    { id: 'm3-5', label: '자기 손을 바라봐요', category: 'cognitive' },
  ],
  4: [
    { id: 'm4-1', label: '뒤집기를 시도해요', category: 'gross_motor' },
    { id: 'm4-2', label: '양손을 모아요', category: 'fine_motor' },
    { id: 'm4-3', label: '다양한 소리를 내요', category: 'language' },
    { id: 'm4-4', label: '거울 속 자기를 보고 웃어요', category: 'social' },
    { id: 'm4-5', label: '물건이 떨어지면 찾아봐요', category: 'cognitive' },
  ],
  5: [
    { id: 'm5-1', label: '뒤집기를 할 수 있어요', category: 'gross_motor' },
    { id: 'm5-2', label: '물건을 한 손에서 다른 손으로 옮겨요', category: 'fine_motor' },
    { id: 'm5-3', label: '이름을 부르면 반응해요', category: 'language' },
    { id: 'm5-4', label: '낯선 사람을 구별해요', category: 'social' },
    { id: 'm5-5', label: '부분적으로 숨긴 물건을 찾아요', category: 'cognitive' },
  ],
  6: [
    { id: 'm6-1', label: '도움 없이 앉을 수 있어요', category: 'gross_motor' },
    { id: 'm6-2', label: '물건을 집어서 입에 가져가요', category: 'fine_motor' },
    { id: 'm6-3', label: '"마마", "바바" 소리를 내요', category: 'language' },
    { id: 'm6-4', label: '까꿍 놀이에 반응해요', category: 'social' },
    { id: 'm6-5', label: '원인과 결과를 이해하기 시작해요', category: 'cognitive' },
  ],
  7: [
    { id: 'm7-1', label: '배밀이를 해요', category: 'gross_motor' },
    { id: 'm7-2', label: '엄지와 검지로 집기를 시도해요', category: 'fine_motor' },
    { id: 'm7-3', label: '간단한 단어의 의미를 이해해요', category: 'language' },
    { id: 'm7-4', label: '낯가림이 나타나요', category: 'social' },
    { id: 'm7-5', label: '숨긴 물건을 찾을 수 있어요', category: 'cognitive' },
  ],
  8: [
    { id: 'm8-1', label: '기어다니기 시작해요', category: 'gross_motor' },
    { id: 'm8-2', label: '손가락으로 음식을 집어요', category: 'fine_motor' },
    { id: 'm8-3', label: '"안돼"를 이해해요', category: 'language' },
    { id: 'm8-4', label: '분리 불안이 나타나요', category: 'social' },
    { id: 'm8-5', label: '상자 안에 물건을 넣고 빼요', category: 'cognitive' },
  ],
  9: [
    { id: 'm9-1', label: '잡고 일어서요', category: 'gross_motor' },
    { id: 'm9-2', label: '집게 손가락으로 작은 물건을 집어요', category: 'fine_motor' },
    { id: 'm9-3', label: '손가락으로 가리켜요', category: 'language' },
    { id: 'm9-4', label: '박수를 따라 쳐요', category: 'social' },
    { id: 'm9-5', label: '물건의 용도를 알아가요', category: 'cognitive' },
  ],
  10: [
    { id: 'm10-1', label: '가구를 잡고 걸어요', category: 'gross_motor' },
    { id: 'm10-2', label: '컵으로 마시기를 시도해요', category: 'fine_motor' },
    { id: 'm10-3', label: '"엄마", "아빠"를 의미 있게 말해요', category: 'language' },
    { id: 'm10-4', label: '간단한 지시를 따라요', category: 'social' },
    { id: 'm10-5', label: '물건을 비교할 수 있어요', category: 'cognitive' },
  ],
  11: [
    { id: 'm11-1', label: '혼자 잠깐 서 있어요', category: 'gross_motor' },
    { id: 'm11-2', label: '숟가락을 잡으려고 해요', category: 'fine_motor' },
    { id: 'm11-3', label: '2~3개 단어를 말해요', category: 'language' },
    { id: 'm11-4', label: '다른 아이에게 관심을 보여요', category: 'social' },
    { id: 'm11-5', label: '간단한 문제를 해결해요', category: 'cognitive' },
  ],
  12: [
    { id: 'm12-1', label: '첫 걸음을 떼요', category: 'gross_motor' },
    { id: 'm12-2', label: '크레용으로 끼적여요', category: 'fine_motor' },
    { id: 'm12-3', label: '3~5개 단어를 사용해요', category: 'language' },
    { id: 'm12-4', label: '간단한 역할놀이를 해요', category: 'social' },
    { id: 'm12-5', label: '동물 소리를 흉내내요', category: 'cognitive' },
  ],
  15: [
    { id: 'm15-1', label: '혼자 걸어요', category: 'gross_motor' },
    { id: 'm15-2', label: '블록 2개를 쌓아요', category: 'fine_motor' },
    { id: 'm15-3', label: '5~10개 단어를 사용해요', category: 'language' },
    { id: 'm15-4', label: '원하는 것을 가리켜요', category: 'social' },
    { id: 'm15-5', label: '숟가락으로 먹으려고 해요', category: 'cognitive' },
  ],
  18: [
    { id: 'm18-1', label: '뛰기를 시도해요', category: 'gross_motor' },
    { id: 'm18-2', label: '블록 3~4개를 쌓아요', category: 'fine_motor' },
    { id: 'm18-3', label: '10~20개 단어를 말해요', category: 'language' },
    { id: 'm18-4', label: '다른 아이와 나란히 놀아요', category: 'social' },
    { id: 'm18-5', label: '신체 부위 1~2개를 가리켜요', category: 'cognitive' },
  ],
  24: [
    { id: 'm24-1', label: '계단을 올라가요 (난간 잡고)', category: 'gross_motor' },
    { id: 'm24-2', label: '선을 따라 끼적여요', category: 'fine_motor' },
    { id: 'm24-3', label: '두 단어를 조합해요 ("엄마 물")', category: 'language' },
    { id: 'm24-4', label: '또래에게 장난감을 건네요', category: 'social' },
    { id: 'm24-5', label: '크기 비교(크다/작다)를 이해해요', category: 'cognitive' },
  ],
  30: [
    { id: 'm30-1', label: '두 발 모아 점프해요', category: 'gross_motor' },
    { id: 'm30-2', label: '동그라미를 그려요', category: 'fine_motor' },
    { id: 'm30-3', label: '3~4단어 문장을 말해요', category: 'language' },
    { id: 'm30-4', label: '차례를 기다려요 (짧은 시간)', category: 'social' },
    { id: 'm30-5', label: '색깔 1~2개를 알아요', category: 'cognitive' },
  ],
  36: [
    { id: 'm36-1', label: '세발자전거 페달을 밟아요', category: 'gross_motor' },
    { id: 'm36-2', label: '가위로 종이를 자르려 해요', category: 'fine_motor' },
    { id: 'm36-3', label: '이름, 나이를 말할 수 있어요', category: 'language' },
    { id: 'm36-4', label: '친구와 함께 놀이해요', category: 'social' },
    { id: 'm36-5', label: '숫자 1~3을 세요', category: 'cognitive' },
  ],
}

const PLAY_ACTIVITIES: Record<number, string[]> = {
  1: ['흑백 모빌 보여주기', '부드러운 음악 들려주기', '스킨십 마사지'],
  2: ['컬러 모빌로 교체', '딸랑이 흔들어주기', '다양한 표정 지어주기'],
  3: ['터미타임 놀이', '손에 장난감 쥐어주기', '거울 놀이'],
  4: ['뒤집기 도와주기', '소리나는 장난감 탐색', '까꿍 놀이'],
  5: ['앉기 연습 도와주기', '다양한 질감 탐색', '이름 불러주기 놀이'],
  6: ['앉아서 놀이하기', '컵 놀이', '손가락 인형극'],
  7: ['배밀이 격려하기', '쌓기 놀이', '그림책 읽어주기'],
  8: ['터널 기어가기', '핑거푸드 탐색', '음악에 맞춰 움직이기'],
  9: ['잡고 일어서기 놀이', '컵 속 물건 찾기', '박수 놀이'],
  10: ['가구 잡고 걷기 격려', '블록 쌓기', '간단한 지시 놀이'],
  11: ['균형 잡기 놀이', '숟가락 놀이', '동물 소리 놀이'],
  12: ['걷기 놀이', '크레용 끼적이기', '역할놀이 시작'],
  15: ['공 던지고 받기', '블록 쌓기 놀이', '그림책 함께 읽기'],
  18: ['달리기 놀이', '도형 맞추기', '동요 부르기'],
  24: ['계단 오르기 놀이', '퍼즐 맞추기 (3~4조각)', '역할놀이 (소꿉놀이)'],
  30: ['점프 놀이', '색칠하기', '숫자 세기 놀이'],
  36: ['세발자전거 타기', '가위 사용 연습', '규칙 있는 간단한 게임'],
}

// 월령별 발달 지연 신호 (Red Flags) — 소아과 상담 권장
const RED_FLAGS: Record<number, { flag: string; category: string }[]> = {
  3: [
    { flag: '소리에 전혀 반응하지 않아요', category: 'language' },
    { flag: '눈 맞춤이 전혀 없어요', category: 'social' },
  ],
  6: [
    { flag: '머리를 전혀 가누지 못해요', category: 'gross_motor' },
    { flag: '옹알이가 전혀 없어요', category: 'language' },
    { flag: '주변에 관심을 보이지 않아요', category: 'cognitive' },
  ],
  9: [
    { flag: '앉기를 전혀 못해요', category: 'gross_motor' },
    { flag: '이름을 불러도 반응이 없어요', category: 'language' },
    { flag: '장난감에 관심이 없어요', category: 'cognitive' },
  ],
  12: [
    { flag: '잡고 서기를 전혀 못해요', category: 'gross_motor' },
    { flag: '"엄마", "아빠" 등 의미 있는 소리가 없어요', category: 'language' },
    { flag: '간단한 몸짓(바이바이)을 따라하지 않아요', category: 'social' },
  ],
  18: [
    { flag: '혼자 걷지 못해요', category: 'gross_motor' },
    { flag: '의미 있는 단어가 3개 미만이에요', category: 'language' },
    { flag: '손가락으로 가리키지 않아요', category: 'social' },
  ],
  24: [
    { flag: '두 단어 조합을 못해요 (예: "엄마 물")', category: 'language' },
    { flag: '간단한 지시를 이해 못해요', category: 'cognitive' },
    { flag: '또래에게 전혀 관심이 없어요', category: 'social' },
  ],
  36: [
    { flag: '계단을 올라가지 못해요', category: 'gross_motor' },
    { flag: '이름/나이를 말하지 못해요', category: 'language' },
    { flag: '간단한 역할놀이를 하지 않아요', category: 'cognitive' },
  ],
}

// 불안 해소 통계 — 부모 안심용 (의학 문헌 기반 일반 통계)
const REASSURANCE_STATS: Record<number, string[]> = {
  1: ['신생아의 수면 패턴은 매우 불규칙한 게 정상이에요', '생후 1개월 아기의 60%는 밤낮 구분이 아직 없어요'],
  2: ['2개월 아기의 30%는 아직 사회적 미소가 늦게 나타나요', '배앓이는 보통 6주~3개월에 가장 심해요'],
  3: ['3개월에 목을 못 가누는 아이도 15% 정도 돼요', '옹알이 시작 시기는 2~5개월로 편차가 커요'],
  4: ['뒤집기는 3~7개월 사이 언제든 시작할 수 있어요', '4개월에 밤잠 연결이 안 되는 건 매우 흔해요'],
  5: ['5개월에 뒤집기를 안 해도 정상 범위예요', '낯가림이 일찍 시작하는 건 인지 발달의 신호예요'],
  6: ['이유식 거부는 6개월 아기의 40%가 경험해요', '앉기는 5~8개월 사이 매우 넓은 범위에서 달성돼요'],
  7: ['7개월에 배밀이를 안 해도 12% 아이는 정상이에요', '치아 발달은 4~12개월로 개인차가 매우 커요'],
  8: ['기는 방식은 아이마다 달라요 — 엉덩이로 기어도 정상!', '분리불안은 건강한 애착의 신호예요'],
  9: ['9개월에 잡고 서기를 못해도 10% 아이는 정상이에요', '가리키기는 9~14개월 사이에 시작돼요'],
  10: ['10개월에 첫 단어가 없어도 걱정하지 마세요', '걷기 시작 시기는 9~18개월로 편차가 커요'],
  11: ['아이의 발달은 직선이 아니라 계단식으로 올라가요', '한 영역이 빠르면 다른 영역이 잠시 멈출 수 있어요'],
  12: ['돌에 걷지 않는 아이도 25%나 돼요', '첫 단어 시기는 8~18개월로 매우 넓어요'],
  15: ['15개월에 단어 2~3개면 충분해요', '형제자매가 있으면 언어 발달이 더 빠를 수 있어요'],
  18: ['18개월 아이의 20%는 아직 단어 10개 미만이에요', '말이 늦는 아이의 70%는 만 3세까지 따라잡아요'],
  24: ['두 단어 조합은 18~30개월 사이에 나타나요', '이 시기 떼쓰기는 감정 표현 발달의 자연스러운 과정이에요'],
  30: ['30개월에 색깔을 못 구별해도 정상이에요', '대소변 훈련 시기는 아이마다 크게 달라요'],
  36: ['36개월에 숫자 세기가 안 돼도 괜찮아요', '만 3세 아이의 말하기 속도는 매우 다양해요'],
}

function getRedFlags(ageMonths: number): { flag: string; category: string }[] {
  const months = Object.keys(RED_FLAGS).map(Number).sort((a, b) => a - b)
  const match = months.reverse().find((m) => ageMonths >= m)
  return RED_FLAGS[match || 3] || []
}

function getReassurance(ageMonths: number): string[] {
  const months = Object.keys(REASSURANCE_STATS).map(Number).sort((a, b) => a - b)
  const match = months.reverse().find((m) => ageMonths >= m)
  return REASSURANCE_STATS[match || 1] || REASSURANCE_STATS[1]
}

function getCatchUpTips(milestones: Milestone[], checked: Set<string>): string[] {
  const unchecked = milestones.filter(m => !checked.has(m.id))
  const tips: Record<string, string> = {
    gross_motor: '매일 5~10분 터미타임(엎드리기)이나 신체 놀이를 해주세요',
    fine_motor: '다양한 크기와 질감의 물건을 손으로 탐색할 기회를 주세요',
    language: '아이 눈을 보며 천천히 말해주세요. 아이 소리를 따라하면 더 좋아요',
    social: '까꿍, 박수 같은 상호작용 놀이를 자주 해주세요',
    cognitive: '원인-결과를 경험할 수 있는 놀이(버튼 누르기, 상자 열기)를 제공해주세요',
  }
  const categories = [...new Set(unchecked.map(m => m.category))]
  return categories.slice(0, 3).map(c => tips[c]).filter(Boolean)
}

function getStorageKey(ageMonths: number): string {
  return `dodam_dev_check_${ageMonths}`
}

function getMilestones(ageMonths: number): Milestone[] {
  // 정확한 월령이 없으면 가장 가까운 이전 단계 사용
  const months = Object.keys(MILESTONES_BY_MONTH).map(Number).sort((a, b) => a - b)
  const match = months.reverse().find((m) => ageMonths >= m)
  return MILESTONES_BY_MONTH[match || 1] || MILESTONES_BY_MONTH[1]
}

function getActivities(ageMonths: number): string[] {
  const months = Object.keys(PLAY_ACTIVITIES).map(Number).sort((a, b) => a - b)
  const match = months.reverse().find((m) => ageMonths >= m)
  return PLAY_ACTIVITIES[match || 1] || PLAY_ACTIVITIES[1]
}

function generateAIInsight(milestones: Milestone[], checked: Set<string>, ageMonths: number): string {
  const total = milestones.length
  const done = milestones.filter((m) => checked.has(m.id)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  if (pct === 100) {
    return `${ageMonths}개월 발달 항목을 모두 달성했어요! 아이가 정말 잘 성장하고 있어요. 다음 달 체크리스트도 기대해주세요.`
  }

  const uncheckedCategories = new Set(
    milestones.filter((m) => !checked.has(m.id)).map((m) => m.category)
  )

  const tips: string[] = []
  if (uncheckedCategories.has('gross_motor')) tips.push('신체 놀이 시간을 조금 더 늘려보세요')
  if (uncheckedCategories.has('fine_motor')) tips.push('손으로 탐색할 수 있는 장난감을 제공해보세요')
  if (uncheckedCategories.has('language')) tips.push('아이에게 자주 말을 걸어주세요')
  if (uncheckedCategories.has('social')) tips.push('다양한 표정과 반응으로 소통해보세요')
  if (uncheckedCategories.has('cognitive')) tips.push('새로운 자극을 경험할 수 있는 놀이를 해보세요')

  if (pct >= 60) {
    return `${ageMonths}개월 발달 항목의 ${pct}%를 달성했어요! 순조롭게 성장하고 있어요. ${tips[0] || ''}`
  }

  return `아이마다 발달 속도가 달라요. 천천히 하나씩 경험해가면 돼요. ${tips.slice(0, 2).join('. ')}`
}

function generateCheckupQuestions(milestones: Milestone[], checked: Set<string>, ageMonths: number): string[] {
  const unchecked = milestones.filter((m) => !checked.has(m.id))
  const questions: string[] = []

  questions.push(`${ageMonths}개월 아이의 전반적인 발달 상태가 궁금해요.`)

  unchecked.forEach((m) => {
    const cat = CATEGORY_ICONS[m.category]
    questions.push(`${cat.label} 영역: "${m.label}" 부분을 어떻게 도와줄 수 있을까요?`)
  })

  if (unchecked.length === 0) {
    questions.push('다음 달에 기대할 수 있는 발달 변화가 있을까요?')
  }

  return questions.slice(0, 3)
}

export default function DevelopmentCheck({ ageMonths }: Props) {
  const milestones = useMemo(() => getMilestones(ageMonths), [ageMonths])
  const activities = useMemo(() => getActivities(ageMonths), [ageMonths])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [showQuestions, setShowQuestions] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(ageMonths))
      if (stored) setChecked(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [ageMonths])

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(getStorageKey(ageMonths), JSON.stringify([...next]))
      } catch { /* ignore */ }
      return next
    })
  }, [ageMonths])

  const total = milestones.length
  const done = milestones.filter((m) => checked.has(m.id)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const insight = useMemo(() => generateAIInsight(milestones, checked, ageMonths), [milestones, checked, ageMonths])
  const checkupQuestions = useMemo(() => generateCheckupQuestions(milestones, checked, ageMonths), [milestones, checked, ageMonths])
  const redFlags = useMemo(() => getRedFlags(ageMonths), [ageMonths])
  const reassurance = useMemo(() => getReassurance(ageMonths), [ageMonths])
  const catchUpTips = useMemo(() => getCatchUpTips(milestones, checked), [milestones, checked])
  const [showRedFlags, setShowRedFlags] = useState(false)

  // Progress ring
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, Milestone[]> = {}
    milestones.forEach((m) => {
      if (!map[m.category]) map[m.category] = []
      map[m.category].push(m)
    })
    return map
  }, [milestones])

  return (
    <div className="space-y-4 px-5 pb-8 pt-4">
      {/* Progress Ring */}
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-5 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#E8E6E1" strokeWidth="8" />
            <circle
              cx="48" cy="48" r={radius} fill="none"
              stroke="var(--color-primary)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 48 48)"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{pct}%</span>
          </div>
        </div>
        <div>
          <h3 className="text-subtitle text-primary">{ageMonths}개월 발달 체크</h3>
          <p className="text-body text-[#4A4744] mt-1">{done}/{total} 항목 달성</p>
          <p className="text-caption text-[#7A7672] mt-0.5">아이마다 속도가 달라요</p>
          <button onClick={() => shareDevelopment('우리 아이', ageMonths, done, total)} className="text-caption text-[var(--color-primary)] font-semibold mt-1">공유</button>
        </div>
      </div>

      {/* Milestones by category */}
      {Object.entries(grouped).map(([cat, items]) => {
        const info = CATEGORY_ICONS[cat]
        return (
          <div key={cat} className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <info.Icon className="w-4 h-4 text-secondary" />
              <h4 className="text-body font-bold text-primary">{info.label}</h4>
            </div>
            <div className="space-y-2">
              {items.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 py-1.5 cursor-pointer active:opacity-70"
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked.has(m.id)
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                        : 'border-[#D1D5DB] bg-white'
                    }`}
                    onClick={() => toggle(m.id)}
                  >
                    {checked.has(m.id) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-body leading-snug ${
                      checked.has(m.id)
                        ? 'text-tertiary line-through'
                        : 'text-primary'
                    }`}
                    onClick={() => toggle(m.id)}
                  >
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}

      {/* AI Insight */}
      <div className="bg-white rounded-2xl border-l-4 border-l-[var(--color-primary)] border border-[#D5D0CA] shadow-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <SparkleIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <h3 className="text-body font-bold text-[var(--color-primary)]">AI 발달 인사이트</h3>
        </div>
        <p className="text-body text-primary leading-relaxed">{insight}</p>
        <p className="text-caption text-[#7A7672] mt-3">아이마다 발달 시기가 달라요. 참고용이며, 걱정되시면 소아과 상담을 추천드려요.</p>
      </div>

      {/* Recommended Activities */}
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <SparkleIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <h3 className="text-body font-bold text-primary">추천 놀이</h3>
        </div>
        <div className="space-y-2">
          {activities.map((act, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#FEF0E8] flex items-center justify-center shrink-0">
                <span className="text-body-emphasis font-bold text-[var(--color-primary)]">{i + 1}</span>
              </div>
              <span className="text-body text-primary">{act}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 불안 해소 통계 — 안심 카드 */}
      <div className="bg-[#F0F9F4] rounded-2xl border border-[#D5E8DC] p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <HeartFilledIcon className="w-4 h-4 text-[#2D7A4A]" />
          <h3 className="text-body font-bold text-[#2D7A4A]">알고 계셨나요?</h3>
        </div>
        <div className="space-y-2.5">
          {reassurance.map((stat, i) => (
            <p key={i} className="text-body text-[#3D6B4E] leading-relaxed flex items-start gap-2">
              <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-[#2D7A4A]/40" />
              {stat}
            </p>
          ))}
        </div>
      </div>

      {/* 따라잡기 놀이 팁 (미달성 항목이 있을 때만) */}
      {catchUpTips.length > 0 && pct < 100 && (
        <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <TargetIcon className="w-4 h-4 text-primary" />
            <h3 className="text-body font-bold text-primary">발달 자극 팁</h3>
          </div>
          <div className="space-y-2">
            {catchUpTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <div className="w-5 h-5 rounded-full bg-[#FEF0E8] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-label font-bold text-[var(--color-primary)]">{i + 1}</span>
                </div>
                <p className="text-body text-[#4A4744] leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
          <p className="text-caption text-tertiary mt-3">매일 조금씩, 놀이를 통해 자연스럽게 경험하면 돼요.</p>
        </div>
      )}

      {/* 발달 지연 신호 (Red Flags) — 접이식 */}
      {redFlags.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
          <button
            onClick={() => setShowRedFlags((v) => !v)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-1.5">
              <StethoscopeIcon className="w-4 h-4 text-secondary" />
              <h3 className="text-body font-bold text-primary">소아과 상담 권장 신호</h3>
            </div>
            <span className="text-body text-[#7A7672]">{showRedFlags ? '접기' : '펼치기'}</span>
          </button>
          {showRedFlags && (
            <div className="mt-3">
              <p className="text-caption text-[#7A7672] mb-2.5">아래 항목이 지속되면 소아과 상담을 추천드려요.</p>
              <div className="space-y-2">
                {redFlags.map((rf, i) => {
                  const catInfo = CATEGORY_ICONS[rf.category]
                  return (
                    <div key={i} className="flex items-start gap-2 py-1 px-3 rounded-xl bg-[#FFF8F5] border border-[#F5E6E0]">
                      {catInfo?.Icon && <catInfo.Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#8B4513]" />}
                      <div>
                        <p className="text-body text-[#8B4513] leading-relaxed">{rf.flag}</p>
                        <p className="text-label text-[#B8860B] mt-0.5">{catInfo?.label} 영역</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-caption text-[#D08068] mt-3 font-medium">이 신호는 참고용이며, 반드시 전문의 상담을 받으세요.</p>
            </div>
          )}
        </div>
      )}

      {/* Checkup Questions */}
      <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm p-4">
        <button
          onClick={() => setShowQuestions((v) => !v)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-1.5">
            <HospitalIcon className="w-3.5 h-3.5" />
            <h3 className="text-body font-bold text-primary">검진 시 질문 추천</h3>
          </div>
          <span className="text-body text-[#7A7672]">{showQuestions ? '접기' : '펼치기'}</span>
        </button>
        {showQuestions && (
          <div className="mt-3 space-y-2">
            {checkupQuestions.map((q, i) => (
              <p key={i} className="text-body text-[#5A5854] leading-relaxed pl-2 border-l-2 border-[#E8E6E1]">
                {q}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
