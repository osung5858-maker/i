'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import ScoreCard from '@/components/today/ScoreCard';
import { InfoCard, InfoGrid } from '@/components/today/InfoRow';
import ClothingCard from '@/components/today/ClothingCard';
import RegionSelector from '@/components/today/RegionSelector';
import ShareButton from '@/components/today/ShareButton';
import { trackEvent } from '@/lib/today/analytics';
import { findNearestRegion } from '@/lib/today/regions';

interface ScoreData {
  score: number;
  grade: 'clear' | 'caution' | 'stay';
  message: string;
  air: {
    pm25: number | null;
    pm10: number | null;
    grade: string;
    score: number;
    fallback?: boolean;
  };
  weather: {
    temp: number;
    tempMin: number;
    tempMax: number;
    rain: number;
    wind: number;
    sky: string;
    score: number;
    fallback?: boolean;
  };
  uv: {
    index: number;
    grade: string;
    score: number;
    fallback?: boolean;
  };
  disease: {
    items: Array<{ name: string; level: 'none' | 'normal' | 'caution' | 'warning' }>;
    score: number;
    fallback?: boolean;
  };
  clothing: {
    main: string;
    extras: string[];
  };
  region: string;
  updatedAt: string;
  cacheHit?: boolean;
  executionTime?: number;
}

/** 감염병 레벨 → 한국어 라벨 */
const levelToLabel = (level: string): string => {
  switch (level) {
    case 'warning': return '주의';
    case 'caution': return '관심';
    case 'normal': return '안전';
    default: return '정보없음';
  }
};

/** PM2.5 등급 → 상태 */
const airGradeToStatus = (grade: string): 'good' | 'moderate' | 'bad' | 'neutral' => {
  if (grade.includes('좋') || grade === '좋음') return 'good';
  if (grade.includes('보통')) return 'moderate';
  if (grade.includes('나쁨') || grade.includes('매우')) return 'bad';
  return 'neutral';
};

/** UV 등급 → 상태 */
const uvGradeToStatus = (grade: string): 'good' | 'moderate' | 'bad' | 'neutral' => {
  if (grade.includes('낮') || grade === '낮음') return 'good';
  if (grade.includes('보통')) return 'moderate';
  if (grade.includes('높') || grade.includes('매우') || grade.includes('위험')) return 'bad';
  return 'neutral';
};

/** 바람 세기 → 상태 */
const windToStatus = (wind: number): 'good' | 'moderate' | 'bad' => {
  if (wind <= 3) return 'good';
  if (wind <= 7) return 'moderate';
  return 'bad';
};

