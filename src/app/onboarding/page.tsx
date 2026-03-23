'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'preparing' | 'pregnant' | 'parenting'

export default function OnboardingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // 로그인 상태 확인
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // 이미 모드 선택 완료 → 해당 페이지로
        const mode = localStorage.getItem('dodam_mode')
        if (mode === 'pregnant') { router.push('/pregnant'); return }
        if (mode === 'parenting') { router.push('/'); return }
        if (mode === 'preparing') { router.push('/'); return }
        // 로그인은 됐지만 모드 미선택 → 모드 선택 화면
        setUser(user)
      }
      setCheckingAuth(false)
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (provider: 'kakao' | 'google') => {
    setLoading(provider)
    setError(null)

    const scopes = provider === 'kakao'
      ? 'profile_nickname profile_image'
      : 'profile email https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.sleep.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.heart_rate.read'
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        scopes,
      },
    })

    if (error) {
      setError('로그인에 실패했어요. 다시 시도해주세요.')
      setLoading(null)
    }
  }

  const handleModeSelect = (mode: Mode) => {
    localStorage.setItem('dodam_mode', mode)
    if (mode === 'preparing') {
      router.push('/preparing')
    } else if (mode === 'pregnant') {
      router.push('/pregnant')
    } else {
      router.push('/settings/children/add')
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" />
      </div>
    )
  }

  // 로그인 완료 → 모드 선택
  if (user) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full bg-[#3D8A5A] flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">도</span>
          </div>
          <h1 className="text-[22px] font-bold text-[#212124] mb-1">환영해요!</h1>
          <p className="text-[14px] text-[#868B94] mb-8">지금 어떤 상태인가요?</p>

          <div className="w-full max-w-xs space-y-3">
            {[
              { key: 'preparing' as Mode, emoji: '💝', title: '임신을 준비하고 있어요', desc: '배란일 · 건강 체크 · 준비 가이드' },
              { key: 'pregnant' as Mode, emoji: '🤰', title: '임신 중이에요', desc: '주차별 태아 성장 · D-day · 체크리스트' },
              { key: 'parenting' as Mode, emoji: '👶', title: '아이를 키우고 있어요', desc: '수유 · 수면 · 성장 기록 · AI 인사이트' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => handleModeSelect(option.key)}
                className="w-full p-5 rounded-2xl border-2 border-[#ECECEC] bg-white text-left transition-all active:scale-[0.98] active:border-[#3D8A5A] active:bg-[#F0F9F4]"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{option.emoji}</span>
                  <div>
                    <p className="text-[15px] font-bold text-[#212124]">{option.title}</p>
                    <p className="text-[12px] text-[#868B94] mt-0.5">{option.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 미로그인 → 로그인 화면
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-[#3D8A5A] flex items-center justify-center shadow-[0_4px_20px_rgba(61,138,90,0.25)]">
          <span className="text-3xl font-bold text-white">도</span>
        </div>
        <h1 className="mt-6 text-[28px] font-bold text-[#212124]">도담</h1>
        <p className="mt-2 text-[15px] text-[#868B94] text-center">오늘도 도담하게</p>
        <p className="mt-8 text-[13px] text-[#AEB1B9] text-center leading-relaxed max-w-[260px]">
          임신 준비부터 육아까지<br />
          AI 케어 파트너가 함께할게요
        </p>
      </div>

      <div className="px-6 pb-12 pt-6 space-y-3">
        {error && (
          <div className="mb-1 p-3 rounded-2xl bg-[#FFF0E6] text-[13px] text-[#D08068] text-center font-medium">
            {error}
          </div>
        )}

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
                <path d="M9 1C4.58 1 1 3.8 1 7.22c0 2.2 1.46 4.14 3.65 5.24-.16.58-.58 2.1-.66 2.43-.1.41.15.4.32.29.13-.09 2.1-1.43 2.95-2.01.56.08 1.14.12 1.74.12 4.42 0 8-2.8 8-6.07C17 3.8 13.42 1 9 1z" fill="#191919" />
              </svg>
              카카오로 시작하기
            </>
          )}
        </button>

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

        <p className="mt-2 text-xs text-[#9B9B9B] text-center leading-relaxed">
          시작하면{' '}
          <a href="/terms" className="underline">서비스 이용약관</a>,{' '}
          <a href="/privacy" className="underline">개인정보처리방침</a>에 동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}
