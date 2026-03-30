'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CommunityPageInner } from '@/app/community/page'
import { MapIcon, PhoneIcon, CompassIcon, ChatIcon, PenIcon } from '@/components/ui/Icons'
import AdSlot from '@/components/ads/AdSlot'

type SubTab = 'town' | 'story' | 'market'

// 슬라이더 스냅 포인트 (미터)
const RANGE_STEPS = [500, 1000, 2000, 3000, 5000, 10000, 20000]

const STORAGE_KEY_RANGE = 'dodam_neighborhood_range'
const STORAGE_KEY_RANGE_SET = 'dodam_neighborhood_range_set'

function getSavedRange(): number {
  if (typeof window === 'undefined') return 1000
  const saved = localStorage.getItem(STORAGE_KEY_RANGE)
  return saved ? Number(saved) : 1000
}

function formatRange(meters: number): string {
  return meters >= 1000 ? `${meters / 1000}km` : `${meters}m`
}

// 미터 → 0~1 비율 (로그 스케일)
function rangeToRatio(meters: number): number {
  const min = Math.log(RANGE_STEPS[0])
  const max = Math.log(RANGE_STEPS[RANGE_STEPS.length - 1])
  return (Math.log(meters) - min) / (max - min)
}

// 0~1 비율 → 스냅된 미터
function ratioToRange(ratio: number): number {
  const min = Math.log(RANGE_STEPS[0])
  const max = Math.log(RANGE_STEPS[RANGE_STEPS.length - 1])
  const value = Math.exp(min + ratio * (max - min))
  // 가장 가까운 스냅 포인트 찾기
  let closest = RANGE_STEPS[0]
  let minDist = Infinity
  for (const step of RANGE_STEPS) {
    const dist = Math.abs(value - step)
    if (dist < minDist) { minDist = dist; closest = step }
  }
  return closest
}

const MAP_CATEGORIES: Record<string, { label: string; query: string }[]> = {
  preparing: [
    { label: '산부인과', query: '산부인과' },
    { label: '난임클리닉', query: '난임클리닉' },
    { label: '약국', query: '약국' },
    { label: '요가', query: '임산부요가' },
  ],
  pregnant: [
    { label: '산부인과', query: '산부인과' },
    { label: '산후조리원', query: '산후조리원' },
    { label: '베이비용품', query: '유아용품점' },
    { label: '약국', query: '약국' },
  ],
  parenting: [
    { label: '소아과', query: '소아과' },
    { label: '응급소아과', query: '응급소아과' },
    { label: '산후조리원', query: '산후조리원' },
    { label: '키즈카페', query: '키즈카페' },
    { label: '문화센터', query: '문화센터' },
    { label: '놀이터', query: '어린이놀이터' },
    { label: '약국', query: '약국' },
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
  const [range, setRange] = useState(1000)
  const [editingRange, setEditingRange] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
    setRange(getSavedRange())
    // 최초 진입 시 범위 편집 모드 자동 활성화
    if (!localStorage.getItem(STORAGE_KEY_RANGE_SET)) {
      setEditingRange(true)
    }
  }, [])

  const handleRangeConfirm = (meters: number) => {
    setRange(meters)
    localStorage.setItem(STORAGE_KEY_RANGE, String(meters))
    localStorage.setItem(STORAGE_KEY_RANGE_SET, '1')
    setEditingRange(false)
  }

  const categories = MAP_CATEGORIES[mode] || MAP_CATEGORIES.parenting

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <div className="sticky top-12 z-30 bg-[var(--color-page-bg)] pt-3 pb-0 max-w-lg mx-auto w-full">
        <div className="max-w-lg mx-auto w-full">
          <div className="flex px-5 gap-2 bg-[#F0EDE8] mx-5 p-1 rounded-xl mb-3">
            {[
              { key: 'town' as SubTab, label: '동네' },
              { key: 'story' as SubTab, label: '이야기' },
              { key: 'market' as SubTab, label: '도담장터' },
            ].map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                className={`flex-1 py-1.5 text-[13px] font-semibold text-center rounded-lg transition-colors ${subTab === t.key ? 'bg-white text-[#1A1918] shadow-sm' : 'text-[#9E9A95]'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full">
        {subTab === 'town' && (
          <MapTab
            categories={categories}
            range={range}
            editingRange={editingRange}
            onEditRange={() => setEditingRange(true)}
            onRangeConfirm={handleRangeConfirm}
          />
        )}
        {subTab === 'story' && <Suspense><CommunityPageInner initialTab="feed" hideHeader /></Suspense>}
        {subTab === 'market' && <Suspense><CommunityPageInner initialTab="market" hideHeader /></Suspense>}
      </div>
    </div>
  )
}

// ===== 범위 슬라이더 (지도 위 오버레이) =====
function RangeSlider({ value, onChange, onConfirm }: { value: number; onChange: (m: number) => void; onConfirm: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const ratio = rangeToRatio(value)

  const handleInteraction = (clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onChange(ratioToRange(x))
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    handleInteraction(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
    handleInteraction(e.clientX)
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white via-white/95 to-transparent pt-8 pb-4 px-5">
      {/* 현재 범위 레이블 */}
      <div className="text-center mb-3">
        <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-4 py-1.5 shadow-md">
          <MapIcon className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-[15px] font-bold text-[#1A1918]">{formatRange(value)}</span>
          <span className="text-[12px] text-[#9E9A95]">
            {value <= 500 ? '도보 거리' : value <= 1000 ? '가까운 동네' : value <= 2000 ? '우리 동네' : value <= 3000 ? '이웃 동네' : '넓은 범위'}
          </span>
        </span>
      </div>

      {/* 슬라이더 트랙 */}
      <div
        ref={trackRef}
        className="relative h-10 flex items-center cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* 배경 트랙 */}
        <div className="absolute left-0 right-0 h-1.5 bg-[#E8E4DF] rounded-full" />
        {/* 활성 트랙 */}
        <div
          className="absolute left-0 h-1.5 bg-[var(--color-primary)] rounded-full transition-[width] duration-75"
          style={{ width: `${ratio * 100}%` }}
        />
        {/* 스냅 포인트 */}
        {RANGE_STEPS.map(step => {
          const pos = rangeToRatio(step) * 100
          const isActive = step <= value
          return (
            <div key={step} className="absolute -translate-x-1/2" style={{ left: `${pos}%` }}>
              <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                isActive ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-white border-[#D0CCC7]'
              }`} />
            </div>
          )
        })}
        {/* 드래그 핸들 */}
        <div
          className="absolute -translate-x-1/2 w-7 h-7 rounded-full bg-white border-[3px] border-[var(--color-primary)] shadow-lg transition-[left] duration-75"
          style={{ left: `${ratio * 100}%` }}
        />
      </div>

      {/* 스냅 레이블 */}
      <div className="relative h-5 mt-0.5">
        {RANGE_STEPS.map(step => {
          const pos = rangeToRatio(step) * 100
          return (
            <span
              key={step}
              className={`absolute -translate-x-1/2 text-[11px] font-medium ${
                step === value ? 'text-[var(--color-primary)] font-bold' : 'text-[#9E9A95]'
              }`}
              style={{ left: `${pos}%` }}
            >
              {formatRange(step)}
            </span>
          )
        })}
      </div>

      {/* 확인 버튼 */}
      <button
        onClick={onConfirm}
        className="w-full mt-2 py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold active:opacity-80 transition-opacity"
      >
        이 범위로 검색하기
      </button>
    </div>
  )
}

