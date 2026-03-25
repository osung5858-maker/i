'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronRightIcon } from '@/components/ui/Icons'
import ThemeSelector from '@/components/settings/ThemeSelector'
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

  const [deleteStep, setDeleteStep] = useState(0) // 0: 닫힘, 1~5: 탈퇴 플로우
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const executeDeleteAccount = async () => {
    try {
      await supabase.from('users').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', user?.id)
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('dodam_') || k.startsWith('kn_'))
      keysToRemove.forEach(k => localStorage.removeItem(k))
      await supabase.auth.signOut()
      window.location.href = '/onboarding'
    } catch {
      alert('탈퇴 처리 중 오류가 발생했어요. 다시 시도해주세요.')
      setDeleteStep(0)
    }
  }

  const nickname = user?.user_metadata?.name || user?.user_metadata?.full_name || '사용자'
  const email = user?.email || user?.user_metadata?.email || ''
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#E8E4DF]">
        <div className="flex items-center justify-center h-14 px-5 max-w-lg mx-auto w-full">
          <h1 className="text-[15px] font-bold text-[#0A0B0D]">설정</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full pb-24">
        {/* 프로필 카드 */}
        <div className="m-4 p-4 rounded-2xl bg-white border border-[#E8E4DF]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6F0F] to-[#4A90D9] flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-lg font-bold">{nickname.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[#0A0B0D] truncate">{nickname}</p>
              {email && <p className="text-xs text-[#9B9B9B] truncate">{email}</p>}
            </div>
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B] shrink-0" />
          </div>
        </div>

        {/* 아이 관리 */}
        <div className="mx-4 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">아이 관리</p>
          </div>
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/settings/children/${child.id}`}
              className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="text-lg">👶</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#0A0B0D]">{child.name}</p>
                <p className="text-xs text-[#9B9B9B]">{child.birthdate}</p>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
            </Link>
          ))}
          <Link
            href="/settings/children/add"
            className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-[#f5f5f5] flex items-center justify-center">
              <span className="text-[#FF6F0F] text-lg font-light">+</span>
            </div>
            <p className="text-sm font-medium text-[#FF6F0F]">아이 추가</p>
          </Link>
        </div>

        {/* 공동양육자 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">가족</p>
          </div>
          <Link
            href="/settings/caregivers"
            className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <span className="text-lg">👨‍👩‍👧</span>
            </div>
            <p className="text-sm font-semibold text-[#0A0B0D]">공동양육자</p>
            <div className="flex-1" />
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
          </Link>
        </div>

        {/* 테마 설정 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">테마 컬러</p>
          </div>
          <div className="px-3 py-3 border-t border-[#E8E4DF]">
            <ThemeSelector />
          </div>
        </div>

        {/* 기록 설정 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">기록 설정</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF]">
            <div>
              <p className="text-sm font-semibold text-[#0A0B0D]">제스처 입력</p>
              <p className="text-xs text-[#9B9B9B]">스와이프로 빠르게 기록 (↑수유 ↓대변 ←수면 →소변)</p>
            </div>
            <button
              onClick={() => {
                const current = localStorage.getItem('dodam_gesture_mode') === 'true'
                localStorage.setItem('dodam_gesture_mode', current ? 'false' : 'true')
                window.location.reload()
              }}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                typeof window !== 'undefined' && localStorage.getItem('dodam_gesture_mode') === 'true'
                  ? 'bg-[var(--color-primary)]' : 'bg-[#D1D5DB]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${
                typeof window !== 'undefined' && localStorage.getItem('dodam_gesture_mode') === 'true'
                  ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* 서비스 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">서비스</p>
          </div>
          {[
            { label: '서비스 이용약관', href: '/terms' },
            { label: '개인정보처리방침', href: '/privacy' },
            { label: '의견 보내기', href: 'mailto:osung5858@gmail.com?subject=%5B%EB%8F%84%EB%8B%B4%5D%20%EC%9D%98%EA%B2%AC&body=%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94%2C%20%EB%8F%84%EB%8B%B4%20%ED%8C%80%EC%97%90%EA%B2%8C%20%EC%9D%98%EA%B2%AC%EC%9D%84%20%EB%B3%B4%EB%83%85%EB%8B%88%EB%8B%A4.%0A%0A' },
          ].map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
            >
              <p className="text-sm text-[#0A0B0D]">{item.label}</p>
              <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
            </Link>
          ))}
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF]">
            <p className="text-sm text-[#9B9B9B]">버전</p>
            <p className="text-sm text-[#9B9B9B]">0.1.3</p>
          </div>
        </div>

        {/* 계정 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3.5 active:bg-[#f5f5f5] transition-colors"
          >
            <p className="text-sm text-[#0A0B0D]">로그아웃</p>
          </button>
          <button
            onClick={() => setDeleteStep(1)}
            className="w-full flex items-center px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
          >
            <p className="text-sm text-red-500">회원 탈퇴</p>
          </button>
        </div>

        {/* 회원 탈퇴 5-depth 플로우 */}
        {deleteStep > 0 && (
          <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setDeleteStep(0)}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
              <div className="px-5 pb-6">
                {/* Step 1: 탈퇴 안내 */}
                {deleteStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-bold text-[#1A1918]">정말 떠나시는 건가요?</h3>
                    <div className="bg-red-50 rounded-xl p-4 space-y-2">
                      <p className="text-[13px] text-red-600 font-semibold">탈퇴 시 삭제되는 데이터:</p>
                      <p className="text-[13px] text-[#6B6966]">• 아이 프로필 및 성장 기록</p>
                      <p className="text-[13px] text-[#6B6966]">• 수유/수면/배변 전체 기록</p>
                      <p className="text-[13px] text-[#6B6966]">• 커뮤니티 글 및 리뷰</p>
                      <p className="text-[13px] text-[#6B6966]">• AI 분석 데이터</p>
                    </div>
                    <p className="text-[13px] text-[#9E9A95]">30일 유예 기간 내 재로그인하면 복구할 수 있어요.</p>
                    <button onClick={() => setDeleteStep(2)} className="w-full py-3 bg-[#E8E4DF] text-[#6B6966] text-[14px] font-semibold rounded-xl">다음</button>
                  </div>
                )}
                {/* Step 2: 탈퇴 사유 */}
                {deleteStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-bold text-[#1A1918]">떠나시는 이유가 궁금해요</h3>
                    {['사용하지 않아요', '다른 앱을 쓰고 있어요', '기능이 부족해요', '개인정보가 걱정돼요', '기타'].map(r => (
                      <button key={r} onClick={() => { setDeleteReason(r); setDeleteStep(3) }}
                        className={`w-full py-3 rounded-xl text-[14px] text-left px-4 border ${deleteReason === r ? 'border-red-400 bg-red-50' : 'border-[#E8E4DF]'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                )}
                {/* Step 3: 재확인 */}
                {deleteStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-bold text-[#1A1918]">정말 탈퇴하시겠어요?</h3>
                    <div className="bg-[#FFF9F5] rounded-xl p-4">
                      <p className="text-[13px] text-[#6B6966]">도담과 함께한 소중한 기록들이 30일 후 영구 삭제됩니다.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteStep(0)} className="flex-1 py-3 bg-[var(--color-primary)] text-white text-[14px] font-bold rounded-xl">돌아가기</button>
                      <button onClick={() => setDeleteStep(4)} className="flex-1 py-3 bg-[#E8E4DF] text-[#6B6966] text-[14px] font-semibold rounded-xl">계속 진행</button>
                    </div>
                  </div>
                )}
                {/* Step 4: 텍스트 입력 확인 */}
                {deleteStep === 4 && (
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-bold text-[#1A1918]">확인을 위해 &quot;탈퇴합니다&quot;를 입력해주세요</h3>
                    <input
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="탈퇴합니다"
                      className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-[14px]"
                    />
                    <button
                      onClick={() => deleteConfirmText === '탈퇴합니다' && setDeleteStep(5)}
                      disabled={deleteConfirmText !== '탈퇴합니다'}
                      className={`w-full py-3 rounded-xl text-[14px] font-semibold ${deleteConfirmText === '탈퇴합니다' ? 'bg-red-500 text-white' : 'bg-[#E8E4DF] text-[#9E9A95]'}`}
                    >다음</button>
                  </div>
                )}
                {/* Step 5: 최종 탈퇴 */}
                {deleteStep === 5 && (
                  <div className="space-y-4 text-center">
                    <p className="text-3xl">😢</p>
                    <h3 className="text-[17px] font-bold text-[#1A1918]">마지막 기회예요</h3>
                    <p className="text-[13px] text-[#6B6966]">탈퇴 버튼을 누르면 30일 유예 후 모든 데이터가 삭제됩니다.</p>
                    <button onClick={() => setDeleteStep(0)} className="w-full py-3 bg-[var(--color-primary)] text-white text-[14px] font-bold rounded-xl">역시 남을래요!</button>
                    <button onClick={executeDeleteAccount} className="w-full py-3 text-red-500 text-[13px]">탈퇴하기</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#9B9B9B] mt-6">
          오늘도 도담하게 🌱
        </p>
      </div>
    </div>
  )
}
