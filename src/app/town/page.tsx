'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CommunityPageInner } from '@/app/community/page'

type SubTab = 'town' | 'story' | 'market'

const MAP_CATEGORIES: Record<string, { icon: string; label: string; query: string }[]> = {
  preparing: [
    { icon: '🏥', label: '산부인과', query: '산부인과' },
    { icon: '🧪', label: '난임클리닉', query: '난임클리닉' },
    { icon: '💊', label: '약국', query: '약국' },
    { icon: '🧘', label: '요가', query: '임산부요가' },
  ],
  pregnant: [
    { icon: '🏥', label: '산부인과', query: '산부인과' },
    { icon: '🤱', label: '산후조리원', query: '산후조리원' },
    { icon: '👶', label: '베이비용품', query: '유아용품점' },
    { icon: '💊', label: '약국', query: '약국' },
  ],
  parenting: [
    { icon: '🏥', label: '소아과', query: '소아과' },
    { icon: '🚨', label: '응급소아과', query: '응급소아과' },
    { icon: '🎪', label: '키즈카페', query: '키즈카페' },
    { icon: '📚', label: '문화센터', query: '문화센터' },
    { icon: '🌳', label: '놀이터', query: '어린이놀이터' },
    { icon: '💊', label: '약국', query: '약국' },
  ],
}

interface Place {
  id: string; name: string; address: string; phone: string; distance: string; lat: number; lng: number
}

interface Review {
  id: string; rating: number; content: string; tags: string[] | null; child_age_months: number | null; created_at: string
}

export default function TownPage() {
  const [subTab, setSubTab] = useState<SubTab>('town')
  const [mode, setMode] = useState('parenting')

  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
  }, [])

  const categories = MAP_CATEGORIES[mode] || MAP_CATEGORIES.parenting

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center h-12 px-5">
            <h1 className="text-[17px] font-bold text-[#1A1918]">동네</h1>
          </div>
          <div className="flex px-5 gap-1 pb-2">
            {[
              { key: 'town' as SubTab, label: '동네' },
              { key: 'story' as SubTab, label: '이야기' },
              { key: 'market' as SubTab, label: '도담장터' },
            ].map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-semibold ${subTab === t.key ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {subTab === 'town' && <MapTab categories={categories} />}
        {subTab === 'story' && <Suspense><CommunityPageInner initialTab="feed" hideHeader /></Suspense>}
        {subTab === 'market' && <Suspense><CommunityPageInner initialTab="market" hideHeader /></Suspense>}
      </div>
    </div>
  )
}