// ===== 동네(지도) 탭 =====
function MapTab({ categories, range, editingRange, onEditRange, onRangeConfirm }: {
  categories: { label: string; query: string }[]
  range: number
  editingRange: boolean
  onEditRange: () => void
  onRangeConfirm: (meters: number) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewStats, setReviewStats] = useState<Record<string, { avg: string; count: number }>>({})
  const [previewRange, setPreviewRange] = useState(range)
  const mapObjRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const circleRef = useRef<any>(null)
  const cacheRef = useRef<Record<string, Place[]>>({})
  const posRef = useRef<{ lat: number; lng: number } | null>(null)
  const rangeRef = useRef(range)

  // 마커 초기화
  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
  }

  // 원형 오버레이 업데이트
  const updateCircle = useCallback((radius: number) => {
    if (!mapObjRef.current || !posRef.current) return
    const center = new window.kakao.maps.LatLng(posRef.current.lat, posRef.current.lng)
    if (circleRef.current) {
      circleRef.current.setRadius(radius)
    } else {
      circleRef.current = new (window.kakao.maps as any).Circle({
        center,
        radius,
        strokeWeight: 2,
        strokeColor: '#4A9B6E',
        strokeOpacity: 0.6,
        fillColor: '#4A9B6E',
        fillOpacity: 0.08,
      })
    }
  }, [])

  // 편집 모드 토글
  useEffect(() => {
    if (!mapObjRef.current) return
    if (editingRange) {
      setPreviewRange(range)
      updateCircle(range)
      circleRef.current?.setMap(mapObjRef.current)
      // 편집 시 지도 줌 맞춤
      const level = range <= 500 ? 4 : range <= 1000 ? 5 : range <= 3000 ? 6 : 7
      mapObjRef.current.setLevel(level)
    } else {
      circleRef.current?.setMap(null)
    }
  }, [editingRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // 프리뷰 범위 변경 → 원 + 줌 실시간 업데이트
  useEffect(() => {
    if (!editingRange || !mapObjRef.current) return
    updateCircle(previewRange)
    const level = previewRange <= 500 ? 4 : previewRange <= 1000 ? 5 : previewRange <= 3000 ? 6 : 7
    mapObjRef.current.setLevel(level)
  }, [previewRange, editingRange, updateCircle])

  const searchPlaces = useCallback((query: string) => {
    const cacheKey = `${query}_${rangeRef.current}`
    if (cacheRef.current[cacheKey]) {
      setPlaces(cacheRef.current[cacheKey])
      setLoading(false)
      clearMarkers()
      if (mapObjRef.current) {
        cacheRef.current[cacheKey].forEach(p => {
          const marker = new window.kakao.maps.Marker({ map: mapObjRef.current, position: new window.kakao.maps.LatLng(p.lat, p.lng) })
          markersRef.current.push(marker)
        })
      }
      return
    }

    setLoading(true); setPlaces([])
    if (!window.kakao?.maps) { setLoading(false); return }

    const mapLevel = rangeRef.current <= 500 ? 4 : rangeRef.current <= 1000 ? 5 : rangeRef.current <= 3000 ? 6 : 7

    const doSearch = (lat: number, lng: number) => {
      const latlng = new window.kakao.maps.LatLng(lat, lng)
      if (!mapObjRef.current && mapRef.current) {
        mapObjRef.current = new window.kakao.maps.Map(mapRef.current, { center: latlng, level: mapLevel })
      } else if (mapObjRef.current) {
        mapObjRef.current.setCenter(latlng)
        mapObjRef.current.setLevel(mapLevel)
      }

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
          cacheRef.current[cacheKey] = results
          if (mapObjRef.current) {
            results.forEach(p => {
              const marker = new window.kakao.maps.Marker({ map: mapObjRef.current, position: new window.kakao.maps.LatLng(p.lat, p.lng) })
              markersRef.current.push(marker)
            })
          }
        }
        setLoading(false)
      }, { location: latlng, radius: rangeRef.current, sort: (window.kakao.maps.services as any).SortBy?.DISTANCE })
    }

    if (posRef.current) {
      doSearch(posRef.current.lat, posRef.current.lng)
    } else {
      navigator.geolocation.getCurrentPosition((pos) => {
        posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        doSearch(pos.coords.latitude, pos.coords.longitude)
      }, () => {
        const defaultLat = 37.4979, defaultLng = 127.0276
        posRef.current = { lat: defaultLat, lng: defaultLng }
        doSearch(defaultLat, defaultLng)
      }, { enableHighAccuracy: true, timeout: 5000 })
    }
  }, [])

  // 배치 리뷰 조회
  useEffect(() => {
    if (places.length === 0) return
    const supabase = createClient()
    const ids = places.map(p => p.id)
    supabase.from('reviews').select('place_id, rating').in('place_id', ids).then(({ data }: any) => {
      if (!data) return
      const stats: Record<string, { avg: string; count: number }> = {}
      const grouped: Record<string, number[]> = {}
      data.forEach((r: any) => {
        if (!grouped[r.place_id]) grouped[r.place_id] = []
        grouped[r.place_id].push(r.rating)
      })
      Object.entries(grouped).forEach(([pid, ratings]) => {
        stats[pid] = { avg: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1), count: ratings.length }
      })
      setReviewStats(stats)
    })
  }, [places])

  useEffect(() => {
    const initMap = () => {
      if (window.kakao?.maps) { window.kakao.maps.load(() => searchPlaces(categories[0]?.query || '소아과')) }
      else setTimeout(initMap, 300)
    }
    initMap()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 범위 변경 시 재검색
  useEffect(() => {
    if (rangeRef.current !== range) {
      rangeRef.current = range
      cacheRef.current = {}
      searchPlaces(categories[activeIdx]?.query || '소아과')
    }
  }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-28">
      {/* 지도 + 범위 원 오버레이 */}
      <div className="relative">
        <div
          ref={mapRef}
          className={`w-full bg-[#E8F0E8] transition-[height] duration-300 ${editingRange ? 'h-72' : 'h-48'}`}
        />
        {/* 범위 버튼 — 지도 우상단 플로팅 */}
        {!editingRange && (
          <button
            onClick={onEditRange}
            className="absolute top-3 right-3 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.12)] active:scale-95 transition-transform"
          >
            <MapIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="text-[12px] font-semibold text-[var(--color-primary)]">{formatRange(range)}</span>
          </button>
        )}
        {editingRange && (
          <RangeSlider
            value={previewRange}
            onChange={setPreviewRange}
            onConfirm={() => onRangeConfirm(previewRange)}
          />
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 py-3">
        {categories.map((cat, i) => (
          <button key={cat.query} onClick={() => { setActiveIdx(i); searchPlaces(cat.query) }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-semibold ${activeIdx === i ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[#6B6966] border border-[#E8E4DF]'}`}>
            {cat.label}
          </button>
        ))}
      </div>
      <div className="px-5 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" /></div>
        ) : places.length === 0 ? (
          <p className="text-[13px] text-[#9E9A95] text-center py-8">주변에 검색 결과가 없어요</p>
        ) : (
          places.map((p, i) => (
            <div key={p.id}>
              <PlaceCard place={p} stats={reviewStats[p.id]} />
              {i === 2 && places.length > 4 && <AdSlot className="mt-2" />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ===== 장소 카드 (리뷰 포함) =====
function PlaceCard({ place: p, stats }: { place: Place; stats?: { avg: string; count: number } }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [showReviews, setShowReviews] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const reviewCount = stats?.count || 0
  const avgRating = stats?.avg || null

  const loadReviews = async () => {
    if (loaded) { setShowReviews(!showReviews); return }
    const supabase = createClient()
    const { data } = await supabase.from('reviews').select('*').eq('place_id', p.id).order('created_at', { ascending: false }).limit(5)
    setReviews(data || [])
    setLoaded(true)
    setShowReviews(true)
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-3">
      {/* 상단: 이름 + 별점 + 거리 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1A1918] truncate">{p.name}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {avgRating ? (
            <span className="text-[13px] text-[#C4A35A] font-bold">★ {avgRating}<span className="text-[13px] text-[#9E9A95] font-normal"> ({reviewCount})</span></span>
          ) : (
            <span className="text-[13px] text-[#9E9A95]">새 장소</span>
          )}
          {p.distance && <span className="text-[14px] text-[#9E9A95]">{p.distance}</span>}
        </div>
      </div>
      <p className="text-[14px] text-[#6B6966] mt-0.5 truncate">{p.address}</p>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2 mt-2">
        {p.phone && (
          <a href={`tel:${p.phone}`} className="w-9 h-9 rounded-full bg-[var(--color-page-bg)] flex items-center justify-center active:opacity-60" title="전화">
            <PhoneIcon className="w-4 h-4 text-[#6B6966]" />
          </a>
        )}
        <a href={`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer"
          className="w-9 h-9 rounded-full bg-[var(--color-page-bg)] flex items-center justify-center active:opacity-60" title="길찾기">
          <CompassIcon className="w-4 h-4 text-[#6B6966]" />
        </a>
        <button onClick={loadReviews} className="w-9 h-9 rounded-full bg-[var(--color-page-bg)] flex items-center justify-center active:opacity-60 relative" title="리뷰">
          <ChatIcon className="w-4 h-4 text-[#6B6966]" />
          {reviewCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[var(--color-primary)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{reviewCount}</span>}
        </button>
        <Link href={`/map/${p.id}/review`} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-[12px] text-white font-semibold active:opacity-80">
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
                  <p className="text-[15px] font-bold text-[#1A1918]">{p.name}</p>
                  {avgRating && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={`text-[14px] ${s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-[#E0E0E0]'}`}>★</span>)}</div>
                      <span className="text-[13px] font-bold">{avgRating}</span>
                      <span className="text-[13px] text-[#6B6966]">{reviews.length}개</span>
                    </div>
                  )}
                </div>
                <Link href={`/map/${p.id}/review`} className="px-3 py-1.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-lg">리뷰 쓰기</Link>
              </div>

              {/* 태그 요약 */}
              {(() => {
                const allTags = reviews.flatMap(r => r.tags || [])
                const tagCounts: Record<string, number> = {}
                allTags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 })
                const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
                if (sorted.length === 0) return null
                return (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sorted.map(([tag, count]) => (
                      <span key={tag} className="text-[13px] px-2 py-0.5 rounded-full bg-[#F0F9F4] text-[var(--color-primary)]">{tag} ({count})</span>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* 리뷰 스크롤 */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[13px] text-[#9E9A95]">아직 리뷰가 없어요</p>
                  <Link href={`/map/${p.id}/review`} className="text-[14px] text-[var(--color-primary)] font-semibold mt-2 inline-block">첫 리뷰 작성하기 →</Link>
                </div>
              ) : reviews.map(r => (
                <div key={r.id} className="bg-[var(--color-page-bg)] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={`text-[13px] ${s <= r.rating ? 'text-amber-400' : 'text-[#E0E0E0]'}`}>★</span>)}</div>
                    {r.child_age_months !== null && <span className="text-[13px] text-[#6B6966]">· 아이 {r.child_age_months}개월</span>}
                    <span className="text-[13px] text-[#9E9A95] ml-auto">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <p className="text-[14px] text-[#1A1918] leading-relaxed">{r.content}</p>
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {r.tags.map(t => <span key={t} className="text-[13px] px-1.5 py-0.5 rounded-full bg-white text-[#6B6966]">{t}</span>)}
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
