'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertIcon, MapIcon } from '@/components/ui/Icons'

interface NearbyClinic {
  id: string
  name: string
  address: string
  phone: string
  distance_km: number
  is_open: boolean
  closing_time: string
  rating: number
}

// 샘플 데이터 (추후 Supabase PostGIS 연동)
const SAMPLE_CLINICS: NearbyClinic[] = [
  { id: '1', name: '행복한소아과', address: '역삼동 123-45', phone: '02-1234-5678', distance_km: 0.5, is_open: true, closing_time: '21:00', rating: 4.2 },
  { id: '2', name: '우리아이소아과', address: '삼성동 456-78', phone: '02-2345-6789', distance_km: 1.2, is_open: true, closing_time: '20:00', rating: 4.5 },
  { id: '3', name: '튼튼소아과', address: '대치동 789-12', phone: '02-3456-7890', distance_km: 2.1, is_open: true, closing_time: '22:00', rating: 3.8 },
  { id: '4', name: '사랑소아과', address: '논현동 234-56', phone: '02-4567-8901', distance_km: 3.5, is_open: false, closing_time: '18:00', rating: 4.0 },
]

export default function EmergencyPage() {
  const [clinics, setClinics] = useState<NearbyClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [locationError, setLocationError] = useState(false)
  const [radius, setRadius] = useState(3)
  const [notified, setNotified] = useState(false)
  const notifiedRef = useRef(false)
  const supabase = createClient()

  // 응급 모드 진입 시 공동양육자에게 알림
  useEffect(() => {
    if (notifiedRef.current) return
    notifiedRef.current = true

    async function notifyCaregivers() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: children } = await supabase
        .from('children')
        .select('id, name')
        .eq('user_id', user.id)
        .limit(1)

      if (!children || children.length === 0) return

      const childName = children[0].name
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || '양육자'

      // 응급 이벤트를 events 테이블에 기록 (Realtime으로 공동양육자에게 전파)
      await supabase.from('events').insert({
        child_id: children[0].id,
        recorder_id: user.id,
        type: 'memo',
        start_ts: new Date().toISOString(),
        tags: {
          emergency: true,
          message: `🚨 ${userName}님이 ${childName}의 응급 모드를 실행했어요. 가까운 소아과를 찾고 있어요.`,
        },
        source: 'manual',
      })

      // 이상 감지 테이블에도 기록 (Critical 알림용)
      await supabase.from('anomalies').insert({
        child_id: children[0].id,
        metric: 'temperature',
        severity: 'critical',
        suggestion: `${userName}님이 응급 모드를 실행했어요. 확인해주세요.`,
      })

      // 카카오톡 메시지 전송 시도
      try {
        await fetch('/api/kakao-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childName,
            senderName: userName,
            messageType: 'emergency',
          }),
        })
      } catch {
        // 카카오톡 실패해도 Realtime으로 전달되므로 무시
      }

      setNotified(true)
    }

    notifyCaregivers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // GPS 위치 요청 시뮬레이션
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // 성공: 샘플 데이터로 표시 (추후 PostGIS 연동)
          const filtered = SAMPLE_CLINICS
            .filter((c) => c.is_open && c.distance_km <= radius)
            .sort((a, b) => a.distance_km - b.distance_km)
          setClinics(filtered)
          setLoading(false)
        },
        () => {
          // 위치 권한 거부: 전체 샘플 표시
          setLocationError(true)
          setClinics(SAMPLE_CLINICS.filter((c) => c.is_open))
          setLoading(false)
        },
        { timeout: 5000 }
      )
    } else {
      setLocationError(true)
      setClinics(SAMPLE_CLINICS.filter((c) => c.is_open))
      setLoading(false)
    }
  }, [radius])

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleNavigate = (name: string, address: string) => {
    window.open(`https://map.kakao.com/link/search/${encodeURIComponent(name + ' ' + address)}`, '_blank')
  }

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5] dark:bg-[#0A0B0D]">
      {/* 헤더 */}
      <div className="bg-gradient-to-b from-[#E53935] to-[#C62828] px-5 pt-14 pb-6">
        <div className="max-w-lg mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">가까운 소아과 찾기</h1>
              <p className="text-sm text-white/70">지금 영업 중인 소아과만 보여드려요</p>
            </div>
          </div>
          <a href="tel:119" className="block w-full py-2.5 bg-white rounded-xl text-center text-[#E53935] font-bold text-[14px] active:opacity-80 mb-2">
            🚨 119 응급 전화 바로 걸기
          </a>
          <div className="bg-white/15 rounded-lg px-3 py-2">
            <p className="text-[10px] text-white/80 leading-relaxed">⚠️ 아래 목록은 참고용입니다. 정확하지 않을 수 있으니 방문 전 전화로 확인해주세요. 응급 상황에는 119를 먼저 이용해주세요.</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full -mt-2 pb-24">
        {/* 공동양육자 알림 배너 */}
        {notified && (
          <div className="mx-4 mb-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-[12px] text-blue-700 font-medium">
              ✅ 공동양육자에게 응급 알림을 보냈어요 (앱 내 알림 + 카카오톡)
            </p>
          </div>
        )}

        {/* 면책 배너 */}
        <div className="mx-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            ⚠️ 영업시간 정보가 정확하지 않을 수 있어요. 전화로 확인해주세요.
          </p>
        </div>

        {/* 위치 에러 */}
        {locationError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              📍 위치 권한을 허용하면 더 정확한 결과를 볼 수 있어요.
            </p>
          </div>
        )}

        {/* 로딩 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-[#E53935]/20 border-t-[#E53935] rounded-full animate-spin" />
            <p className="text-sm text-[#9B9B9B] mt-3">주변 소아과를 찾고 있어요...</p>
          </div>
        ) : clinics.length === 0 ? (
          /* 결과 없음 */
          <div className="flex flex-col items-center justify-center py-16 mx-4">
            <div className="w-16 h-16 rounded-2xl bg-[#f0f0f0] dark:bg-[#2a2a2a] flex items-center justify-center mb-4">
              <MapIcon className="w-8 h-8 text-[#9B9B9B]" />
            </div>
            <p className="text-base font-semibold text-[#0A0B0D] dark:text-white">근처에 영업 중인 소아과가 없어요</p>
            <p className="text-sm text-[#9B9B9B] mt-1">검색 범위를 넓혀볼까요?</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRadius(5)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                  radius === 5
                    ? 'bg-[#FF6F0F] text-white'
                    : 'bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a] text-[#0A0B0D] dark:text-white'
                }`}
              >
                5km
              </button>
              <button
                onClick={() => setRadius(10)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                  radius === 10
                    ? 'bg-[#FF6F0F] text-white'
                    : 'bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a] text-[#0A0B0D] dark:text-white'
                }`}
              >
                10km
              </button>
            </div>
          </div>
        ) : (
          /* 소아과 목록 */
          <div className="mt-4 mx-4 space-y-3">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#E8E4DF] dark:border-[#2a2a2a]"
              >
                {/* 상단: 이름 + 거리 */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0A0B0D] dark:text-white">
                      🏥 {clinic.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        영업중 · {clinic.closing_time}까지
                      </span>
                      <span className="text-xs text-[#9B9B9B]">⭐ {clinic.rating}</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-[#E53935] shrink-0">
                    {clinic.distance_km}km
                  </span>
                </div>

                {/* 주소 */}
                <p className="text-xs text-[#9B9B9B] mb-3">{clinic.address}</p>

                {/* 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCall(clinic.phone)}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold border-2 border-[#E53935] text-[#E53935] active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                  >
                    📞 전화하기
                  </button>
                  <button
                    onClick={() => handleNavigate(clinic.name, clinic.address)}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold bg-[#E53935] text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                  >
                    🗺️ 길찾기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 반경 선택 */}
        {clinics.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-[#9B9B9B]">검색 범위:</span>
            {[3, 5, 10].map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  radius === r
                    ? 'bg-[#E53935] text-white'
                    : 'bg-white dark:bg-[#1a1a1a] text-[#9B9B9B] border border-[#E8E4DF] dark:border-[#2a2a2a]'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
