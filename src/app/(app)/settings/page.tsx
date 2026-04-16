'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { safeGetItem, safeRemoveItem } from '@/lib/safeStorage'
import { ChevronRightIcon, UsersIcon, BellIcon } from '@/components/ui/Icons'
import { loadNotificationSettings, loadNotificationSettingsFromDB, saveNotificationSettings, type NotificationSettings } from '@/lib/push/config'
import { subscribePush, unsubscribePush, isPushSubscribed } from '@/lib/push/subscribe'
// child avatars are .webm video files
import ThemeSelector from '@/components/settings/ThemeSelector'
import type { User } from '@supabase/supabase-js'
import type { Child } from '@/types'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [mode, setMode] = useState('parenting')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      setUser(user)

      const { data } = await supabase
        .from('children')
        .select('id, name, photo_url, birthdate, sex')
        .eq('user_id', user.id)
        .order('created_at')
      if (data) setChildren(data as Child[])
    }
    load()
    setMode(safeGetItem('dodam_mode') || 'parenting')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/onboarding'
  }

  // 알림 설정
  const [notiSettings, setNotiSettings] = useState<NotificationSettings>(loadNotificationSettings())
  const [pushActive, setPushActive] = useState(false)

  useEffect(() => {
    isPushSubscribed().then(setPushActive)
    loadNotificationSettingsFromDB().then(setNotiSettings)
  }, [])

  const toggleNoti = async (key: keyof NotificationSettings) => {
    if (key === 'enabled') {
      // 토글 상태는 실제 구독 여부(pushActive) 기준
      const wantEnable = !pushActive
      if (wantEnable) {
        const result = await subscribePush()
        setPushActive(result.ok)
        if (!result.ok) {
          const msg = result.reason === 'sw'
            ? '현재 환경에서는 푸시 알림을 사용할 수 없어요. 홈 화면에 앱을 추가하거나 프로덕션 환경에서 이용해주세요.'
            : result.reason === 'permission'
              ? '브라우저 알림 권한이 거부되어 있어요. 설정에서 허용해주세요.'
              : '푸시 알림 설정 중 오류가 발생했어요. 다시 시도해주세요.'
          window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: msg } }))
          return
        }
      } else {
        await unsubscribePush()
        setPushActive(false)
      }
      const next = { ...notiSettings, enabled: wantEnable }
      setNotiSettings(next)
      saveNotificationSettings(next)
    } else {
      const next = { ...notiSettings, [key]: !notiSettings[key] }
      setNotiSettings(next)
      saveNotificationSettings(next)
    }
  }

  const [deleteStep, setDeleteStep] = useState(0) // 0: 닫힘, 1~5: 탈퇴 플로우
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const executeDeleteAccount = async () => {
    try {
      await supabase.from('user_profiles').upsert({ user_id: user?.id, status: 'withdrawn', updated_at: new Date().toISOString() })
      try {
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('dodam_') || k.startsWith('kn_'))
        keysToRemove.forEach(k => safeRemoveItem(k))
      } catch { /* Safari private mode — skip localStorage cleanup */ }
      await supabase.auth.signOut()
      window.location.href = '/onboarding'
    } catch {
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '탈퇴 처리 중 오류가 발생했어요. 다시 시도해주세요.' } }))
      setDeleteStep(0)
    }
  }

  const nickname = user?.user_metadata?.name || user?.user_metadata?.full_name || '사용자'
  const email = user?.email || user?.user_metadata?.email || ''
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5]">
      <div className="max-w-lg mx-auto w-full pb-28">
        {/* 프로필 카드 */}
        <div className="m-4 p-4 rounded-2xl bg-white border border-[#E8E4DF]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden relative shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))' }}>
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill className="object-cover" />
              ) : (
                <span className="text-white text-lg font-bold">{nickname.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-subtitle text-primary truncate">{nickname}</p>
              {email && <p className="text-xs text-tertiary truncate">{email}</p>}
            </div>
            <ChevronRightIcon className="w-4 h-4 text-tertiary shrink-0" />
          </div>
        </div>

        {/* 아이 관리 (육아 모드에서만 표시) */}
        {mode === 'parenting' && (
          <div className="mx-4 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
            <div className="px-5 pt-3 pb-2">
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wide">아이 관리</p>
            </div>
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/settings/children/${child.id}`}
                className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#f5f5f5]">
                  {child.photo_url ? (
                    <video src={child.photo_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                      <span className="text-blue-500 text-sm font-bold">{child.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">{child.name}</p>
                  <p className="text-xs text-tertiary">{child.birthdate}</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-tertiary" />
              </Link>
            ))}
            <Link
              href="/settings/children/add"
              className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-[#f5f5f5] flex items-center justify-center">
                <span className="text-[var(--color-primary)] text-lg font-light">+</span>
              </div>
              <p className="text-sm font-medium text-[var(--color-primary)]">아이 추가</p>
            </Link>
          </div>
        )}

        {/* 공동양육자 (육아 모드에서만 표시) */}
        {mode === 'parenting' && (
          <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
            <div className="px-5 pt-3 pb-2">
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wide">가족</p>
            </div>
            <Link
              href="/settings/caregivers"
              className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-primary">공동양육자</p>
              <div className="flex-1" />
              <ChevronRightIcon className="w-4 h-4 text-tertiary" />
            </Link>
          </div>
        )}

        {/* 테마 컬러 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-tertiary uppercase tracking-wide">테마</p>
          </div>
          <div className="px-3 py-3 border-t border-[#E8E4DF]">
            <ThemeSelector />
          </div>
        </div>

        {/* 알림 설정 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-tertiary uppercase tracking-wide">알림</p>
          </div>

          {/* 마스터 토글 */}
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF]">
            <div className="flex items-center gap-2.5">
              <BellIcon className="w-4 h-4 text-[var(--color-primary)]" />
              <div>
                <p className="text-sm font-semibold text-primary">푸시 알림</p>
                <p className="text-xs text-tertiary">{pushActive ? '활성화됨' : '비활성'}</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={pushActive}
              aria-label="푸시 알림"
              onClick={() => toggleNoti('enabled')}
              className={`w-12 h-7 rounded-full transition-colors relative ${pushActive ? 'bg-[var(--color-primary)]' : 'bg-[#D1D5DB]'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${pushActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {pushActive && (
            <>
              {[
                { key: 'predictFeed' as const,    label: '수유 예측 알림',  desc: 'AI 예측 시간 10분 전',          modes: ['parenting'] },
                { key: 'predictSleep' as const,   label: '수면 예측 알림',  desc: '낮잠/밤잠 시간 알림',           modes: ['parenting'] },
                { key: 'vaccination' as const,    label: '접종 · 검진',     desc: '예방접종, 영유아검진 리마인더',  modes: ['parenting'] },
                { key: 'dailyEncourage' as const, label: '기록 격려',       desc: '매일 저녁 기록 격려 메시지',    modes: ['preparing', 'pregnant', 'parenting'] },
                { key: 'aiInsight' as const,      label: 'AI 인사이트',     desc: '매일 오전 돌봄 분석 리포트',    modes: ['preparing', 'pregnant', 'parenting'] },
              ].filter(item => item.modes.includes(mode)).map(item => (
                <div key={item.key} className="flex items-center justify-between px-4 py-3 border-t border-[#E8E4DF]">
                  <div>
                    <p className="text-sm text-primary">{item.label}</p>
                    <p className="text-xs text-tertiary">{item.desc}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={notiSettings[item.key]}
                    aria-label={item.label}
                    onClick={() => toggleNoti(item.key)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${notiSettings[item.key] ? 'bg-[var(--color-primary)]' : 'bg-[#D1D5DB]'}`}
                  >
                    <div className={`w-[18px] h-[18px] bg-white rounded-full absolute top-[3px] transition-transform shadow-sm ${notiSettings[item.key] ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
              ))}

              {/* 방해 금지 시간 */}
              <div className="px-4 py-3 border-t border-[#E8E4DF]">
                <p className="text-sm text-primary mb-2">방해 금지 시간</p>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={notiSettings.dndStart}
                    onChange={e => { const next = { ...notiSettings, dndStart: e.target.value }; setNotiSettings(next); saveNotificationSettings(next) }}
                    className="flex-1 h-9 px-2 rounded-lg border border-[#E8E4DF] text-body text-center"
                  />
                  <span className="text-body text-tertiary">~</span>
                  <input
                    type="time"
                    value={notiSettings.dndEnd}
                    onChange={e => { const next = { ...notiSettings, dndEnd: e.target.value }; setNotiSettings(next); saveNotificationSettings(next) }}
                    className="flex-1 h-9 px-2 rounded-lg border border-[#E8E4DF] text-body text-center"
                  />
                </div>
                <p className="text-xs text-tertiary mt-1">이 시간에는 알림을 보내지 않아요</p>
              </div>
            </>
          )}
        </div>

        {/* 서비스 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-semibold text-tertiary uppercase tracking-wide">서비스</p>
          </div>
          <Link href="/terms" className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5]">
            <p className="text-sm text-primary">서비스 이용약관</p>
            <ChevronRightIcon className="w-4 h-4 text-tertiary" />
          </Link>
          <Link href="/privacy" className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5]">
            <p className="text-sm text-primary">개인정보처리방침</p>
            <ChevronRightIcon className="w-4 h-4 text-tertiary" />
          </Link>
          <Link href="/feedback" className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5]">
            <p className="text-sm text-primary">의견 보내기</p>
            <ChevronRightIcon className="w-4 h-4 text-tertiary" />
          </Link>
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#E8E4DF]">
            <p className="text-sm text-tertiary">버전</p>
            <p className="text-sm text-tertiary">0.1.3</p>
          </div>
        </div>

        {/* 계정 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3.5 active:bg-[#f5f5f5] transition-colors"
          >
            <p className="text-sm text-primary">로그아웃</p>
          </button>
          <button
            onClick={() => setDeleteStep(1)}
            className="w-full flex items-center px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
          >
            <p className="text-sm text-red-500">회원 탈퇴</p>
          </button>
        </div>

        {/* 회원 탈퇴 5-depth 플로우 */}
        {deleteStep > 0 && (<>
          <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setDeleteStep(0)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="회원 탈퇴" className="fixed inset-0 z-[100] pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)] pointer-events-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
              <div className="px-5 pb-6">
                {/* Step 1: 탈퇴 안내 */}
                {deleteStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-bold text-primary">정말 떠나시는 건가요?</h3>
                    <div className="bg-red-50 rounded-xl p-4 space-y-2">
                      <p className="text-body text-red-600 font-semibold">탈퇴 시 삭제되는 데이터:</p>
                      <p className="text-body text-secondary">• 아이 프로필 및 성장 기록</p>
                      <p className="text-body text-secondary">• 수유/수면/배변 전체 기록</p>
                      <p className="text-body text-secondary">• 커뮤니티 글 및 리뷰</p>
                      <p className="text-body text-secondary">• AI 분석 데이터</p>
                    </div>
                    <p className="text-body text-tertiary">30일 유예 기간 내 재로그인하면 복구할 수 있어요.</p>
                    <button onClick={() => setDeleteStep(2)} className="w-full py-3 bg-[#E8E4DF] text-secondary text-body-emphasis rounded-xl">다음</button>
                  </div>
                )}
                {/* Step 2: 탈퇴 사유 */}
                {deleteStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-bold text-primary">떠나시는 이유가 궁금해요</h3>
                    {['사용하지 않아요', '다른 앱을 쓰고 있어요', '기능이 부족해요', '개인정보가 걱정돼요', '기타'].map(r => (
                      <button key={r} onClick={() => { setDeleteReason(r); setDeleteStep(3) }}
                        className={`w-full py-3 rounded-xl text-body-emphasis text-left px-4 border ${deleteReason === r ? 'border-red-400 bg-red-50' : 'border-[#E8E4DF]'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                )}
                {/* Step 3: 재확인 */}
                {deleteStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-bold text-primary">정말 탈퇴하시겠어요?</h3>
                    <div className="bg-[var(--color-page-bg)] rounded-xl p-4">
                      <p className="text-body text-secondary">도담과 함께한 소중한 기록들이 30일 후 영구 삭제됩니다.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteStep(0)} className="flex-1 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl">돌아가기</button>
                      <button onClick={() => setDeleteStep(4)} className="flex-1 py-3 bg-[#E8E4DF] text-secondary text-body-emphasis rounded-xl">계속 진행</button>
                    </div>
                  </div>
                )}
                {/* Step 4: 텍스트 입력 확인 */}
                {deleteStep === 4 && (
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-bold text-primary">확인을 위해 &quot;탈퇴합니다&quot;를 입력해주세요</h3>
                    <input
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="탈퇴합니다"
                      maxLength={10}
                      className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis"
                    />
                    <button
                      onClick={() => deleteConfirmText === '탈퇴합니다' && setDeleteStep(5)}
                      disabled={deleteConfirmText !== '탈퇴합니다'}
                      className={`w-full py-3 rounded-xl text-body-emphasis ${deleteConfirmText === '탈퇴합니다' ? 'bg-red-500 text-white' : 'bg-[#E8E4DF] text-tertiary'}`}
                    >다음</button>
                  </div>
                )}
                {/* Step 5: 최종 탈퇴 */}
                {deleteStep === 5 && (
                  <div className="space-y-4 text-center">
                    <p className="text-subtitle text-secondary">정말요?</p>
                    <h3 className="text-[17px] font-bold text-primary">마지막 기회예요</h3>
                    <p className="text-body text-secondary">탈퇴 버튼을 누르면 30일 유예 후 모든 데이터가 삭제됩니다.</p>
                    <button onClick={() => setDeleteStep(0)} className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl">역시 남을래요!</button>
                    <button onClick={executeDeleteAccount} className="w-full py-3 text-red-500 text-body">탈퇴하기</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>)}

        <p className="text-center text-xs text-tertiary mt-6">
          오늘도 도담하게
        </p>
      </div>
    </div>
  )
}
