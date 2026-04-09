/**
 * 에어코리아 API 클라이언트 — PM2.5/PM10 대기오염 정보
 * Endpoint: apis.data.go.kr/B552584/ArpltnInforInqireSvc
 * ver=1.3 필수 (PM2.5 포함), stationName URL 인코딩, "-" 값 처리
 */

import { cacheManager, CACHE_TTL } from './cache';

const AIRKOREA_API_KEY = process.env.AIRKOREA_API_KEY ?? '';
const BASE_URL = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
const TIMEOUT_MS = 3000;

export interface AirKoreaResult {
  pm25: number | null;
  pm10: number | null;
  pm25Grade: string | null;
  pm10Grade: string | null;
  dataTime: string | null;
  fallback: boolean;
}

const GRADE_MAP: Record<string, string> = {
  '1': '좋음',
  '2': '보통',
  '3': '나쁨',
  '4': '매우나쁨',
};

/** "-" 또는 비정상 값 → null 변환 */
function parseValue(val: string | undefined | null): number | null {
  if (!val || val === '-' || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

/** 캐시 키 생성 */
function getCacheKey(stationName: string): string {
  const now = new Date();
  const hour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  return `airkorea:${stationName}:${hour}`;
}

/**
 * 에어코리아 측정소별 실시간 대기오염 데이터 조회
 */
export async function fetchAirKorea(stationName: string): Promise<AirKoreaResult> {
  // 캐시 확인
  const cacheKey = getCacheKey(stationName);
  const cached = cacheManager.get<AirKoreaResult>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      serviceKey: AIRKOREA_API_KEY,
      returnType: 'json',
      numOfRows: '1',
      pageNo: '1',
      stationName,
      dataTerm: 'DAILY',
      ver: '1.3',
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      console.error('[AirKorea] HTTP error:', res.status);
      return createFallback();
    }

    const data = await res.json();
    const items = data?.response?.body?.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('[AirKorea] No items in response');
      return createFallback();
    }

    const item = items[0];
    const result: AirKoreaResult = {
      pm25: parseValue(item.pm25Value),
      pm10: parseValue(item.pm10Value),
      pm25Grade: GRADE_MAP[item.pm25Grade] ?? null,
      pm10Grade: GRADE_MAP[item.pm10Grade] ?? null,
      dataTime: item.dataTime ?? null,
      fallback: false,
    };

    cacheManager.set(cacheKey, result, CACHE_TTL.AIRKOREA);
    return result;
  } catch (error) {
    console.error('[AirKorea] Fetch error:', error);
    return createFallback();
  }
}

function createFallback(): AirKoreaResult {
  return {
    pm25: null,
    pm10: null,
    pm25Grade: null,
    pm10Grade: null,
    dataTime: null,
    fallback: true,
  };
}
