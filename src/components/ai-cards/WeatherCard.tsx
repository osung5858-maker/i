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

// 날짜 기반 안정적 랜덤 인덱스 — 같은 날엔 같은 문구, 날마다 달라짐
function dailyPick<T>(arr: T[]): T {
  const d = new Date()
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  return arr[seed % arr.length]
}

// ── 감성 문구 풀 ─────────────────────────────────────────
const MOOD_SUNNY = [
  '햇살이 아이처럼 방긋 웃는 날이에요',
  '구름 한 점 없는 하늘, 마음까지 맑아져요',
  '오늘 햇살은 아이 볼처럼 따스해요',
  '파란 하늘 아래 작은 모험을 떠나볼까요',
  '세상이 반짝반짝 빛나는 하루예요',
  '햇살이 살랑살랑 인사하는 기분 좋은 날',
  '하늘이 이렇게 예쁜 날, 밖에서 놀아요',
  '눈부신 하루, 아이와 함께 빛나는 시간',
  '따스한 햇볕이 온 세상을 안아주는 날',
  '오늘 같은 날엔 아이 손잡고 산책이 딱이에요',
  '맑은 하늘만큼 우리 아이 미소도 환해요',
  '바람도 햇살도 우리 편인 완벽한 하루',
  '이런 날 집에만 있긴 아까워요, 나가볼까요?',
  '햇살 가득 담은 오늘, 좋은 기억 만들어요',
  '날씨가 선물 같은 하루예요',
]

const MOOD_CLOUDY = [
  '구름이 살짝 놀러온 포근한 하루예요',
  '하늘이 부드러운 솜이불을 덮은 날',
  '은은한 하늘 아래, 사색하기 좋은 오늘',
  '햇살이 숨바꼭질하는 날, 그래도 괜찮아요',
  '흐린 하늘도 나름의 매력이 있는 법이에요',
  '구름 사이로 햇살 찾기 놀이하는 하루',
  '오늘은 하늘이 수채화 같아요',
  '잔잔한 하루, 마음도 차분히 쉬어가요',
  '살짝 흐려도 마음만은 화창하게 보내요',
  '부드러운 빛이 감싸는, 눈이 편한 하루',
  '뽀얀 하늘이 아이 뺨처럼 복슬복슬한 날',
  '구름이 그림을 그리는 하루, 올려다보세요',
  '은은한 날씨가 오히려 산책엔 딱이에요',
  '빛이 부드러워서 아이 눈이 편한 날',
  '회색빛 하늘도 들여다보면 예쁜 날이에요',
]

const MOOD_RAIN = [
  '빗소리가 자장가처럼 포근한 하루예요',
  '촉촉한 비가 세상을 씻어주는 날',
  '창밖 빗소리에 귀 기울여보는 하루',
  '비 오는 날은 집에서 보내는 시간도 특별해요',
  '톡톡톡, 빗방울이 인사하는 소리 들리나요?',
  '비가 내리면 세상이 더 싱그러워져요',
  '우산 쓴 아이 모습도 참 사랑스럽죠',
  '촉촉한 하루, 따뜻한 코코아 한 잔 어때요',
  '빗속에서 피어나는 작은 행복을 찾아보세요',
  '비 온 뒤엔 더 맑은 하늘이 기다리고 있어요',
  '주룩주룩 비 내리는 날, 아늑함이 좋은 날',
  '물웅덩이 첨벙첨벙, 아이에겐 놀이터죠',
  '비가 와도 우리 집 안은 따뜻해요',
  '세상이 촉촉해지는 날, 마음도 촉촉하게',
  '빗소리 들으며 그림책 읽기 좋은 날이에요',
]

const MOOD_SNOW = [
  '하얀 눈이 세상을 동화로 만드는 날이에요',
  '눈이 소복소복, 아이 눈이 반짝반짝',
  '겨울 왕국이 찾아온 것 같은 하루예요',
  '하얀 눈꽃이 내려앉는 포근한 날',
  '눈 내리는 창밖을 함께 바라보는 시간',
  '세상이 하얗게 변하는 마법 같은 하루',
  '눈사람 만들 생각에 벌써 설레지 않나요?',
  '폭신한 눈밭 위, 작은 발자국을 남겨보세요',
  '눈 오는 날엔 따뜻한 간식이 더 맛있어요',
  '하늘에서 솜사탕이 내리는 것 같은 날',
  '은빛 세상이 펼쳐진 특별한 하루예요',
  '눈송이처럼 하나하나 소중한 오늘',
]

const MOOD_STORM = [
  '바람이 세게 부는 날, 안전이 최우선이에요',
  '하늘이 잠깐 심술 부리는 날, 곧 그칠 거예요',
  '폭풍우 지나면 더 맑은 하늘이 와요',
  '거센 바람이 부는 날엔 집이 최고예요',
  '하늘이 잠시 화가 났나 봐요, 달래줄까요?',
  '폭풍 속에서도 우리 가족은 안전하게',
  '번쩍번쩍 천둥은 하늘의 불꽃놀이래요',
  '거친 날씨도 지나가는 법, 기다려봐요',
]

