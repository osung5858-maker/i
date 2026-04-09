/**
 * 질병관리청 감염병 API 클라이언트 — 목데이터 폴백 포함
 * Endpoint: apis.data.go.kr/1790387/EIDAPIService
 * API 승인 필요 (2~5영업일) → 미승인 시 목데이터 반환
 */

import { cacheManager, CACHE_TTL } from './cache';
import type { DiseaseItem } from '../score';

const KDCA_API_KEY = process.env.KDCA_API_KEY ?? '';
const ENABLE_DISEASE_API = process.env.ENABLE_DISEASE_API === 'true';
const BASE_URL = 'https://apis.data.go.kr/1790387/EIDAPIService/EIDStatInfoList';
const TIMEOUT_MS = 3000;

export interface KdcaDiseaseResult {
  items: DiseaseItem[];
  fallback: boolean;
}

/** 대상 감염병 목록 */
const TARGET_DISEASES = [
  '수족구병',
  '인플루엔자',
  '수두',
  '노로바이러스감염증',
  'RSV감염증',
  '로타바이러스감염증',
];

/** 목데이터 — API 미승인 시 사용 */
const MOCK_DATA: DiseaseItem[] = [
  { name: '수족구병', level: 'normal' },
  { name: '인플루엔자', level: 'none' },
  { name: '수두', level: 'none' },
];

/** 캐시 키 */
function getCacheKey(sidoCd: string): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dateStr = `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(kst.getUTCDate()).padStart(2, '0')}`;
  return `kdca_disease:${sidoCd}:${dateStr}`;
}

/**
 * 감염병 데이터 조회 — API 미승인 시 목데이터 반환
 */
export async function fetchKdcaDisease(sidoCd: string): Promise<KdcaDiseaseResult> {
  const cacheKey = getCacheKey(sidoCd);
  const cached = cacheManager.get<KdcaDiseaseResult>(cacheKey);
  if (cached) return cached;

  // API 비활성 시 목데이터
  if (!ENABLE_DISEASE_API || !KDCA_API_KEY) {
    const result: KdcaDiseaseResult = { items: MOCK_DATA, fallback: true };
    cacheManager.set(cacheKey, result, CACHE_TTL.KDCA);
    return result;
  }

  try {
    const params = new URLSearchParams({
      serviceKey: KDCA_API_KEY,
      pageNo: '1',
      numOfRows: '100',
      sidoCd,
      resType: '2', // JSON
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      console.error('[KDCA] HTTP error:', res.status);
      return fallbackResult(cacheKey);
    }

    const data = await res.json();
    const items = data?.response?.body?.items;

    if (!items || !Array.isArray(items)) {
      console.warn('[KDCA] No items in response');
      return fallbackResult(cacheKey);
    }

    // 대상 감염병만 필터 + 유행도 판정
    const diseaseItems: DiseaseItem[] = [];

    for (const disease of TARGET_DISEASES) {
      const matching = items.filter(
        (item: Record<string, unknown>) =>
          typeof item.diseaseNm === 'string' && item.diseaseNm.includes(disease)
      );

      if (matching.length === 0) {
        diseaseItems.push({ name: disease, level: 'none' });
        continue;
      }

      // 최신 주차 데이터에서 건수 확인
      const latest = matching[0];
      const cases = Number(latest.caseCnt) || 0;

      // 간단한 유행도 판정 (건수 기반)
      let level: DiseaseItem['level'] = 'none';
      if (cases > 500) level = 'warning';
      else if (cases > 100) level = 'caution';
      else if (cases > 0) level = 'normal';

      diseaseItems.push({ name: disease, level });
    }

    const result: KdcaDiseaseResult = {
      items: diseaseItems.filter(i => i.level !== 'none'),
      fallback: false,
    };

    cacheManager.set(cacheKey, result, CACHE_TTL.KDCA);
    return result;
  } catch (error) {
    console.error('[KDCA] Fetch error:', error);
    return fallbackResult(cacheKey);
  }
}

function fallbackResult(cacheKey: string): KdcaDiseaseResult {
  const result: KdcaDiseaseResult = { items: MOCK_DATA, fallback: true };
  cacheManager.set(cacheKey, result, CACHE_TTL.KDCA);
  return result;
}
