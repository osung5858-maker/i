/**
 * 기상청 단기예보 API 클라이언트 — 기온/강수/바람/하늘상태
 * Endpoint: apis.data.go.kr/1360000/VilageFcstInfoService_2.0
 * 격자 좌표 (nx, ny) 필요, base_time 계산 로직 포함
 */

import { cacheManager, CACHE_TTL } from './cache';

const KMA_API_KEY = process.env.KMA_API_KEY ?? '';
const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
const TIMEOUT_MS = 3000;

export interface KmaForecastResult {
  temp: number;       // 현재 기온
  tempMin: number;    // 최저 기온
  tempMax: number;    // 최고 기온
  rain: number;       // 강수확률 (%)
  wind: number;       // 풍속 (m/s)
  sky: string;        // 하늘상태 텍스트
  pty: string;        // 강수형태 텍스트
  fallback: boolean;
}

const SKY_MAP: Record<string, string> = {
  '1': '맑음',
  '3': '구름많음',
  '4': '흐림',
};

const PTY_MAP: Record<string, string> = {
  '0': '없음',
  '1': '비',
  '2': '비/눈',
  '3': '눈',
  '4': '소나기',
};

/**
 * base_time 계산 — 기상청 단기예보 발표 시각
 * 발표시각: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
 * API 제공 시각: 발표 후 약 10분 (02:10, 05:10 ...)
 */
function getBaseDateTime(): { baseDate: string; baseTime: string } {
  const now = new Date();
  // KST (UTC+9)
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hours = kst.getUTCHours();
  const minutes = kst.getUTCMinutes();

  const baseTimes = [23, 20, 17, 14, 11, 8, 5, 2];
  let baseTime = '0200';
  let dateOffset = 0;

  for (const bt of baseTimes) {
    // 발표 시각 + 10분 후부터 사용 가능
    if (hours > bt || (hours === bt && minutes >= 10)) {
      baseTime = String(bt).padStart(2, '0') + '00';
      break;
    }
    if (bt === 2) {
      // 02:10 이전이면 전날 23:00 발표 사용
      baseTime = '2300';
      dateOffset = -1;
    }
  }

  const baseDate = new Date(kst.getTime() + dateOffset * 24 * 60 * 60 * 1000);
  const y = baseDate.getUTCFullYear();
  const m = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(baseDate.getUTCDate()).padStart(2, '0');

  return { baseDate: `${y}${m}${d}`, baseTime };
}

/** 캐시 키 */
function getCacheKey(nx: number, ny: number): string {
  const { baseDate, baseTime } = getBaseDateTime();
  return `kma_forecast:${nx}_${ny}:${baseDate}${baseTime}`;
}

/**
 * 기상청 단기예보 데이터 조회
 */
export async function fetchKmaForecast(nx: number, ny: number): Promise<KmaForecastResult> {
  const cacheKey = getCacheKey(nx, ny);
  const cached = cacheManager.get<KmaForecastResult>(cacheKey);
  if (cached) return cached;

  try {
    const { baseDate, baseTime } = getBaseDateTime();

    const params = new URLSearchParams({
      serviceKey: KMA_API_KEY,
      numOfRows: '300',
      pageNo: '1',
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: String(nx),
      ny: String(ny),
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      console.error('[KMA Forecast] HTTP error:', res.status);
      return createFallback();
    }

    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('[KMA Forecast] No items in response');
      return createFallback();
    }

    // 오늘 날짜 데이터에서 카테고리별 추출
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = `${kstNow.getUTCFullYear()}${String(kstNow.getUTCMonth() + 1).padStart(2, '0')}${String(kstNow.getUTCDate()).padStart(2, '0')}`;
    const currentHour = String(kstNow.getUTCHours()).padStart(2, '0') + '00';

    // 현재 시간에 가장 가까운 데이터 추출
    let temp = 15, rain = 0, wind = 0, sky = '1', pty = '0';
    let tempMin = 99, tempMax = -99;
    let foundTmp = false;

    for (const item of items) {
      const cat = item.category;
      const val = item.fcstValue;
      const fcstDate = item.fcstDate;
      const fcstTime = item.fcstTime;

      if (fcstDate !== todayStr) continue;

      // 현재 시각에 가장 가까운 TMP 값
      if (cat === 'TMP' && !foundTmp && fcstTime >= currentHour) {
        temp = Number(val) || 15;
        foundTmp = true;
      }

      // 최저/최고 기온
      if (cat === 'TMN') tempMin = Math.min(tempMin, Number(val) || 99);
      if (cat === 'TMX') tempMax = Math.max(tempMax, Number(val) || -99);

      // 강수확률 — 하루 중 최대값
      if (cat === 'POP') rain = Math.max(rain, Number(val) || 0);

      // 풍속 — 현재 시각 근처
      if (cat === 'WSD' && fcstTime >= currentHour && wind === 0) {
        wind = Number(val) || 0;
      }

      // 하늘 상태 — 현재 시각 근처
      if (cat === 'SKY' && fcstTime >= currentHour && sky === '1') {
        sky = val;
      }

      // 강수 형태
      if (cat === 'PTY' && fcstTime >= currentHour && pty === '0') {
        pty = val;
      }
    }

    // TMN/TMX가 없을 수 있음 (base_time에 따라)
    if (tempMin === 99) tempMin = temp - 5;
    if (tempMax === -99) tempMax = temp + 5;

    const result: KmaForecastResult = {
      temp,
      tempMin,
      tempMax,
      rain,
      wind,
      sky: SKY_MAP[sky] ?? '맑음',
      pty: PTY_MAP[pty] ?? '없음',
      fallback: false,
    };

    cacheManager.set(cacheKey, result, CACHE_TTL.KMA_FORECAST);
    return result;
  } catch (error) {
    console.error('[KMA Forecast] Fetch error:', error);
    return createFallback();
  }
}

function createFallback(): KmaForecastResult {
  return {
    temp: 15,
    tempMin: 10,
    tempMax: 20,
    rain: 0,
    wind: 0,
    sky: '맑음',
    pty: '없음',
    fallback: true,
  };
}
