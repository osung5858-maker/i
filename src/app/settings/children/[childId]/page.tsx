'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Child } from '@/types'

export default function EditChildPage() {
  const router = useRouter()
  const params = useParams()
  const childId = params.childId as string
  const supabase = createClient()

  const [child, setChild] = useState<Child | null>(null)
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [sex, setSex] = useState('not_specified')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId)
        .single()
      if (data) {
        const c = data as Child
        setChild(c)
        setName(c.name)
        setBirthdate(c.birthdate)
        setSex(c.sex || 'not_specified')
      }
    }
    load()
  }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!birthdate) { setError('생년월일을 입력해주세요.'); return }
    setLoading(true)

    const { error: updateError } = await supabase
      .from('children')
      .update({
        name: name.trim() || '도담이',
        birthdate,
        sex: sex === 'not_specified' ? null : sex,
      })
      .eq('id', childId)

    if (updateError) {
      setError('저장에 실패했어요.')
      setLoading(false)
      return
    }

    router.push('/settings')
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제할까요? 모든 기록이 사라져요.')) return

    await supabase.from('children').delete().eq('id', childId)
    window.location.href = '/'
  }

  if (!child) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="w-8 h-8 border-3 border-[#0052FF]/20 border-t-[#0052FF] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#0A0B0D] flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">취소</button>
          <h1 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">프로필 수정</h1>
          <button
            onClick={handleSave}
            disabled={loading}
            className="text-sm font-semibold text-[#0052FF] disabled:opacity-40"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      <div className="flex-1 px-6 pt-8 max-w-lg mx-auto w-full">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#0052FF] to-[#4A90D9] flex items-center justify-center shadow-[0_8px_30px_rgba(0,82,255,0.15)]">
            <span className="text-4xl">👶</span>
          </div>
        </div>

        {/* 이름 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#6B6B6B] dark:text-[#9B9B9B] mb-2 uppercase tracking-wide">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] text-[15px] text-[#0A0B0D] dark:text-white focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] transition-colors"
          />
        </div>

        {/* 생년월일 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#6B6B6B] dark:text-[#9B9B9B] mb-2 uppercase tracking-wide">생년월일</label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] text-[15px] text-[#0A0B0D] dark:text-white focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] transition-colors"
          />
        </div>

        {/* 성별 */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-[#6B6B6B] dark:text-[#9B9B9B] mb-3 uppercase tracking-wide">성별</label>
          <div className="flex gap-3">
            {[
              { value: 'male', label: '남아' },
              { value: 'female', label: '여아' },
              { value: 'not_specified', label: '선택 안 함' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSex(option.value)}
                className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                  sex === option.value
                    ? 'bg-[#0052FF] text-white'
                    : 'bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#6B6B6B] dark:text-[#9B9B9B] border border-[#f0f0f0] dark:border-[#2a2a2a]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950 text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}
      </div>

      {/* 삭제 */}
      <div className="px-6 pb-10 max-w-lg mx-auto w-full">
        <button
          onClick={handleDelete}
          className="w-full py-3 text-sm text-red-500 font-medium active:opacity-70"
        >
          프로필 삭제
        </button>
      </div>
    </div>
  )
}