// ===== 동네(지도) 탭 =====
function MapTab({ categories }: { categories: { icon: string; label: string; query: string }[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const mapObjRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const cacheRef = useRef<Record<string, Place[]>>({}) // 검색 결과 캐시
  const posRef = useRef<{ lat: number; lng: number } | null>(null)

  // 마커 초기화
  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
  }

  const searchPlaces = useCallback((query: string) => {
    // 캐시 히트
    if (cacheRef.current[query]) {
      setPlaces(cacheRef.current[query])
      setLoading(false)
      // 마커만 다시 그리기
      clearMarkers()
      if (mapObjRef.current) {
        cacheRef.current[query].forEach(p => {
          const marker = new window.kakao.maps.Marker({ map: mapObjRef.current, position: new window.kakao.maps.LatLng(p.lat, p.lng) })
          markersRef.current.push(marker)
        })
      }
      return
    }

    setLoading(true); setPlaces([])
    if (!window.kakao?.maps) { setLoading(false); return }

    const doSearch = (lat: number, lng: number) => {
      const latlng = new window.kakao.maps.LatLng(lat, lng)
      if (!mapObjRef.current && mapRef.current) {
        mapObjRef.current = new window.kakao.maps.Map(mapRef.current, { center: latlng, level: 5 })
      } else if (mapObjRef.current) { mapObjRef.current.setCenter(latlng) }

      clearMarkers()
      const ps = new window.kakao.maps.services.Places()
      ps.keywordSearch(query, (data: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const results = data.slice(0, 10).map((p: any) => ({
            id: p.id, name: p.place_name, address: p.road_address_name || p.address_name,
            phone: p.phone || '', distance: p.distance ? `${Math.round(Number(p.distance))}m` : '',
            lat: Number(p.y), lng: Number(p.x),
          }))
          setPlaces(results)
          cacheRef.current[query] = results // 캐시 저장
          if (mapObjRef.current) {
            results.forEach(p => {
              const marker = new window.kakao.maps.Marker({ map: mapObjRef.current, position: new window.kakao.maps.LatLng(p.lat, p.lng) })
              markersRef.current.push(marker)
            })
          }
        }
        setLoading(false)
      }, { location: latlng, radius: 5000, sort: (window.kakao.maps.services as any).SortBy?.DISTANCE })
    }

    // 위치 캐시 활용
    if (posRef.current) {
      doSearch(posRef.current.lat, posRef.current.lng)
    } else {
      navigator.geolocation.getCurrentPosition((pos) => {
        posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        doSearch(pos.coords.latitude, pos.coords.longitude)
      }, () => setLoading(false), { enableHighAccuracy: true })
    }
  }, [])

  useEffect(() => {
    const initMap = () => {
      if (window.kakao?.maps) { window.kakao.maps.load(() => searchPlaces(categories[0]?.query || '소아과')) }
      else setTimeout(initMap, 300)
    }
    initMap()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-28">
      <div ref={mapRef} className="w-full h-48 bg-[#E8F0E8]" />
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 py-3">
        {categories.map((cat, i) => (
          <button key={cat.query} onClick={() => { setActiveIdx(i); searchPlaces(cat.query) }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 ${activeIdx === i ? 'bg-[#3D8A5A] text-white' : 'bg-white text-[#868B94] border border-[#f0f0f0]'}`}>
            <span className="text-sm">{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>
      <div className="px-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" /></div>
        ) : places.length === 0 ? (
          <p className="text-[13px] text-[#AEB1B9] text-center py-8">주변에 검색 결과가 없어요</p>
        ) : (
          places.map(p => <PlaceCard key={p.id} place={p} />)
        )}
      </div>
    </div>
  )
}

// ===== 장소 카드 (리뷰 포함) =====
function PlaceCard({ place: p }: { place: Place }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [showReviews, setShowReviews] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)
  const [avgRating, setAvgRating] = useState<string | null>(null)

  // 카드 렌더링 시 리뷰 수/평점만 먼저 로드
  useEffect(() => {
    const supabase = createClient()
    supabase.from('reviews').select('rating').eq('place_id', p.id).then(({ data }) => {
      if (data && data.length > 0) {
        setReviewCount(data.length)
        setAvgRating((data.reduce((s: number, r: any) => s + r.rating, 0) / data.length).toFixed(1))
      }
    })
  }, [p.id])

  const loadReviews = async () => {
    if (loaded) { setShowReviews(!showReviews); return }
    const supabase = createClient()
    const { data } = await supabase.from('reviews').select('*').eq('place_id', p.id).order('created_at', { ascending: false }).limit(5)
    setReviews(data || [])
    setLoaded(true)
    setShowReviews(true)
  }

  return (
    <div className="bg-white rounded-xl border border-[#f0f0f0] p-3">
      {/* 상단: 이름 + 별점 + 거리 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1A1918] truncate">{p.name}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {avgRating ? (
            <span className="text-[11px] text-[#C4A35A] font-bold">★ {avgRating}<span className="text-[9px] text-[#AEB1B9] font-normal"> ({reviewCount})</span></span>
          ) : (
            <span className="text-[9px] text-[#AEB1B9]">새 장소</span>
          )}
          {p.distance && <span className="text-[10px] text-[#AEB1B9]">{p.distance}</span>}
        </div>
      </div>
      <p className="text-[10px] text-[#868B94] mt-0.5 truncate">{p.address}</p>

      {/* 액션: 한 줄 컴팩트 */}
      <div className="flex items-center gap-1.5 mt-2">
        {p.phone && (
          <a href={`tel:${p.phone}`} className="px-2.5 py-1 rounded-full bg-[#F5F4F1] text-[10px] text-[#868B94] active:opacity-60">📞 전화</a>
        )}
        <a href={`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-full bg-[#F5F4F1] text-[10px] text-[#868B94] active:opacity-60">🧭 길찾기</a>
        <button onClick={loadReviews} className="px-2.5 py-1 rounded-full bg-[#F5F4F1] text-[10px] text-[#868B94] active:opacity-60">
          💬 리뷰{reviewCount > 0 ? ` ${reviewCount}` : ''}
        </button>
        <Link href={`/map/${p.id}/review`} className="px-2.5 py-1 rounded-full bg-[#3D8A5A] text-[10px] text-white font-semibold active:opacity-80 ml-auto">✏️ 리뷰 쓰기</Link>
      </div>

      {/* 리뷰 목록 (펼침) */}
      {showReviews && (
        <div className="mt-2 pt-2 border-t border-[#f0f0f0]">
          {reviews.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-[11px] text-[#AEB1B9]">아직 리뷰가 없어요</p>
              <Link href={`/map/${p.id}/review`} className="text-[11px] text-[#3D8A5A] font-semibold mt-1 inline-block">첫 리뷰 작성하기 →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 평균 평점 */}
              <div className="flex items-center gap-2 mb-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className={`text-[14px] ${s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-[#E0E0E0]'}`}>★</span>
                  ))}
                </div>
                <span className="text-[13px] font-bold text-[#1A1918]">{avgRating}</span>
                <span className="text-[10px] text-[#868B94]">{reviews.length}개 리뷰</span>
              </div>

              {/* 태그 요약 */}
              {(() => {
                const allTags = reviews.flatMap(r => r.tags || [])
                const tagCounts: Record<string, number> = {}
                allTags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 })
                const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
                if (sorted.length === 0) return null
                return (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {sorted.map(([tag, count]) => (
                      <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-[#F0F9F4] text-[#3D8A5A]">{tag} ({count})</span>
                    ))}
                  </div>
                )
              })()}

              {/* 리뷰 목록 */}
              {reviews.map(r => (
                <div key={r.id} className="bg-[#F5F4F1] rounded-lg p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className={`text-[10px] ${s <= r.rating ? 'text-amber-400' : 'text-[#E0E0E0]'}`}>★</span>
                      ))}
                    </div>
                    {r.child_age_months !== null && <span className="text-[9px] text-[#868B94]">· 방문 시 {r.child_age_months}개월</span>}
                  </div>
                  <p className="text-[12px] text-[#1A1918] leading-relaxed">{r.content}</p>
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.tags.map(t => <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-white text-[#868B94]">{t}</span>)}
                    </div>
                  )}
                  <p className="text-[9px] text-[#AEB1B9] mt-1">{new Date(r.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
