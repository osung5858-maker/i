'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EnvelopeIcon } from '@/components/ui/Icons'

type InviteStatus = 'loading' | 'valid' | 'expired' | 'accepted' | 'error'

export default function InviteAcceptPage() {
  const params = useParams()
  const token = params.token as string
  const supabase = createClient()

  const [status, setStatus] = useState<InviteStatus>('loading')
  const [childName, setChildName] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function checkInvite() {
      // API route로 토큰 조회 (RLS 우회)
      try {
        const res = await fetch(`/api/invite?token=${token}`)
        const data = await res.json()

        if (data.status === 'expired') { setStatus('expired'); return }
        if (data.status === 'accepted') { setStatus('accepted'); return }
        if (data.status === 'valid') {
          setChildName(data.childName || '도담이')
          setStatus('valid')
        } else {
          setStatus('expired')
        }
      } catch {
        setStatus('error')
      }
    }
    checkInvite()
  }, [token])

  const handleAccept = async () => {
    setProcessing(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // 비로그인 → 카카오 로그인 후 돌아오기
      await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dodam.life'}/invite/${token}`,
          scopes: 'profile_nickname profile_image',
        },
      })
      return
    }

    // API route로 초대 수락 (RLS 우회)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: user.id }),
      })
      const data = await res.json()

      if (data.error) {
        setStatus('error')
        setProcessing(false)
        return
      }

      window.location.href = '/'
    } catch {
      setStatus('error')
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <p className="text-[13px] text-[#6B6966]">초대를 확인하는 중이에요...</p>
        </div>
      )}

      {status === 'valid' && (
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 rounded-full bg-[#FFF0E6] flex items-center justify-center mx-auto mb-6">
            <EnvelopeIcon className="w-10 h-10 text-[#D08068]" />
          </div>
          <h1 className="text-[22px] font-bold text-[#212124] mb-2">
            {childName}의 가족이 되어주세요
          </h1>
          <p className="text-[14px] text-[#6B6966] leading-relaxed mb-8">
            함께 기록하면 더 도담해요.<br />
            아이의 기록을 함께 볼 수 있어요.
          </p>
          <button
            onClick={handleAccept}
            disabled={processing}
            className="w-full h-[52px] rounded-2xl font-semibold text-[15px] bg-[var(--color-primary)] text-white active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {processing ? '연결하는 중...' : '수락하기'}
          </button>
          <p className="text-[13px] text-[#9E9A95] mt-4">
            카카오 로그인이 필요할 수 있어요
          </p>
        </div>
      )}

      {status === 'expired' && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#9E9A95]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h1 className="text-[18px] font-bold text-[#212124] mb-1">초대가 만료되었어요</h1>
          <p className="text-[13px] text-[#6B6966]">다시 초대해달라고 해주세요</p>
        </div>
      )}

      {status === 'accepted' && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <h1 className="text-[18px] font-bold text-[#212124] mb-1">이미 연결되었어요!</h1>
          <button onClick={() => window.location.href = '/'} className="mt-4 text-[14px] font-semibold text-[var(--color-primary)]">
            홈으로 가기
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <h1 className="text-[18px] font-bold text-[#212124] mb-1">오류가 발생했어요</h1>
          <p className="text-[13px] text-[#6B6966]">다시 시도해주세요</p>
        </div>
      )}
    </div>
  )
}
