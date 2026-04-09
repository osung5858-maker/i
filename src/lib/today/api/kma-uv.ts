/**
 * 기상청 생활기상지수 API 클라이언트 — UV Index
 * Endpoint: apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4
 * areaNo: 10자리 행정코드, time: YYYYMMDDhh
 */

import { cacheManager, CACHE_TTL } from './cache';

const KMA_API_KEY = process.env.KMA_API_KEY ?? '';
const BASE_URL = 'https://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4';
const TIMEOUT_MS = 3000;

export interface KmaUvResult {
  index: number;  // UV Index (당일 최대)
  fallback: boolean;
}

/** 발표 시각 계산 — 06:00, 18:00 발표 */
function getTimeParam(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const hours = kst.getUTCHours();
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');

  // 06시 이후면 06 발표, 그 이전이면 전날 18 발표 사용
  if (hours >= 6) {
    return `${y}${m}${d}06`;
  }
  // 전날 18시 발표
  const yesterday = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
  const yy = yesterday.getUTCFullYear();
  const ym = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const yd = String(yesterday.getUTCDate()).padStart(2, '0');
  return `${yy}${ym}${yd}18`;
}

/** 캐시 키 */
function getCacheKey(areaNo: string): string {
  const time = getTimeParam();
  return `kma_uv:${areaNo}:${time}`;
}

/**
 * UV Index 조회 — 당일 09~15시 최대값 사용
 */
export async function fetchKmaUv(areaNo: string): Promise<KmaUvResult> {
  const cacheKey = getCacheKey(areaNo);
  const cached = cacheManager.get<KmaUvResult>(cacheKey);
  if (cached) return cached;

  try {
    const time = getTimeParam();
    const params = new URLSearchParams({
      serviceKey: KMA_API_KEY,
      areaNo,
      time,
      dataType: 'JSON',
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      console.error('[KMA UV] HTTP error:', res.status);
      return createFallback();
    }

    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('[KMA UV] No items in response');
      return createFallback();
    }

    const item = items[0];

    // h0 ~ h24 (3시간 단위) 중 09~15시 범위의 최대값
    // h0=금일0시, h3=금일3시, h6=금일6시, h9=금일9시, h12=금일12시, h15=금일15시...
    const dayTimeKeys = ['h9', 'h12', 'h15'] as const;
    let maxUv = 0;

    for (const key of dayTimeKeys) {
      const val = Number(item[key]);
      if (!isNaN(val) && val > maxUv) {
        maxUv = val;
      }
    }

    // 만약 daytime 값 없으면 h0 등 다른 키도 확인
    if (maxUv === 0) {
      for (let i = 0; i <= 24; i += 3) {
        const key = `h${i}`;
        const val = Number(item[key]);
        if (!isNaN(val) && val > maxUv) {
          maxUv = val;
        }
      }
    }

    const result: KmaUvResult = {
      index: maxUv,
      fallback: false,
    };

    cacheManager.set(cacheKey, result, CACHE_TTL.KMA_UV);
    return result;
  } catch (error) {
    console.error('[KMA UV] Fetch error:', error);
    return createFallback();
  }
}

function createFallback(): KmaUvResult {
  return { index: 0, fallback: true };
}
