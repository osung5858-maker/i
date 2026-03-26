'use client'

import { useEffect, useRef, useState } from 'react'

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

interface Props {
  onPlacesFound: (places: MapPlace[]) => void
  searchKeyword: string
  onMapReady?: () => void
}

export default function KakaoMap({ onPlacesFound, searchKeyword, onMapReady }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const retryRef = useRef(0)
  const [mapLoaded, setMapLoaded] = useState(false)

  // 지도 초기화 — SDK 로드 대기
  useEffect(() => {
    if (!mapRef.current) return

    function tryInit() {
      if (!window.kakao?.maps) {
        // SDK 아직 로드 안 됨 → 100ms 후 재시도 (최대 50회 = 5초)
        if (retryRef.current < 50) {
          retryRef.current++
          setTimeout(tryInit, 100)
        }
        return
      }
      window.kakao.maps.load(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => initMap(pos.coords.latitude, pos.coords.longitude),
          () => initMap(37.4979, 127.0276),
          { timeout: 5000 }
        )
      })
    }

    function initMap(lat: number, lng: number) {
      if (!mapRef.current) return
      const center = new window.kakao.maps.LatLng(lat, lng)
      const map = new window.kakao.maps.Map(mapRef.current, {
        center,
        level: 5,
      })
      mapInstanceRef.current = map
      setMapLoaded(true)
      onMapReady?.()
    }

    tryInit()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 키워드 검색
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !searchKeyword) return

    const map = mapInstanceRef.current
    const ps = new window.kakao.maps.services.Places()
    const center = map.getCenter()

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    ps.keywordSearch(
      searchKeyword,
      (results, status) => {
        if (status !== 'OK') {
          onPlacesFound([])
          return
        }

        const places: MapPlace[] = results.map((r) => ({
          id: r.id,
          name: r.place_name,
          lat: Number(r.y),
          lng: Number(r.x),
          phone: r.phone,
          address: r.road_address_name || r.address_name,
          category: r.category_name,
          distance: r.distance ? `${(Number(r.distance) / 1000).toFixed(1)}km` : '',
        }))

        // 마커 표시
        places.forEach((place) => {
          const position = new window.kakao.maps.LatLng(place.lat, place.lng)
          const marker = new window.kakao.maps.Marker({ position, map })
          markersRef.current.push(marker)
        })

        // 첫 번째 결과로 지도 중심 이동
        if (places.length > 0) {
          map.setCenter(new window.kakao.maps.LatLng(places[0].lat, places[0].lng))
        }

        onPlacesFound(places)
      },
      {
        location: center,
        radius: 3000,
        sort: 'distance' as kakao.maps.services.SortBy,
        size: 15,
      }
    )
  }, [searchKeyword, mapLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={mapRef} className="w-full h-full" />
  )
}