const MOOD_FOG = [
  '안개가 세상을 몽글몽글 감싸는 하루예요',
  '뿌연 안개 속, 신비로운 모험이 시작될 것 같아요',
  '안개 낀 아침, 조심조심 천천히 보내요',
  '숨바꼭질하듯 안개가 놀러온 날이에요',
  '뽀얀 안개 속에서 따뜻한 차 한 잔 어때요',
  '안개가 걷히면 더 선명한 하루가 기다려요',
  '동화 속 한 장면 같은 안개 낀 아침',
  '포근한 안개가 도시를 감싸안은 날',
]

const MOOD_HOT = [
  '태양이 펑펑! 시원한 실내가 최고예요',
  '더위 조심, 아이 수분 보충 꼭 챙겨주세요',
  '땀이 주르륵, 시원한 수박 타임이 필요해요',
  '뜨거운 햇살을 피해 그늘 속 작은 쉼터로',
  '폭염이에요, 한낮엔 실내에서 놀아요',
  '더운 날엔 물놀이가 최고죠!',
  '아이스크림이 절로 생각나는 하루예요',
  '무더위도 아이 웃음 앞에선 녹아내려요',
  '햇볕이 뜨거워요, 아이 모자 꼭 씌워주세요',
  '더운 날이지만 시원한 추억을 만들어봐요',
]

const MOOD_WARM = [
  '따끈한 날씨, 그늘에서 쉬엄쉬엄 보내요',
  '물 자주 마시며 활기차게 보내요',
  '더운 듯 따뜻한 하루, 아이 옷 가볍게',
  '선풍기 바람이 시원한 여름날이에요',
  '살짝 더운 듯한 날, 가벼운 차림이 좋아요',
  '오늘은 시원한 과일이 더 맛있는 날',
  '더위를 식혀줄 바람이 불어올 거예요',
  '아이와 함께 그늘 아래 소풍 어때요?',
]

const MOOD_COLD = [
  '꽁꽁 추운 날, 따뜻이 감싸주세요',
  '찬 바람에 뺨이 빨개지는 날이에요',
  '한파가 찾아왔어요, 외출은 잠깐만!',
  '추울수록 포옹은 따뜻해지는 법이에요',
  '손이 시려워지는 날, 주머니 속 장갑 챙기세요',
  '겨울 한가운데, 따뜻한 마음으로 버텨요',
  '매서운 추위도 가족과 함께면 녹아내려요',
  '오늘은 뜨끈한 국물 요리가 딱인 날',
]

const MOOD_CHILLY = [
  '쌀쌀한 바람, 아이 겉옷 잊지 마세요',
  '서늘한 공기가 코끝을 간질이는 하루',
  '살짝 쌀쌀해요, 따뜻한 차 한 잔 챙겨요',
  '가을바람처럼 서늘한 하루, 겹겹이 입어요',
  '바람이 제법 차요, 목도리가 있으면 좋겠어요',
  '쌀쌀한 날엔 우리 아이 볼이 빨개져요',
  '선선함이 기분 좋은 날이에요',
  '살짝 차가운 공기가 상쾌하기도 한 날',
]

const MOOD_PERFECT = [
  '이보다 완벽한 산책 날씨는 없어요!',
  '바깥 공기가 달콤한 날, 나가볼까요?',
  '바람도 햇살도 딱 좋은 황금 같은 하루',
  '놀이터가 우리를 부르는 소리 들려요',
  '이런 날 집에만 있으면 하늘이 서운해해요',
  '날씨가 선물처럼 완벽한 하루예요',
  '아이 손 잡고 어디든 걸어가고 싶은 날',
  '가을 소풍 같은 기분 좋은 날씨예요',
  '세상 모든 것이 반짝이는 산책 일화',
  '공원 벤치에 앉아 있기만 해도 좋은 날',
  '산들바람이 우리를 밖으로 불러내는 날',
  '아이도 어른도 저절로 웃음 나는 날씨예요',
]

const MOOD_DEFAULT = [
  '오늘도 도담하게, 한 걸음씩 함께해요',
  '특별하지 않아도 소중한 오늘 하루',
  '평범한 하루도 아이와 함께면 빛나요',
  '오늘 하루도 아이의 웃음으로 시작해요',
  '매일이 성장하는 우리 아이의 하루',
  '잔잔한 하루, 작은 행복을 발견해보세요',
  '아이의 눈으로 보면 세상이 달라 보여요',
  '오늘도 사랑 가득, 도담하게 보내요',
  '보통의 하루가 가장 귀한 날이에요',
  '아이와 눈 맞추는 순간이 가장 빛나요',
]

