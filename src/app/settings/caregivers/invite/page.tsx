'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

      // 초대 토큰 생성
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72시간

      // user_id는 수락 시 설정. 초대 단계에서는 placeholder로 비워둠
      // RLS 우회를 위해 서비스 역할 또는 invited_by 패턴 사용
      await supabase.from('caregivers').insert({
        child_id: children[0].id,
        user_id: '00000000-0000-0000-0000-000000000000', // placeholder (수락 시 실제 user_id로 교체)
        role: 'caregiver',
        invite_token: token,
        invite_expires_at: expiresAt,
        permissions: { record: true, view: true, edit: false, delete: false },
      })

      setInviteLink(`${window.location.origin}/invite/${token}`)
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
          title: '도담 - 함께 기록해요 💌',
          description: '도담에서 아이의 수유, 수면, 기저귀 기록을 함께 볼 수 있어요. 가족으로 참여해주세요!',
          imageUrl: 'https://www.dodam.life/og-image.png',
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
    <div className="min-h-[100dvh] bg-white dark:bg-[#0A0B0D] flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">닫기</button>
          <h1 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">가족 초대</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        <div className="w-20 h-20 rounded-3xl bg-green-50 dark:bg-green-950 flex items-center justify-center mb-6">
          <span className="text-4xl">💌</span>
        </div>

        <h2 className="text-xl font-bold text-[#0A0B0D] dark:text-white text-center">
          가족과 함께 기록해요
        </h2>
        <p className="text-sm text-[#9B9B9B] text-center mt-2 leading-relaxed">
          초대 링크를 공유하면<br />
          가족이 아이의 기록을 함께 볼 수 있어요
        </p>

        {inviteLink ? (
          <div className="w-full mt-8 space-y-3">
            {/* 링크 표시 */}
            <div className="p-3 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a]">
              <p className="text-xs text-[#9B9B9B] truncate font-mono">{inviteLink}</p>
            </div>

            {/* 카카오톡으로 보내기 */}
            <button
              onClick={handleShareKakao}
              className="w-full h-[52px] rounded-xl font-semibold text-[15px] bg-[#FEE500] text-[#191919] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M9 0.6C4.03 0.6 0 3.713 0 7.534c0 2.476 1.641 4.648 4.106 5.876l-1.05 3.886c-.093.343.3.616.59.41l4.654-3.072c.23.018.462.028.7.028 4.97 0 9-3.113 9-6.928S13.97.6 9 .6" fill="#191919"/></svg>
              카카오톡으로 초대하기
            </button>

            {/* 링크 복사 */}
            <button
              onClick={handleCopy}
              className="w-full h-[48px] rounded-xl font-medium text-[15px] border border-[#E8E4DF] dark:border-[#2a2a2a] text-[#0A0B0D] dark:text-white active:scale-[0.98] transition-transform"
            >
              {copied ? '✅ 복사 완료!' : '📋 링크 복사'}
            </button>
          </div>
        ) : (
          <div className="mt-8">
            <div className="w-6 h-6 border-2 border-[#FF6F0F]/20 border-t-[#FF6F0F] rounded-full animate-spin" />
          </div>
        )}

        <p className="text-xs text-[#9B9B9B] mt-6 text-center">
          초대 링크는 72시간 동안 유효합니다
        </p>
      </div>
    </div>
  )
}
