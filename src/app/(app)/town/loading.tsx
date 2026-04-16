export default function Loading() {
  return (
    <div className="bg-[var(--color-page-bg)] min-h-[100dvh] animate-pulse">
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-24 space-y-3">
        {/* Header with tabs skeleton */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-6 w-28 bg-[#E8E4DF] rounded-lg" />
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-[#E8E4DF] rounded-full h-8 w-20" />
            <div className="px-3 py-1 bg-[#E8E4DF] rounded-full h-8 w-20" />
          </div>
        </div>

        {/* Grid of place cards */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden">
              <div className="h-32 bg-[#E8E4DF]" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-20 bg-[#E8E4DF] rounded-lg" />
                <div className="h-3 w-16 bg-[#E8E4DF] rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-5 w-24 bg-[#E8E4DF] rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-[#E8E4DF] rounded-lg" />
            <div className="h-4 w-3/4 bg-[#E8E4DF] rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
