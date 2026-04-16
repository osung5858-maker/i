'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronRightIcon, UsersIcon } from '@/components/ui/Icons'
import PageHeader from '@/components/layout/PageHeader'

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
        .select('id, role, accepted_at, user_id')
        .eq('child_id', children[0].id)

      if (data) setCaregivers(data as CaregiverRow[])
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5]">
      <PageHeader title="공동양육자" />

      <div className="max-w-lg mx-auto w-full pb-28">
        <div className="m-4 rounded-2xl bg-white border border-[#E8E4DF] overflow-hidden">
          {caregivers.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f5f5] flex items-center justify-center mx-auto mb-3">
                <UsersIcon className="w-8 h-8 text-[var(--color-primary)]" />
              </div>
              <p className="text-sm font-semibold text-primary">아직 연결된 가족이 없어요</p>
              <p className="text-xs text-tertiary mt-1">함께 기록하면 더 도담해요</p>
            </div>
          ) : (
            caregivers.map((cg) => (
              <div
                key={cg.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E8E4DF] last:border-b-0"
              >
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">
                    {cg.role === 'primary' ? '주 양육자' : '공동양육자'}
                  </p>
                  <p className="text-xs text-tertiary">
                    {cg.accepted_at ? '연결됨' : '대기 중'}
                  </p>
                </div>
              </div>
            ))
          )}

          <Link
            href="/settings/caregivers/invite"
            className="flex items-center gap-3 px-4 py-3.5 border-t border-[#E8E4DF] active:bg-[#f5f5f5] transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center">
              <span className="text-[var(--color-primary)] text-lg font-light">+</span>
            </div>
            <p className="text-sm font-medium text-[var(--color-primary)]">가족 초대하기</p>
            <div className="flex-1" />
            <ChevronRightIcon className="w-4 h-4 text-tertiary" />
          </Link>
        </div>
      </div>
    </div>
  )
}
