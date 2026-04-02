'use client'

import { useState, useEffect } from 'react'
import { SunIcon, MoonIcon, ThermometerIcon } from '@/components/ui/Icons'

interface WeatherData {
  temp: number
  feelsLike: number
  condition: string
  iconType: string
  humidity: number
  pm10?: number
  pm25?: number
  uvIndex?: number
  suggestion: string
  babyTip: string
}

const WEATHER_CODES: Record<number, { condition: string; iconType: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog' }> = {
  0: { condition: '맑음', iconType: 'sun' },
  1: { condition: '대체로 맑음', iconType: 'sun' },
  2: { condition: '구름 조금', iconType: 'cloud' },
  3: { condition: '흐림', iconType: 'cloud' },
  45: { condition: '안개', iconType: 'fog' },
  48: { condition: '안개', iconType: 'fog' },
  51: { condition: '이슬비', iconType: 'rain' },
  53: { condition: '이슬비', iconType: 'rain' },
  55: { condition: '이슬비', iconType: 'rain' },
  61: { condition: '비', iconType: 'rain' },
  63: { condition: '비', iconType: 'rain' },
  65: { condition: '폭우', iconType: 'storm' },
  71: { condition: '눈', iconType: 'snow' },
  73: { condition: '눈', iconType: 'snow' },
  75: { condition: '폭설', iconType: 'snow' },
  80: { condition: '소나기', iconType: 'rain' },
  81: { condition: '소나기', iconType: 'rain' },
  82: { condition: '폭우', iconType: 'storm' },
  95: { condition: '뇌우', iconType: 'storm' },
}

function WeatherSvgIcon({ type, className = 'w-7 h-7' }: { type: string; className?: string }) {
  switch (type) {
    case 'sun': return <SunIcon className={className} />
    case 'cloud': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    )
    case 'rain': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /><line x1="8" y1="19" x2="8" y2="21" /><line x1="12" y1="19" x2="12" y2="21" /><line x1="16" y1="19" x2="16" y2="21" />
      </svg>
    )
    case 'snow': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /><path d="M8 18l.5 1" /><path d="M12 18l.5 1" /><path d="M16 18l.5 1" />
      </svg>
    )
    case 'storm': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /><polyline points="13 16 11 20 15 20 13 24" />
      </svg>
    )
    case 'fog': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /><line x1="4" y1="16" x2="20" y2="16" /><line x1="6" y1="20" x2="18" y2="20" />
      </svg>
    )
    default: return <ThermometerIcon className={className} />
  }
}

function getBabyTip(temp: number, code: number, pm10?: number, uvIndex?: number): { suggestion: string; babyTip: string } {
  const hour = new Date().getHours()
  const tips: string[] = []
  let suggestion = ''

  // 온도 기반
  if (temp >= 33) {
    suggestion = '폭염 주의! 외출을 자제해주세요.'
    tips.push('실내에서 시원하게 놀아요')
  } else if (temp >= 28) {
    suggestion = '더운 날이에요. 수분 보충에 신경 쓰세요.'
    tips.push('얇은 옷 + 모자 필수')
  } else if (temp <= -5) {
    suggestion = '한파 주의! 외출 시 보온에 신경 쓰세요.'
    tips.push('외출 최소화, 실내 놀이 추천')
  } else if (temp <= 5) {
    suggestion = '쌀쌀해요. 따뜻하게 입고 나가세요.'
    tips.push('겉옷 + 장갑 + 목도리')
  } else if (code <= 2 && temp >= 15 && temp <= 27 && hour >= 9 && hour <= 17) {
    suggestion = '산책하기 좋은 날이에요!'
    tips.push('가까운 놀이터나 공원은 어때요?')
  } else {
    suggestion = '오늘도 도담하게 보내세요.'
  }

  // 비/눈
  if (code >= 51 && code <= 67) tips.push('비 올 때는 실내 키즈카페가 딱이에요')
  if (code >= 71 && code <= 77) tips.push('눈 오는 날, 집에서 촉감 놀이 추천')

  // 미세먼지
  if (pm10 && pm10 > 80) {
    tips.unshift('미세먼지 나쁨 — 외출 자제, 공기청정기 ON')
  } else if (pm10 && pm10 > 50) {
    tips.unshift('미세먼지 보통 — 장시간 외출은 피해요')
  }

  // 자외선
  if (uvIndex && uvIndex >= 8) {
    tips.push('자외선 매우 강함 — 외출 시 선크림 필수')
  } else if (uvIndex && uvIndex >= 6) {
    tips.push('자외선 강함 — 모자 착용 추천')
  }

  return { suggestion, babyTip: tips[0] || '아이와 함께 좋은 하루 보내세요' }
}

