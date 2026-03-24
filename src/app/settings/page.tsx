'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronRightIcon } from '@/components/ui/Icons'
import type { User } from '@supabase/supabase-js'
import type { Child } from '@/types'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      setUser(user)

      const { data } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')
      if (data) setChildren(data as Child[])
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/onboarding'
  }

  const handleDeleteAccount = async () => {
    if (!confirm('정말 탈퇴하시겠어요?\n\n• 30일 유예 기간 후 모든 데이터가 삭제됩니다\n• 아이 기록, 성장 데이터, 커뮤니티 글이 모두 사라져요\n• 유예 기간 내 재로그인하면 복구할 수 있어요')) return
    if (!confirm('마지막 확인입니다. 정말 탈퇴하시겠어요?')) return
    try {
      // 사용자 상태를 withdrawn으로 변경
      await supabase.from('users').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', user?.id)
      // 로컬 데이터 정리
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('dodam_') || k.startsWith('kn_'))
      keysToRemove.forEach(k => localStorage.removeItem(k))
      await supabase.auth.signOut()
      window.location.href = '/onboarding'
    } catch {
      alert('탈퇴 처리 중 오류가 발생했어요. 다시 시도해주세요.')
    }
  }

  const nickname = user?.user_metadata?.name || user?.user_metadata?.full_name || '사용자'
  const email = user?.email || user?.user_metadata?.email || ''
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5] dark:bg-[#0A0B0D]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl border-b border-[#E8E4DF] dark:border-[#2a2a2a]">
        <div className="flex items-center justify-center h-14 px-5 max-w-lg mx-auto w-full">
          <h1 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">설정</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full pb-24">
        {/* 프로필 카드 */}
        <div className="m-4 p-4 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6F0F] to-[#4A90D9] flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-lg font-bold">{nickname.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[#0A0B0D] dark:text-white truncate">{nickname}</p>
              {email && <p className="text-xs text-[#9B9B9B] truncate">{email}</p>}
            </div>
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B] shrink-0" />
          </div>
        </div>

        {/* 아이 관리 */}
        <div className="mx-4 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">아이 관리</p>
          </div>
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/settings/children/${child.id}`}
              className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] dark:border-[#2a2a2a] active:bg-[#f5f5f5] dark:active:bg-[#2a2a2a] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <span className="text-lg">👶</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#0A0B0D] dark:text-white">{child.name}</p>
                <p className="text-xs text-[#9B9B9B]">{child.birthdate}</p>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
            </Link>
          ))}
          <Link
            href="/settings/children/add"
            className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] dark:border-[#2a2a2a] active:bg-[#f5f5f5] dark:active:bg-[#2a2a2a] transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center">
              <span className="text-[#FF6F0F] text-lg font-light">+</span>
            </div>
            <p className="text-sm font-medium text-[#FF6F0F]">아이 추가</p>
          </Link>
        </div>

        {/* 공동양육자 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">가족</p>
          </div>
          <Link
            href="/settings/caregivers"
            className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] dark:border-[#2a2a2a] active:bg-[#f5f5f5] dark:active:bg-[#2a2a2a] transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950 flex items-center justify-center">
              <span className="text-lg">👨‍👩‍👧</span>
            </div>
            <p className="text-sm font-semibold text-[#0A0B0D] dark:text-white">공동양육자</p>
            <div className="flex-1" />
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
          </Link>
        </div>

        {/* 서비스 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">서비스</p>
          </div>
          {[
            { label: '서비스 이용약관', href: '/terms' },
            { label: '개인정보처리방침', href: '/privacy' },
            { label: '의견 보내기', href: 'mailto:dodam@dodam.life' },
          ].map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF] dark:border-[#2a2a2a] active:bg-[#f5f5f5] dark:active:bg-[#2a2a2a] transition-colors"
            >
              <p className="text-sm text-[#0A0B0D] dark:text-white">{item.label}</p>
              <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
            </Link>
          ))}
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF] dark:border-[#2a2a2a]">
            <p className="text-sm text-[#9B9B9B]">버전</p>
            <p className="text-sm text-[#9B9B9B]">1.0.0</p>
          </div>
        </div>

        {/* 계정 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a] overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3.5 active:bg-[#f5f5f5] dark:active:bg-[#2a2a2a] transition-colors"
          >
            <p className="text-sm text-[#0A0B0D] dark:text-white">로그아웃</p>
          </button>
          <button
            onClick={handleDeleteAccount}
            className="w-full flex items-center px-4 py-3.5 border-t border-[#E8E4DF] dark:border-[#2a2a2a] active:bg-[#f5f5f5] dark:active:bg-[#2a2a2a] transition-colors"
          >
            <p className="text-sm text-red-500">회원 탈퇴</p>
          </button>
        </div>

        <p className="text-center text-xs text-[#9B9B9B] mt-6">
          오늘도 도담하게 🌱
        </p>
      </div>
    </div>
  )
}
