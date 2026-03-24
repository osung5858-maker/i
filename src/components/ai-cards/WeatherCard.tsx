'use client'

import { useState, useEffect } from 'react'

interface WeatherData {
  temp: number
  condition: string
  icon: string
  suggestion: string
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    // 간이 날씨 (시간대 기반 시뮬레이션 — 추후 기상청 API 연동)
    const hour = new Date().getHours()
    const month = new Date().getMonth() + 1

    let temp = 20
    if (month >= 6 && month <= 8) temp = 28 + Math.floor(Math.random() * 5)
    else if (month >= 11 || month <= 2) temp = -2 + Math.floor(Math.random() * 10)
    else temp = 12 + Math.floor(Math.random() * 8)

    const conditions = [
      { condition: '맑음', icon: '☀️', threshold: 0.6 },
      { condition: '흐림', icon: '☁️', threshold: 0.8 },
      { condition: '비', icon: '🌧️', threshold: 1.0 },
    ]
    const rand = Math.random()
    const c = conditions.find((x) => rand <= x.threshold) || conditions[0]

    let suggestion = ''
    if (temp >= 30) suggestion = '무더위 주의! 실내 놀이를 추천해요.'
    else if (temp <= 0) suggestion = '영하예요. 따뜻하게 입고 나가세요.'
    else if (c.condition === '비') suggestion = '비 오는 날, 실내 키즈카페는 어때요?'
    else if (hour >= 10 && hour <= 16 && c.condition === '맑음') suggestion = '산책하기 좋은 날이에요! 🌿'
    else suggestion = '오늘도 도담하게 보내세요.'

    setWeather({ temp, condition: c.condition, icon: c.icon, suggestion })
  }, [])

  if (!weather) return null

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECECEC]">
      <span className="text-2xl">{weather.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-[#212124]">{weather.temp}°C</span>
          <span className="text-[12px] text-[#6B6966]">{weather.condition}</span>
        </div>
        <p className="text-[12px] text-[#6B6966] mt-0.5">{weather.suggestion}</p>
      </div>
    </div>
  )
}
