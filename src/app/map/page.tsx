'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import KakaoMap from '@/components/map/KakaoMap'
import { MapIcon } from '@/components/ui/Icons'

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
  { keyword: '소아과', label: '소아과', emoji: '🏥' },
  { keyword: '키즈카페', label: '키즈카페', emoji: '☕' },
  { keyword: '수유실', label: '수유실', emoji: '🍼' },
  { keyword: '놀이터', label: '놀이터', emoji: '🎪' },
  { keyword: '약국', label: '약국', emoji: '💊' },
  { keyword: '문화센터 유아', label: '문화센터', emoji: '📚' },
]

export default function MapPage() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0])
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)

  const handlePlacesFound = useCallback((found: MapPlace[]) => {
    setPlaces(found)
    setLoading(false)
  }, [])

  const handleCategoryChange = (cat: typeof CATEGORIES[number]) => {
    setSelectedCategory(cat)
    setLoading(true)
  }

  const handleCall = (phone: string) => {
    if (phone) window.location.href = `tel:${phone}`
  }

  const handleNavigate = (name: string, address: string) => {
    const query = encodeURIComponent(`${name} ${address}`)
    window.open(`https://map.kakao.com/link/search/${query}`, '_blank')
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5] dark:bg-[#0A0B0D] flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
        <div className="flex items-center justify-center h-14 px-4 max-w-lg mx-auto">
          <h1 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">동네 육아 지도</h1>
        </div>
      </header>

      {/* 카카오맵 */}
      <div className="relative h-56 bg-[#e8e8e8] dark:bg-[#1a1a1a]">
        <KakaoMap
          searchKeyword={selectedCategory.keyword}
          onPlacesFound={handlePlacesFound}
          onMapReady={() => setMapReady(true)}
        />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1a1a1a]">
            <div className="text-center">
              <MapIcon className="w-8 h-8 text-[#c0c0c0] mx-auto mb-2" />
              <p className="text-xs text-[#9B9B9B]">지도를 불러오는 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="sticky top-14 z-30 bg-white/80 dark:bg-[#0A0B0D]/80 backdrop-blur-xl border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.keyword}
              onClick={() => handleCategoryChange(cat)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                selectedCategory.keyword === cat.keyword
                  ? 'bg-[#0052FF] text-white shadow-[0_2px_8px_rgba(0,82,255,0.2)]'
                  : 'bg-white dark:bg-[#1a1a1a] text-[#6B6B6B] dark:text-[#9B9B9B] border border-[#f0f0f0] dark:border-[#2a2a2a]'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 장소 리스트 */}
      <div className="flex-1 max-w-lg mx-auto w-full pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-[#0052FF]/20 border-t-[#0052FF] rounded-full animate-spin" />
          </div>
        ) : places.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[#f0f0f0] dark:bg-[#2a2a2a] flex items-center justify-center mb-3">
              <MapIcon className="w-8 h-8 text-[#9B9B9B]" />
            </div>
            <p className="text-sm font-semibold text-[#0A0B0D] dark:text-white">주변에 장소가 없어요</p>
            <p className="text-xs text-[#9B9B9B] mt-1">다른 카테고리를 선택해보세요</p>
          </div>
        ) : (
          <div className="mt-3 mx-4 space-y-3">
            {places.map((place) => (
              <div
                key={place.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a]"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">
                    {selectedCategory.emoji} {place.name}
                  </h3>
                  {place.distance && (
                    <span className="text-xs font-semibold text-[#0052FF] shrink-0 ml-2">
                      {place.distance}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#9B9B9B] mb-0.5">{place.address}</p>
                {place.phone && (
                  <p className="text-xs text-[#6B6B6B] dark:text-[#9B9B9B]">{place.phone}</p>
                )}
                <p className="text-[10px] text-[#c0c0c0] mt-1">{place.category}</p>

                {/* 액션 버튼 */}
                <div className="flex gap-2 mt-3">
                  {place.phone && (
                    <button
                      onClick={() => handleCall(place.phone)}
                      className="flex-1 h-10 rounded-xl text-xs font-semibold border border-[#0052FF] text-[#0052FF] active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      📞 전화
                    </button>
                  )}
                  <button
                    onClick={() => handleNavigate(place.name, place.address)}
                    className="flex-1 h-10 rounded-xl text-xs font-semibold bg-[#0052FF] text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    🗺️ 길찾기
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
