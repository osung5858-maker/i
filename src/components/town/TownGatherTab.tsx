'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {MapIcon, BabyIcon, PenIcon, ClockIcon, UsersIcon, ChatIcon} from '@/components/ui/Icons'
import { sanitizeTitle, sanitizeUserInput } from '@/lib/sanitize'

interface Gathering {
  id: string
  title: string
  description: string | null
  category: string | null
  place_name: string | null
  max_participants: number | null
  min_child_age_months: number | null
  max_child_age_months: number | null
  meeting_frequency: string | null
  participant_count: number
  is_joined: boolean
  distance?: number
}

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

export default function TownGatherTab({ range }: { range: number }) {
  const [gatherings, setGatherings] = useState<Gathering[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true) // 목록 펼침/접기

  // 소모임 만들기 모달
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('playgroup')
  const [placeName, setPlaceName] = useState('')
  const [frequency, setFrequency] = useState<string>('weekly')
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null)
  const [minAge, setMinAge] = useState<number>(0)
  const [maxAge, setMaxAge] = useState<number>(60)
  const [creating, setCreating] = useState(false)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    loadGatherings()
    // 위치 가져오기
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserPos({ lat: 37.4979, lng: 127.0276 }) // 강남역 기본값
    )
  }, [range])

  const loadGatherings = async () => {
    try {
      const supabase = createClient()

      // 소모임 목록 + 참여자 수 + 최근 게시글
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('town_gatherings')
        .select(`
          *,
          gathering_participants(count),
          gathering_posts(content, created_at)
        `)
        .eq('status', 'open')
        .lte('created_at', now)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id

        // 사용자가 참여 중인 소모임 ID 조회
        let joinedIds = new Set<string>()
        if (userId) {
          const { data: participantData } = await supabase
            .from('gathering_participants')
            .select('gathering_id')
            .eq('user_id', userId)

          if (participantData) {
            joinedIds = new Set(participantData.map((p: { gathering_id: string }) => p.gathering_id))
          }
        }

        const gatherings = data.map((g: any) => {
          const posts = g.gathering_posts || []
          const sortedPosts = posts.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          return {
            ...g,
            participant_count: g.gathering_participants[0]?.count || 0,
            post_count: posts.length,
            latest_post: sortedPosts[0] || null,
            is_joined: joinedIds.has(g.id),
            gathering_participants: undefined,
            gathering_posts: undefined,
          }
        })
        setGatherings(gatherings)
      }
    } catch (err) {
      console.error('Failed to load gatherings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!title.trim() || !userPos || creating) return

    setCreating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('로그인이 필요합니다')
        setCreating(false)
        return
      }

      const sanitizedTitle = sanitizeTitle(title, 50)
      const sanitizedDesc = sanitizeUserInput(description, 300, { preserveNewlines: true })
      const sanitizedPlace = sanitizeTitle(placeName, 100)
      if (!sanitizedTitle) { setCreating(false); return }
      const { data: newGathering, error } = await supabase.from('town_gatherings').insert({
        creator_id: user.id,
        title: sanitizedTitle,
        description: sanitizedDesc || null,
        category: category,
        place_name: sanitizedPlace || null,
        lat: userPos.lat,
        lng: userPos.lng,
        meeting_frequency: frequency,
        max_participants: maxParticipants,
        min_child_age_months: minAge,
        max_child_age_months: maxAge,
      }).select().single()

      if (error) {
        console.error('Create error:', error)
        alert('소모임 만들기에 실패했어요. 다시 시도해주세요.')
        setCreating(false)
        return
      }

      // 생성자 자동 가입
      if (newGathering) {
        await supabase.from('gathering_participants').insert({
          gathering_id: newGathering.id,
          user_id: user.id,
        })
      }

      // 초기화
      setTitle('')
      setDescription('')
      setCategory('playgroup')
      setPlaceName('')
      setFrequency('weekly')
      setMaxParticipants(null)
      setMinAge(0)
      setMaxAge(60)
      setCreateOpen(false)
      loadGatherings()
    } catch (err) {
      console.error('Failed to create gathering:', err)
      alert('소모임 만들기에 실패했어요.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="px-5 pb-24 space-y-3">
      {/* 소모임 만들기 버튼 */}
      <button
        onClick={() => setCreateOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-primary)] text-white active:opacity-80 shadow-[0_2px_8px_rgba(45,122,74,0.25)]"
      >
        <PenIcon className="w-4 h-4" />
        동네 소모임 만들기
      </button>

      {/* 소모임 목록 헤더 */}
      <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 active:bg-[#FAFAF8] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
              <span className="text-lg">🤝</span>
            </div>
            <div className="text-left">
              <p className="text-subtitle text-primary">소모임 목록</p>
              <p className="text-caption text-tertiary">
                {loading ? '불러오는 중...' : `${gatherings.length}개의 소모임`}
              </p>
            </div>
          </div>
          <div className={`w-6 h-6 rounded-full bg-[#F0EDE8] flex items-center justify-center transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <svg className="w-3 h-3 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* 소모임 목록 내용 */}
        {expanded && (
          <div className="border-t border-[#E8E4DF]">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
              </div>
            ) : gatherings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-body-emphasis text-primary">아직 열린 소모임이 없어요</p>
                <p className="text-body text-tertiary mt-1">첫 소모임을 만들어보세요!</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E4DF]">
                {gatherings.map((g) => (
                  <Link
                    key={g.id}
                    href={`/town/gathering/${g.id}`}
                    className="block p-4 active:bg-[#FAFAF8] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* 아이콘 */}
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                        <span className="text-lg">
                          {g.category === 'playgroup' ? '🎈' :
                           g.category === 'study' ? '📚' :
                           g.category === 'hobby' ? '🎨' :
                           g.category === 'outdoor' ? '🏃' :
                           g.category === 'support' ? '💬' : '🤝'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* 카테고리 + 주기 */}
                        <div className="flex items-center gap-2 mb-1">
                          {g.category && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-label font-bold">
                              {CATEGORY_LABELS[g.category] || g.category}
                            </span>
                          )}
                          {g.is_joined && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-label font-bold">
                              참여중
                            </span>
                          )}
                        </div>

                        {/* 제목 */}
                        <p className="text-subtitle text-primary leading-snug mb-1">{g.title}</p>

                        {/* 메타 정보 (간소화) */}
                        <div className="flex items-center gap-3 text-caption text-tertiary">
                          {g.meeting_frequency && (
                            <span>{FREQUENCY_LABELS[g.meeting_frequency]}</span>
                          )}
                          <span>
                            <UsersIcon className="w-3 h-3 inline mr-1" />
                            {g.participant_count}명
                          </span>
                          {g.place_name && (
                            <span className="truncate">{g.place_name}</span>
                          )}
                        </div>
                      </div>

                      {/* 화살표 */}
                      <div className="shrink-0 text-[var(--color-primary)] self-center">→</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 소모임 만들기 모달 */}
      {createOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end" onClick={() => setCreateOpen(false)}>
          <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 핸들 바 */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-[#E8E4DF] rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E4DF] shrink-0">
              <button onClick={() => setCreateOpen(false)} className="text-body-emphasis text-secondary font-medium">취소</button>
              <p className="text-subtitle text-primary">소모임 만들기</p>
              <div className="w-12" />
            </div>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* 소모임 제목 */}
              <div>
                <p className="text-body-emphasis text-secondary mb-1.5">소모임 이름 *</p>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                  placeholder="예: 서초 놀이터 친구들"
                  className="w-full h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)]"
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
                  className="w-full h-20 px-3 py-2 rounded-xl border border-[#E8E4DF] text-body-emphasis resize-none focus:outline-none focus:border-[var(--color-primary)]"
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
                  className="w-full h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)]"
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
                    className="flex-1 h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <span className="text-body-emphasis text-secondary">~</span>
                  <input
                    type="number"
                    value={maxAge}
                    onChange={(e) => setMaxAge(Number(e.target.value))}
                    min="0"
                    max="60"
                    className="flex-1 h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)]"
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
                  className="w-full h-10 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* 고정 푸터 - 만들기 버튼 */}
            <div className="shrink-0 px-5 py-4 border-t border-[#E8E4DF] bg-white pb-[env(safe-area-inset-bottom)]">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className={`w-full py-3.5 rounded-xl text-subtitle transition-colors ${
                  title.trim()
                    ? 'bg-[var(--color-primary)] text-white active:bg-[#2D6B45]'
                    : 'bg-[#E8E4DF] text-tertiary'
                }`}
              >
                {creating ? '만들는 중...' : '소모임 만들기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
