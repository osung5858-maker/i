'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sanitizeTitle, sanitizeUserInput } from '@/lib/sanitize'
import PageHeader from '@/components/layout/PageHeader'

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  playgroup: { label: '놀이모임', emoji: '🎈' },
  study:     { label: '공부/교육', emoji: '📚' },
  hobby:     { label: '취미', emoji: '🎨' },
  support:   { label: '육아정보', emoji: '💬' },
  outdoor:   { label: '야외활동', emoji: '🏃' },
  etc:       { label: '기타', emoji: '🤝' },
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: '주 1회',
  biweekly: '2주 1회',
  monthly: '월 1회',
  irregular: '비정기',
}

export default function GatheringEditPage() {
  const router = useRouter()
  const params = useParams()
  const gatheringId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('playgroup')
  const [placeName, setPlaceName] = useState('')
  const [frequency, setFrequency] = useState<string>('weekly')
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null)
  const [minAge, setMinAge] = useState<number>(0)
  const [maxAge, setMaxAge] = useState<number>(60)
  const [isCreator, setIsCreator] = useState(false)

  useEffect(() => { loadGathering() }, [gatheringId])

  const loadGathering = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '로그인이 필요해요' } }))
        router.push(`/town/gathering/${gatheringId}`)
        return
      }
      const { data: gathering, error } = await supabase.from('town_gatherings').select('*').eq('id', gatheringId).single()
      if (error || !gathering) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '소모임을 찾을 수 없어요' } }))
        router.push('/town')
        return
      }
      if (gathering.creator_id !== user.id) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '소모임장만 수정할 수 있어요' } }))
        router.push(`/town/gathering/${gatheringId}`)
        return
      }
      setIsCreator(true)
      setTitle(gathering.title || '')
      setDescription(gathering.description || '')
      setCategory(gathering.category || 'playgroup')
      setPlaceName(gathering.place_name || '')
      setFrequency(gathering.meeting_frequency || 'weekly')
      setMaxParticipants(gathering.max_participants)
      setMinAge(gathering.min_child_age_months || 0)
      setMaxAge(gathering.max_child_age_months || 60)
    } catch (err) {
      console.error('Failed to load gathering:', err)
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '소모임을 불러오는데 실패했어요' } }))
      router.push('/town')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const supabase = createClient()
      const sanitizedTitle = sanitizeTitle(title, 50)
      const sanitizedDesc = sanitizeUserInput(description, 300, { preserveNewlines: true })
      const sanitizedPlace = sanitizeTitle(placeName, 100)
      if (!sanitizedTitle) { setSaving(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); return }
      const { error } = await supabase
        .from('town_gatherings')
        .update({
          title: sanitizedTitle,
          description: sanitizedDesc || null,
          category: category,
          place_name: sanitizedPlace || null,
          meeting_frequency: frequency,
          max_participants: maxParticipants,
          min_child_age_months: minAge,
          max_child_age_months: maxAge,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gatheringId)
        .eq('creator_id', user.id)

      if (error) {
        console.error('Update error:', error)
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '수정에 실패했어요' } }))
        return
      }
      router.push(`/town/gathering/${gatheringId}`)
    } catch (err) {
      console.error('Failed to update gathering:', err)
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '수정에 실패했어요' } }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-page-bg)] flex items-center justify-center">
        <div className="w-7 h-7 border-[2.5px] border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  if (!isCreator) return null

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <PageHeader title="소모임 수정" standalone rightAction={
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className={`text-[14px] font-semibold px-3 py-1.5 rounded-xl transition-colors ${
            title.trim()
              ? 'text-[var(--color-primary)] active:bg-[var(--color-primary-bg)]'
              : 'text-tertiary'
          }`}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      } />

      {/* 폼 */}
      <div className="max-w-lg mx-auto px-5 py-5 space-y-5 pb-20">
        {/* 소모임 제목 */}
        <div>
          <label className="text-[13px] font-semibold text-primary mb-2 block">소모임 이름 <span className="text-[var(--color-primary)]">*</span></label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            placeholder="예: 서초 놀이터 친구들"
            maxLength={50}
            className="w-full h-11 px-4 rounded-xl bg-[var(--color-surface-alt)] text-body-emphasis focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-shadow"
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label className="text-[13px] font-semibold text-primary mb-2 block">카테고리 <span className="text-[var(--color-primary)]">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  category === key
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'bg-[var(--color-surface-alt)] text-secondary active:bg-[var(--color-border)]'
                }`}
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        {/* 모임 설명 */}
        <div>
          <label className="text-[13px] font-semibold text-primary mb-2 block">소모임 소개 <span className="text-[var(--color-primary)]">*</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            placeholder="어떤 소모임인지 자유롭게 소개해주세요"
            maxLength={300}
            className="w-full h-24 px-4 py-3 rounded-xl bg-[var(--color-surface-alt)] text-body-emphasis resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-shadow"
          />
          <p className="text-right text-[11px] text-tertiary mt-1">{description.length}/300</p>
        </div>

        {/* 모임 빈도 */}
        <div>
          <label className="text-[13px] font-semibold text-primary mb-2 block">모임 주기</label>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFrequency(key)}
                className={`px-2 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  frequency === key
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'bg-[var(--color-surface-alt)] text-secondary active:bg-[var(--color-border)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 장소 */}
        <div>
          <label className="text-[13px] font-semibold text-primary mb-2 block">주요 장소</label>
          <input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value.slice(0, 100))}
            placeholder="예: 서초동 놀이터"
            maxLength={100}
            className="w-full h-11 px-4 rounded-xl bg-[var(--color-surface-alt)] text-body-emphasis focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-shadow"
          />
        </div>

        {/* 아이 월령 */}
        <div>
          <label className="text-[13px] font-semibold text-primary mb-2 block">아이 월령</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                min="0"
                max="60"
                className="w-full h-11 px-4 rounded-xl bg-[var(--color-surface-alt)] text-body-emphasis focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-shadow"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-tertiary">개월</span>
            </div>
            <span className="text-tertiary font-medium">~</span>
            <div className="flex-1 relative">
              <input
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                min="0"
                max="60"
                className="w-full h-11 px-4 rounded-xl bg-[var(--color-surface-alt)] text-body-emphasis focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-shadow"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-tertiary">개월</span>
            </div>
          </div>
        </div>

        {/* 최대 인원 */}
        <div>
          <label className="text-[13px] font-semibold text-primary mb-2 block">최대 인원</label>
          <input
            type="number"
            value={maxParticipants || ''}
            onChange={(e) => setMaxParticipants(e.target.value ? Math.max(2, Math.min(50, Number(e.target.value) || 2)) : null)}
            placeholder="제한 없음"
            min="2"
            max="50"
            className="w-full h-11 px-4 rounded-xl bg-[var(--color-surface-alt)] text-body-emphasis focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-shadow"
          />
        </div>
      </div>
    </div>
  )
}
