export default function Loading() {
  return (
    <div className="bg-[var(--color-page-bg)] min-h-[100dvh] animate-pulse">
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-24 space-y-3">
        {/* Hero section skeleton */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-8 w-48 bg-[#E8E4DF] rounded-lg" />
          <div className="h-4 w-full bg-[#E8E4DF] rounded-lg" />
          <div className="h-4 w-3/4 bg-[#E8E4DF] rounded-lg" />
        </div>

        {/* Timeline/progress skeleton */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-5 w-24 bg-[#E8E4DF] rounded-lg" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 bg-[#E8E4DF] rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-[#E8E4DF] rounded-lg" />
                <div className="h-3 w-24 bg-[#E8E4DF] rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Info card skeleton */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-5 w-32 bg-[#E8E4DF] rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-[#E8E4DF] rounded-lg" />
            <div className="h-4 w-5/6 bg-[#E8E4DF] rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
