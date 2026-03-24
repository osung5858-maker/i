'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronRightIcon } from '@/components/ui/Icons'

interface CaregiverRow {
  id: string
  role: string
  accepted_at: string | null
  user_id: string
}

export default function CaregiversPage() {
  const [caregivers, setCaregivers] = useState<CaregiverRow[]>([])
  const [childId, setChildId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }

      const { data: children } = await supabase
        .from('children')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!children || children.length === 0) return
      setChildId(children[0].id)

      const { data } = await supabase
        .from('caregivers')
        .select('*')
        .eq('child_id', children[0].id)

      if (data) setCaregivers(data as CaregiverRow[])
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5] dark:bg-[#0A0B0D]">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl border-b border-[#E8E4DF] dark:border-[#2a2a2a]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">뒤로</button>
          <h1 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">공동양육자</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full pb-24">
        <div className="m-4 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a] overflow-hidden">
          {caregivers.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">👨‍👩‍👧</span>
              </div>
              <p className="text-sm font-semibold text-[#0A0B0D] dark:text-white">아직 연결된 가족이 없어요</p>
              <p className="text-xs text-[#9B9B9B] mt-1">함께 기록하면 더 도담해요</p>
            </div>
          ) : (
            caregivers.map((cg) => (
              <div
                key={cg.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E8E4DF] dark:border-[#2a2a2a] last:border-b-0"
              >
                <div className="w-9 h-9 rounded-full bg-green-50 dark:bg-green-950 flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0A0B0D] dark:text-white">
                    {cg.role === 'primary' ? '주 양육자' : '공동양육자'}
                  </p>
                  <p className="text-xs text-[#9B9B9B]">
                    {cg.accepted_at ? '연결됨' : '대기 중'}
                  </p>
                </div>
              </div>
            ))
          )}

          <Link
            href="/settings/caregivers/invite"
            className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] dark:border-[#2a2a2a] active:bg-[#f5f5f5] dark:active:bg-[#2a2a2a] transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center">
              <span className="text-[#FF6F0F] text-lg font-light">+</span>
            </div>
            <p className="text-sm font-medium text-[#FF6F0F]">가족 초대하기</p>
            <div className="flex-1" />
            <ChevronRightIcon className="w-4 h-4 text-[#9B9B9B]" />
          </Link>
        </div>
      </div>
    </div>
  )
}
