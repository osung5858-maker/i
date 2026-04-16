export default function Loading() {
  return (
    <div className="bg-[var(--color-page-bg)] min-h-[100dvh] animate-pulse">
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-24 space-y-3">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4">
          <div className="h-6 w-32 bg-[#E8E4DF] rounded-lg" />
        </div>

        {/* List items */}
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-[#E8E4DF] rounded-lg" />
                <div className="h-3 w-24 bg-[#E8E4DF] rounded-lg" />
              </div>
              <div className="w-8 h-8 bg-[#E8E4DF] rounded-lg" />
            </div>
            <div className="h-3 w-32 bg-[#E8E4DF] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
