'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sanitizeTitle, sanitizeUserInput } from '@/lib/sanitize'

const CATEGORY_LABELS: Record<string, string> = {
  playgroup: '놀이모임',
  study: '공부/교육',
  hobby: '취미',
  support: '육아정보',
  outdoor: '야외활동',
  etc: '기타',
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

  useEffect(() => {
    loadGathering()
  }, [gatheringId])

  const loadGathering = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('로그인이 필요합니다')
        router.push(`/town/gathering/${gatheringId}`)
        return
      }

      const { data: gathering, error } = await supabase
        .from('town_gatherings')
        .select('*')
        .eq('id', gatheringId)
        .single()

      if (error || !gathering) {
        alert('소모임을 찾을 수 없습니다')
        router.push('/town')
        return
      }

      // 생성자 확인
      if (gathering.creator_id !== user.id) {
        alert('소모임 생성자만 수정할 수 있습니다')
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
      alert('소모임을 불러오는데 실패했어요')
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

      if (error) {
        console.error('Update error:', error)
        alert('수정에 실패했어요. 다시 시도해주세요.')
        setSaving(false)
        return
      }

      // 성공 시 상세 페이지로 이동
      router.push(`/town/gathering/${gatheringId}`)
    } catch (err) {
      console.error('Failed to update gathering:', err)
      alert('수정에 실패했어요.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-page-bg)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  if (!isCreator) {
    return null
  }

  return (
    <div className="min-h-screen bg-[var(--color-page-bg)]">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E8E4DF] sticky top-0 z-10">
        <div className="max-w-[430px] mx-auto flex items-center justify-between px-5 py-3">
          <button
            onClick={() => router.back()}
            className="text-body-emphasis text-secondary font-medium"
          >
            취소
          </button>
          <p className="text-subtitle text-primary">소모임 수정</p>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className={`text-body-emphasis ${
              title.trim()
                ? 'text-[var(--color-primary)]'
                : 'text-tertiary'
            }`}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 폼 */}
      <div className="max-w-[430px] mx-auto px-5 py-4 space-y-4 pb-20">
        {/* 소모임 제목 */}
        <div>
          <p className="text-body-emphasis text-secondary mb-1.5">소모임 이름 *</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            placeholder="예: 서초 놀이터 친구들"
            maxLength={50}
            className="w-full h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)] bg-white"
          />
        </div>

        {/* 카테고리 */}
        <div>
          <p className="text-body-emphasis text-secondary mb-1.5">카테고리 *</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`px-3 py-1.5 rounded-lg text-body font-medium transition-colors ${
                  category === key
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[#E8E4DF] text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 모임 설명 */}
        <div>
          <p className="text-body-emphasis text-secondary mb-1.5">소모임 소개 *</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            placeholder="어떤 소모임인지 자유롭게 소개해주세요"
            maxLength={300}
            className="w-full h-20 px-3 py-2 rounded-xl border border-[#E8E4DF] text-body-emphasis resize-none focus:outline-none focus:border-[var(--color-primary)] bg-white"
          />
        </div>

        {/* 모임 빈도 */}
        <div>
          <p className="text-body-emphasis text-secondary mb-1.5">모임 주기</p>
          <div className="flex gap-2">
            {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFrequency(key)}
                className={`flex-1 px-3 py-2 rounded-lg text-body font-medium transition-colors ${
                  frequency === key
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[#E8E4DF] text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 장소 */}
        <div>
          <p className="text-body-emphasis text-secondary mb-1.5">주요 장소 (선택)</p>
          <input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value.slice(0, 100))}
            placeholder="예: 서초동 놀이터"
            maxLength={100}
            className="w-full h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)] bg-white"
          />
        </div>

        {/* 아이 월령 */}
        <div>
          <p className="text-body-emphasis text-secondary mb-1.5">아이 월령</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
              min="0"
              max="60"
              className="flex-1 h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)] bg-white"
            />
            <span className="text-body-emphasis text-secondary">~</span>
            <input
              type="number"
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              min="0"
              max="60"
              className="flex-1 h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)] bg-white"
            />
            <span className="text-body-emphasis text-secondary">개월</span>
          </div>
        </div>

        {/* 최대 인원 */}
        <div>
          <p className="text-body-emphasis text-secondary mb-1.5">최대 인원 (선택)</p>
          <input
            type="number"
            value={maxParticipants || ''}
            onChange={(e) => setMaxParticipants(e.target.value ? Number(e.target.value) : null)}
            placeholder="제한 없음"
            min="2"
            max="50"
            className="w-full h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)] bg-white"
          />
        </div>
      </div>
    </div>
  )
}
