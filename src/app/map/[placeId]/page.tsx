'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface PlaceData {
  id: string
  name: string
  lat: number
  lng: number
  phone: string
  address: string
  category: string
  distance: string
}

interface DBReview {
  id: string
  rating: number
  content: string
  tags: string[] | null
  child_age_months: number | null
  created_at: string
}

export default function PlaceDetailPage() {
  const params = useParams()
  const placeId = params.placeId as string
  const router = useRouter()
  const supabase = createClient()

  const [place, setPlace] = useState<PlaceData | null>(null)
  const [reviews, setReviews] = useState<DBReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [congestion, setCongestion] = useState<string | null>(null)
  const [congestionSubmitted, setCongestionSubmitted] = useState(false)

  // sessionStorage에서 장소 데이터 로드
  useEffect(() => {
    const saved = sessionStorage.getItem(`place-${placeId}`)
    if (saved) {
      setPlace(JSON.parse(saved))
    }
  }, [placeId])

  // DB 리뷰 조회
  useEffect(() => {
    async function loadReviews() {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('place_id', placeId)
        .order('created_at', { ascending: false })
      if (data) setReviews(data as DBReview[])
      setReviewsLoading(false)
    }
    loadReviews()
  }, [placeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCongestionCheck = useCallback((level: string) => {
    setCongestion(level)
    setCongestionSubmitted(true)
  }, [])

  if (!place) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] gap-3">
        <div className="w-10 h-10 border-3 border-[#FF6F0F]/20 border-t-[#FF6F0F] rounded-full animate-spin" />
        <p className="text-[13px] text-[#868B94]">장소 정보를 불러오는 중...</p>
      </div>
    )
  }

  const handleCall = () => {
    if (place.phone) window.location.href = `tel:${place.phone}`
  }
  const handleNavigate = () => {
    window.open(`https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`, '_blank')
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECECEC]">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-[13px] text-[#868B94]">뒤로</button>
          <h1 className="text-[15px] font-bold text-[#212124] truncate max-w-[220px]">{place.name}</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-24">
        {/* 기본 정보 */}
        <div className="m-4 p-5 rounded-2xl bg-white border border-[#ECECEC]">
          <h2 className="text-[18px] font-bold text-[#212124]">{place.name}</h2>

          <div className="flex items-center gap-2 mt-1.5">
            {avgRating && (
              <span className="text-[13px] text-[#212124]">⭐ {avgRating} ({reviews.length})</span>
            )}
            {place.distance && (
              <span className="text-[12px] font-medium text-[#FF6F0F]">{place.distance}</span>
            )}
          </div>

          <p className="text-[13px] text-[#868B94] mt-2">{place.address}</p>
          {place.phone && (
            <p className="text-[13px] text-[#FF6F0F] font-medium mt-1">{place.phone}</p>
          )}
          <p className="text-[11px] text-[#AEB1B9] mt-1">{place.category}</p>
        </div>

        {/* 액션 버튼 */}
        <div className="mx-4 flex gap-2">
          {place.phone && (
            <button
              onClick={handleCall}
              className="flex-1 h-12 rounded-2xl text-[13px] font-semibold border-2 border-[#FF6F0F] text-[#FF6F0F] active:scale-95 transition-transform flex items-center justify-center gap-1.5"
            >
              📞 전화하기
            </button>
          )}
          <button
            onClick={handleNavigate}
            className="flex-1 h-12 rounded-2xl text-[13px] font-semibold bg-[#FF6F0F] text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5"
          >
            🗺️ 길찾기
          </button>
        </div>

        {/* 혼잡도 체크인 */}
        <div className="mx-4 mt-3 p-4 rounded-2xl bg-white border border-[#ECECEC]">
          <p className="text-[13px] font-bold text-[#212124] mb-2">지금 혼잡도는?</p>
          {congestionSubmitted ? (
            <div className="flex items-center gap-2 py-1">
              <span className="text-lg">{congestion === 'low' ? '🟢' : congestion === 'medium' ? '🟡' : '🔴'}</span>
              <p className="text-[12px] text-[#868B94]">
                {congestion === 'low' ? '여유' : congestion === 'medium' ? '보통' : '혼잡'}로 공유했어요!
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              {[
                { level: 'low', label: '여유', emoji: '🟢', color: 'border-green-300 text-green-600 bg-green-50' },
                { level: 'medium', label: '보통', emoji: '🟡', color: 'border-amber-300 text-amber-600 bg-amber-50' },
                { level: 'high', label: '혼잡', emoji: '🔴', color: 'border-red-300 text-red-600 bg-red-50' },
              ].map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => handleCongestionCheck(opt.level)}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium border ${opt.color} active:scale-95 transition-transform`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 리뷰 섹션 */}
        <div className="mx-4 mt-3 rounded-2xl bg-white border border-[#ECECEC] overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[13px] font-bold text-[#212124]">리뷰 {reviews.length}개</p>
            <Link
              href={`/map/${placeId}/review`}
              className="text-[12px] font-semibold text-[#FF6F0F] active:opacity-70"
            >
              리뷰 쓰기
            </Link>
          </div>

          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#FF6F0F]/20 border-t-[#FF6F0F] rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="px-4 py-8 text-center border-t border-[#ECECEC]">
              <p className="text-[13px] text-[#868B94]">아직 리뷰가 없어요</p>
              <Link
                href={`/map/${placeId}/review`}
                className="inline-block mt-3 px-5 py-2 rounded-xl bg-[#FF6F0F] text-white text-[12px] font-semibold active:scale-95"
              >
                첫 리뷰 남기기
              </Link>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="px-4 py-3.5 border-t border-[#ECECEC]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#212124]">도담 사용자</span>
                    {review.child_age_months && (
                      <span className="text-[11px] text-[#868B94]">{review.child_age_months}개월 아이</span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#AEB1B9]">
                    {new Date(review.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex gap-0.5 mb-1.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={`text-[11px] ${i < review.rating ? 'text-amber-400' : 'text-[#ECECEC]'}`}>★</span>
                  ))}
                </div>
                <p className="text-[13px] text-[#212124] leading-relaxed">{review.content}</p>
                {review.tags && review.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {review.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F8FA] text-[#868B94]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
