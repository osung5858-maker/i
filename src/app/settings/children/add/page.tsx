'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddChildPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('도담이')
  const [birthdate, setBirthdate] = useState('')
  const [sex, setSex] = useState<string>('not_specified')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!birthdate) {
      setError('생년월일을 입력해주세요.')
      return
    }

    // 미래 날짜 체크
    if (new Date(birthdate) > new Date()) {
      setError('생년월일을 확인해주세요.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/onboarding')
      return
    }

    const { error: insertError } = await supabase.from('children').insert({
      user_id: user.id,
      name: name.trim() || '도담이',
      birthdate,
      sex: sex === 'not_specified' ? null : sex,
    })

    if (insertError) {
      setError(`프로필 생성에 실패했어요: ${insertError.message}`)
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-[#9B9B9B] text-sm">
            취소
          </button>
          <h1 className="text-[15px] font-bold text-[#0A0B0D]">도담이 등록</h1>
          <div className="w-8" />
        </div>
      </header>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-6 pt-8 max-w-lg mx-auto w-full">
        {/* 프로필 아바타 */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FF6F0F] to-[#4A90D9] flex items-center justify-center shadow-[0_8px_30px_rgba(0,82,255,0.15)]">
            <span className="text-4xl">👶</span>
          </div>
        </div>

        {/* 이름 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">
            이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="도담이"
            maxLength={20}
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] border border-[#E8E4DF] text-[15px] text-[#0A0B0D] placeholder-[#9B9B9B] focus:outline-none focus:border-[#FF6F0F] focus:ring-1 focus:ring-[#FF6F0F] transition-colors"
          />
        </div>

        {/* 생년월일 */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-2 uppercase tracking-wide">
            생년월일 <span className="text-[#FF6F0F]">*</span>
          </label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f5] border border-[#E8E4DF] text-[15px] text-[#0A0B0D] focus:outline-none focus:border-[#FF6F0F] focus:ring-1 focus:ring-[#FF6F0F] transition-colors"
          />
        </div>

        {/* 성별 */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-3 uppercase tracking-wide">
            성별
          </label>
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
                    ? 'bg-[#FF6F0F] text-white shadow-[0_4px_12px_rgba(0,82,255,0.2)]'
                    : 'bg-[#f5f5f5] text-[#6B6B6B] border border-[#E8E4DF]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {/* 스페이서 */}
        <div className="flex-1" />

        {/* 제출 버튼 */}
        <div className="pb-10 pt-4">
          <button
            type="submit"
            disabled={loading || !birthdate}
            className="w-full h-[52px] rounded-xl font-semibold text-[15px] transition-all active:scale-[0.98] disabled:opacity-40 bg-[#FF6F0F] text-white shadow-[0_4px_12px_rgba(0,82,255,0.3)]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              '도담이 등록하기'
            )}
          </button>
          <p className="text-xs text-[#9B9B9B] text-center mt-3">
            이름과 성별은 나중에 변경할 수 있어요
          </p>
        </div>
      </form>
    </div>
  )
}