/** 오늘 날짜 포맷 */
const formatDate = () => {
  const now = new Date();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${now.getMonth() + 1}월 ${now.getDate()}일 ${weekdays[now.getDay()]}요일`;
};

export default function TodayPage() {
  const [region, setRegion] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('today_region') || '서울특별시_강남구';
    }
    return '서울특별시_강남구';
  });
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prevRegionRef = useRef(region);

  // GPS 위치 자동감지 — localStorage에 저장된 값이 없을 때만
  useEffect(() => {
    const saved = localStorage.getItem('today_region');
    if (saved) return; // 이미 수동 선택한 적 있으면 스킵

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestRegion(pos.coords.latitude, pos.coords.longitude);
        const regionParam = nearest.name.replace(/ /g, '_');
        setRegion(regionParam);
        localStorage.setItem('today_region', regionParam);
        trackEvent('gps_detected', { region: regionParam });
      },
      () => {
        // 권한 거부 시 기본값 유지
      },
      { timeout: 5000, maximumAge: 600000 },
    );
  }, []);

  useEffect(() => {
    trackEvent('page_view', { page: 'today', region });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevRegionRef.current !== region) {
      trackEvent('region_change', { from: prevRegionRef.current, to: region });
      prevRegionRef.current = region;
    }
  }, [region]);

  const fetchScore = useCallback(async (regionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/today/score?region=${encodeURIComponent(regionId)}`);
      if (!response.ok) throw new Error('Failed to fetch score');
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore(region);
  }, [region, fetchScore]);

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-sky-50 to-white">
        <div className="text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-12 h-12 mx-auto mb-5 rounded-2xl bg-blue-500/10 flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-500">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </motion.div>
          <p className="text-[15px] font-medium text-slate-400 tracking-tight">날씨 정보를 불러오는 중</p>
          <div className="mt-4 w-40 h-0.5 bg-slate-100 rounded-full overflow-hidden mx-auto">
            <motion.div
              className="h-full bg-blue-400 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-b from-slate-50 to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white rounded-2xl p-8 max-w-sm shadow-sm border border-slate-100"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-400">
              <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">
            데이터를 불러올 수 없어요
          </h2>
          <p className="text-sm text-slate-400 mb-5 leading-relaxed">
            {error || '일시적인 문제가 발생했습니다'}
          </p>
          <button
            onClick={() => fetchScore(region)}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 active:scale-[0.98] transition-all"
          >
            다시 시도
          </button>
        </motion.div>
      </div>
    );
  }

  /* ─── Categories for ScoreCard breakdown ─── */
  const categories = [
    { label: '대기질', icon: '😷', score: data.air.score, maxScore: 35 },
    { label: '날씨', icon: '🌡️', score: data.weather.score, maxScore: 30 },
    { label: '자외선', icon: '☀️', score: data.uv.score, maxScore: 15 },
    { label: '감염병', icon: '🦠', score: data.disease.score, maxScore: 20 },
  ];

  /* ─── Main disease item ─── */
  const mainDisease = data.disease.items[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/80 via-sky-50/40 to-slate-50/30 transition-all duration-700">
      {/* ─── Header ─── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-slate-100/60"
      >
        <div className="max-w-[430px] lg:max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-slate-800 tracking-tight leading-tight">
              오늘도, 맑음
            </h1>
            <p className="text-[13px] lg:text-sm text-slate-400 lg:text-slate-500 font-medium mt-0.5">{formatDate()}</p>
          </div>
          <RegionSelector currentRegion={region} onRegionChange={setRegion} />
        </div>
      </motion.header>

      {/* ─── Main Content ─── */}
      <main className="max-w-[430px] lg:max-w-4xl mx-auto px-4 pb-8 pt-4">

        {/* Desktop: 2-column layout / Mobile: single column */}
        <div className="lg:grid lg:grid-cols-5 lg:gap-6">

          {/* Left column — Score Card + Share (sticky on desktop) */}
          <div className="lg:col-span-2 lg:sticky lg:top-[60px] lg:self-start">
            <ScoreCard
              score={data.score}
              grade={data.grade}
              message={data.message}
              categories={categories}
            />
            <div className="hidden lg:block mt-4">
              <ShareButton region={region} score={data.score} message={data.message} />
            </div>
          </div>

          {/* Right column — Detail cards */}
          <div className="lg:col-span-3">

            {/* ─── Detail Info Grid ─── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 lg:mt-0"
            >
              <p className="text-[13px] lg:text-sm font-semibold text-slate-400 lg:text-slate-500 tracking-wider mb-3 px-0.5">
                상세 정보
              </p>
              <InfoGrid>
                <InfoCard
                  icon="🌡️"
                  label="기온"
                  value={`${data.weather.temp}°C`}
                  sub={`최저 ${data.weather.tempMin}° / 최고 ${data.weather.tempMax}°`}
                  status={data.weather.temp >= 10 && data.weather.temp <= 26 ? 'good' : data.weather.temp >= 5 ? 'moderate' : 'bad'}
                  delay={0.5}
                />
                <InfoCard
                  icon="😷"
                  label="미세먼지"
                  value={data.air.pm25 !== null ? `${data.air.pm25}㎍/㎥` : data.air.grade}
                  sub={data.air.pm25 !== null ? data.air.grade : undefined}
                  status={airGradeToStatus(data.air.grade)}
                  delay={0.55}
                />
                <InfoCard
                  icon="☀️"
                  label="자외선"
                  value={data.uv.grade}
                  sub={`지수 ${data.uv.index}`}
                  status={uvGradeToStatus(data.uv.grade)}
                  delay={0.6}
                />
                <InfoCard
                  icon="💨"
                  label="바람"
                  value={`${data.weather.wind}m/s`}
                  sub={data.weather.wind <= 3 ? '약함' : data.weather.wind <= 7 ? '보통' : '강함'}
                  status={windToStatus(data.weather.wind)}
                  delay={0.65}
                />
              </InfoGrid>
            </motion.div>

            {/* ─── Disease Alert (conditional) ─── */}
            {mainDisease && mainDisease.level !== 'none' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.3 }}
                className="mt-4 bg-white/80 backdrop-blur-sm rounded-2xl p-4 lg:p-5 shadow-sm border border-slate-100/60"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <span className="text-base lg:text-lg">🦠</span>
                  </div>
                  <p className="text-[15px] lg:text-base font-semibold text-slate-700">감염병 현황</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.disease.items.map((item, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] lg:text-sm font-medium border ${
                        item.level === 'warning'
                          ? 'bg-rose-50 text-rose-600 border-rose-200/60'
                          : item.level === 'caution'
                            ? 'bg-amber-50 text-amber-600 border-amber-200/60'
                            : 'bg-blue-50 text-blue-600 border-blue-200/60'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.level === 'warning' ? 'bg-rose-400'
                        : item.level === 'caution' ? 'bg-amber-400'
                        : 'bg-blue-400'
                      }`} />
                      {item.name} · {levelToLabel(item.level)}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Clothing Card ─── */}
            <div className="mt-4">
              <ClothingCard
                main={data.clothing.main}
                extras={data.clothing.extras}
                temp={data.weather.temp}
              />
            </div>

            {/* ─── Share Button (mobile only) ─── */}
            <div className="mt-6 lg:hidden">
              <ShareButton region={region} score={data.score} message={data.message} />
            </div>

          </div>
        </div>

        {/* ─── Footer ─── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-8 pb-6 text-center space-y-2.5"
        >
          <p className="text-[13px] lg:text-sm text-slate-400">
            마지막 업데이트{' '}
            {new Date(data.updatedAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="text-[12px] lg:text-[13px] text-slate-300 lg:text-slate-400">
            by 도담 · today.dodam.life
          </p>
          <div className="pt-3 border-t border-slate-100/40">
            <p className="text-[11px] lg:text-[12px] text-slate-300 lg:text-slate-400 leading-relaxed">
              대기질: 한국환경공단 에어코리아 · 날씨: 기상청 단기예보
            </p>
          </div>
        </motion.footer>
      </main>
    </div>
  );
}
