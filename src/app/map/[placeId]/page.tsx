'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRightIcon } from '@/components/ui/Icons'

// 샘플 데이터 (추후 Supabase 연동)
const PLACES_DB: Record<string, {
  name: string; category: string; address: string; phone: string;
  rating: number; review_count: number; tags: string[];
  is_open: boolean; closing_time: string; hours: Record<string, string>;
}> = {
  '1': {
    name: '행복한소아과', category: 'pediatric', address: '서울시 강남구 역삼동 123-45',
    phone: '02-1234-5678', rating: 4.2, review_count: 23,
    tags: ['피부 잘 봄', '대기 짧음', '주차 편함'],
    is_open: true, closing_time: '21:00',
    hours: { '월~금': '09:00~21:00', '토': '09:00~14:00', '일': '휴진' },
  },
  '2': {
    name: '키즈랜드 카페', category: 'kids_cafe', address: '서울시 강남구 삼성동 456-78',
    phone: '02-2345-6789', rating: 4.5, review_count: 45,
    tags: ['넓은 공간', '주차 편함', '기저귀 갈기 편함'],
    is_open: true, closing_time: '20:00',
    hours: { '매일': '10:00~20:00' },
  },
}

const SAMPLE_REVIEWS = [
  { id: 'r1', nickname: '서연맘', rating: 5, content: '피부 질환으로 갔는데 정말 잘 봐주셨어요. 대기 시간도 짧고 원장님이 친절하세요.', tags: ['피부 잘 봄', '대기 짧음'], age_months: 25, created_at: '2일 전' },
  { id: 'r2', nickname: '도하아빠', rating: 4, content: '야간 진료 가능해서 좋아요. 주차 공간이 넉넉합니다.', tags: ['주차 편함'], age_months: 14, created_at: '5일 전' },
  { id: 'r3', nickname: '하은맘', rating: 4, content: '예방접종 후 케어도 꼼꼼하게 해주셔서 믿고 다닙니다.', tags: ['친절함'], age_months: 8, created_at: '1주 전' },
]

export default function PlaceDetailPage() {
  const params = useParams()
  const placeId = params.placeId as string
  const router = useRouter()
  const [showAllHours, setShowAllHours] = useState(false)

  const place = PLACES_DB[placeId]

  if (!place) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] gap-3">
        <p className="text-sm text-[#9B9B9B]">장소 정보를 찾을 수 없어요</p>
        <button onClick={() => router.back()} className="text-sm text-[#0052FF] font-medium">
          돌아가기
        </button>
      </div>
    )
  }

  const handleCall = () => window.location.href = `tel:${place.phone}`
  const handleNavigate = () => {
    const query = encodeURIComponent(`${place.name} ${place.address}`)
    window.open(`https://map.kakao.com/link/search/${query}`, '_blank')
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5] dark:bg-[#0A0B0D]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-sm text-[#9B9B9B]">뒤로</button>
          <h1 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white truncate max-w-[200px]">{place.name}</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-24">
        {/* 기본 정보 카드 */}
        <div className="m-4 p-5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium text-white bg-[#E53935] px-2 py-0.5 rounded-full">
              {place.category === 'pediatric' ? '소아과' : place.category === 'kids_cafe' ? '키즈카페' : '장소'}
            </span>
            {place.is_open ? (
              <span className="text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full">
                영업중 · {place.closing_time}까지
              </span>
            ) : (
              <span className="text-[10px] font-medium text-[#9B9B9B] bg-[#f5f5f5] dark:bg-[#2a2a2a] px-2 py-0.5 rounded-full">
                영업종료
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-[#0A0B0D] dark:text-white mt-2">{place.name}</h2>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-[#6B6B6B]">⭐ {place.rating}</span>
            <span className="text-sm text-[#9B9B9B]">({place.review_count}개 리뷰)</span>
          </div>

          <p className="text-sm text-[#6B6B6B] mt-3">{place.address}</p>

          {place.phone && (
            <p className="text-sm text-[#0052FF] font-medium mt-1">{place.phone}</p>
          )}

          {/* 영업시간 */}
          <button
            onClick={() => setShowAllHours(!showAllHours)}
            className="flex items-center gap-1 mt-3 text-xs text-[#9B9B9B]"
          >
            영업시간
            <ChevronRightIcon className={`w-3 h-3 transition-transform ${showAllHours ? 'rotate-90' : ''}`} />
          </button>
          {showAllHours && (
            <div className="mt-2 space-y-1">
              {Object.entries(place.hours).map(([day, time]) => (
                <div key={day} className="flex justify-between text-xs">
                  <span className="text-[#9B9B9B]">{day}</span>
                  <span className="text-[#0A0B0D] dark:text-white">{time}</span>
                </div>
              ))}
            </div>
          )}

          {/* 태그 */}
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {place.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-[#f5f5f5] dark:bg-[#2a2a2a] text-[#6B6B6B] dark:text-[#9B9B9B]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mx-4 flex gap-3">
          {place.phone && (
            <button
              onClick={handleCall}
              className="flex-1 h-12 rounded-xl text-sm font-semibold border-2 border-[#0052FF] text-[#0052FF] active:scale-95 transition-transform flex items-center justify-center gap-1.5"
            >
              📞 전화하기
            </button>
          )}
          <button
            onClick={handleNavigate}
            className="flex-1 h-12 rounded-xl text-sm font-semibold bg-[#0052FF] text-white shadow-[0_4px_12px_rgba(0,82,255,0.3)] active:scale-95 transition-transform flex items-center justify-center gap-1.5"
          >
            🗺️ 길찾기
          </button>
        </div>

        {/* 리뷰 섹션 */}
        <div className="mx-4 mt-4 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-sm font-bold text-[#0A0B0D] dark:text-white">
              리뷰 {place.review_count}개
            </p>
            <Link
              href={`/map/${placeId}/review`}
              className="text-xs font-semibold text-[#0052FF] active:opacity-70"
            >
              리뷰 쓰기
            </Link>
          </div>

          {SAMPLE_REVIEWS.map((review) => (
            <div key={review.id} className="px-4 py-3.5 border-t border-[#f0f0f0] dark:border-[#2a2a2a]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#0A0B0D] dark:text-white">{review.nickname}</span>
                  <span className="text-xs text-[#9B9B9B]">{review.age_months}개월 아이</span>
                </div>
                <span className="text-xs text-[#9B9B9B]">{review.created_at}</span>
              </div>
              <div className="flex gap-0.5 mb-1.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={`text-xs ${i < review.rating ? 'text-amber-400' : 'text-[#e0e0e0]'}`}>★</span>
                ))}
              </div>
              <p className="text-sm text-[#0A0B0D] dark:text-white leading-relaxed">{review.content}</p>
              {review.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {review.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#2a2a2a] text-[#9B9B9B]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
