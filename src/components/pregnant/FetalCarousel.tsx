'use client'

import { useRef, useEffect, useMemo } from 'react'
import { RulerIcon, ScaleIcon } from '@/components/ui/Icons'
import IllustVideo from '@/components/ui/IllustVideo'

interface FetalStage {
  week: number
  fruit: string
  name: string
  length: string
  weight: string
  desc: string
  tip: string
}

const FETAL_DATA: FetalStage[] = [
  { week: 4, fruit: '/images/illustrations/f1.webm', name: '참깨', length: '0.1cm', weight: '-', desc: '수정란이 자궁에 착상했어요', tip: '엽산 복용을 시작하세요' },
  { week: 8, fruit: '/images/illustrations/f2.webm', name: '블루베리', length: '1.6cm', weight: '1g', desc: '심장이 뛰기 시작했어요!', tip: '첫 초음파 검사를 받아보세요' },
  { week: 12, fruit: '/images/illustrations/f3.webm', name: '자두', length: '5.4cm', weight: '14g', desc: '손가락 발가락이 생겼어요', tip: '입덧이 줄어들기 시작해요' },
  { week: 16, fruit: '/images/illustrations/f4.webm', name: '오렌지', length: '11.6cm', weight: '100g', desc: '태동을 느낄 수 있어요!', tip: '안정기 진입! 가벼운 산책을 시작하세요' },
  { week: 20, fruit: '/images/illustrations/f5.webm', name: '바나나', length: '25cm', weight: '300g', desc: '성별을 확인할 수 있어요', tip: '정밀 초음파 검사 시기예요' },
  { week: 24, fruit: '/images/illustrations/f6.webm', name: '옥수수', length: '30cm', weight: '600g', desc: '소리를 들을 수 있어요', tip: '태교 음악을 들려주세요' },
  { week: 28, fruit: '/images/illustrations/f7.webm', name: '코코넛', length: '37cm', weight: '1kg', desc: '눈을 뜨기 시작해요', tip: '임신성 당뇨 검사를 받으세요' },
  { week: 32, fruit: '/images/illustrations/f8.webm', name: '멜론', length: '42cm', weight: '1.7kg', desc: '폐가 성숙해지고 있어요', tip: '출산 가방을 준비하세요' },
  { week: 36, fruit: '/images/illustrations/f9.webm', name: '수박', length: '47cm', weight: '2.6kg', desc: '출산 자세로 내려오고 있어요', tip: '2주마다 검진을 받으세요' },
  { week: 40, fruit: '/images/illustrations/f9.webm', name: '호박', length: '51cm', weight: '3.4kg', desc: '만삭! 언제든 만날 수 있어요', tip: '진통 신호를 확인해두세요' },
]

interface Props {
  currentWeek: number
  onShare?: (stage: FetalStage) => void
}

export default function FetalCarousel({ currentWeek, onShare }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 현재 단계 인덱스
  const currentIdx = useMemo(() => {
    const idx = [...FETAL_DATA].reverse().findIndex(f => currentWeek >= f.week)
    return idx === -1 ? 0 : FETAL_DATA.length - 1 - idx
  }, [currentWeek])

  // 초기 스크롤: 현재 단계를 가운데로
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // 카드 너비 160px + gap 12px
    const cardWidth = 160
    const gap = 12
    const containerWidth = el.offsetWidth
    const targetScroll = currentIdx * (cardWidth + gap) - (containerWidth / 2) + (cardWidth / 2)
    el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'auto' })
  }, [currentIdx])

  return (
    <div className="relative">
      {/* 좌우 그라데이션 마스크 */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none rounded-l-xl" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none rounded-r-xl" />

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto hide-scrollbar px-4 py-2 snap-x snap-mandatory"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {FETAL_DATA.map((stage, i) => {
          const dist = Math.abs(i - currentIdx)
          const isCurrent = i === currentIdx
          const isAdjacent = dist === 1
          const isFar = dist >= 2

          // 스타일 계산
          const opacity = isCurrent ? 1 : isAdjacent ? 0.85 : 0.5
          const scale = isCurrent ? 1 : isAdjacent ? 0.92 : 0.82
          const height = isCurrent ? 'auto' : isAdjacent ? '150px' : '120px'

          return (
            <div
              key={stage.week}
              className="shrink-0 snap-center transition-all duration-300"
              style={{
                width: isCurrent ? '180px' : isAdjacent ? '150px' : '130px',
                opacity,
                transform: `scale(${scale})`,
              }}
            >
              <div
                className={`rounded-2xl p-3.5 text-center transition-all duration-300 overflow-hidden ${
                  isCurrent
                    ? 'bg-gradient-to-br from-[#F0F9F4] to-[#FFF8F3] border-2 border-[var(--color-primary)]/30 shadow-md'
                    : 'bg-[#F5F3F0] border border-[#E8E4DF]'
                }`}
                style={{ minHeight: height, maxHeight: isFar ? '120px' : undefined }}
              >
                {/* 주차 뱃지 */}
                <div className={`inline-block px-2 py-0.5 rounded-full text-label font-bold mb-1.5 ${
                  isCurrent ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-secondary'
                }`}>
                  {stage.week}주
                </div>

                {/* 크기 비유 — 일러스트 */}
                <IllustVideo src={stage.fruit} variant="icon" className={`mx-auto mb-1 ${isCurrent ? 'w-14 h-14' : isAdjacent ? 'w-10 h-10' : 'w-8 h-8'}`} />
                <p className={`font-bold leading-none mb-1 ${isCurrent ? 'text-heading-3 text-primary' : isAdjacent ? 'text-body-emphasis text-secondary' : 'text-caption text-secondary'}`}>
                  {stage.name}
                </p>

                {/* 현재 단계만 상세 정보 */}
                {isCurrent && (
                  <>
                    <div className="flex justify-center gap-3 mt-1.5 text-caption text-secondary">
                      <span className="inline-flex items-center gap-0.5"><RulerIcon className="w-3 h-3" /> {stage.length}</span>
                      <span className="inline-flex items-center gap-0.5"><ScaleIcon className="w-3 h-3" /> {stage.weight}</span>
                    </div>
                    <p className="text-caption text-[#4A4744] mt-1.5 leading-snug">{stage.desc}</p>
                    <p className="text-label text-[var(--color-primary)] mt-1 font-medium">{stage.tip}</p>
                    {onShare && (
                      <button
                        onClick={() => onShare(stage)}
                        className="mt-2 text-label text-[var(--color-primary)] font-semibold"
                      >
                        공유
                      </button>
                    )}
                  </>
                )}

                {/* 인접 단계: 간단 정보 */}
                {isAdjacent && (
                  <p className="text-label text-tertiary mt-1 line-clamp-2">{stage.desc}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 현재 위치 도트 인디케이터 */}
      <div className="flex justify-center gap-1 mt-2">
        {FETAL_DATA.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === currentIdx
                ? 'w-4 h-1.5 bg-[var(--color-primary)]'
                : Math.abs(i - currentIdx) <= 2
                  ? 'w-1.5 h-1.5 bg-[#D5D0CA]'
                  : 'w-1 h-1 bg-[#E8E4DF]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export { FETAL_DATA }
export type { FetalStage }
