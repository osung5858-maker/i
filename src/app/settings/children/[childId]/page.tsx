'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
// profile avatars are .webm video files
import type { Child } from '@/types'

const PROFILE_AVATARS = [
  '/images/illustrations/profile-default1.webm',
  '/images/illustrations/profile-default2.webm',
  '/images/illustrations/profile-default3.webm',
  '/images/illustrations/profile-default4.webm',
]

export default function EditChildPage() {
  const router = useRouter()
  const params = useParams()
  const childId = params.childId as string
  const supabase = createClient()

  const [child, setChild] = useState<Child | null>(null)
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [sex, setSex] = useState('not_specified')
  const [photoUrl, setPhotoUrl] = useState(PROFILE_AVATARS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('children')
        .select('id, name, birthdate, sex, photo_url')
        .eq('id', childId)
        .single()
      if (data) {
        const c = data as Child
        setChild(c)
        setName(c.name)
        setBirthdate(c.birthdate)
        setSex(c.sex || 'not_specified')
        setPhotoUrl(c.photo_url || PROFILE_AVATARS[0])
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
        photo_url: photoUrl,
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
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-sm text-tertiary shrink-0">취소</button>
          <h1 className="text-subtitle text-primary truncate mx-3">프로필 수정</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="flex-1 px-6 pt-8 max-w-lg mx-auto w-full">
        {/* 프로필 아바타 선택 */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,82,255,0.15)] bg-[#f5f5f5]">
              <video src={photoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex justify-center gap-3">
            {PROFILE_AVATARS.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPhotoUrl(url)}
                className={`w-14 h-14 rounded-2xl overflow-hidden transition-all ${
                  photoUrl === url
                    ? 'ring-[3px] ring-[var(--color-primary)] ring-offset-2 scale-105'
                    : 'opacity-60 hover:opacity-80'
                }`}
              >
                <video src={url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* 이름 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] border border-[#E8E4DF] text-subtitle text-primary focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
          />
        </div>

        {/* 생년월일 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">생년월일</label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] border border-[#E8E4DF] text-subtitle text-primary focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
          />
        </div>

        {/* 성별 */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-3 uppercase tracking-wide">성별</label>
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
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[#f5f5f5] text-[#6B6B6B] border border-[#E8E4DF]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-sm text-red-600 text-center">
            {error}
          </div>
        )}
      </div>

      {/* 삭제 */}
      <div className="px-6 pb-28 max-w-lg mx-auto w-full">
        <button
          onClick={handleDelete}
          className="w-full py-3 text-sm text-red-500 font-medium active:opacity-70"
        >
          프로필 삭제
        </button>
      </div>

      {/* 하단 고정 저장 버튼 */}
      <div className="sticky bottom-0 bg-white border-t border-[#E8E4DF] px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`w-full py-3.5 rounded-xl text-subtitle transition-colors max-w-lg mx-auto block ${!loading ? 'bg-[var(--color-primary)] text-white active:bg-[#2D6B45]' : 'bg-[#E8E4DF] text-tertiary'}`}
        >
          {loading ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  )
}
