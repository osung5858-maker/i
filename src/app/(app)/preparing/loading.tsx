export default function Loading() {
  return (
    <div className="bg-[var(--color-page-bg)] min-h-[100dvh] animate-pulse">
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-24 space-y-3">
        {/* Hero skeleton with mode-specific gradient */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-8 w-44 bg-[#E8E4DF] rounded-lg" />
          <div className="h-4 w-full bg-[#E8E4DF] rounded-lg" />
          <div className="h-4 w-3/4 bg-[#E8E4DF] rounded-lg" />
        </div>

        {/* Info cards */}
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 space-y-3">
            <div className="h-5 w-28 bg-[#E8E4DF] rounded-lg" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-[#E8E4DF] rounded-lg" />
              <div className="h-4 w-4/5 bg-[#E8E4DF] rounded-lg" />
            </div>
          </div>
        ))}

        {/* Checklist skeleton */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-5 w-32 bg-[#E8E4DF] rounded-lg" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-[#E8E4DF] rounded" />
              <div className="flex-1 h-4 bg-[#E8E4DF] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
