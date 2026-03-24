'use client'

import { useState } from 'react'

export default function DevResetButton() {
  const [open, setOpen] = useState(false)

  const resetLocalData = () => {
    // localStorage에서 dodam_ 접두어 키만 삭제 (auth 쿠키/세션은 유지)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('dodam_') || key.startsWith('sb-'))) {
        // sb- 는 건너뜀 (supabase 세션)
        if (key.startsWith('dodam_')) keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    alert(`${keysToRemove.length}개 로컬 데이터 삭제 완료!\n(로그인 유지됨)`)
    window.location.href = '/onboarding'
  }

  const resetToMode = (mode: string) => {
    // 모드만 변경 (데이터 유지)
    localStorage.setItem('dodam_mode', mode)
    if (mode === 'preparing') window.location.href = '/preparing'
    else if (mode === 'pregnant') window.location.href = '/pregnant'
    else window.location.href = '/'
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-20 right-2 z-[100] w-8 h-8 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg active:scale-90 opacity-60"
      >
        🔧
      </button>

      {/* 패널 */}
      {open && (
        <div className="fixed top-30 right-2 z-[100] bg-white rounded-xl shadow-xl border border-[#E8E4DF] p-3 w-48">
          <p className="text-[11px] font-bold text-[#1A1918] mb-2">🔧 개발 도구</p>

          <p className="text-[9px] text-[#6B6966] mb-1">모드 전환</p>
          <div className="flex gap-1 mb-2">
            {[
              { mode: 'preparing', label: '준비' },
              { mode: 'pregnant', label: '임신' },
              { mode: 'parenting', label: '육아' },
            ].map(m => (
              <button key={m.mode} onClick={() => resetToMode(m.mode)}
                className="flex-1 py-1 rounded text-[9px] font-medium bg-[#FFF9F5] text-[#6B6966] active:bg-[#3D8A5A] active:text-white">
                {m.label}
              </button>
            ))}
          </div>

          <button onClick={resetLocalData}
            className="w-full py-2 rounded-lg bg-red-500 text-white text-[11px] font-semibold active:opacity-80 mb-1">
            🗑️ 로컬 데이터 리셋
          </button>

          <p className="text-[9px] text-[#9E9A95] text-center">로그인은 유지됩니다</p>
        </div>
      )}
    </>
  )
}
