/**
 * 옷차림 추천 로직 — 기온 기반 7구간 + 보정 메시지
 */

export interface ClothingRecommendation {
  main: string;
  extras: string[];
}

interface ClothingInput {
  temp: number;
  tempMin?: number;
  tempMax?: number;
  rain: number;       // 강수확률 (%)
  wind: number;       // 풍속 (m/s)
  uvIndex: number;    // UV Index
}

/** 기온 구간별 옷차림 매핑 */
function getBaseClothing(temp: number): string {
  if (temp >= 25) return '반팔 + 반바지';
  if (temp >= 20) return '반팔 + 긴바지 (or 얇은 긴팔)';
  if (temp >= 15) return '긴팔 + 얇은 겉옷';
  if (temp >= 10) return '긴팔 + 두꺼운 겉옷 (점퍼/가디건)';
  if (temp >= 5) return '기모 내의 + 패딩';
  if (temp >= 0) return '기모 내의 + 두꺼운 패딩 + 목도리';
  return '풀 무장 (기모내의+패딩+모자+장갑+목도리)';
}

/** 보정 메시지 생성 */
function getExtras(input: ClothingInput): string[] {
  const extras: string[] = [];

  // 강수 보정
  if (input.rain >= 50) {
    extras.push('우비/우산 꼭 챙기세요');
  } else if (input.rain >= 30) {
    extras.push('오후 우산 챙기세요');
  }

  // 바람 보정
  if (input.wind >= 8) {
    extras.push('바람이 강해요, 바람막이 추천');
  }

  // UV 보정
  if (input.uvIndex >= 6) {
    extras.push('자외선 강해요, 모자 + 선크림');
  }

  // 일교차 보정
  if (input.tempMin !== undefined && input.tempMax !== undefined) {
    const diff = input.tempMax - input.tempMin;
    if (diff >= 10) {
      extras.push(`일교차 ${Math.round(diff)}°C, 겉옷 꼭 챙기세요`);
    }
  }

  return extras;
}

/**
 * 옷차림 추천 — 기온 기반 + 보정
 */
export function recommendClothing(input: ClothingInput): ClothingRecommendation {
  return {
    main: getBaseClothing(input.temp),
    extras: getExtras(input),
  };
}
