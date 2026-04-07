'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sanitizeUserInput } from '@/lib/sanitize'
import PageHeader from '@/components/layout/PageHeader'

const PRESET_TAGS = [
  '피부 잘 봄', '대기 짧음', '주차 편함', '친절함',
  '시설 깨끗', '기저귀 갈기 편함', '수유실 있음', '유모차 접근 편함',
]

export default function WriteReviewPage() {
  const params = useParams()
  const placeId = params.placeId as string
  const router = useRouter()
  const supabase = createClient()

  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [childAgeMonths, setChildAgeMonths] = useState<number | null>(null)

  useEffect(() => {
    async function loadChild() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: children } = await supabase
        .from('children')
        .select('birthdate')
        .eq('user_id', user.id)
        .limit(1)

      if (children && children.length > 0) {
        const birth = new Date(children[0].birthdate)
        const now = new Date()
        setChildAgeMonths(
          (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
        )
      }
    }
    loadChild()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 5 ? [...prev, tag] : prev
    )
  }

  const handleSubmit = async () => {
    if (rating === 0) { setError('별점을 선택해주세요.'); return }
    if (content.length < 10) { setError('10자 이상 작성해주세요.'); return }

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/onboarding'); return }

    const sanitizedContent = sanitizeUserInput(content, 500, { preserveNewlines: true })
    if (!sanitizedContent) { setError('내용을 입력해주세요.'); setLoading(false); return }

    // sessionStorage에서 장소명 가져오기
    let placeName: string | null = null
    try {
      const saved = sessionStorage.getItem(`place-${placeId}`)
      if (saved) placeName = JSON.parse(saved).name || null
    } catch { /* ignore */ }

    const { error: insertError } = await supabase.from('reviews').insert({
      place_id: placeId,
      place_name: placeName,
      user_id: user.id,
      rating,
      content: sanitizedContent,
      tags: selectedTags.length > 0 ? selectedTags : null,
      child_age_months: childAgeMonths,
    })

    if (insertError) {
      if (insertError.code === '42P01') {
        setError('리뷰 테이블이 아직 생성되지 않았어요. (reviews 테이블 필요)')
      } else {
        setError(`저장 실패: ${insertError.message} (${insertError.code})`)
      }
      setLoading(false)
      return
    }

    window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '리뷰가 등록되었어요!' } }))
    router.back()
  }

  const isValid = rating > 0 && content.length >= 10

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <PageHeader title="리뷰 쓰기" />

      <div className="flex-1 px-6 pt-6 max-w-lg mx-auto w-full">
        {/* 별점 */}
        <div className="text-center mb-6">
          <p className="text-xs text-tertiary mb-3">별점을 선택해주세요</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="text-3xl transition-transform active:scale-110"
              >
                <span className={star <= rating ? 'text-amber-400' : 'text-[#e0e0e0]'}>
                  ★
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 텍스트 */}
        <div className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="육아하면서 느낀 솔직한 후기를 남겨주세요 (10자 이상)"
            maxLength={500}
            rows={5}
            className="w-full p-4 rounded-xl bg-[#f5f5f5] border border-[#E8E4DF] text-subtitle text-primary placeholder-[#c0c0c0] resize-none focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
          />
          <div className="flex justify-between mt-1.5">
            <span className={`text-xs ${content.length < 10 && content.length > 0 ? 'text-red-500' : 'text-[#c0c0c0]'}`}>
              {content.length < 10 && content.length > 0 ? '10자 이상 작성해주세요' : ''}
            </span>
            <span className="text-xs text-[#c0c0c0]">{content.length}/500</span>
          </div>
        </div>

        {/* 태그 */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#6B6B6B] mb-3 uppercase tracking-wide">
            태그 선택 (최대 5개)
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                  selectedTags.includes(tag)
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[#f5f5f5] text-[#6B6B6B] border border-[#E8E4DF]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 아이 나이 */}
        {childAgeMonths !== null && (
          <p className="text-xs text-tertiary">
            방문 시 아이 나이: {childAgeMonths}개월 (자동 입력)
          </p>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-sm text-red-600 text-center">
            {error}
          </div>
        )}
      </div>

      {/* 하단 고정 등록 버튼 — GNB 위 */}
      <div className="sticky bottom-[80px] bg-white border-t border-[#E8E4DF] px-5 py-3">
        <button
          onClick={handleSubmit}
          disabled={loading || !isValid}
          className={`w-full py-3.5 rounded-xl text-subtitle transition-colors max-w-lg mx-auto block ${isValid ? 'bg-[var(--color-primary)] text-white active:bg-[#2D6B45]' : 'bg-[#E8E4DF] text-tertiary'}`}
        >
          {loading ? '등록 중...' : '리뷰 등록'}
        </button>
      </div>
    </div>
  )
}
