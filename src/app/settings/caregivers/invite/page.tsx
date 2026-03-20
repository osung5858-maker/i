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

      await supabase.from('caregivers').insert({
        child_id: children[0].id,
        user_id: user.id, // 임시로 본인 ID (수락 시 변경)
        role: 'caregiver',
        invite_token: token,
        invite_expires_at: expiresAt,
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
    // 카카오톡 공유 (웹 공유 API 폴백)
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
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">닫기</button>
          <h1 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">가족 초대</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto">
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
            <div className="p-3 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a]">
              <p className="text-xs text-[#9B9B9B] truncate font-mono">{inviteLink}</p>
            </div>

            {/* 공유 버튼 */}
            <button
              onClick={handleShareKakao}
              className="w-full h-[52px] rounded-xl font-semibold text-[15px] bg-[#0052FF] text-white shadow-[0_4px_12px_rgba(0,82,255,0.3)] active:scale-[0.98] transition-transform"
            >
              공유하기
            </button>

            {/* 복사 버튼 */}
            <button
              onClick={handleCopy}
              className="w-full h-[48px] rounded-xl font-medium text-[15px] border border-[#f0f0f0] dark:border-[#2a2a2a] text-[#0A0B0D] dark:text-white active:scale-[0.98] transition-transform"
            >
              {copied ? '복사 완료!' : '링크 복사'}
            </button>
          </div>
        ) : (
          <div className="mt-8">
            <div className="w-6 h-6 border-2 border-[#0052FF]/20 border-t-[#0052FF] rounded-full animate-spin" />
          </div>
        )}

        <p className="text-xs text-[#9B9B9B] mt-6 text-center">
          초대 링크는 72시간 동안 유효합니다
        </p>
      </div>
    </div>
  )
}
