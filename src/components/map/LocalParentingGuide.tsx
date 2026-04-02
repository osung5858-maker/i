'use client'

import { useState, useEffect } from 'react'
import { BuildingIcon, HospitalIcon, ActivityIcon, BottleIcon, BookOpenIcon } from '@/components/ui/Icons'

interface LocalTip {
  category: string
  emoji: string
  title: string
  description: string
}

interface GuideData {
  areaName: string
  summary: string
  tips: LocalTip[]
  nearbyHighlight: string
  seasonalTip: string
}

function tipCategoryIcon(category: string) {
  switch (category) {
    case 'health': return <HospitalIcon className="w-4 h-4 text-secondary" />
    case 'play': return <ActivityIcon className="w-4 h-4 text-secondary" />
    case 'nursing': return <BottleIcon className="w-4 h-4 text-secondary" />
    case 'culture': return <BookOpenIcon className="w-4 h-4 text-secondary" />
    default: return <BuildingIcon className="w-4 h-4 text-secondary" />
  }
}

export default function LocalParentingGuide() {
  const [guide, setGuide] = useState<GuideData | null>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [expanded, setExpanded] = useState(false)

  // 위치 가져오기
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 }
    )
  }, [])

  const fetchGuide = async () => {
    if (!location) return
    setLoading(true)

    // 역지오코딩으로 동네명 가져오기
    let areaName = '내 동네'
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_REST_KEY
    if (kakaoKey) {
      try {
        const geoRes = await fetch(
          `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${location.lng}&y=${location.lat}`,
          { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
        )
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          const region = geoData.documents?.find((d: any) => d.region_type === 'H')
          if (region) areaName = `${region.region_2depth_name} ${region.region_3depth_name}`
        }
      } catch { /* */ }
    }

    // AI 가이드 생성
    try {
      const res = await fetch('/api/ai-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType: 'local-guide',
          areaName,
          month: new Date().getMonth() + 1,
          lat: location.lat,
          lng: location.lng,
        }),
      })
      const data = await res.json()
      if (data.summary) {
        setGuide(data)
        setExpanded(true)
      } else {
        // AI 응답 실패 시 로컬 기본 가이드
        setGuide(generateLocalGuide(areaName))
        setExpanded(true)
      }
    } catch {
      setGuide(generateLocalGuide(areaName))
      setExpanded(true)
    }
    setLoading(false)
  }

  if (!location) return null

  if (!guide && !loading) {
    return (
      <button
        onClick={fetchGuide}
        className="w-full bg-gradient-to-r from-[#F0F9F4] to-[#F0F4FF] rounded-2xl border border-[#D5E8DC] p-4 text-left active:opacity-90"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
            <BuildingIcon className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <p className="text-body-emphasis font-bold text-primary">동네 육아 AI 가이드</p>
            <p className="text-caption text-secondary">내 위치 기반 맞춤 육아 정보 보기</p>
          </div>
          <span className="text-body text-[var(--color-primary)] font-semibold shrink-0">보기</span>
        </div>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#D5D0CA] p-5 text-center">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-body text-secondary">동네 육아 가이드 준비 중...</p>
      </div>
    )
  }

  if (!guide) return null

  return (
    <div className="bg-white rounded-2xl border border-[#D5D0CA] shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-[#F5F1EC]">
        <div className="w-10 h-10 rounded-full bg-[#F0F9F4] flex items-center justify-center shrink-0">
          <BuildingIcon className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-body-emphasis font-bold text-primary">{guide.areaName} 육아 가이드</p>
          <p className="text-caption text-secondary line-clamp-1">{guide.summary}</p>
        </div>
        <span className="text-body text-tertiary">{expanded ? '접기' : '펼치기'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2.5">
          {guide.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--color-page-bg)]">
              <span className="shrink-0 mt-0.5">{tipCategoryIcon(tip.category)}</span>
              <div>
                <p className="text-body font-semibold text-primary">{tip.title}</p>
                <p className="text-caption text-secondary leading-relaxed">{tip.description}</p>
              </div>
            </div>
          ))}

          {guide.nearbyHighlight && (
            <div className="p-3 rounded-xl bg-[#FFF8F3] border border-[#F0E4D8]">
              <p className="text-caption text-[#C4A35A] font-medium mb-0.5">근처 추천</p>
              <p className="text-body text-[#5A5854]">{guide.nearbyHighlight}</p>
            </div>
          )}

          {guide.seasonalTip && (
            <div className="p-3 rounded-xl bg-[#F0F4FF] border border-[#D5DFEF]">
              <p className="text-caption text-[#4A6FA5] font-medium mb-0.5">이달의 팁</p>
              <p className="text-body text-[#4A4744]">{guide.seasonalTip}</p>
            </div>
          )}

          <button onClick={fetchGuide} className="w-full text-center text-caption text-tertiary py-1">
            새로고침
          </button>
        </div>
      )}
    </div>
  )
}

// AI 실패 시 로컬 기본 가이드
function generateLocalGuide(areaName: string): GuideData {
  const month = new Date().getMonth() + 1
  const season = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'fall' : 'winter'

  const seasonTips: Record<string, string> = {
    spring: '봄철 환절기 — 아이 외출 시 얇은 겉옷 + 마스크. 꽃가루 알레르기 주의하세요.',
    summer: '여름 더위 — 외출 시 모자 필수, 수분 보충 자주! 키즈카페는 에어컨 천국이에요.',
    fall: '가을 나들이 시즌 — 동네 공원 산책하기 좋아요. 아침저녁 쌀쌀하니 겉옷 챙기세요.',
    winter: '겨울 한파 — 실내 놀이 위주로. 키즈카페나 문화센터 프로그램을 찾아보세요.',
  }

  return {
    areaName,
    summary: '우리 동네 육아 정보를 모았어요',
    tips: [
      { category: 'health', emoji: '', title: '소아과 알아두기', description: '야간·주말 진료 가능한 소아과를 미리 확인해두면 급할 때 당황하지 않아요' },
      { category: 'play', emoji: '', title: '놀이 공간', description: '동네 놀이터, 키즈카페 위치를 파악해두세요. 지도에서 "놀이터" 검색!' },
      { category: 'nursing', emoji: '', title: '수유실 확인', description: '외출 전 근처 수유실 위치를 확인하면 편해요. 지도에서 "수유실" 검색!' },
      { category: 'culture', emoji: '', title: '문화센터', description: '구청·주민센터 영유아 프로그램을 확인해보세요. 무료 프로그램도 많아요' },
    ],
    nearbyHighlight: '지도 탭에서 "소아과", "키즈카페", "수유실"을 검색해보세요',
    seasonalTip: seasonTips[season],
  }
}
