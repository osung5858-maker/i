'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ScoreCard from '@/components/today/ScoreCard';
import InfoRow from '@/components/today/InfoRow';
import ClothingCard from '@/components/today/ClothingCard';
import RegionSelector from '@/components/today/RegionSelector';
import ShareButton from '@/components/today/ShareButton';

/** API 응답 타입 — /api/today/score 실제 응답과 일치 */
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

const gradeGradients = {
  clear: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #BBF7D0 100%)',
  caution: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)',
  stay: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 50%, #FECACA 100%)',
};

/** 감염병 위험도 레벨 → 아이콘 매핑 */
const getLevelIcon = (level: 'none' | 'normal' | 'caution' | 'warning') => {
  switch (level) {
    case 'warning': return '🔴';
    case 'caution': return '🟡';
    case 'normal': return '🟢';
    default: return '⚪';
  }
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

  const fetchScore = useCallback(async (regionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/today/score?region=${encodeURIComponent(regionId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch score');
      }
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

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: gradeGradients.clear }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">☀️</div>
          <p className="text-lg font-semibold text-gray-700">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-5"
        style={{ background: gradeGradients.stay }}
      >
        <div className="text-center bg-white rounded-2xl p-8 max-w-sm">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            오류가 발생했습니다
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {error || '데이터를 불러올 수 없습니다'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-all duration-1000"
      style={{ background: gradeGradients[data.grade] }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="sticky top-0 z-10 bg-white/70 backdrop-blur-sm shadow-sm"
      >
        <div className="max-w-[430px] mx-auto px-5 py-4 flex items-center justify-between">
          <h1
            className="text-xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            오늘도, 맑음
          </h1>
          <RegionSelector currentRegion={region} onRegionChange={setRegion} />
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-[430px] mx-auto px-5 pb-8">
        {/* Score Card */}
        <ScoreCard score={data.score} grade={data.grade} message={data.message} />

        {/* Info Rows */}
        <div className="space-y-3 mb-6">
          <InfoRow
            icon="🌡"
            label=""
            value={`${data.weather.temp}°C (${data.weather.tempMin}~${data.weather.tempMax})`}
            rightIcon="💨"
            rightValue={data.weather.wind > 5 ? '강함' : '보통'}
            delay={0.3}
          />
          <InfoRow
            icon="😊"
            label="PM2.5"
            value={data.air.grade}
            rightIcon="☀️"
            rightLabel="UV"
            rightValue={data.uv.grade}
            delay={0.4}
          />
          {data.disease.items.length > 0 && (
            <InfoRow
              icon="🦠"
              label={data.disease.items[0]?.name || ''}
              value={getLevelIcon(data.disease.items[0]?.level || 'none')}
              rightLabel={data.disease.items[1]?.name || ''}
              rightValue={
                data.disease.items[1]
                  ? getLevelIcon(data.disease.items[1].level)
                  : undefined
              }
              delay={0.5}
            />
          )}
        </div>

        {/* Clothing Card */}
        <ClothingCard main={data.clothing.main} extras={data.clothing.extras} />

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <ShareButton />
        </div>

        {/* Update Time */}
        <p className="text-center text-xs text-gray-500 mt-4">
          마지막 업데이트:{' '}
          {new Date(data.updatedAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </main>
    </div>
  );
}
