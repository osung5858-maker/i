'use client'

import { useState } from 'react'
import { WrenchIcon, TrashIcon } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'

export default function DevResetButton() {
  const [open, setOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const resetAll = async () => {
    if (!confirm('로컬 + DB 데이터를 모두 삭제할까요?\n(로그인은 유지됩니다)')) return
    setResetting(true)

    // 1. localStorage 삭제
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('dodam_')) keysToRemove.push(key)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))

    // 2. DB 삭제
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await Promise.all([
          supabase.from('prep_events').delete().eq('user_id', user.id),
          supabase.from('pregnant_events').delete().eq('user_id', user.id),
          // 육아 events는 child_id 기반 — children 먼저 조회 후 삭제
          supabase.from('children').select('id').eq('user_id', user.id).then(({ data: children }: { data: { id: string }[] | null }) => {
            if (!children?.length) return
            const ids = children.map((c: { id: string }) => c.id)
            return supabase.from('events').delete().in('child_id', ids)
          }),
        ])
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error('DB reset error:', e)
    }

    setResetting(false)
    alert(`${keysToRemove.length}개 로컬 + DB 데이터 삭제 완료!`)
    window.location.href = '/onboarding'
  }

  const resetToMode = (mode: string) => {
    localStorage.setItem('dodam_mode', mode)
    if (mode === 'preparing') window.location.href = '/preparing'
    else if (mode === 'pregnant') window.location.href = '/pregnant'
    else window.location.href = '/'
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-20 right-2 z-[100] w-8 h-8 rounded-full bg-red-500 text-white text-[14px] font-bold shadow-lg active:scale-90 opacity-60"
      >
        <WrenchIcon className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed top-30 right-2 z-[100] bg-white rounded-xl shadow-xl border border-[#E8E4DF] p-3 w-48">
          <p className="text-[13px] font-bold text-[#1A1918] mb-2 flex items-center gap-1"><WrenchIcon className="w-3.5 h-3.5" /> 개발 도구</p>

          <p className="text-[13px] text-[#6B6966] mb-1">모드 전환</p>
          <div className="flex gap-1 mb-2">
            {[
              { mode: 'preparing', label: '준비' },
              { mode: 'pregnant', label: '임신' },
              { mode: 'parenting', label: '육아' },
            ].map(m => (
              <button key={m.mode} onClick={() => resetToMode(m.mode)}
                className="flex-1 py-1 rounded text-[13px] font-medium bg-[var(--color-page-bg)] text-[#6B6966] active:bg-[var(--color-primary)] active:text-white">
                {m.label}
              </button>
            ))}
          </div>

          <button onClick={resetAll} disabled={resetting}
            className="w-full py-2 rounded-lg bg-red-500 text-white text-[13px] font-semibold active:opacity-80 mb-1 disabled:opacity-50">
            <span className="inline-flex items-center gap-1">
              <TrashIcon className="w-3.5 h-3.5 inline" />
              {resetting ? '삭제 중...' : '전체 리셋 (로컬+DB)'}
            </span>
          </button>

          <p className="text-[13px] text-[#9E9A95] text-center">로그인은 유지됩니다</p>
        </div>
      )}
    </>
  )
}