// ── 육아 팁 풀 ────────────────────────────────────────────
const TIPS_RAIN = [
  '비 올 때는 실내 키즈카페가 딱이에요',
  '창문에 그림 그리기 놀이 어때요?',
  '빗소리 들으며 함께 그림책 읽어요',
  '비 오는 날 점토 놀이, 아이가 좋아해요',
  '퍼즐이나 블록 놀이로 집콕 시간을 알차게',
  '실내에서 보물찾기 놀이 해보세요',
  '비 오는 날은 쿠키 같이 만들기 좋아요',
]

const TIPS_SNOW = [
  '눈 오는 날, 집에서 촉감 놀이 추천',
  '하얀 눈 위에 발자국 찍기 놀이 어때요?',
  '따뜻한 코코아 만들며 요리 놀이해요',
  '눈사람 만들고 따뜻한 간식 타임!',
  '눈 결정 관찰 놀이, 아이 과학 감각 Up!',
]

const TIPS_HOT = [
  '실내에서 시원하게 놀아요',
  '물놀이 매트 깔아주면 아이가 좋아해요',
  '얼음 놀이로 시원한 감각 경험을!',
  '선풍기 앞에서 종이 바람개비 돌려요',
  '시원한 과일 간식으로 수분 보충해요',
]

const TIPS_WARM = [
  '얇은 옷 + 모자로 가볍게 나서요',
  '그늘에서 비눗방울 놀이 어때요?',
  '물통 꼭 챙기고 자주 마시게 해주세요',
  '자외선 차단제 꼼꼼히 발라주세요',
]

const TIPS_COLD = [
  '외출 최소화, 실내 놀이 추천해요',
  '겉옷 + 장갑 + 목도리 세트로 무장!',
  '따뜻한 실내에서 춤추기 놀이 어때요?',
  '핫초코 만들며 따뜻한 시간 보내요',
]

const TIPS_CHILLY = [
  '겉옷 + 장갑 + 목도리 챙기세요',
  '바람이 차요, 귀마개도 있으면 좋아요',
  '따뜻한 옷 입고 짧은 산책이 좋아요',
  '아이 발이 차갈 수 있으니 양말 신겨주세요',
]

const TIPS_PERFECT = [
  '가까운 놀이터나 공원은 어때요?',
  '돗자리 펴고 미니 소풍 어때요?',
  '자전거 타기 딱 좋은 날이에요',
  '흙장난하기 좋은 날, 편한 옷 입혀요',
  '모래 놀이 세트 들고 나가볼까요?',
]

const TIPS_DEFAULT = [
  '아이와 함께 좋은 하루 보내세요',
  '오늘도 사랑 가득한 하루 되세요',
  '아이 표정 관찰하며 대화 나눠보세요',
  '잠깐이라도 함께 놀아주면 아이가 행복해해요',
  '스킨십 많이 해주면 아이 정서에 좋아요',
  '오늘 하루도 수고하는 당신, 최고의 부모예요',
]

function getBabyTip(temp: number, code: number, pm10?: number, uvIndex?: number): { suggestion: string; babyTip: string } {
  const hour = new Date().getHours()
  const tips: string[] = []
  let suggestion = ''

  // 온도 + 날씨 코드 기반 감성 문구
  if (temp >= 33) {
    suggestion = dailyPick(MOOD_HOT)
    tips.push(dailyPick(TIPS_HOT))
  } else if (temp >= 28) {
    suggestion = dailyPick(MOOD_WARM)
    tips.push(dailyPick(TIPS_WARM))
  } else if (temp <= -5) {
    suggestion = dailyPick(MOOD_COLD)
    tips.push(dailyPick(TIPS_COLD))
  } else if (temp <= 5) {
    suggestion = dailyPick(MOOD_CHILLY)
    tips.push(dailyPick(TIPS_CHILLY))
  } else if (code <= 2 && temp >= 15 && temp <= 27 && hour >= 9 && hour <= 17) {
    suggestion = dailyPick(MOOD_PERFECT)
    tips.push(dailyPick(TIPS_PERFECT))
  } else {
    suggestion = dailyPick(MOOD_DEFAULT)
  }

  // 날씨 코드별 오버라이드 — 비/눈/뇌우/안개가 온도보다 우선
  if (code >= 95) {
    suggestion = dailyPick(MOOD_STORM)
  } else if (code >= 71 && code <= 77) {
    suggestion = dailyPick(MOOD_SNOW)
    tips.push(dailyPick(TIPS_SNOW))
  } else if (code >= 51 && code <= 82) {
    suggestion = dailyPick(MOOD_RAIN)
    tips.push(dailyPick(TIPS_RAIN))
  } else if (code === 45 || code === 48) {
    suggestion = dailyPick(MOOD_FOG)
  } else if (code === 3) {
    suggestion = dailyPick(MOOD_CLOUDY)
  } else if (code <= 1 && temp >= 6 && temp < 28) {
    suggestion = dailyPick(MOOD_SUNNY)
  }

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

  return { suggestion, babyTip: tips[0] || dailyPick(TIPS_DEFAULT) }
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
