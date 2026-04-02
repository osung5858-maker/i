'use client'

import { useState, useEffect, useCallback } from 'react'

interface GuideStep {
  /** CSS selector for the target element */
  target: string
  /** 말풍선 텍스트 */
  title: string
  desc: string
  /** 말풍선 위치 */
  position: 'top' | 'bottom'
}

const GUIDE_STEPS: Record<string, GuideStep[]> = {
  parenting: [
    // 1. 핵심: FAB 기록
    {
      target: '[data-guide="fab"]',
      title: '여기를 눌러 기록해요',
      desc: '수유 · 수면 · 기저귀 · 체온\n가운데 버튼 하나로 모든 기록을 시작해요',
      position: 'top',
    },
    // 2. FAB 상세: 시간 기록
    {
      target: '[data-guide="fab"]',
      title: '모유/수면은 시작 → 종료',
      desc: '탭하면 타이머가 시작되고\n다시 탭하면 종료돼요. 시간이 자동 기록!',
      position: 'top',
    },
    // 3. AI 인사이트
    {
      target: '[data-guide="ai-card"]',
      title: 'AI가 리듬을 분석해요',
      desc: '기록이 3건 이상 쌓이면\n다음 수유/수면 시간을 예측해줘요',
      position: 'bottom',
    },
    // 4. 카톡 공유
    {
      target: '[data-guide="share-btn"]',
      title: '오늘 기록을 카톡으로 공유',
      desc: '배우자나 가족에게\n오늘의 돌봄 기록을 한번에 보내요',
      position: 'bottom',
    },
    // 5. 동네
    {
      target: '[data-guide="nav-town"]',
      title: '급할 때 — 동네 소아과',
      desc: '지금 문 연 가까운 소아과를\n지도에서 바로 찾을 수 있어요',
      position: 'top',
    },
    // 6. 추억 탭
    {
      target: '[data-guide="nav-record"]',
      title: '성장 기록 · 사진 타임랩스',
      desc: '키/몸무게 기록, 발달 체크,\n매월 사진으로 성장 영상도 만들어요',
      position: 'top',
    },
    // 7. 우리 탭
    {
      target: '[data-guide="nav-more"]',
      title: '더 많은 기능이 여기에',
      desc: '예방접종 · 이유식 가이드 · 자장가\n검진표 AI 분석 · 정부 혜택까지',
      position: 'top',
    },
    // 8. 프로필
    {
      target: '[data-guide="profile"]',
      title: '프로필 사진을 골라보세요',
      desc: '탭하면 귀여운 아바타 4종 중\n마음에 드는 걸 선택할 수 있어요',
      position: 'bottom',
    },
    // 9. 흔들기
    {
      target: '[data-guide="fab"]',
      title: '급할 땐 흔들어보세요!',
      desc: '핸드폰을 흔들면 바로\n응급 소아과 검색 화면이 열려요',
      position: 'top',
    },
  ],
  pregnant: [
    // 1. 태아 발달
    {
      target: '[data-guide="fetal-card"]',
      title: '우리 아이 이만큼 자랐어요',
      desc: '매주 태아 크기를 과일로 비교하고\n발달 상황과 주의사항을 알려드려요',
      position: 'bottom',
    },
    // 2. 기다림 탭
    {
      target: '[data-guide="nav-waiting"]',
      title: '기다림 탭에 다 있어요',
      desc: '검진 일정 · 혜택 · 준비물 체크리스트\n태교 일기까지 기다림 탭에서 확인해요',
      position: 'top',
    },
    // 3. 동네
    {
      target: '[data-guide="nav-town"]',
      title: '동네 산부인과 · 산후조리원',
      desc: '가까운 병원과 조리원을\n지도에서 바로 찾아볼 수 있어요',
      position: 'top',
    },
    // 4. 우리 탭
    {
      target: '[data-guide="nav-more"]',
      title: 'AI 이름 짓기 · 정부 혜택',
      desc: '맘편한임신 통합신청, AI 이름 추천,\n영양제·운동 맞춤 가이드까지',
      position: 'top',
    },
    // 5. 프로필
    {
      target: '[data-guide="profile"]',
      title: '프로필 사진을 골라보세요',
      desc: '탭하면 귀여운 아바타를 선택할 수 있어요',
      position: 'bottom',
    },
  ],
  preparing: [
    // 1. 주기 설정
    {
      target: '[data-guide="cycle-setup"]',
      title: '주기를 설정해요',
      desc: '마지막 생리일과 주기 길이를 입력하면\n배란일 · 가임기를 자동 계산해요',
      position: 'bottom',
    },
    // 2. AI 브리핑 (임신 확률 + 영양제 현황 포함)
    {
      target: '[data-guide="ai-briefing"]',
      title: '오늘의 임신 확률 · AI 조언',
      desc: '주기 · 영양제 데이터를 종합해서\n임신 가능성과 맞춤 조언을 알려줘요',
      position: 'bottom',
    },
    // 3. 동네
    {
      target: '[data-guide="nav-town"]',
      title: '동네 산부인과 찾기',
      desc: '난임 클리닉, 산부인과를\n지도에서 바로 찾아볼 수 있어요',
      position: 'top',
    },
    // 4. 우리 탭
    {
      target: '[data-guide="nav-more"]',
      title: '태명 짓기 · 정부 혜택',
      desc: 'AI 태명 추천, 난임 시술비 지원,\n임신 준비 가이드까지',
      position: 'top',
    },
  ],
}

