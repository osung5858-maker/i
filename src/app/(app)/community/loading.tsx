export default function Loading() {
  return (
    <div className="bg-[var(--color-page-bg)] min-h-[100dvh] animate-pulse">
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-24 space-y-3">
        {/* Header section skeleton */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-6 w-40 bg-[#E8E4DF] rounded-lg" />
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-[#E8E4DF] rounded-full h-8 w-20" />
            <div className="px-3 py-1 bg-[#E8E4DF] rounded-full h-8 w-20" />
            <div className="px-3 py-1 bg-[#E8E4DF] rounded-full h-8 w-20" />
          </div>
        </div>

        {/* Feed items skeleton */}
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 space-y-3">
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#E8E4DF] rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 bg-[#E8E4DF] rounded-lg" />
                <div className="h-3 w-16 bg-[#E8E4DF] rounded-lg" />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-[#E8E4DF] rounded-lg" />
              <div className="h-4 w-4/5 bg-[#E8E4DF] rounded-lg" />
            </div>

            {/* Image placeholder */}
            <div className="h-32 bg-[#E8E4DF] rounded-xl" />

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <div className="h-4 w-12 bg-[#E8E4DF] rounded-lg" />
              <div className="h-4 w-12 bg-[#E8E4DF] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
