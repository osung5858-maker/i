'use client'

import { useState } from 'react'

interface Stage {
  id: string
  title: string
  age: string
  meals: string
  texture: string
  nextSignal: string
  recommended: string[]
  caution: string[]
}

const STAGES: Stage[] = [
  {
    id: 'early',
    title: '초기',
    age: '5~6개월',
    meals: '1일 1회 (수유 + 이유식 1끼)',
    texture: '묽은 미음 (10배죽) · 체에 거른 퓨레',
    nextSignal: '미음을 잘 삼키고, 혀로 밀어내지 않으면 중기로',
    recommended: ['쌀', '감자', '고구마', '애호박', '브로콜리', '당근', '배', '사과'],
    caution: ['꿀 (만 1세 미만 금지)', '소금·설탕 첨가 금지', '통곡물 (소화 어려움)'],
  },
  {
    id: 'mid',
    title: '중기',
    age: '7~8개월',
    meals: '1일 2회 (수유 + 이유식 2끼)',
    texture: '으깬 형태 (7배죽) · 작은 알갱이 OK',
    nextSignal: '으깬 음식을 잘 씹고, 손가락 음식에 관심 보이면 후기로',
    recommended: ['닭가슴살', '두부', '달걀 노른자', '오이', '시금치', '양배추', '바나나', '소고기'],
    caution: ['달걀 흰자 (알레르기 주의)', '생선 (흰살 생선만 소량)', '우유 (음료 X, 조리용만)'],
  },
  {
    id: 'late',
    title: '후기',
    age: '9~11개월',
    meals: '1일 3회 (수유 + 이유식 3끼)',
    texture: '잘게 다진 형태 (5배죽~진밥) · 핑거푸드 시작',
    nextSignal: '다진 음식을 잘 씹고, 숟가락 잡으려 하면 완료기로',
    recommended: ['소고기', '연어', '달걀 (전란)', '파프리카', '버섯', '완두콩', '치즈', '잡곡'],
    caution: ['꿀 (여전히 금지)', '견과류 (통째로 X, 갈아서 소량)', '조개류 (알레르기 주의)'],
  },
  {
    id: 'complete',
    title: '완료기',
    age: '12개월~',
    meals: '1일 3회 + 간식 1~2회',
    texture: '진밥~일반밥 · 어른 식사에 가까운 형태',
    nextSignal: '대부분의 식재료를 먹을 수 있고, 스스로 숟가락 사용',
    recommended: ['모든 육류', '등푸른 생선', '우유 (음료 가능)', '견과류 (잘게)', '해조류', '다양한 과일'],
    caution: ['떡·통포도 등 질식 위험 식품', '카페인 음료', '가공식품·과자'],
  },
]

const ALLERGY_INFO = [
  { name: '달걀', tip: '노른자 → 흰자 순서로 소량씩. 7개월부터 노른자 시작' },
  { name: '우유·유제품', tip: '만 1세 전에는 음료로 X. 치즈·요거트는 9개월부터 소량 OK' },
  { name: '밀 (글루텐)', tip: '6개월 이후 소량씩 시작. 빵·국수 등' },
  { name: '땅콩·견과류', tip: '가루/페이스트 형태로 6개월 이후 소량. 통째로는 만 3세 이후' },
  { name: '갑각류·조개', tip: '새우·게·조개는 돌 이후 소량씩. 강한 알레르기 유발 가능' },
  { name: '대두 (콩)', tip: '두부는 7개월부터 OK. 된장·간장은 염분 주의' },
]

export default function BabyFoodGuide() {
  const [activeStage, setActiveStage] = useState(0)
  const [allergyOpen, setAllergyOpen] = useState(false)

  const stage = STAGES[activeStage]

  return (
    <div className="space-y-3">
      {/* 단계 탭 */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {STAGES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveStage(i)}
            className={`shrink-0 px-3 py-2 rounded-xl text-body font-semibold transition-colors ${
              activeStage === i
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-white text-secondary border border-[#E8E4DF]'
            }`}
          >
            {s.title} ({s.age})
          </button>
        ))}
      </div>

      {/* 선택된 단계 상세 */}
      <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-4">
        <div>
          <p className="text-subtitle text-primary">{stage.title} 이유식</p>
          <p className="text-body text-[var(--color-primary)] font-semibold">{stage.age}</p>
        </div>

        {/* 식사 횟수 & 식감 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--color-page-bg)] rounded-xl p-3">
            <p className="text-label text-tertiary font-semibold mb-0.5">식사 횟수</p>
            <p className="text-body text-primary">{stage.meals}</p>
          </div>
          <div className="bg-[var(--color-page-bg)] rounded-xl p-3">
            <p className="text-label text-tertiary font-semibold mb-0.5">식감·크기</p>
            <p className="text-body text-primary">{stage.texture}</p>
          </div>
        </div>

        {/* 추천 식재료 */}
        <div>
          <p className="text-body font-semibold text-primary mb-1.5">추천 식재료</p>
          <div className="flex flex-wrap gap-1.5">
            {stage.recommended.map(item => (
              <span key={item} className="text-body px-2.5 py-1 rounded-full bg-[#E8F5EE] text-[var(--color-primary)] font-medium">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* 주의 식재료 */}
        <div>
          <p className="text-body font-semibold text-[#D08068] mb-1.5">주의사항</p>
          <div className="space-y-1">
            {stage.caution.map(item => (
              <div key={item} className="flex items-start gap-1.5">
                <span className="text-[#D08068] text-label mt-0.5 shrink-0">⚠</span>
                <p className="text-body text-secondary">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 다음 단계 신호 */}
        <div className="bg-[#FFF8F3] rounded-xl p-3">
          <p className="text-label text-tertiary font-semibold mb-0.5">다음 단계로 넘어가는 신호</p>
          <p className="text-body text-primary">{stage.nextSignal}</p>
        </div>
      </div>

      {/* 알레르기 주의사항 */}
      <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
        <button
          onClick={() => setAllergyOpen(!allergyOpen)}
          className="w-full flex items-center justify-between p-4 active:bg-[var(--color-page-bg)]"
        >
          <p className="text-body-emphasis font-bold text-primary">알레르기 주의사항</p>
          <span className="text-tertiary text-body">{allergyOpen ? '▲' : '▼'}</span>
        </button>
        {allergyOpen && (
          <div className="px-4 pb-4 space-y-2.5 border-t border-[#E8E4DF] pt-3">
            <p className="text-caption text-secondary mb-2">
              새 식재료는 3일 간격으로 한 가지씩 시작하세요. 이상 반응(발진, 구토, 설사) 시 즉시 중단하고 소아과 상담을 받으세요.
            </p>
            {ALLERGY_INFO.map(a => (
              <div key={a.name} className="flex items-start gap-2 bg-[var(--color-page-bg)] rounded-xl p-2.5">
                <span className="text-body font-semibold text-[#D08068] shrink-0 w-20">{a.name}</span>
                <p className="text-body text-secondary">{a.tip}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 일반 팁 */}
      <div className="bg-[#F0F9F4] rounded-xl p-3">
        <p className="text-body text-[var(--color-primary)] font-semibold mb-1">이유식 기본 원칙</p>
        <ul className="text-body text-secondary space-y-0.5">
          <li>· 새 식재료는 1~2 티스푼으로 시작, 3일간 관찰</li>
          <li>· 소금·설탕·꿀은 만 1세 이전 사용 금지</li>
          <li>· 이유식 후 모유/분유 보충 수유</li>
          <li>· 알레르기 가족력이 있으면 소아과 상담 후 진행</li>
        </ul>
      </div>
    </div>
  )
}
