'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { safeGetItem, safeSetItem } from '@/lib/safeStorage'
import { MapIcon, PhoneIcon, CompassIcon, ChatIcon, PenIcon } from '@/components/ui/Icons'
import AdSlot from '@/components/ads/AdSlot'
import PlaceCard from '@/components/town/PlaceCard'
import TownFeedTab from '@/components/town/TownFeedTab'
import TownGatherTab from '@/components/town/TownGatherTab'
import TownMarketTab from '@/components/town/TownMarketTab'

type SubTab = 'town' | 'feed' | 'gather' | 'market'

// 슬라이더 스냅 포인트 (미터)
const RANGE_STEPS = [500, 1000, 2000, 3000, 5000, 10000, 20000]

const STORAGE_KEY_RANGE = 'dodam_neighborhood_range'
const STORAGE_KEY_RANGE_SET = 'dodam_neighborhood_range_set'

function getSavedRange(): number {
  if (typeof window === 'undefined') return 1000
  const saved = safeGetItem(STORAGE_KEY_RANGE)
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
    const saved = safeGetItem('dodam_mode')
    if (saved) setMode(saved)
    setRange(getSavedRange())
    // 최초 진입 시 범위 편집 모드 자동 활성화
    if (!safeGetItem(STORAGE_KEY_RANGE_SET)) {
      setEditingRange(true)
    }
  }, [])

  const handleRangeConfirm = (meters: number) => {
    setRange(meters)
    safeSetItem(STORAGE_KEY_RANGE, String(meters))
    safeSetItem(STORAGE_KEY_RANGE_SET, '1')
    setEditingRange(false)
  }

  const categories = MAP_CATEGORIES[mode] || MAP_CATEGORIES.parenting

  return (
    <div className="bg-[var(--color-page-bg)]">
      {/* 탭 네비게이션 */}
      <div className="flex gap-2 bg-[#F0EDE8] mx-5 p-1 rounded-xl my-3">
        {[
          { key: 'town' as SubTab, label: '장소' },
          { key: 'feed' as SubTab, label: '소식' },
          { key: 'gather' as SubTab, label: '소모임' },
          { key: 'market' as SubTab, label: '거래' },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`flex-1 py-1.5 text-body font-semibold text-center rounded-lg transition-colors ${subTab === t.key ? 'bg-white text-primary shadow-sm' : 'text-tertiary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {subTab === 'town' && (
        <MapTab
          categories={categories}
          range={range}
          editingRange={editingRange}
          onEditRange={() => setEditingRange(true)}
          onRangeConfirm={handleRangeConfirm}
        />
      )}
      {subTab === 'feed' && <TownFeedTab range={range} />}
      {subTab === 'gather' && <TownGatherTab range={range} />}
      {subTab === 'market' && <TownMarketTab range={range} />}
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
          <span className="text-subtitle text-primary">{formatRange(value)}</span>
          <span className="text-caption text-tertiary">
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
              className={`absolute -translate-x-1/2 text-label font-medium ${
                step === value ? 'text-[var(--color-primary)] font-bold' : 'text-tertiary'
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
        className="w-full mt-2 py-3 rounded-xl bg-[var(--color-primary)] text-white active:opacity-80 transition-opacity"
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
  const [mapError, setMapError] = useState(false)
  const retryCountRef = useRef(0)
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
    if (!window.kakao?.maps) { setLoading(false); setMapError(true); return }

    const mapLevel = rangeRef.current <= 500 ? 4 : rangeRef.current <= 1000 ? 5 : rangeRef.current <= 3000 ? 6 : 7

    const doSearch = (lat: number, lng: number) => {
      try {
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
      } catch (err) {
        console.error('Kakao map error:', err)
        setLoading(false)
        setMapError(true)
      }
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
      if (window.kakao?.maps?.load) {
        try {
          window.kakao.maps.load(() => searchPlaces(categories[0]?.query || '소아과'))
        } catch (err) {
          console.error('Kakao maps.load error:', err)
          setLoading(false)
          setMapError(true)
        }
      } else if (retryCountRef.current < 30) {
        retryCountRef.current++
        setTimeout(initMap, 300)
      } else {
        setLoading(false)
        setMapError(true)
      }
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
    <div className="pb-24">
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
            <span className="text-caption font-semibold text-[var(--color-primary)]">{formatRange(range)}</span>
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
            className={`shrink-0 px-3 py-1.5 rounded-full font-semibold ${activeIdx === i ? 'bg-[var(--color-primary)] font-bold' : 'bg-white text-secondary border border-[#E8E4DF]'}`}
            style={activeIdx === i ? { fontSize: 14, color: '#FFFFFF', fontWeight: 700 } : { fontSize: 14 }}>
            {cat.label}
          </button>
        ))}
      </div>
      <div className="px-5 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" /></div>
        ) : mapError ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-body-emphasis text-primary">지도를 불러올 수 없어요</p>
            <p className="text-body text-tertiary">카카오 지도 API 권한을 확인해주세요</p>
            <button onClick={() => { setMapError(false); setLoading(true); retryCountRef.current = 0; const t = setTimeout(() => { if (window.kakao?.maps?.load) window.kakao.maps.load(() => searchPlaces(categories[activeIdx]?.query || '소아과')); else { setLoading(false); setMapError(true) } }, 100); return () => clearTimeout(t) }}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl font-semibold">
              다시 시도
            </button>
          </div>
        ) : places.length === 0 ? (
          <p className="text-body text-tertiary text-center py-8">주변에 검색 결과가 없어요</p>
        ) : (
          places.map((p, i) => (
            <div key={p.id}>
              <PlaceCard place={p} stats={reviewStats[p.id]} />
              {/* {i === 2 && places.length > 4 && <AdSlot className="mt-2" />} */}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

