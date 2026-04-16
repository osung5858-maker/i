'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <p className="text-4xl">😵</p>
        <h2 className="text-lg font-bold">문제가 발생했어요</h2>
        <p className="text-sm text-gray-500">{error.message || '잠시 후 다시 시도해주세요'}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
            다시 시도
          </button>
          <a href="/" className="px-4 py-2 border rounded-lg text-sm">
            홈으로
          </a>
        </div>
      </div>
    </div>
  )
}
