'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleKakaoLogin = async () => {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'profile_nickname profile_image',
      },
    })

    if (error) {
      setError('로그인에 실패했어요. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white dark:bg-[#0A0B0D]">
      {/* 상단 여백 + 로고 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* 로고 */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0052FF] to-[#4A90D9] flex items-center justify-center shadow-[0_8px_30px_rgba(0,82,255,0.2)]">
          <span className="text-3xl font-bold text-white">도</span>
        </div>

        {/* 서비스명 */}
        <h1 className="mt-6 text-3xl font-bold text-[#0A0B0D] dark:text-white">
          도담
        </h1>

        {/* 슬로건 */}
        <p className="mt-2 text-base text-[#6B6B6B] dark:text-[#9B9B9B] text-center">
          오늘도 도담하게, 우리 동네에서
        </p>

        {/* 설명 */}
        <p className="mt-8 text-sm text-[#9B9B9B] text-center leading-relaxed max-w-[280px]">
          아이의 하루 리듬을 이해하고<br />
          동네 육아 인프라까지 연결해주는<br />
          AI 케어 파트너
        </p>
      </div>

      {/* 하단 로그인 영역 */}
      <div className="px-6 pb-12 pt-6">
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950 text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {/* 카카오 로그인 버튼 */}
        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full h-[52px] rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: '#FEE500', color: '#191919' }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#191919]/30 border-t-[#191919] rounded-full animate-spin" />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 1C4.58 1 1 3.8 1 7.22c0 2.2 1.46 4.14 3.65 5.24-.16.58-.58 2.1-.66 2.43-.1.41.15.4.32.29.13-.09 2.1-1.43 2.95-2.01.56.08 1.14.12 1.74.12 4.42 0 8-2.8 8-6.07C17 3.8 13.42 1 9 1z"
                  fill="#191919"
                />
              </svg>
              카카오로 시작하기
            </>
          )}
        </button>

        {/* 약관 안내 */}
        <p className="mt-4 text-xs text-[#9B9B9B] text-center leading-relaxed">
          시작하면{' '}
          <button className="underline">서비스 이용약관</button>,{' '}
          <button className="underline">개인정보처리방침</button>,{' '}
          <button className="underline">아동 개인정보 수집·이용</button>에
          동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}
