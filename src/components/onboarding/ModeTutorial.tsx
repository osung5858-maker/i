'use client'

import { useState } from 'react'
import IllustVideo from '@/components/ui/IllustVideo'

interface TutorialStep {
  illustration: string
  title: string
  desc: string
  accent: string
}

const TUTORIALS: Record<string, TutorialStep[]> = {
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
}

export default function ModeTutorial({ mode, onComplete }: Props) {
  const [step, setStep] = useState(0)
  const steps = TUTORIALS[mode] || TUTORIALS.parenting

  const isLast = step === steps.length - 1
  const current = steps[step]

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* 스킵 */}
      <div className="flex justify-end px-5 pt-4">
        <button
          onClick={onComplete}
          className="text-[13px] text-[#9E9A95] active:opacity-60"
        >
          건너뛰기
        </button>
      </div>

      {/* 일러스트 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <IllustVideo
          src={current.illustration}
          variant="circle"
          className="w-56 h-56 mb-8"
        />

        <h2 className="text-[22px] font-bold text-[#1A1918] text-center mb-3">
          {current.title}
        </h2>
        <p className="text-[15px] text-[#6B6966] text-center leading-relaxed whitespace-pre-line">
          {current.desc}
        </p>
      </div>

      {/* 하단: 인디케이터 + 버튼 */}
      <div className="px-6 pb-12">
        {/* 도트 인디케이터 */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === step
                  ? 'w-6 h-2'
                  : 'w-2 h-2'
              }`}
              style={{
                backgroundColor: i === step ? current.accent : '#E8E4DF',
              }}
            />
          ))}
        </div>

        {/* 버튼 */}
        <button
          onClick={() => {
            if (isLast) onComplete()
            else setStep(step + 1)
          }}
          className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white active:opacity-80 transition-opacity"
          style={{ backgroundColor: current.accent }}
        >
          {isLast ? '시작하기' : '다음'}
        </button>
      </div>
    </div>
  )
}
