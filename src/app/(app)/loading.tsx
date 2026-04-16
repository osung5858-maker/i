export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-page-bg)] animate-pulse">
      {/* Header skeleton */}
      <div className="sticky top-0 bg-white border-b border-[#E8E4DF] px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 bg-[#E8E4DF] rounded"></div>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-[#E8E4DF] rounded-full"></div>
            <div className="w-8 h-8 bg-[#E8E4DF] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-4">
        {/* Card skeleton 1 */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-5 w-32 bg-[#E8E4DF] rounded"></div>
          <div className="h-4 w-full bg-[#E8E4DF] rounded"></div>
          <div className="h-4 w-3/4 bg-[#E8E4DF] rounded"></div>
        </div>

        {/* Card skeleton 2 */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#E8E4DF] rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-[#E8E4DF] rounded"></div>
              <div className="h-3 w-32 bg-[#E8E4DF] rounded"></div>
            </div>
          </div>
        </div>

        {/* Card skeleton 3 */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="h-5 w-40 bg-[#E8E4DF] rounded"></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-20 bg-[#E8E4DF] rounded-lg"></div>
            <div className="h-20 bg-[#E8E4DF] rounded-lg"></div>
          </div>
        </div>

        {/* List skeleton */}
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E8E4DF] rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-[#E8E4DF] rounded"></div>
                <div className="h-3 w-16 bg-[#E8E4DF] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E4DF] px-4 py-2">
        <div className="flex justify-around">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 bg-[#E8E4DF] rounded"></div>
              <div className="h-2 w-8 bg-[#E8E4DF] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
