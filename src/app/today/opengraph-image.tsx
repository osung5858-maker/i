import { ImageResponse } from 'next/og';

// Image metadata
export const alt = '오늘도, 맑음 — 외출 점수 한눈에';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Force dynamic rendering so the image reflects live data
export const dynamic = 'force-dynamic';

/**
 * Dynamic OG image for /today route.
 * Shows live score data for the default region (서울 강남구).
 * Social crawlers hit /today/opengraph-image — no searchParams available
 * in the file convention, so we fetch the default region score server-side.
 */
export default async function OGImage() {
  // Fetch live score from the internal API (server-side, absolute URL not needed for internal fetch)
  let score = 78;
  let grade: 'clear' | 'caution' | 'stay' = 'caution';
  let message = '조심해서 나가세요';
  let region = '서울 강남구';
  let temp = 15;
  let airGrade = '보통';

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const res = await fetch(
      `${baseUrl}/api/today/score?region=${encodeURIComponent('서울특별시_강남구')}`,
      { cache: 'no-store' },
    );
    if (res.ok) {
      const data = await res.json();
      score = data.score ?? score;
      grade = data.grade ?? grade;
      message = data.message ?? message;
      region = data.region ?? region;
      temp = data.weather?.temp ?? temp;
      airGrade = data.air?.grade ?? airGrade;
    }
  } catch {
    // Use fallback values on error
  }

  const bg = gradeBackground(grade);
  const emoji = gradeEmoji(grade);
  const dateStr = formatKST();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: 28, color: '#6B7280' }}>
            {region}
          </span>
          <span style={{ fontSize: 24, color: '#9CA3AF' }}>
            {dateStr}
          </span>
        </div>

        {/* Score circle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '220px',
            height: '220px',
            borderRadius: '110px',
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 72, fontWeight: 'bold', color: scoreColor(grade) }}>
              {score}
            </span>
            <span style={{ fontSize: 24, color: '#6B7280' }}>점</span>
          </div>
        </div>

        {/* Grade message */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '24px',
          }}
        >
          <span style={{ fontSize: 48 }}>{emoji}</span>
          <span
            style={{
              fontSize: 40,
              fontWeight: 'bold',
              color: scoreColor(grade),
            }}
          >
            {message}
          </span>
        </div>

        {/* Info pills */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          <div style={pillStyle}>
            <span style={{ fontSize: 20 }}>🌡</span>
            <span style={{ fontSize: 20, color: '#374151' }}>{temp}°C</span>
          </div>
          <div style={pillStyle}>
            <span style={{ fontSize: 20 }}>😊</span>
            <span style={{ fontSize: 20, color: '#374151' }}>PM2.5 {airGrade}</span>
          </div>
        </div>

        {/* Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '32px',
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 'bold', color: '#9CA3AF' }}>
            오늘도, 맑음
          </span>
          <span style={{ fontSize: 18, color: '#D1D5DB' }}>
            today.dodam.life
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

/* --- Helpers --- */

const pillStyle = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: '6px',
  background: 'rgba(255,255,255,0.8)',
  borderRadius: '12px',
  padding: '8px 16px',
};

function gradeBackground(grade: string): string {
  switch (grade) {
    case 'clear':   return 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #BBF7D0 100%)';
    case 'caution': return 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)';
    case 'stay':    return 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 50%, #FECACA 100%)';
    default:        return 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #BBF7D0 100%)';
  }
}

function gradeEmoji(grade: string): string {
  switch (grade) {
    case 'clear':   return '☀️';
    case 'caution': return '⛅';
    case 'stay':    return '🌧️';
    default:        return '☀️';
  }
}

function scoreColor(grade: string): string {
  switch (grade) {
    case 'clear':   return '#16A34A';
    case 'caution': return '#D97706';
    case 'stay':    return '#DC2626';
    default:        return '#16A34A';
  }
}

function formatKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  return `${m}월 ${d}일`;
}