function getPm10Level(pm10: number): { label: string; color: string } {
  if (pm10 <= 30) return { label: '좋음', color: '#2D7A4A' }
  if (pm10 <= 50) return { label: '보통', color: '#C4A35A' }
  if (pm10 <= 100) return { label: '나쁨', color: '#D08068' }
  return { label: '매우나쁨', color: '#D05050' }
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchWeather(lat: number, lon: number) {
      try {
        // Open-Meteo API (무료, API 키 불필요)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&daily=uv_index_max&timezone=Asia/Seoul&forecast_days=1`
        const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5`

        const [weatherRes, airRes] = await Promise.all([
          fetch(weatherUrl),
          fetch(airUrl).catch(() => null),
        ])

        if (!weatherRes.ok) throw new Error('Weather API failed')

        const weatherData = await weatherRes.json()
        const airData = airRes?.ok ? await airRes.json() : null

        const temp = Math.round(weatherData.current.temperature_2m)
        const feelsLike = Math.round(weatherData.current.apparent_temperature)
        const code = weatherData.current.weather_code
        const humidity = weatherData.current.relative_humidity_2m
        const uvIndex = weatherData.daily?.uv_index_max?.[0]
        const pm10 = airData?.current?.pm10
        const pm25 = airData?.current?.pm2_5

        const weatherInfo = WEATHER_CODES[code] || { condition: '알 수 없음', iconType: 'sun' }
        const { suggestion, babyTip } = getBabyTip(temp, code, pm10, uvIndex)

        setWeather({
          temp,
          feelsLike,
          condition: weatherInfo.condition,
          iconType: weatherInfo.iconType,
          humidity,
          pm10: pm10 ? Math.round(pm10) : undefined,
          pm25: pm25 ? Math.round(pm25) : undefined,
          uvIndex: uvIndex ? Math.round(uvIndex) : undefined,
          suggestion,
          babyTip,
        })
      } catch {
        fallback()
      }
    }

    function fallback() {
      // 위치/API 실패 시 서울 기본
      fetchWeather(37.5665, 126.978).catch(() => setError(true))
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fallback(),
        { timeout: 5000 }
      )
    } else {
      fallback()
    }
  }, [])

  if (error || !weather) return null

  const pm10Info = weather.pm10 ? getPm10Level(weather.pm10) : null

  return (
    <div className="mx-4 mb-3 p-3.5 rounded-2xl bg-white border border-[#ECECEC]">
      <div className="flex items-center gap-3">
        <WeatherSvgIcon type={weather.iconType} className="w-7 h-7 text-secondary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-subtitle text-primary">{weather.temp}°C</span>
            <span className="text-body text-tertiary">체감 {weather.feelsLike}°C</span>
            <span className="text-body text-secondary">{weather.condition}</span>
          </div>
          <p className="text-body text-[#4A4744] mt-0.5 font-medium">{weather.suggestion}</p>
        </div>
      </div>

      {/* 하단 태그들 */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {pm10Info && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-medium" style={{ backgroundColor: `${pm10Info.color}15`, color: pm10Info.color }}>
            미세먼지 {pm10Info.label}
          </span>
        )}
        {weather.uvIndex !== undefined && weather.uvIndex >= 6 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-medium bg-[#FEF3E8] text-[#D08068]">
            UV {weather.uvIndex} {weather.uvIndex >= 8 ? '매우강함' : '강함'}
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-medium bg-[#F0F4FF] text-[#4A6FA5]">
          습도 {weather.humidity}%
        </span>
      </div>

      {/* 육아 맞춤 팁 */}
      <p className="text-caption text-[#7A7672] mt-2 pl-0.5">
        {weather.babyTip}
      </p>
    </div>
  )
}
