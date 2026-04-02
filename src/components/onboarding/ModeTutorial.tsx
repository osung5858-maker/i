'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import IllustVideo from '@/components/ui/IllustVideo'

interface TutorialStep {
  illustration: string
  title: string
  desc: string
  accent: string
}

const TUTORIALS: Record<string, TutorialStep[]> = {
  intro: [
    {
      illustration: '/images/illustrations/onboarding-preparing.webm',
      title: '임신 준비,\n혼자 하지 않아도 돼요',
      desc: 'AI가 내 몸의 리듬을 읽고\n가임기와 배란일을 미리 알려드려요',
      accent: '#C67A52',
    },
    {
      illustration: '/images/illustrations/waiting-fertile.webm',
      title: '오늘이 바로\n그날일지도요',
      desc: '매달 쌓이는 주기 데이터를 분석해서\n임신 가능성을 숫자로 확인할 수 있어요',
      accent: '#E8937A',
    },
    {
      illustration: '/images/illustrations/onboarding-pregnant.webm',
      title: '이번 주,\n아이가 포도알만 해졌어요',
      desc: '매주 태아 크기를 실감 나게 보여주고\nAI가 이 시기 꼭 챙길 것들을 알려줘요',
      accent: '#3D8A5A',
    },
    {
      illustration: '/images/illustrations/celebration-new-start.webm',
      title: '이 설렘을\n기록해두세요',
      desc: '아이에게 전하고 싶은 마음을 써두면\n나중에 함께 읽을 수 있어요',
      accent: '#5B9FD6',
    },
    {
      illustration: '/images/illustrations/onboarding-parenting.webm',
      title: '새벽 3시,\n손가락 하나면 돼요',
      desc: '수유·수면·기저귀\n버튼 하나로 기록하고 AI가 분석해줘요',
      accent: '#5A9E6F',
    },
    {
      illustration: '/images/illustrations/empty-no-growth.webm',
      title: '도담이가\n다음을 먼저 알아요',
      desc: '기록이 쌓일수록 AI가 더 똑똑해져서\n수유·수면 시간을 미리 예측해줘요',
      accent: '#7B6DB0',
    },
  ],
  preparing: [
    {
      illustration: '/images/illustrations/onboarding-preparing.webm',
      title: '배란일을 알려드려요',
      desc: '마지막 생리일만 입력하면\nAI가 배란일과 가임기를 계산해요',
      accent: '#C67A52',
    },
    {
      illustration: '/images/illustrations/profile-default1.webm',
      title: '매일 챙기기',
      desc: '엽산 · 비타민D · 철분\n하루 체크리스트로 빠짐없이',
      accent: '#5A9E6F',
    },
    {
      illustration: '/images/illustrations/celebration-hero.webm',
      title: '임신 확률도 알 수 있어요',
      desc: '주기 데이터를 분석해서\n오늘의 임신 확률을 보여줘요',
      accent: '#7B6DB0',
    },
  ],
  pregnant: [
    {
      illustration: '/images/illustrations/onboarding-pregnant.webm',
      title: '우리 아이 이만큼 자랐어요',
      desc: '매주 태아 크기를 과일로 비교하고\n발달 상황을 알려드려요',
      accent: '#3D8A5A',
    },
    {
      illustration: '/images/illustrations/empty-no-records.webm',
      title: '기다림 탭에서 한번에 확인해요',
      desc: '검진 일정 · 혜택 · 준비물 체크리스트\n기다림 탭에 모두 모아뒀어요',
      accent: '#5B9FD6',
    },
    {
      illustration: '/images/illustrations/celebration-new-start.webm',
      title: '기다림 일기도 써보세요',
      desc: '태어날 아이에게 마음을 전하면\n나중에 함께 읽을 수 있어요',
      accent: '#C67A52',
    },
  ],
  parenting: [
    {
      illustration: '/images/illustrations/onboarding-parenting.webm',
      title: '원탭으로 기록해요',
      desc: '수유 · 수면 · 기저귀\n가운데 버튼 하나로 간편하게',
      accent: '#3D8A5A',
    },
    {
      illustration: '/images/illustrations/empty-no-growth.webm',
      title: 'AI가 리듬을 분석해요',
      desc: '기록이 쌓이면 도담이가\n수유/수면 패턴을 알려줘요',
      accent: '#7B6DB0',
    },
    {
      illustration: '/images/illustrations/empty-no-photos.webm',
      title: '급할 땐 소아과 찾기',
      desc: '동네 탭에서 지금 문 연\n가까운 소아과를 바로 찾아요',
      accent: '#D05050',
    },
  ],
}

