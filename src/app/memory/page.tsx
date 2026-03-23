'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DiaryView from '@/components/diary/DiaryView'
import StatsReport from '@/components/growth-chart/StatsReport'
import DevelopmentCheck from '@/components/growth-chart/DevelopmentCheck'
import CommunityComparison from '@/components/growth-chart/CommunityComparison'
import { ChevronRightIcon } from '@/components/ui/Icons'
import type { Child, GrowthRecord, CareEvent } from '@/types'

function getAgeMonths(birthdate: string): number {
  const birth = new Date(birthdate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

type MemoryTab = 'diary' | 'growth'

export default function MemoryPage() {
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<CareEvent[]>([])
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<MemoryTab>('diary')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }

      const { data: children } = await supabase.from('children').select('*').eq('user_id', user.id).limit(1)
      if (!children || children.length === 0) { router.push('/settings/children/add'); return }

      const c = children[0] as Child
      setChild(c)

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [eventsRes, growthRes] = await Promise.all([
        supabase.from('events').select('*').eq('child_id', c.id).gte('start_ts', thirtyDaysAgo.toISOString()).order('start_ts', { ascending: false }),
        supabase.from('growth_records').select('*').eq('child_id', c.id).order('measured_at', { ascending: true }),
      ])

      if (eventsRes.data) setEvents(eventsRes.data as CareEvent[])
      if (growthRes.data) setRecords(growthRes.data as GrowthRecord[])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="w-8 h-8 border-3 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" />
      </div>
    )
  }

  const ageMonths = child ? getAgeMonths(child.birthdate) : 0
  const latestRecord = records.length > 0 ? records[records.length - 1] : null

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">추억</h1>
          <div className="flex items-center gap-2">
            <Link href="/growth/add" className="text-[12px] font-semibold text-[#3D8A5A]">+ 성장 기록</Link>
          </div>
        </div>

        <div className="flex px-4 pb-1 max-w-lg mx-auto gap-1">
          {([
            { key: 'diary' as MemoryTab, label: '📖 일기' },
            { key: 'growth' as MemoryTab, label: '📊 성장' },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-[13px] font-semibold text-center rounded-xl transition-colors ${
                tab === t.key ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#AEB1B9]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-28">
        {tab === 'diary' && (
          <DiaryView events={events} childName={child?.name || '도담이'} />
        )}
        {tab === 'growth' && (
          <div className="space-y-3">
            {/* 성장 요약 */}
            <div className="px-4 pt-4">
              {latestRecord ? (
                <div className="bg-white rounded-2xl p-5 border border-[#f0f0f0]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3D8A5A] to-[#5B6DFF] flex items-center justify-center">
                      <span className="text-lg">👶</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-bold text-[#1A1918]">{child?.name}</p>
                      <p className="text-[11px] text-[#9C9B99]">{ageMonths}개월</p>
                    </div>
                    <Link href="/growth/add" className="text-[11px] font-semibold text-[#3D8A5A] px-3 py-1.5 bg-[#F0F9F4] rounded-lg">+ 측정</Link>
                  </div>
                  <div className="flex gap-3">
                    {latestRecord.weight_kg && (
                      <div className="flex-1 p-3 rounded-xl bg-[#F5F9F6]">
                        <p className="text-[10px] text-[#9C9B99]">몸무게</p>
                        <p className="text-lg font-bold text-[#1A1918]">{Number(latestRecord.weight_kg).toFixed(1)}<span className="text-[11px] font-normal text-[#9C9B99] ml-0.5">kg</span></p>
                      </div>
                    )}
                    {latestRecord.height_cm && (
                      <div className="flex-1 p-3 rounded-xl bg-[#F5F5FA]">
                        <p className="text-[10px] text-[#9C9B99]">키</p>
                        <p className="text-lg font-bold text-[#1A1918]">{Number(latestRecord.height_cm).toFixed(1)}<span className="text-[11px] font-normal text-[#9C9B99] ml-0.5">cm</span></p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-[#f0f0f0] text-center">
                  <p className="text-2xl mb-2">📏</p>
                  <p className="text-[13px] text-[#9C9B99]">아직 성장 기록이 없어요</p>
                  <Link href="/growth/add" className="inline-block mt-4 px-5 py-2 rounded-xl bg-[#3D8A5A] text-white text-[13px] font-semibold">기록 추가</Link>
                </div>
              )}
            </div>

            {/* 통계 하이라이트 */}
            <StatsReport events={events} ageMonths={ageMonths} />

            {/* 발달 체크 */}
            <DevelopmentCheck ageMonths={ageMonths} />
          </div>
        )}
      </div>
    </div>
  )
}
