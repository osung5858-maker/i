/**
 * 외출 점수 계산 엔진 — 100점 체계
 * 대기질(35) + 날씨(30: 기온15+강수10+바람5) + UV(15) + 감염병(20)
 */

export interface AirData {
  pm25: number | null;
  pm10: number | null;
}

export interface WeatherData {
  temp: number;
  tempMin: number;
  tempMax: number;
  rain: number;   // 강수확률 %
  wind: number;   // 풍속 m/s
  sky: string;    // 하늘상태 텍스트
}

export interface UvData {
  index: number;
}

export interface DiseaseItem {
  name: string;
  level: 'none' | 'normal' | 'caution' | 'warning';
}

export interface DiseaseData {
  items: DiseaseItem[];
}

export interface ScoreBreakdown {
  air: { score: number; pm25: number | null; grade: string };
  weather: { score: number; temp: number; tempMin: number; tempMax: number; rain: number; wind: number; sky: string };
  uv: { score: number; index: number; grade: string };
  disease: { score: number; items: DiseaseItem[] };
}

export interface ScoreResult {
  total: number;
  grade: 'clear' | 'caution' | 'stay';
  message: string;
  breakdown: ScoreBreakdown;
}

/** 대기질 점수 (35점) — PM2.5 기준 */
export function calculateAirScore(pm25: number | null): { score: number; grade: string } {
  if (pm25 === null) return { score: 0, grade: '측정불가' };
  if (pm25 <= 15) return { score: 35, grade: '좋음' };
  if (pm25 <= 25) return { score: 28, grade: '보통' };
  if (pm25 <= 35) return { score: 18, grade: '나쁨' };
  if (pm25 <= 50) return { score: 8, grade: '매우나쁨' };
  return { score: 0, grade: '위험' };
}

/** 기온 적정성 점수 (15점) */
function calculateTempScore(temp: number): number {
  if (temp >= 18 && temp <= 25) return 15;
  if ((temp >= 12 && temp <= 17) || (temp >= 26 && temp <= 30)) return 12;
  if ((temp >= 5 && temp <= 11) || (temp >= 31 && temp <= 35)) return 8;
  if ((temp >= 0 && temp <= 4) || temp >= 36) return 4;
  if (temp <= -5) return 0;
  // -5 < temp < 0
  return 4;
}

/** 강수확률 점수 (10점) */
function calculateRainScore(rain: number): number {
  if (rain <= 20) return 10;
  if (rain <= 50) return 6;
  if (rain <= 70) return 3;
  return 0;
}

/** 바람 점수 (5점) */
function calculateWindScore(wind: number): number {
  if (wind <= 5) return 5;
  if (wind <= 10) return 3;
  return 0;
}

/** 날씨 종합 점수 (30점) = 기온15 + 강수10 + 바람5 */
export function calculateWeatherScore(weather: WeatherData): number {
  return calculateTempScore(weather.temp)
    + calculateRainScore(weather.rain)
    + calculateWindScore(weather.wind);
}

/** 자외선 점수 (15점) */
export function calculateUvScore(uvIndex: number): { score: number; grade: string } {
  if (uvIndex <= 2) return { score: 15, grade: '낮음' };
  if (uvIndex <= 5) return { score: 12, grade: '보통' };
  if (uvIndex <= 7) return { score: 8, grade: '높음' };
  if (uvIndex <= 10) return { score: 3, grade: '매우높음' };
  return { score: 0, grade: '위험' };
}

/** 감염병 점수 (20점) */
export function calculateDiseaseScore(data: DiseaseData): number {
  const { items } = data;
  if (items.length === 0) return 20;

  const warningCount = items.filter(i => i.level === 'warning').length;
  const cautionCount = items.filter(i => i.level === 'caution').length;
  const normalCount = items.filter(i => i.level === 'normal').length;

  if (warningCount > 0) return 0;
  if (cautionCount >= 2) return 5;
  if (cautionCount === 1) return 10;
  if (normalCount >= 1) return 15;
  return 20;
}

/** 판정 메시지 생성 */
function getGradeMessage(grade: 'clear' | 'caution' | 'stay'): string {
  switch (grade) {
    case 'clear': return '오늘도, 맑음';
    case 'caution': return '조심해서 나가세요';
    case 'stay': return '오늘은 실내 놀이';
  }
}

/** 통합 점수 계산 */
export function calculateScore(
  air: AirData,
  weather: WeatherData,
  uv: UvData,
  disease: DiseaseData,
): ScoreResult {
  const airResult = calculateAirScore(air.pm25);
  const weatherScore = calculateWeatherScore(weather);
  const uvResult = calculateUvScore(uv.index);
  const diseaseScore = calculateDiseaseScore(disease);

  const total = airResult.score + weatherScore + uvResult.score + diseaseScore;
  const grade: 'clear' | 'caution' | 'stay' =
    total >= 80 ? 'clear' : total >= 50 ? 'caution' : 'stay';

  return {
    total,
    grade,
    message: getGradeMessage(grade),
    breakdown: {
      air: { score: airResult.score, pm25: air.pm25, grade: airResult.grade },
      weather: { score: weatherScore, ...weather },
      uv: { score: uvResult.score, index: uv.index, grade: uvResult.grade },
      disease: { score: diseaseScore, items: disease.items },
    },
  };
}
