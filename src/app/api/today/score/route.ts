/**
 * /api/today/score — 통합 외출 점수 API
 * 4개 API 병렬 호출 → 점수 계산 → 옷차림 추천 → 통합 응답
 *
 * GET /api/today/score?region=서울특별시_강남구
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveRegion } from '@/lib/today/regions';
import { fetchAirKorea } from '@/lib/today/api/airkorea';
import { fetchKmaForecast } from '@/lib/today/api/kma-forecast';
import { fetchKmaUv } from '@/lib/today/api/kma-uv';
import { fetchKdcaDisease } from '@/lib/today/api/kdca-disease';
import { calculateScore } from '@/lib/today/score';
import { recommendClothing } from '@/lib/today/clothing';
import { cacheManager, CACHE_TTL } from '@/lib/today/api/cache';

/** 통합 점수 캐시 키 */
function getScoreCacheKey(regionName: string): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const hour = `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(kst.getUTCDate()).padStart(2, '0')}${String(kst.getUTCHours()).padStart(2, '0')}`;
  return `today_score:${regionName}:${hour}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionParam = searchParams.get('region');
    const noCache = searchParams.get('nocache') === '1';

    if (!regionParam) {
      return NextResponse.json(
        { error: 'MISSING_REGION', message: '지역을 선택해주세요.', code: 400 },
        { status: 400 },
      );
    }

    // 지역 매핑 조회
    const regionName = regionParam.replace(/_/g, ' ');
    const region = resolveRegion(regionParam) ?? resolveRegion(regionName);
    if (!region) {
      return NextResponse.json(
        { error: 'INVALID_REGION', message: '지원하지 않는 지역입니다.', code: 400 },
        { status: 400 },
      );
    }

    // 통합 캐시 확인
    const scoreCacheKey = getScoreCacheKey(region.id);
    if (!noCache) {
      const cached = cacheManager.get<Record<string, unknown>>(scoreCacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, cacheHit: true }, {
          headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' },
        });
      }
    }

    // 4개 API 병렬 호출 (Promise.allSettled로 개별 실패 허용)
    const startTime = Date.now();
    const [airResult, forecastResult, uvResult, diseaseResult] = await Promise.allSettled([
      fetchAirKorea(region.stationName),
      fetchKmaForecast(region.nx, region.ny),
      fetchKmaUv(region.areaNo),
      fetchKdcaDisease(region.sidoCd),
    ]);

    // 개별 결과 추출 (실패 시 폴백)
    const air = airResult.status === 'fulfilled'
      ? airResult.value
      : { pm25: null, pm10: null, pm25Grade: null, pm10Grade: null, dataTime: null, fallback: true };

    const forecast = forecastResult.status === 'fulfilled'
      ? forecastResult.value
      : { temp: 15, tempMin: 10, tempMax: 20, rain: 0, wind: 0, sky: '맑음', pty: '없음', fallback: true };

    const uv = uvResult.status === 'fulfilled'
      ? uvResult.value
      : { index: 0, fallback: true };

    const disease = diseaseResult.status === 'fulfilled'
      ? diseaseResult.value
      : { items: [], fallback: true };

    // 점수 계산
    const scoreResult = calculateScore(
      { pm25: air.pm25, pm10: air.pm10 },
      {
        temp: forecast.temp,
        tempMin: forecast.tempMin,
        tempMax: forecast.tempMax,
        rain: forecast.rain,
        wind: forecast.wind,
        sky: forecast.sky,
      },
      { index: uv.index },
      { items: disease.items },
    );

    // 옷차림 추천
    const clothing = recommendClothing({
      temp: forecast.temp,
      tempMin: forecast.tempMin,
      tempMax: forecast.tempMax,
      rain: forecast.rain,
      wind: forecast.wind,
      uvIndex: uv.index,
    });

    const executionTime = Date.now() - startTime;

    // 응답 조립
    const response = {
      score: scoreResult.total,
      grade: scoreResult.grade,
      message: scoreResult.message,
      air: {
        pm25: air.pm25,
        pm10: air.pm10,
        grade: scoreResult.breakdown.air.grade,
        score: scoreResult.breakdown.air.score,
        fallback: air.fallback,
      },
      weather: {
        temp: forecast.temp,
        tempMin: forecast.tempMin,
        tempMax: forecast.tempMax,
        rain: forecast.rain,
        wind: forecast.wind,
        sky: forecast.sky,
        score: scoreResult.breakdown.weather.score,
        fallback: forecast.fallback,
      },
      uv: {
        index: uv.index,
        grade: scoreResult.breakdown.uv.grade,
        score: scoreResult.breakdown.uv.score,
        fallback: uv.fallback,
      },
      disease: {
        items: disease.items,
        score: scoreResult.breakdown.disease.score,
        fallback: disease.fallback,
      },
      clothing,
      region: region.name,
      updatedAt: new Date().toISOString(),
      cacheHit: false,
      executionTime,
    };

    // 통합 캐시 저장
    cacheManager.set(scoreCacheKey, response, CACHE_TTL.SCORE);

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('[Score API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: '외부 API 호출 실패',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 500,
      },
      { status: 500 },
    );
  }
}
