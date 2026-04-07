'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MapIcon, PenIcon, UsersIcon } from '@/components/ui/Icons'
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

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  playgroup: { label: '놀이모임', emoji: '🎈', color: 'text-rose-600', bg: 'bg-rose-50' },
  study:     { label: '공부/교육', emoji: '📚', color: 'text-blue-600', bg: 'bg-blue-50' },
  hobby:     { label: '취미', emoji: '🎨', color: 'text-purple-600', bg: 'bg-purple-50' },
  support:   { label: '육아정보', emoji: '💬', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  outdoor:   { label: '야외활동', emoji: '🏃', color: 'text-amber-600', bg: 'bg-amber-50' },
  etc:       { label: '기타', emoji: '🤝', color: 'text-slate-600', bg: 'bg-slate-50' },
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: '주 1회',
  biweekly: '2주 1회',
  monthly: '월 1회',
  irregular: '비정기',
}

const GATHER_PAGE_SIZE = 15

export default function TownGatherTab({ range }: { range: number }) {
  const [gatherings, setGatherings] = useState<Gathering[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)

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
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserPos({ lat: 37.4979, lng: 127.0276 })
    )
  }, [range])

  const loadGatherings = async () => {
    try {
      const supabase = createClient()
      const now = new Date().toISOString()

      // H-4: 병렬 실행
      const [gatheringsRes, userRes] = await Promise.all([
        supabase
          .from('town_gatherings')
          .select(`*, gathering_participants(count), gathering_posts(content, created_at)`)
          .eq('status', 'open')
          .lte('created_at', now)
          .order('created_at', { ascending: false })
          .limit(GATHER_PAGE_SIZE),
        supabase.auth.getUser(),
      ])

      const data = gatheringsRes.data
      if (data) {
        const userId = userRes.data?.user?.id
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
            participant_count: Array.isArray(g.gathering_participants) ? (g.gathering_participants[0]?.count || 0) : 0,
            post_count: posts.length,
            latest_post: sortedPosts[0] || null,
            is_joined: joinedIds.has(g.id),
            gathering_participants: undefined,
            gathering_posts: undefined,
          }
        })
        setGatherings(gatherings)
        setHasMore(data.length >= GATHER_PAGE_SIZE)
      }
    } catch (err) {
      console.error('Failed to load gatherings:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || gatherings.length === 0) return
    setLoadingMore(true)
    try {
      const supabase = createClient()
      const now = new Date().toISOString()
      const last = gatherings[gatherings.length - 1] as any
      const { data } = await supabase
        .from('town_gatherings')
        .select(`*, gathering_participants(count), gathering_posts(content, created_at)`)
        .eq('status', 'open')
        .lte('created_at', now)
        .lt('created_at', last.created_at)
        .order('created_at', { ascending: false })
        .limit(GATHER_PAGE_SIZE)

      if (data) {
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id
        let joinedIds = new Set<string>()
        if (userId) {
          const { data: participantData } = await supabase
            .from('gathering_participants')
            .select('gathering_id')
            .eq('user_id', userId)
          if (participantData) joinedIds = new Set(participantData.map((p: { gathering_id: string }) => p.gathering_id))
        }
        const more = data.map((g: any) => {
          const posts = g.gathering_posts || []
          const sortedPosts = posts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          return { ...g, participant_count: Array.isArray(g.gathering_participants) ? (g.gathering_participants[0]?.count || 0) : 0, post_count: posts.length, latest_post: sortedPosts[0] || null, is_joined: joinedIds.has(g.id), gathering_participants: undefined, gathering_posts: undefined }
        })
        setGatherings(prev => [...prev, ...more])
        setHasMore(data.length >= GATHER_PAGE_SIZE)
      }
    } catch (err) {
      console.error('Failed to load more gatherings:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, gatherings])

  useEffect(() => {
    const el = observerRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore()
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  const handleCreate = async () => {
    if (!title.trim() || !userPos || creating) return
    setCreating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '로그인이 필요해요' } }))
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
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '소모임 만들기에 실패했어요' } }))
        setCreating(false)
        return
      }
      if (newGathering) {
        const { error: joinErr } = await supabase.from('gathering_participants').insert({
          gathering_id: newGathering.id,
          user_id: user.id,
        })
        if (joinErr) console.error('Auto-join failed:', joinErr)
      }
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
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '소모임 만들기에 실패했어요' } }))
    } finally {
      setCreating(false)
    }
  }

  const catMeta = (cat: string | null) => CATEGORY_META[cat || 'etc'] || CATEGORY_META.etc

  return (
    <div className="px-5 pb-24">
      {/* 소모임 만들기 CTA */}
      <button
        onClick={() => setCreateOpen(true)}
        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-[var(--color-border)] mb-4 active:scale-[0.98] transition-transform"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--color-primary-bg)] to-[var(--color-accent-bg)] flex items-center justify-center shrink-0">
          <PenIcon className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div className="text-left flex-1">
          <p className="text-body-emphasis text-primary">새 소모임 만들기</p>
          <p className="text-caption text-tertiary">우리 동네 부모님들과 함께해요</p>
        </div>
        <svg className="w-5 h-5 text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 로딩 */}
      {loading ? (
        <div className="space-y-3" aria-label="소모임 로딩 중" role="status">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[var(--color-border)] p-4 animate-pulse">
              <div className="flex gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#F0EDE8] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-1.5">
                    <div className="h-5 w-14 bg-[#F0EDE8] rounded-md" />
                    <div className="h-5 w-12 bg-[#F0EDE8] rounded-md" />
                  </div>
                  <div className="h-4 w-3/4 bg-[#F0EDE8] rounded" />
                  <div className="h-3 w-1/2 bg-[#F0EDE8] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : gatherings.length === 0 ? (
        /* 빈 상태 */
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--color-primary-bg)] flex items-center justify-center">
            <span className="text-3xl">🤝</span>
          </div>
          <p className="text-subtitle text-primary mb-1">아직 열린 소모임이 없어요</p>
          <p className="text-body text-tertiary">첫 소모임을 만들어보세요!</p>
        </div>
      ) : (
        /* 소모임 카드 리스트 */
        <div className="space-y-3">
          {gatherings.map((g) => {
            const meta = catMeta(g.category)
            return (
              <Link
                key={g.id}
                href={`/town/gathering/${g.id}`}
                className="block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden active:scale-[0.98] transition-transform"
              >
                <div className="p-4">
                  <div className="flex gap-3.5">
                    {/* 카테고리 아이콘 */}
                    <div className={`w-12 h-12 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                      <span className="text-2xl">{meta.emoji}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 배지 행 */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md ${meta.bg} ${meta.color} text-[11px] font-semibold`}>
                          {meta.label}
                        </span>
                        {g.meeting_frequency && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-tertiary text-[11px] font-medium">
                            {FREQUENCY_LABELS[g.meeting_frequency]}
                          </span>
                        )}
                        {g.is_joined && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-primary-bg)] text-[var(--color-primary)] text-[11px] font-semibold">
                            참여중
                          </span>
                        )}
                      </div>

                      {/* 제목 */}
                      <p className="text-[15px] font-semibold text-primary leading-snug mb-1.5 line-clamp-1">{g.title}</p>

                      {/* 메타 */}
                      <div className="flex items-center gap-2.5 text-[12px] text-tertiary">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="w-3.5 h-3.5" />
                          {g.participant_count}명
                        </span>
                        {g.place_name && (
                          <span className="flex items-center gap-1 truncate">
                            <MapIcon className="w-3.5 h-3.5" />
                            {g.place_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* 인피니티 스크롤 센티널 */}
      {hasMore && !loading && (
        <div ref={observerRef} className="flex justify-center py-6">
          {loadingMore && <div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />}
        </div>
      )}

      {/* 소모임 만들기 모달 */}
      {createOpen && (<>
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end" onClick={() => setCreateOpen(false)} aria-hidden="true" />
        <div className="fixed inset-0 z-[100] flex items-end pointer-events-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="소모임 만들기"
            className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl max-h-[90vh] flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32,0.72,0,1)' }}
          >
            {/* 핸들 바 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] shrink-0">
              <button onClick={() => setCreateOpen(false)} className="text-body-emphasis text-secondary font-medium">취소</button>
              <p className="text-subtitle text-primary">소모임 만들기</p>
              <div className="w-12" />
            </div>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* 소모임 제목 */}
              <div>
                <label className="text-[13px] font-semibold text-primary mb-2 block">소모임 이름 <span className="text-[var(--color-primary)]">*</span></label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                  placeholder="예: 서초 놀이터 친구들"
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

            {/* 고정 푸터 */}
            <div className="shrink-0 px-5 py-4 border-t border-[var(--color-border)] bg-white" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className={`w-full py-3.5 rounded-2xl text-[15px] font-bold transition-all ${
                  title.trim()
                    ? 'bg-[var(--color-primary)] text-white active:scale-[0.98] shadow-[0_2px_12px_var(--color-fab-shadow)]'
                    : 'bg-[var(--color-surface-alt)] text-tertiary'
                }`}
              >
                {creating ? '만드는 중...' : '소모임 만들기'}
              </button>
            </div>
          </div>
        </div>
      </>)}

      <style jsx>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
