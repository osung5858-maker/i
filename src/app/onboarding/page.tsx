'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { upsertProfile, getProfile } from '@/lib/supabase/userProfile'
import Image from 'next/image'
import ModeTutorial from '@/components/onboarding/ModeTutorial'
import { trackEvent } from '@/lib/analytics'
type Mode = 'preparing' | 'pregnant' | 'parenting'


export default function OnboardingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [showIntro, setShowIntro] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('error') === 'auth') {
      setError('로그인에 실패했어요. 다시 시도해주세요.')
    }
  }, [searchParams])

  // 첫 방문 시 인트로 가이드 모달 표시
  useEffect(() => {
    if (!localStorage.getItem('dodam_intro_shown')) {
      setShowIntro(true)
    }
  }, [])

  // 로그인 상태 확인
  useEffect(() => {
    async function check() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (user) {
          try {
            const p = await getProfile()
            const mode = p?.mode
            if (mode) localStorage.setItem('dodam_mode', mode)

            if (mode === 'pregnant') { router.push('/pregnant'); return }
            if (mode === 'parenting') { router.push('/'); return }
            if (mode === 'preparing') { router.push('/'); return }
          } catch {
            // getProfile 실패해도 모드 선택 카드 표시
          }
          setUser(user)
        }
      } catch {
        // 네트워크/504 에러 시 로그인 화면 표시
      }
      setCheckingAuth(false)
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (provider: 'kakao' | 'google') => {
    setLoading(provider)
    setError(null)
    trackEvent('onboarding_started', { provider })

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

  const handleModeSelect = async (mode: Mode) => {
    localStorage.setItem('dodam_mode', mode)
    trackEvent('mode_selected', { mode })
    trackEvent('onboarding_completed', { mode })
    upsertProfile({ mode })
    if (mode === 'preparing') router.push('/preparing')
    else if (mode === 'pregnant') router.push('/pregnant')
    else router.push('/')
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
    return (
      <div className="h-[100dvh] flex flex-col bg-white">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-3 shrink-0">
          <p className="text-caption font-semibold tracking-[0.08em] text-[var(--color-primary)] mb-0.5">도담 · AI 육아파트너</p>
          <h1 className="text-heading-2 font-bold">지금 어떤 여정에 계신가요?</h1>
        </div>

        {/* 카드 */}
        <div className="flex-1 flex flex-col px-4 pb-6 gap-3 min-h-0">
          {[
            { key: 'preparing' as Mode, title: '임신 준비 중', desc: '배란일 · 건강 체크 · 준비 가이드', video: '/images/illustrations/onboarding-preparing.webm', poster: '/images/illustrations/onboarding-preparing.jpg', tint: '140,72,42', bg: '#8C482A' },
            { key: 'pregnant' as Mode,  title: '임신 중',      desc: '주차별 태아 성장 · D-day · 체크리스트', video: '/images/illustrations/onboarding-pregnant.webm',  poster: '/images/illustrations/onboarding-pregnant.jpg',  tint: '30,90,55',  bg: '#1E5A37' },
            { key: 'parenting' as Mode, title: '육아 중',      desc: '수유 · 수면 · 성장 기록 · AI 인사이트', video: '/images/illustrations/onboarding-parenting.webm', poster: '/images/illustrations/onboarding-parenting.jpg', tint: '40,75,130', bg: '#284B82' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => handleModeSelect(option.key)}
              className="flex-1 rounded-2xl press-feedback overflow-hidden relative min-h-0"
              style={{ backgroundColor: option.bg }}
            >
              {/* 정적 포스터 (비디오 로드 전/실패 시 폴백) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option.poster}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* 비디오 배경 (로드 성공 시 포스터 위에 덮음) */}
              <video
                src={option.video}
                poster={option.poster}
                autoPlay loop muted playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* 브랜드 컬러 그라데이션 오버레이 */}
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to top, rgba(${option.tint},0.75) 0%, rgba(${option.tint},0.25) 40%, transparent 70%)` }}
              />
              {/* 텍스트 — 좌하단 */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 text-left">
                <p className="text-[18px] font-extrabold text-white" style={{ textShadow: `0 1px 6px rgba(${option.tint},0.6)` }}>{option.title}</p>
                <p className="text-[13px] text-white/90 mt-0.5 font-bold" style={{ textShadow: `0 1px 4px rgba(${option.tint},0.5)` }}>{option.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 미로그인 → 로그인 화면
  return (
    <div className="min-h-[100dvh] flex flex-col relative" style={{ background: 'linear-gradient(180deg, #FFF0E6 0%, #FFF8F4 35%, #FFFFFF 60%)' }}>

      {/* 상단 브랜딩 */}
      <div className="flex flex-col items-center px-6 pt-20 pb-6">
        <Image
          src="/app-icon.png"
          alt="도담"
          width={72}
          height={72}
          priority
          className="rounded-[18px]"
          style={{ boxShadow: '0 8px 28px rgba(208,122,98,0.22)' }}
        />
        <h1 className="mt-5 text-center">
          <span className="block text-[36px] font-extrabold text-[#2D2015] tracking-tight">도담</span>
          <span className="block mt-1 text-[13px] font-semibold text-[#C67A52] tracking-wide">AI 육아파트너</span>
        </h1>
        <p className="mt-3 text-[14px] text-[#8A7060] text-center leading-relaxed">
          임신 준비부터 육아까지<br />AI 케어 파트너가 함께할게요
        </p>
      </div>

      {/* 로그인 버튼 */}
      <div className="mt-auto px-6 pb-12 pt-4 flex flex-col gap-3">
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

        <p className="mt-2 text-xs text-[#B0A090] text-center leading-relaxed">
          시작하면{' '}
          <a href="/terms" className="underline">서비스 이용약관</a>,{' '}
          <a href="/privacy" className="underline">개인정보처리방침</a>에 동의하게 됩니다.
        </p>
      </div>

      {/* 첫 방문 인트로 가이드 (6장 모달) */}
      {showIntro && (
        <ModeTutorial
          mode="intro"
          modal
          onComplete={() => {
            localStorage.setItem('dodam_intro_shown', '1')
            setShowIntro(false)
          }}
        />
      )}
    </div>
  )
}
