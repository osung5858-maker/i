'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PhoneIcon, CompassIcon, ChatIcon, PenIcon, HeartIcon, BellIcon } from '@/components/ui/Icons'

interface Place {
  id: string
  name: string
  address: string
  phone: string
  distance: string
  lat: number
  lng: number
}

interface Review {
  id: string
  rating: number
  content: string
  tags: string[] | null
  child_age_months: number | null
  created_at: string
  photos?: { photo_url: string }[]
}

interface PlaceTip {
  id: string
  tip: string
  votes: number
  voted: boolean
}

interface TipDataRow {
  id: string
  place_id: string
  tip: string
  votes: number
  created_at: string
}

export default function PlaceCard({ place: p, stats }: { place: Place; stats?: { avg: string; count: number } }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [tips, setTips] = useState<PlaceTip[]>([])
  const [crowdStatus, setCrowdStatus] = useState<{ status: string; timestamp: string } | null>(null)
  const [showReviews, setShowReviews] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const reviewCount = stats?.count || 0
  const avgRating = stats?.avg || null

  const loadReviews = async () => {
    if (loaded) { setShowReviews(!showReviews); return }

    const supabase = createClient()

    // 리뷰 + 사진
    const { data: reviewData } = await supabase
      .from('reviews')
      .select(`
        *,
        review_photos(photo_url)
      `)
      .eq('place_id', p.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (reviewData) setReviews(reviewData as Review[])

    // 팁 태그 (투표 많은 순)
    const { data: tipData } = await supabase
      .from('place_tips')
      .select('*')
      .eq('place_id', p.id)
      .order('votes', { ascending: false })
      .limit(5)

    if (tipData) setTips((tipData as TipDataRow[]).map(t => ({ ...t, voted: false })))

    // 최근 붐빔 정보 (5분 이내)
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString()
    const { data: crowdData } = await supabase
      .from('place_crowdedness')
      .select('status, created_at')
      .eq('place_id', p.id)
      .gte('created_at', fiveMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    if (crowdData && crowdData.length > 0) {
      setCrowdStatus({ status: crowdData[0].status, timestamp: crowdData[0].created_at })
    }

    setLoaded(true)
    setShowReviews(true)
  }

  const handleTipVote = async (tipId: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 투표 기록
      await supabase.from('tip_votes').insert({ tip_id: tipId, user_id: user.id })

      // 투표 수 증가
      await supabase.rpc('increment_tip_votes', { tip_id: tipId })

      // 리로드
      const { data: tipData } = await supabase
        .from('place_tips')
        .select('*')
        .eq('place_id', p.id)
        .order('votes', { ascending: false })
        .limit(5)

      if (tipData) setTips((tipData as TipDataRow[]).map(t => ({ ...t, voted: t.id === tipId })))
    } catch (err) {
      console.error('Failed to vote tip:', err)
    }
  }

  const getCrowdLabel = (status: string) => {
    const labels: Record<string, { text: string; color: string; emoji: string }> = {
      empty: { text: '한산함', color: 'text-green-600', emoji: '🟢' },
      moderate: { text: '보통', color: 'text-yellow-600', emoji: '🟡' },
      crowded: { text: '붐빔', color: 'text-orange-600', emoji: '🟠' },
      very_crowded: { text: '매우 붐빔', color: 'text-red-600', emoji: '🔴' },
    }
    return labels[status] || labels.moderate
  }

  const getTimeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 1) return '방금 전'
    return `${mins}분 전`
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-3">
      {/* 상단: 이름 + 별점 + 거리 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-body font-semibold text-primary truncate">{p.name}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {avgRating ? (
            <span className="text-body text-[#C4A35A] font-bold">★ {avgRating}<span className="text-body text-tertiary font-normal"> ({reviewCount})</span></span>
          ) : (
            <span className="text-body text-tertiary">새 장소</span>
          )}
          {p.distance && <span className="text-body-emphasis text-tertiary">{p.distance}</span>}
        </div>
      </div>
      <p className="text-body-emphasis text-secondary mt-0.5 truncate">{p.address}</p>

      {/* 붐빔 상태 (최근 5분 이내 데이터만) */}
      {crowdStatus && (
        <div className="mt-2 px-2 py-1 rounded-lg bg-[#F0EDE8] flex items-center gap-1.5">
          <BellIcon className="w-3.5 h-3.5 text-secondary" />
          <span className={`text-caption font-semibold ${getCrowdLabel(crowdStatus.status).color}`}>
            {getCrowdLabel(crowdStatus.status).emoji} {getCrowdLabel(crowdStatus.status).text}
          </span>
          <span className="text-label text-tertiary ml-auto">{getTimeAgo(crowdStatus.timestamp)}</span>
        </div>
      )}

      {/* 팁 태그 미리보기 (상위 3개) */}
      {tips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tips.slice(0, 3).map((tip) => (
            <button
              key={tip.id}
              onClick={() => handleTipVote(tip.id)}
              disabled={tip.voted}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-semibold border ${
                tip.voted
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-secondary border-[#E8E4DF] active:bg-[#F0EDE8]'
              }`}
            >
              {tip.tip} <HeartIcon className="w-3 h-3" /> {tip.votes}
            </button>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2 mt-2">
        {p.phone && (
          <a href={`tel:${p.phone}`} className="w-9 h-9 rounded-full bg-[var(--color-page-bg)] flex items-center justify-center active:opacity-60" title="전화">
            <PhoneIcon className="w-4 h-4 text-secondary" />
          </a>
        )}
        <a href={`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer"
          className="w-9 h-9 rounded-full bg-[var(--color-page-bg)] flex items-center justify-center active:opacity-60" title="길찾기">
          <CompassIcon className="w-4 h-4 text-secondary" />
        </a>
        <button onClick={loadReviews} className="w-9 h-9 rounded-full bg-[var(--color-page-bg)] flex items-center justify-center active:opacity-60 relative" title="리뷰">
          <ChatIcon className="w-4 h-4 text-secondary" />
          {reviewCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[var(--color-primary)] text-white text-label font-bold w-4 h-4 rounded-full flex items-center justify-center">{reviewCount}</span>}
        </button>
        <Link href={`/map/${p.id}/review`} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-caption font-semibold active:opacity-80">
          <PenIcon className="w-3 h-3" /> 리뷰
        </Link>
      </div>

      {/* 리뷰 바텀시트 */}
      {showReviews && (
        <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setShowReviews(false)}>
          <div className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-slideUp"
            onClick={e => e.stopPropagation()}>
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>

            {/* 헤더 */}
            <div className="px-5 pb-3 border-b border-[#E8E4DF]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-subtitle text-primary">{p.name}</p>
                  {avgRating && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={`text-body-emphasis ${s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-[#E0E0E0]'}`}>★</span>)}</div>
                      <span className="text-body font-bold">{avgRating}</span>
                      <span className="text-body text-secondary">{reviews.length}개</span>
                    </div>
                  )}
                </div>
                <Link href={`/map/${p.id}/review`} className="px-3 py-1.5 bg-[var(--color-primary)] text-white font-semibold rounded-lg">리뷰 쓰기</Link>
              </div>

              {/* 팁 태그 전체 */}
              {tips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tips.map((tip) => (
                    <button
                      key={tip.id}
                      onClick={() => handleTipVote(tip.id)}
                      disabled={tip.voted}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-semibold border ${
                        tip.voted
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-white text-secondary border-[#E8E4DF] active:bg-[#F0EDE8]'
                      }`}
                    >
                      {tip.tip} <HeartIcon className="w-3.5 h-3.5" /> {tip.votes}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 리뷰 스크롤 */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-body text-tertiary">아직 리뷰가 없어요</p>
                  <Link href={`/map/${p.id}/review`} className="text-body-emphasis text-[var(--color-primary)] font-semibold mt-2 inline-block">첫 리뷰 작성하기 →</Link>
                </div>
              ) : reviews.map(r => (
                <div key={r.id} className="bg-[var(--color-page-bg)] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={`text-body ${s <= r.rating ? 'text-amber-400' : 'text-[#E0E0E0]'}`}>★</span>)}</div>
                    {r.child_age_months !== null && <span className="text-body text-secondary">· 아이 {r.child_age_months}개월</span>}
                    <span className="text-body text-tertiary ml-auto">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>

                  {/* 리뷰 사진 갤러리 */}
                  {r.photos && r.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-2">
                      {r.photos.map((photo, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                          <Image src={photo.photo_url} alt="" fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-body-emphasis text-primary leading-relaxed">{r.content}</p>
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {r.tags.map(t => <span key={t} className="text-body px-1.5 py-0.5 rounded-full bg-white text-secondary">{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
