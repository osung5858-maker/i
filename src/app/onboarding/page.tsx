'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeartIcon, PregnantIcon, BabyIcon } from '@/components/ui/Icons'
import ModeTutorial from '@/components/onboarding/ModeTutorial'
import Image from 'next/image'
type Mode = 'preparing' | 'pregnant' | 'parenting'

const PROFILE_AVATARS = [
  '/images/illustrations/profile-default1.webm',
  '/images/illustrations/profile-default2.webm',
  '/images/illustrations/profile-default3.webm',
  '/images/illustrations/profile-default4.webm',
]

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

  const [tutorialMode, setTutorialMode] = useState<Mode | null>(null)

  const handleModeSelect = (mode: Mode) => {
    localStorage.setItem('dodam_mode', mode)
    // 튜토리얼을 처음 한 번만
    const tutorialDone = localStorage.getItem(`dodam_tutorial_${mode}`)
    if (!tutorialDone) {
      setTutorialMode(mode)
    } else {
      navigateToMode(mode)
    }
  }

  const navigateToMode = (mode: Mode) => {
    if (mode === 'preparing') router.push('/preparing')
    else if (mode === 'pregnant') router.push('/pregnant')
    else router.push('/settings/children/add')
  }

  const handleTutorialComplete = () => {
    if (!tutorialMode) return
    localStorage.setItem(`dodam_tutorial_${tutorialMode}`, '1')
    navigateToMode(tutorialMode)
  }

  // 튜토리얼 진행 중
  if (tutorialMode) {
    return <ModeTutorial mode={tutorialMode} onComplete={handleTutorialComplete} />
  }

  if (checkingAuth) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full shimmer" />
      </div>
    )
  }

  // 로그인 완료 → 모드 선택
  if (user) {
    const randomAvatar = PROFILE_AVATARS[Math.floor(Math.random() * PROFILE_AVATARS.length)]

    return (
      <div className="min-h-[100dvh] flex flex-col bg-white">
        <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-6 pt-16 pb-16">
          {/* 랜덤 프로필 아바타 */}
          <div className="w-20 h-20 rounded-full overflow-hidden mb-5" style={{ boxShadow: 'var(--shadow-md)' }}>
            <video src={randomAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          </div>
          <h1 className="text-heading-2 mb-1">환영해요!</h1>
          <p className="text-body text-tertiary mb-8">지금 어떤 상태인가요?</p>

          <div className="w-full max-w-sm space-y-4">
            {[
              { key: 'preparing' as Mode, title: '임신을 준비하고 있어요', desc: '배란일 · 건강 체크 · 준비 가이드', video: '/images/illustrations/onboarding-preparing.webm' },
              { key: 'pregnant' as Mode, title: '임신 중이에요', desc: '주차별 태아 성장 · D-day · 체크리스트', video: '/images/illustrations/onboarding-pregnant.webm' },
              { key: 'parenting' as Mode, title: '아이를 키우고 있어요', desc: '수유 · 수면 · 성장 기록 · AI 인사이트', video: '/images/illustrations/onboarding-parenting.webm' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => handleModeSelect(option.key)}
                className="w-full dodam-card press-feedback text-left overflow-hidden border-2"
              >
                {/* 일러스트 영상 (그라데이션 페이드) */}
                <div className="w-full h-36 bg-white relative overflow-hidden">
                  <video src={option.video} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'linear-gradient(to bottom, transparent 60%, white 100%), linear-gradient(to top, transparent 85%, white 100%), linear-gradient(to right, white 0%, transparent 10%, transparent 90%, white 100%)',
                  }} />
                </div>
                {/* 텍스트 */}
                <div style={{ padding: 'var(--spacing-4)' }}>
                  <p className="text-body-emphasis">{option.title}</p>
                  <p className="text-caption mt-1">{option.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    )
  }

  // 미로그인 → 로그인 화면
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <Image
          src="/app-icon.png"
          alt="도담"
          width={80}
          height={80}
          priority
          className="rounded-[20px]"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        />
        <h1 className="mt-6 text-heading-2">도담</h1>
        <p className="mt-2 text-body-emphasis text-center">오늘도 도담하게</p>
        <p className="mt-8 text-caption text-center leading-relaxed max-w-[260px]">
          임신 준비부터 육아까지<br />
          AI 케어 파트너가 함께할게요
        </p>
      </div>

      <div className="px-6 pb-12 pt-6" style={{ gap: 'var(--spacing-3)' }}>
        {error && (
          <div className="mb-1 rounded-2xl bg-[#FFF0E6] text-caption text-[#D08068] text-center font-medium" style={{ padding: 'var(--spacing-3)' }}>
            {error}
          </div>
        )}

        <button
          onClick={() => handleLogin('kakao')}
          disabled={loading !== null}
          className="w-full dodam-btn dodam-btn-lg press-feedback"
          style={{ backgroundColor: '#FEE500', color: '#191919', gap: 'var(--spacing-2)' }}
        >
          {loading === 'kakao' ? (
            <div className="w-5 h-5 border-2 border-[#191919]/30 border-t-[#191919] rounded-full shimmer" />
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
          className="w-full dodam-btn dodam-btn-outline dodam-btn-lg press-feedback"
          style={{ gap: 'var(--spacing-2)', color: '#3C4043' }}
        >
          {loading === 'google' ? (
            <div className="w-5 h-5 border-2 border-[#4285F4]/30 border-t-[#4285F4] rounded-full shimmer" />
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
