export default function Loading() {
  return (
    <div className="bg-[var(--color-page-bg)] min-h-[100dvh] animate-pulse">
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-24 space-y-3">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4">
          <div className="h-6 w-32 bg-[#E8E4DF] rounded-lg" />
        </div>

        {/* Settings sections */}
        {[1, 2, 3].map(section => (
          <div key={section} className="space-y-2">
            {/* Section title */}
            <div className="px-5 py-2">
              <div className="h-5 w-24 bg-[#E8E4DF] rounded-lg" />
            </div>

            {/* Settings items */}
            {[1, 2, 3].map(item => (
              <div key={`${section}-${item}`} className="bg-white rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-[#E8E4DF] rounded-lg" />
                    <div className="h-3 w-40 bg-[#E8E4DF] rounded-lg" />
                  </div>
                  <div className="w-6 h-6 bg-[#E8E4DF] rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