interface Props {
  mode: string
  onComplete: () => void
}

export default function SpotlightGuide({ mode, onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const steps = GUIDE_STEPS[mode] || GUIDE_STEPS.parenting
  const current = steps[step]
  const isLast = step === steps.length - 1

  const findTarget = useCallback(() => {
    if (!current) return
    const el = document.querySelector(current.target)
    if (el) {
      setRect(el.getBoundingClientRect())
    } else {
      // 타겟 못 찾으면 다음 스텝
      if (!isLast) setStep(s => s + 1)
      else onComplete()
    }
  }, [current, isLast, onComplete])

  useEffect(() => {
    // 약간 딜레이 후 타겟 찾기 (렌더링 완료 대기)
    const timer = setTimeout(findTarget, 300)
    return () => clearTimeout(timer)
  }, [step, findTarget])

  // 윈도우 리사이즈/스크롤 시 위치 갱신
  useEffect(() => {
    const handler = () => findTarget()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [findTarget])

  const handleNext = () => {
    if (isLast) onComplete()
    else setStep(step + 1)
  }

  if (!current || !rect) return null

  const pad = 6
  const spotX = rect.left - pad
  const spotY = rect.top - pad
  const spotW = rect.width + pad * 2
  const spotH = rect.height + pad * 2
  const spotR = 16

  // 말풍선 위치
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(320px, calc(100vw - 40px))',
    zIndex: 102,
  }
  if (current.position === 'bottom') {
    tooltipStyle.top = spotY + spotH + 16
  } else {
    tooltipStyle.bottom = window.innerHeight - spotY + 16
  }

  return (
    <div className="fixed inset-0 z-[100]" onClick={handleNext}>
      {/* 오버레이 (스포트라이트 구멍) */}
      <svg className="fixed inset-0 w-full h-full" style={{ zIndex: 101 }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={spotX} y={spotY}
              width={spotW} height={spotH}
              rx={spotR} ry={spotR}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#spotlight-mask)"
        />
        {/* 스포트라이트 테두리 */}
        <rect
          x={spotX} y={spotY}
          width={spotW} height={spotH}
          rx={spotR} ry={spotR}
          fill="none"
          stroke="white"
          strokeWidth={2}
          opacity={0.5}
        />
      </svg>

      {/* 말풍선 */}
      <div style={tooltipStyle} onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <p className="text-subtitle font-bold text-primary mb-1">{current.title}</p>
          <p className="text-body-emphasis text-secondary leading-relaxed">{current.desc}</p>

          <div className="flex items-center justify-between mt-4">
            {/* 스텝 인디케이터 */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-4 bg-[var(--color-primary)]' : 'w-1.5 bg-[#E8E4DF]'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); onComplete() }}
                className="text-body text-tertiary active:opacity-60"
              >
                건너뛰기
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-semibold active:opacity-80"
              >
                {isLast ? '완료' : '다음'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