interface Props {
  mode: string
  onComplete: () => void
  modal?: boolean
}

const AUTO_ADVANCE_MS = 5000

export default function ModeTutorial({ mode, onComplete, modal = false }: Props) {
  const [step, setStep] = useState(0)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const steps = TUTORIALS[mode] || TUTORIALS.parenting
  const touchStartX = useRef<number | null>(null)

  const isLast = step === steps.length - 1
  const current = steps[step]

  const goTo = (next: number) => {
    if (next < 0 || next >= steps.length) return
    setSlideDir(next > step ? 'left' : 'right')
    setStep(next)
  }

  // 자동 넘기기 (modal 모드에서만)
  useEffect(() => {
    if (!modal) return
    const timer = setTimeout(() => {
      if (isLast) onComplete()
      else goTo(step + 1)
    }, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [step, modal]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 48) {
      if (diff > 0) isLast ? onComplete() : goTo(step + 1)
      else goTo(step - 1)
    }
    touchStartX.current = null
  }

  const inner = (
    <div
      className="flex flex-col h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* 일러스트 + 텍스트 (슬라이드 애니메이션) */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        <div
          key={step}
          className="flex flex-col items-center w-full"
          style={{
            animation: slideDir
              ? `${slideDir === 'left' ? 'slideInFromRight' : 'slideInFromLeft'} 0.28s ease-out`
              : undefined,
          }}
        >
          <IllustVideo
            src={current.illustration}
            variant="circle"
            className="w-48 h-48 mb-7"
          />
          <h2
            className="text-heading-2 font-bold text-primary text-center mb-3 whitespace-pre-line"
            style={{ lineHeight: '1.35' }}
          >
            {current.title}
          </h2>
          <p className="text-subtitle text-secondary text-center leading-relaxed whitespace-pre-line">
            {current.desc}
          </p>
        </div>
      </div>

      {/* 하단: 인디케이터 + 버튼 */}
      <div className="px-6 pb-10 pt-4">
        <div className="flex justify-center gap-2 mb-5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2' : 'w-2 h-2'}`}
              style={{ backgroundColor: i === step ? current.accent : '#E8E4DF' }}
            />
          ))}
        </div>
        <button
          onClick={() => { if (isLast) onComplete(); else goTo(step + 1) }}
          className="relative w-full py-3.5 rounded-xl text-subtitle text-white overflow-hidden active:opacity-90"
          style={{ backgroundColor: current.accent }}
        >
          {/* 프로그레스 바 (modal 모드에서만) */}
          {modal && (
            <span
              key={step}
              className="absolute inset-0 origin-left rounded-xl"
              style={{
                backgroundColor: 'rgba(255,255,255,0.22)',
                animation: `fillProgress ${AUTO_ADVANCE_MS}ms linear forwards`,
              }}
            />
          )}
          <span className="relative z-10">{isLast ? '시작하기' : '다음'}</span>
        </button>
      </div>
    </div>
  )

  if (modal) {
    return (
      <>
        <style>{`
          @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(40px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes slideInFromLeft {
            from { opacity: 0; transform: translateX(-40px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes fillProgress {
            from { transform: scaleX(0); }
            to   { transform: scaleX(1); }
          }
        `}</style>
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-8">
          {/* 백드롭 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onComplete}
          />
          {/* 아이콘 + 모달을 하나의 컨테이너로 */}
          <div className="relative w-full" style={{ maxHeight: '75dvh' }}>
            {/* 아이콘 — 모달 상단에 반쯤 걸침 */}
            <div className="absolute -top-[34px] left-1/2 -translate-x-1/2 z-10">
              <Image
                src="/app-icon.png"
                alt="도담"
                width={68}
                height={68}
                className="rounded-[17px] shadow-[0_8px_32px_rgba(0,0,0,0.22)]"
              />
            </div>
            {/* X 버튼 — 모달 우상단 모서리 */}
            <button
              onClick={onComplete}
              className="absolute -top-3 -right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md active:opacity-60"
              aria-label="닫기"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="#6B6B6B" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
            {/* 모달 카드 */}
            <div
              className="bg-white rounded-3xl w-full overflow-hidden shadow-2xl"
              style={{ maxHeight: '75dvh', paddingTop: '42px' }}
            >
              {/* 슬로건 */}
              <p className="text-center text-[13px] font-bold tracking-[0.08em] text-[#3D2E26] pb-1">
                도담 · AI 육아파트너
              </p>
              {inner}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {inner}
    </div>
  )
}
