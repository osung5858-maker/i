'use client'

import { useEffect } from 'react'
import { RefreshIcon } from '@/components/ui/Icons'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 개발 환경에서만 에러 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary caught:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-page-bg)] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <span className="text-3xl">😢</span>
        </div>

        <h1 className="text-xl font-bold text-[#1A1918] mb-2">
          앗, 문제가 발생했어요
        </h1>

        <p className="text-sm text-[#6B6966] mb-6">
          예상치 못한 오류가 발생했습니다.<br />
          잠시 후 다시 시도해주세요.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] text-white font-semibold active:opacity-80 flex items-center justify-center gap-2"
          >
            <RefreshIcon className="w-5 h-5" />
            다시 시도
          </button>

          <a
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-[#E8E4DF] text-[#1A1918] font-semibold active:opacity-80"
          >
            홈으로 돌아가기
          </a>
        </div>

        {error.digest && (
          <p className="mt-4 text-xs text-[#9E9A95]">
            오류 ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
