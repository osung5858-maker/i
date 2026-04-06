'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const MODES = [
  { key: 'parenting', label: '육아', emoji: '👶' },
  { key: 'pregnant', label: '임신', emoji: '🤰' },
  { key: 'preparing', label: '준비', emoji: '🌱' },
] as const

type DbStats = {
  userId: string | null
  userRecords: number
  pregRecords: number
  prepRecords: number
  mode: string | null
}

export default function DevPanel() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [dbStats, setDbStats] = useState<DbStats | null>(null)
  const [loading, setLoading] = useState(false)

  // 스크린샷 촬영용 히든 (콘솔: localStorage.setItem('dodam_dev_hidden','1'))
  useEffect(() => {
    if (localStorage.getItem('dodam_dev_hidden') === '1') setHidden(true)
  }, [])

  // 패널 열릴 때 DB 상태 조회
  useEffect(() => {
    if (!open || hidden) return
    let cancelled = false
    async function loadStats() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setDbStats({ userId: null, userRecords: 0, pregRecords: 0, prepRecords: 0, mode: null })
        return
      }
      const [ur, pr, prep, profile] = await Promise.all([
        supabase.from('user_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('preg_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('prep_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_profiles').select('mode').eq('user_id', user.id).single(),
      ])
      if (cancelled) return
      setDbStats({
        userId: user.id.slice(0, 8),
        userRecords: ur.count ?? 0,
        pregRecords: pr.count ?? 0,
        prepRecords: prep.count ?? 0,
        mode: profile.data?.mode ?? null,
      })
    }
    loadStats()
    return () => { cancelled = true }
  }, [open, hidden])

  const currentMode = typeof window !== 'undefined'
    ? localStorage.getItem('dodam_mode') || 'parenting'
    : 'parenting'

  if (hidden) return null

  const switchMode = useCallback(async (mode: string) => {
    // APP_STATE 키 — 동기적 접근 필요하므로 localStorage 유지
    localStorage.setItem('dodam_mode', mode)
    // DB에도 동기화 (fire-and-forget)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      supabase.from('user_profiles').upsert(
        { user_id: user.id, mode },
        { onConflict: 'user_id' }
      )
    }
    window.location.href = '/'
  }, [])

  const resetCache = useCallback(() => {
    const keysToKeep = ['sb-', 'supabase']
    const allKeys = Object.keys(localStorage)
    let count = 0
    allKeys.forEach(key => {
      if (!keysToKeep.some(k => key.startsWith(k))) {
        localStorage.removeItem(key)
        count++
      }
    })
    alert(`캐시 ${count}개 키 삭제 완료 (세션 유지)`)
    window.location.href = '/'
  }, [])

  const resetDbData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('로그인 상태가 아닙니다'); return }

      const results = await Promise.all([
        supabase.from('user_records').delete().eq('user_id', user.id),
        supabase.from('preg_records').delete().eq('user_id', user.id),
        supabase.from('prep_records').delete().eq('user_id', user.id),
        supabase.from('prep_events').delete().eq('user_id', user.id),
        supabase.from('pregnant_events').delete().eq('user_id', user.id),
      ])
      const errors = results.map(r => r.error).filter(Boolean)
      if (errors.length) {
        alert(`일부 삭제 실패: ${errors.map(e => e?.message).join(', ')}`)
      } else {
        localStorage.removeItem('dodam_db_migrated_v2')
        alert('DB 레코드 전체 삭제 완료')
      }
      setDbStats(prev => prev ? { ...prev, userRecords: 0, pregRecords: 0, prepRecords: 0 } : prev)
    } finally {
      setLoading(false)
      setConfirming(null)
    }
  }, [])

  const resetAll = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await Promise.all([
          supabase.from('user_records').delete().eq('user_id', user.id),
          supabase.from('preg_records').delete().eq('user_id', user.id),
          supabase.from('prep_records').delete().eq('user_id', user.id),
          supabase.from('prep_events').delete().eq('user_id', user.id),
          supabase.from('pregnant_events').delete().eq('user_id', user.id),
          supabase.from('children').delete().eq('user_id', user.id),
          supabase.from('user_profiles').delete().eq('user_id', user.id),
        ])
        await supabase.auth.signOut()
      }
      localStorage.clear()
      document.cookie.split(';').forEach(c => {
        document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
      })
      alert('전체 초기화 완료 (DB + localStorage + 쿠키 + 로그아웃)')
      window.location.href = '/onboarding'
    } finally {
      setLoading(false)
    }
  }, [])

  const goTo = useCallback((path: string) => {
    window.location.href = path
  }, [])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-3 z-[9999] w-10 h-10 rounded-full bg-black/80 text-white text-lg flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        D
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-2xl p-5 pb-8 space-y-4 animate-in slide-in-from-bottom"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Dev Panel</h2>
          <button onClick={() => setOpen(false)} className="text-2xl text-gray-400 leading-none">&times;</button>
        </div>

        {/* 모드 전환 */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold">MODE SWITCH</p>
          <div className="flex gap-2">
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => switchMode(m.key)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  currentMode === m.key
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 빠른 이동 */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold">QUICK NAV</p>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { path: '/', label: '홈' },
              { path: '/onboarding', label: '온보딩' },
              { path: '/settings', label: '설정' },
              { path: '/vaccination', label: '예방접종' },
              { path: '/mental-check', label: '정신건강' },
              { path: '/waiting', label: '기다림' },
              { path: '/record', label: '성장기록' },
              { path: '/cry', label: '울음분석' },
              { path: '/feed-timer', label: '수유타이머' },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => goTo(item.path)}
                className="py-2 rounded-lg bg-gray-50 text-xs font-medium text-gray-700 active:bg-gray-200"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 데이터 리셋 */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold">DATA RESET</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                if (confirming === 'cache') { resetCache(); setConfirming(null) }
                else setConfirming('cache')
              }}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                confirming === 'cache'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {confirming === 'cache' ? '다시 탭하면 삭제' : '캐시 초기화 (세션 유지)'}
            </button>
            <button
              disabled={loading}
              onClick={() => {
                if (confirming === 'db') { resetDbData() }
                else setConfirming('db')
              }}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                confirming === 'db'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-50 text-orange-600 active:bg-orange-100'
              }`}
            >
              {loading && confirming === 'db' ? '삭제 중...' : confirming === 'db' ? '다시 탭하면 DB 삭제' : 'DB 레코드 삭제 (계정 유지)'}
            </button>
            <button
              disabled={loading}
              onClick={() => {
                if (confirming === 'all') { resetAll() }
                else setConfirming('all')
              }}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                confirming === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-600 active:bg-red-100'
              }`}
            >
              {loading && confirming === 'all' ? '초기화 중...' : confirming === 'all' ? '다시 탭하면 전체 초기화' : '전체 초기화 (DB + 로그아웃)'}
            </button>
          </div>
        </div>

        {/* DB 상태 */}
        <div className="text-[10px] text-gray-400 font-mono space-y-0.5">
          <p>local mode: {currentMode}</p>
          {dbStats ? (
            <>
              <p>db user: {dbStats.userId ?? 'not logged in'}</p>
              <p>db mode: {dbStats.mode ?? 'null'}</p>
              <p>user_records: {dbStats.userRecords} | preg: {dbStats.pregRecords} | prep: {dbStats.prepRecords}</p>
            </>
          ) : (
            <p>db: loading...</p>
          )}
          <p>ls keys: {typeof window !== 'undefined' ? Object.keys(localStorage).length : '?'}</p>
        </div>
      </div>
    </div>
  )
}
