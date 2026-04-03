'use client'

/**
 * 페이지 로딩 중 표시하는 스켈레톤 UI
 * variant에 따라 각 페이지 레이아웃에 맞는 스켈레톤을 표시
 */
export default function PageSkeleton({ variant = 'default' }: { variant?: 'default' | 'pregnant' | 'preparing' }) {
  return (
    <div className="bg-[var(--color-page-bg)] min-h-[100dvh]">
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-24 space-y-3 animate-pulse">
        {/* 상단 카드 스켈레톤 */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-[#E8E4DF] rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-28 bg-[#E8E4DF] rounded-lg" />
              <div className="h-4 w-40 bg-[#E8E4DF] rounded-lg" />
            </div>
          </div>
        </div>

        {/* AI 카드 스켈레톤 */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 bg-[#E8E4DF] rounded" />
            <div className="h-4 w-24 bg-[#E8E4DF] rounded-lg" />
          </div>
          <div className="h-4 w-full bg-[#E8E4DF] rounded-lg" />
          <div className="h-4 w-3/4 bg-[#E8E4DF] rounded-lg" />
          <div className="h-4 w-1/2 bg-[#E8E4DF] rounded-lg" />
        </div>

        {/* 기록 그리드 스켈레톤 */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-5 w-20 bg-[#E8E4DF] rounded-lg" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-[#E8E4DF] rounded-xl" />
            ))}
          </div>
        </div>

        {/* 추가 카드 스켈레톤 */}
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 space-y-2">
            <div className="h-4 w-32 bg-[#E8E4DF] rounded-lg" />
            <div className="h-4 w-full bg-[#E8E4DF] rounded-lg" />
            <div className="h-4 w-2/3 bg-[#E8E4DF] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
