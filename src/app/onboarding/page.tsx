'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (provider: 'kakao' | 'google') => {
    setLoading(provider)
    setError(null)

    const supabase = createClient()
    const scopes = provider === 'kakao' ? 'profile_nickname profile_image' : 'profile email'

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes,
      },
    })

    if (error) {
      setError('로그인에 실패했어요. 다시 시도해주세요.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">
      {/* 상단 여백 + 로고 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* 로고 */}
        <div className="w-20 h-20 rounded-full bg-[#FF6F0F] flex items-center justify-center shadow-[0_4px_20px_rgba(255,111,15,0.25)]">
          <span className="text-3xl font-bold text-white">도</span>
        </div>

        {/* 서비스명 */}
        <h1 className="mt-6 text-[28px] font-bold text-[#212124]">
          도담
        </h1>

        {/* 슬로건 */}
        <p className="mt-2 text-[15px] text-[#868B94] text-center">
          오늘도 도담하게, 우리 동네에서
        </p>

        {/* 설명 */}
        <p className="mt-8 text-[13px] text-[#AEB1B9] text-center leading-relaxed max-w-[260px]">
          아이의 하루 리듬을 이해하고<br />
          동네 육아 인프라까지 연결해주는<br />
          AI 케어 파트너
        </p>
      </div>

      {/* 하단 로그인 영역 */}
      <div className="px-6 pb-12 pt-6 space-y-3">
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-1 p-3 rounded-2xl bg-[#FFF0E6] text-[13px] text-[#FF6F0F] text-center font-medium">
            {error}
          </div>
        )}

        {/* 카카오 로그인 */}
        <button
          onClick={() => handleLogin('kakao')}
          disabled={loading !== null}
          className="w-full h-[52px] rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: '#FEE500', color: '#191919' }}
        >
          {loading === 'kakao' ? (
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

        {/* Google 로그인 */}
        <button
          onClick={() => handleLogin('google')}
          disabled={loading !== null}
          className="w-full h-[52px] rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 border border-[#DADCE0] bg-white text-[#3C4043]"
        >
          {loading === 'google' ? (
            <div className="w-5 h-5 border-2 border-[#4285F4]/30 border-t-[#4285F4] rounded-full animate-spin" />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Google로 시작하기
            </>
          )}
        </button>

        {/* 약관 안내 */}
        <p className="mt-2 text-xs text-[#9B9B9B] text-center leading-relaxed">
          시작하면{' '}
          <a href="/terms" className="underline">서비스 이용약관</a>,{' '}
          <a href="/privacy" className="underline">개인정보처리방침</a>,{' '}
          <a href="/privacy#child" className="underline">아동 개인정보 수집·이용</a>에
          동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}
