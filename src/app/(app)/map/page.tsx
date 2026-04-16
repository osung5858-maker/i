'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import LocalParentingGuide from '@/components/map/LocalParentingGuide'
import { MapIcon } from '@/components/ui/Icons'

const KakaoMap = dynamic(() => import('@/components/map/KakaoMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#F0EDE8] flex items-center justify-center"><div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" /></div>,
})

interface MapPlace {
  id: string
  name: string
  lat: number
  lng: number
  phone: string
  address: string
  category: string
  distance: string
}

const CATEGORIES = [
  { keyword: '소아과', label: '소아과' },
  { keyword: '키즈카페', label: '키즈카페' },
  { keyword: '수유실', label: '수유실' },
  { keyword: '놀이터', label: '놀이터' },
  { keyword: '약국', label: '약국' },
  { keyword: '문화센터 유아', label: '문화센터' },
]

export default function MapPage() {
  return <Suspense><MapPageInner /></Suspense>
}

function MapPageInner() {
  const searchParams = useSearchParams()
  const queryParam = searchParams.get('q')

  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0])
  const [customSearch, setCustomSearch] = useState(queryParam || '')
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)

  // URL 쿼리파라미터로 검색 카테고리 설정
  useEffect(() => {
    if (queryParam) {
      const found = CATEGORIES.find(c => c.keyword === queryParam)
      if (found) {
        setSelectedCategory(found)
      } else {
        // 커스텀 검색어 (식당 등)
        setSelectedCategory({ keyword: queryParam, label: queryParam })
      }
    }
  }, [queryParam])

  const handlePlacesFound = useCallback((found: MapPlace[]) => {
    setPlaces(found)
    setLoading(false)
  }, [])

  const router = useRouter()

  const handlePlaceTap = (place: MapPlace) => {
    // 장소 데이터를 sessionStorage에 저장 후 상세 페이지로 이동
    sessionStorage.setItem(`place-${place.id}`, JSON.stringify(place))
    router.push(`/map/${place.id}`)
  }

  const handleCategoryChange = (cat: typeof CATEGORIES[number]) => {
    setSelectedCategory(cat)
    setPlaces([])
    setLoading(true)
    // 8초 내 결과 안 오면 stuck 방지
    setTimeout(() => setLoading(l => { if (l) return false; return l }), 8000)
  }

  const handleCall = (phone: string) => {
    if (phone) window.location.href = `tel:${phone}`
  }

  const handleNavigate = (place: { name: string; lat: number; lng: number }) => {
    // 카카오맵 길찾기 (좌표 기반)
    window.open(`https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`, '_blank')
  }

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[#f5f5f5] flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-40 bg-[#f5f5f5] border-b border-[#E8E4DF]">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full active:bg-[rgba(0,0,0,0.05)]" aria-label="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="flex-1 text-center"><p className="text-subtitle truncate">동네 육아 지도</p></div>
          <div className="w-10" />
        </div>
      </div>

      {/* 카카오맵 */}
      <div className="relative h-72 bg-[#e8e8e8]">
        <KakaoMap
          searchKeyword={selectedCategory.keyword}
          onPlacesFound={handlePlacesFound}
          onMapReady={() => setMapReady(true)}
        />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f5]">
            <div className="text-center">
              <MapIcon className="w-8 h-8 text-[#c0c0c0] mx-auto mb-2" />
              <p className="text-xs text-tertiary">지도를 불러오는 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="bg-white border-b border-[#E8E4DF]">
        <div className="max-w-lg mx-auto w-full px-5 py-2.5 flex gap-2 overflow-x-auto hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.keyword}
              onClick={() => handleCategoryChange(cat)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                selectedCategory.keyword === cat.keyword
                  ? 'bg-[var(--color-primary)] text-white shadow-[0_2px_8px_rgba(0,82,255,0.2)]'
                  : 'bg-white text-[#6B6B6B] border border-[#E8E4DF]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 동네 육아 AI 가이드 */}
      <div className="max-w-lg mx-auto w-full px-4 pt-3">
        <LocalParentingGuide />
      </div>

      {/* 장소 리스트 */}
      <div className="flex-1 max-w-lg mx-auto w-full pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
          </div>
        ) : places.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[#f0f0f0] flex items-center justify-center mb-3">
              <MapIcon className="w-8 h-8 text-tertiary" />
            </div>
            <p className="text-sm font-semibold text-primary">주변에 장소가 없어요</p>
            <p className="text-xs text-tertiary mt-1">다른 카테고리를 선택해보세요</p>
          </div>
        ) : (
          <div className="mt-3 mx-4 space-y-3">
            {places.map((place) => (
              <div
                key={place.id}
                className="p-4 rounded-2xl bg-white border border-[#ECECEC]"
              >
                {/* 클릭 가능한 장소 정보 영역 */}
                <button
                  onClick={() => handlePlaceTap(place)}
                  className="w-full text-left active:opacity-70 transition-opacity"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-subtitle text-primary">
                      {place.name}
                    </h3>
                    {place.distance && (
                      <span className="text-body-emphasis text-[var(--color-primary)] shrink-0 ml-2">
                        {place.distance}
                      </span>
                    )}
                  </div>
                  <p className="text-body-emphasis text-secondary mb-0.5">{place.address}</p>
                  {place.phone && (
                    <p className="text-body-emphasis text-[#6B6B6B]">{place.phone}</p>
                  )}
                  <p className="text-body-emphasis text-tertiary mt-1">{place.category}</p>
                </button>

                {/* 액션 버튼 */}
                <div className="flex gap-2 mt-3">
                  {place.phone && (
                    <button
                      onClick={() => handleCall(place.phone)}
                      className="flex-1 h-10 rounded-xl text-body-emphasis border border-[var(--color-primary)] text-[var(--color-primary)] active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      전화
                    </button>
                  )}
                  <button
                    onClick={() => handleNavigate(place)}
                    className="flex-1 h-10 rounded-xl text-body-emphasis bg-[var(--color-primary)] text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    길찾기
                  </button>
                  <button
                    onClick={() => handlePlaceTap(place)}
                    className="h-10 px-3 rounded-xl text-body-emphasis border border-[#ECECEC] text-secondary active:scale-95 transition-transform flex items-center justify-center"
                  >
                    리뷰
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
