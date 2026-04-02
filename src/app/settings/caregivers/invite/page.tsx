'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeartIcon, ClipboardIcon } from '@/components/ui/Icons'

export default function InvitePage() {
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function generateLink() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }

      const { data: children } = await supabase
        .from('children')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!children || children.length === 0) return

      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일

      const { error } = await supabase.from('caregivers').insert({
        child_id: children[0].id,
        user_id: '00000000-0000-0000-0000-000000000000',
        role: 'caregiver',
        invite_token: token,
        invite_expires_at: expiresAt,
        permissions: { record: true, view: true, edit: false, delete: false },
      })

      if (error) {
        // RLS 차단 등 insert 실패 시 API route로 우회
        const res = await fetch('/api/invite/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: children[0].id, token, expiresAt }),
        })
        if (!res.ok) return
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dodam.life'
      setInviteLink(`${siteUrl}/invite/${token}`)
    }
    generateLink()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareKakao = () => {
    if (!inviteLink) return

    // 카카오 SDK로 카카오톡 공유
    if (typeof window !== 'undefined' && window.Kakao?.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '도담 - 함께 기록해요',
          description: '도담에서 아이의 수유, 수면, 기저귀 기록을 함께 볼 수 있어요. 가족으로 참여해주세요!',
          imageUrl: 'https://dodam.life/og-image.png',
          link: {
            mobileWebUrl: inviteLink,
            webUrl: inviteLink,
          },
        },
        buttons: [
          {
            title: '초대 수락하기',
            link: {
              mobileWebUrl: inviteLink,
              webUrl: inviteLink,
            },
          },
        ],
      })
      return
    }

    // 카카오 SDK 미로드 시 웹 공유 API 폴백
    if (navigator.share) {
      navigator.share({
        title: '도담 - 함께 기록해요',
        text: '도담에서 아이 기록을 함께 볼 수 있어요!',
        url: inviteLink,
      })
    } else {
      handleCopy()
    }
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <header className="sticky top-[72px] z-30 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-sm text-tertiary">닫기</button>
          <h1 className="text-subtitle text-primary">가족 초대</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center mb-6">
          <HeartIcon className="w-10 h-10 text-green-600" />
        </div>

        <h2 className="text-xl font-bold text-primary text-center">
          가족과 함께 기록해요
        </h2>
        <p className="text-sm text-tertiary text-center mt-2 leading-relaxed">
          초대 링크를 공유하면<br />
          가족이 아이의 기록을 함께 볼 수 있어요
        </p>

        {inviteLink ? (
          <div className="w-full mt-8 space-y-3">
            {/* 링크 표시 */}
            <div className="p-3 rounded-xl bg-[#f5f5f5] border border-[#E8E4DF]">
              <p className="text-xs text-tertiary truncate font-mono">{inviteLink}</p>
            </div>

            {/* 카카오톡으로 보내기 */}
            <button
              onClick={handleShareKakao}
              className="w-full h-[52px] rounded-xl font-semibold text-subtitle bg-[#FEE500] text-[#191919] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M9 0.6C4.03 0.6 0 3.713 0 7.534c0 2.476 1.641 4.648 4.106 5.876l-1.05 3.886c-.093.343.3.616.59.41l4.654-3.072c.23.018.462.028.7.028 4.97 0 9-3.113 9-6.928S13.97.6 9 .6" fill="#191919"/></svg>
              카카오톡으로 초대하기
            </button>

            {/* 링크 복사 */}
            <button
              onClick={handleCopy}
              className="w-full h-[48px] rounded-xl font-medium text-subtitle border border-[#E8E4DF] text-primary active:scale-[0.98] transition-transform"
            >
              {copied ? '복사 완료!' : '링크 복사'}
            </button>
          </div>
        ) : (
          <div className="mt-8">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
          </div>
        )}

        <p className="text-xs text-tertiary mt-6 text-center">
          초대 링크는 7일 동안 유효합니다
        </p>
      </div>
    </div>
  )
}
