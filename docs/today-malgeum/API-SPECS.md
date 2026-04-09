# "오늘도, 맑음" API Specifications

> **버전**: 1.0
> **작성일**: 2026-04-09
> **상위 문서**: `ARCHITECTURE.md`

---

## 목차

1. [Internal API Specifications](#1-internal-api-specifications)
2. [External API Client Specifications](#2-external-api-client-specifications)
3. [Error Codes & Response Formats](#3-error-codes--response-formats)
4. [Rate Limiting & Retry Logic](#4-rate-limiting--retry-logic)

---

## 1. Internal API Specifications

### 1.1 GET /api/today/score

#### Request

**Endpoint**: `/api/today/score`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `region` | string | Yes | 지역 식별자 (`{시도}_{시군구}`) | `서울특별시_강남구` |
| `nocache` | boolean | No | 캐시 무시 (디버깅용) | `true` |

**Example Request**:
```http
GET /api/today/score?region=서울특별시_강남구 HTTP/1.1
Host: today.dodam.life
```

#### Response

**Success Response (200 OK)**:

```json
{
  "score": 78,
  "grade": "caution",
  "message": "조심해서 나가세요",
  "air": {
    "pm25": 16,
    "pm10": 42,
    "grade": "보통",
    "score": 28,
    "fallback": false
  },
  "weather": {
    "temp": 15,
    "tempMin": 8,
    "tempMax": 18,
    "rain": 30,
    "wind": 3.2,
    "sky": "흐림",
    "score": 23,
    "fallback": false
  },
  "uv": {
    "index": 5,
    "grade": "보통",
    "score": 12,
    "fallback": false
  },
  "disease": {
    "items": [
      {
        "name": "수족구",
        "cases": 127,
        "trend": "up",
        "trendText": "전주 대비 +12%",
        "severity": "주의"
      },
      {
        "name": "독감",
        "cases": 84,
        "trend": "same",
        "trendText": "전주 대비 유사",
        "severity": "보통"
      }
    ],
    "score": 15,
    "fallback": false
  },
  "clothing": {
    "main": "긴팔 + 얇은 겉옷",
    "extras": [
      "오후 우산 챙기세요",
      "일교차 주의 (10°C)"
    ]
  },
  "region": "서울특별시 강남구",
  "updatedAt": "2026-04-09T07:10:00+09:00",
  "cacheHit": false,
  "executionTime": 2450
}
```

**Partial Success Response (200 OK with Fallbacks)**:

```json
{
  "score": 50,
  "grade": "caution",
  "message": "일부 데이터를 불러오지 못했습니다",
  "air": {
    "pm25": null,
    "pm10": null,
    "grade": "측정 불가",
    "score": 0,
    "fallback": true,
    "fallbackReason": "API 타임아웃"
  },
  "weather": {
    "temp": 15,
    "tempMin": 8,
    "tempMax": 18,
    "rain": 30,
    "wind": 3.2,
    "sky": "흐림",
    "score": 23,
    "fallback": false
  },
  ...
}
```

**Error Response (400 Bad Request)**:

```json
{
  "error": "INVALID_REGION",
  "message": "지원하지 않는 지역입니다.",
  "code": 400,
  "availableRegions": [
    "서울특별시_강남구",
    "서울특별시_강북구",
    ...
  ]
}
```

**Error Response (500 Internal Server Error)**:

```json
{
  "error": "API_ERROR",
  "message": "모든 외부 API 호출에 실패했습니다.",
  "code": 500,
  "details": "에어코리아, 기상청 API 모두 타임아웃",
  "retryAfter": 60
}
```

**Error Response (503 Service Unavailable)**:

```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "서비스가 일시적으로 이용 불가합니다.",
  "code": 503,
  "retryAfter": 300
}
```

#### Performance Metrics

| Scenario | Target Response Time | Measured By |
|----------|---------------------|-------------|
| Cache Hit | < 200ms | TTFB |
| Cache Miss (모든 API 성공) | < 3s | End-to-end |
| Cache Miss (일부 API 실패) | < 3.5s | End-to-end |

#### Caching Headers

```http
Cache-Control: public, max-age=1800, stale-while-revalidate=3600
Vary: Accept-Encoding
ETag: W/"hash-of-response"
```

---

### 1.2 GET /api/today/share

#### Request

**Endpoint**: `/api/today/share`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `region` | string | Yes | 지역 식별자 | `서울특별시_강남구` |
| `score` | number | No | 미리 계산된 점수 (캐시 최적화) | `78` |

**Example Request**:
```http
GET /api/today/share?region=서울특별시_강남구&score=78 HTTP/1.1
Host: today.dodam.life
```

#### Response

**Success Response (200 OK)**:

- Content-Type: `image/png`
- 크기: 1200×630 (OG Image 표준)
- 동적 생성 내용:
  - 외출 점수 (큰 숫자 + 원형)
  - 지역명 + 날짜
  - PM2.5, 기온, 주요 감염병
  - 옷차림 아이콘
  - 색상: 점수에 따라 초록/노랑/빨강

**Example Rendered Image**:

```
┌─────────────────────────────────────┐
│  오늘도, 맑음                         │
│  서울 강남구 | 4월 9일 (수)            │
│                                     │
│        ┌────────────┐               │
│        │            │               │
│        │    78점    │               │
│        │  조심해서  │               │
│        │  나가세요  │               │
│        │            │               │
│        └────────────┘               │
│                                     │
│  PM2.5 보통 · 15°C                  │
│  수족구 ⬆️ 주의                      │
│  👕 긴팔+얇은겉옷+🌂                 │
│                                     │
│  today.dodam.life                   │
└─────────────────────────────────────┘
```

#### Implementation

```typescript
// src/app/api/today/share/opengraph-image.tsx
import { ImageResponse } from '@vercel/og';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const score = parseInt(searchParams.get('score') || '0');

  // /api/today/score 호출하여 데이터 가져오기
  const data = await fetch(`/api/today/score?region=${region}`);

  return new ImageResponse(
    (
      <div style={{ /* Tailwind-like styles */ }}>
        {/* 점수 표시 */}
        {/* 지역, 날씨, 감염병 요약 */}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

---

## 2. External API Client Specifications

### 2.1 에어코리아 API Client

#### Module: `src/lib/today/api/airkorea.ts`

#### Interface

```typescript
interface AirKoreaParams {
  stationName: string; // 측정소명 (예: "강남구")
}

interface AirKoreaResponse {
  pm25: number | null;  // PM2.5 농도 (μg/m³)
  pm10: number | null;  // PM10 농도
  pm25Grade: number;    // 1좋음, 2보통, 3나쁨, 4매우나쁨
  pm10Grade: number;
  dataTime: string;     // 측정 시각
}

async function fetchAirKorea(params: AirKoreaParams): Promise<AirKoreaResponse>;
```

#### API Endpoint

```
https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty
```

#### Request Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `serviceKey` | `process.env.AIRKOREA_API_KEY` | 공공데이터포털 인증키 |
| `returnType` | `json` | 응답 포맷 |
| `numOfRows` | `1` | 최신 1건 |
| `stationName` | `강남구` | 측정소명 (URL 인코딩) |
| `dataTerm` | `DAILY` | 조회 기간 |
| `ver` | `1.3` | API 버전 (필수) |

#### Response Mapping

```json
{
  "response": {
    "body": {
      "items": [
        {
          "pm25Value": "16",
          "pm10Value": "42",
          "pm25Grade": "2",
          "pm10Grade": "2",
          "dataTime": "2026-04-09 07:00"
        }
      ]
    }
  }
}
```

#### Error Handling

| Error | Condition | Handling |
|-------|-----------|----------|
| `"-"` 값 | 측정 불가 | null 변환 |
| HTTP 타임아웃 | > 3초 | 재시도 1회, 실패 시 fallback |
| HTTP 5xx | 서버 에러 | 즉시 fallback |
| HTTP 429 | Rate Limit | Stale cache 반환 또는 fallback |

#### Implementation Example

```typescript
// src/lib/today/api/airkorea.ts
import { CacheManager } from './cache';

const API_KEY = process.env.AIRKOREA_API_KEY;
const BASE_URL = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
const TIMEOUT = 3000; // 3초
const CACHE_TTL = 30 * 60 * 1000; // 30분

export async function fetchAirKorea(params: AirKoreaParams): Promise<AirKoreaResponse> {
  const cacheKey = `airkorea:${params.stationName}:${getCurrentHour()}`;
  const cached = CacheManager.get<AirKoreaResponse>(cacheKey);
  if (cached) return cached;

  const url = new URL(BASE_URL);
  url.searchParams.set('serviceKey', API_KEY);
  url.searchParams.set('returnType', 'json');
  url.searchParams.set('numOfRows', '1');
  url.searchParams.set('stationName', params.stationName);
  url.searchParams.set('dataTerm', 'DAILY');
  url.searchParams.set('ver', '1.3');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const item = json.response.body.items[0];

    const result: AirKoreaResponse = {
      pm25: item.pm25Value === '-' ? null : parseFloat(item.pm25Value),
      pm10: item.pm10Value === '-' ? null : parseFloat(item.pm10Value),
      pm25Grade: parseInt(item.pm25Grade),
      pm10Grade: parseInt(item.pm10Grade),
      dataTime: item.dataTime,
    };

    CacheManager.set(cacheKey, result, CACHE_TTL);
    return result;

  } catch (error) {
    console.error('[AIRKOREA_ERROR]', error);
    // 재시도 로직 (optional)
    throw new Error('에어코리아 API 호출 실패');
  }
}
```

---

### 2.2 기상청 단기예보 API Client

#### Module: `src/lib/today/api/kma-forecast.ts`

#### Interface

```typescript
interface KmaForecastParams {
  nx: number; // 격자 X 좌표
  ny: number; // 격자 Y 좌표
}

interface KmaForecastResponse {
  temp: number;       // 현재 기온 (°C)
  tempMin: number;    // 최저 기온
  tempMax: number;    // 최고 기온
  rain: number;       // 강수 확률 (%)
  wind: number;       // 풍속 (m/s)
  sky: string;        // "맑음" | "구름많음" | "흐림"
  pty: string;        // "없음" | "비" | "눈" | "소나기"
  baseTime: string;   // 발표 시각
}

async function fetchKmaForecast(params: KmaForecastParams): Promise<KmaForecastResponse>;
```

#### API Endpoint

```
https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst
```

#### Request Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `serviceKey` | `process.env.KMA_API_KEY` | 인증키 |
| `dataType` | `JSON` | 응답 포맷 |
| `numOfRows` | `100` | 충분한 행 수 (3시간마다 발표) |
| `base_date` | `20260409` | 발표 날짜 (오늘) |
| `base_time` | `0500` | 발표 시각 (05:00) |
| `nx` | `61` | 격자 X |
| `ny` | `126` | 격자 Y |

#### 좌표 변환 (위경도 → 격자)

**Lambert Conformal Conic 투영법**:

```typescript
// src/lib/today/grid-converter.ts
export function latLngToGrid(lat: number, lng: number): { nx: number; ny: number } {
  const RE = 6371.00877; // 지구 반지름 (km)
  const GRID = 5.0; // 격자 간격 (km)
  const SLAT1 = 30.0; // 표준 위도 1
  const SLAT2 = 60.0; // 표준 위도 2
  const OLON = 126.0; // 기준점 경도
  const OLAT = 38.0; // 기준점 위도
  const XO = 43; // 기준점 X 좌표
  const YO = 136; // 기준점 Y 좌표

  // 투영 변환 (검증된 알고리즘)
  // ...
  return { nx, ny };
}
```

#### Response Mapping

```json
{
  "response": {
    "body": {
      "items": {
        "item": [
          { "category": "TMP", "fcstValue": "15", "fcstTime": "0700" },
          { "category": "POP", "fcstValue": "30", "fcstTime": "0700" },
          { "category": "WSD", "fcstValue": "3.2", "fcstTime": "0700" },
          { "category": "SKY", "fcstValue": "4", "fcstTime": "0700" },
          { "category": "PTY", "fcstValue": "1", "fcstTime": "0700" },
          { "category": "TMN", "fcstValue": "8" },
          { "category": "TMX", "fcstValue": "18" }
        ]
      }
    }
  }
}
```

**Category Codes**:
- `TMP`: 기온 (°C)
- `POP`: 강수확률 (%)
- `WSD`: 풍속 (m/s)
- `SKY`: 하늘상태 (1맑음, 3구름많음, 4흐림)
- `PTY`: 강수형태 (0없음, 1비, 2비/눈, 3눈, 4소나기)
- `TMN`: 최저기온
- `TMX`: 최고기온

---

### 2.3 기상청 UV Index API Client

#### Module: `src/lib/today/api/kma-uv.ts`

#### Interface

```typescript
interface KmaUvParams {
  areaNo: string; // 10자리 행정코드 (예: "1168000000")
}

interface KmaUvResponse {
  index: number; // UV Index (0~11+)
  grade: string; // "낮음" | "보통" | "높음" | "매우높음" | "위험"
  time: string;  // 해당 시간
}

async function fetchKmaUv(params: KmaUvParams): Promise<KmaUvResponse>;
```

#### API Endpoint

```
https://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4
```

#### Request Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `serviceKey` | `process.env.KMA_API_KEY` | 인증키 |
| `areaNo` | `1168000000` | 행정구역 코드 (10자리) |
| `time` | `2026040907` | 조회 시각 (`YYYYMMDDHH`) |
| `dataType` | `JSON` | 응답 포맷 |

#### Response Mapping

```json
{
  "response": {
    "body": {
      "items": {
        "item": [
          {
            "h0": "0",
            "h3": "0",
            "h6": "2",
            "h9": "5",
            "h12": "7",
            "h15": "6",
            "h18": "2",
            "h21": "0"
          }
        ]
      }
    }
  }
}
```

**UV Index → Grade Mapping**:
- 0~2: 낮음
- 3~5: 보통
- 6~7: 높음
- 8~10: 매우높음
- 11+: 위험

**시간대별 최댓값 선택**:
- 09:00~15:00 시간대 중 최댓값 사용 (외출 시간대)

---

### 2.4 질병관리청 감염병 API Client

#### Module: `src/lib/today/api/kdca-disease.ts`

#### Interface

```typescript
interface KdcaDiseaseParams {
  sidoCd: string; // 시도코드 (예: "11" = 서울)
}

interface KdcaDiseaseItem {
  name: string;       // 질병명
  cases: number;      // 발생 건수
  trend: 'up' | 'same' | 'down';
  trendText: string;  // "전주 대비 +12%"
  severity: string;   // "보통" | "주의" | "경보"
}

interface KdcaDiseaseResponse {
  items: KdcaDiseaseItem[];
  weekStart: string;  // 집계 주 시작일
}

async function fetchKdcaDisease(params: KdcaDiseaseParams): Promise<KdcaDiseaseResponse>;
```

#### API Endpoint

```
https://apis.data.go.kr/1790387/covid19DiseaseDataService/covid19DiseaseData
```

#### Request Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `serviceKey` | `process.env.KDCA_API_KEY` | 인증키 |
| `pageNo` | `1` | 페이지 번호 |
| `numOfRows` | `100` | 조회 건수 |
| `sidoCd` | `11` | 시도코드 |

#### Target Diseases

- 수족구병
- 인플루엔자 (독감)
- 수두
- 노로바이러스
- RSV (호흡기세포융합바이러스)
- 로타바이러스

#### Fallback Strategy

```typescript
const MOCK_DISEASE_DATA: KdcaDiseaseItem[] = [
  { name: "수족구", cases: 120, trend: "up", trendText: "전주 대비 +10%", severity: "주의" },
  { name: "독감", cases: 80, trend: "same", trendText: "전주 대비 유사", severity: "보통" },
];

async function fetchKdcaDisease(params: KdcaDiseaseParams): Promise<KdcaDiseaseResponse> {
  if (process.env.ENABLE_DISEASE_API !== 'true') {
    return { items: MOCK_DISEASE_DATA, weekStart: '2026-04-07' };
  }

  try {
    // 실제 API 호출
  } catch (error) {
    console.warn('[KDCA_FALLBACK]', 'Using mock data');
    return { items: MOCK_DISEASE_DATA, weekStart: '2026-04-07' };
  }
}
```

---

## 3. Error Codes & Response Formats

### 3.1 Internal API Error Codes

| Code | Error Type | Message | HTTP Status |
|------|------------|---------|-------------|
| `INVALID_REGION` | Validation Error | 지원하지 않는 지역입니다 | 400 |
| `MISSING_PARAM` | Validation Error | 필수 파라미터가 누락되었습니다 | 400 |
| `API_TIMEOUT` | External API Error | 외부 API 응답 시간 초과 | 504 |
| `API_ERROR` | External API Error | 외부 API 호출 실패 | 502 |
| `CACHE_ERROR` | Internal Error | 캐시 처리 중 오류 발생 | 500 |
| `SERVICE_UNAVAILABLE` | Server Error | 서비스 일시 중단 | 503 |

### 3.2 Error Response Format

```typescript
interface ErrorResponse {
  error: string;        // 에러 코드
  message: string;      // 사용자 친화적 메시지
  code: number;         // HTTP Status Code
  details?: string;     // 상세 정보 (optional)
  retryAfter?: number;  // 재시도 권장 시간 (초)
  availableRegions?: string[]; // INVALID_REGION 시 제공
}
```

---

## 4. Rate Limiting & Retry Logic

### 4.1 External API Rate Limits

| API | Daily Limit | Strategy |
|-----|-------------|----------|
| 에어코리아 | 500 (개발) / 10,000 (운영) | 캐시 30분 → 하루 48회/지역 |
| 기상청 단기예보 | 10,000 | 캐시 1시간 → 하루 24회/지역 |
| 기상청 UV | 10,000 | 캐시 6시간 → 하루 4회/지역 |
| 질병관리청 | 1,000 | 캐시 24시간 → 하루 1회/지역 |

**총 일일 호출 예상**:
- 100개 지역 지원 시: 에어코리아 4,800건, 기상청 2,400건, 질병관리청 100건
- **모든 한도 내 수용 가능**

### 4.2 Retry Logic

```typescript
async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  options: {
    maxRetries: number;
    timeout: number;
    backoff: 'exponential' | 'linear';
  }
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= options.maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error as Error;

      if (i < options.maxRetries) {
        const delay = options.backoff === 'exponential'
          ? Math.pow(2, i) * 1000
          : 1000;
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

**Retry Strategy**:
- 에어코리아: 1회 재시도 (Exponential Backoff)
- 기상청: 1회 재시도
- 질병관리청: 재시도 없음 (Fallback 사용)

---

## Version History

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2026-04-09 | 초안 작성 | Claude Opus 4.6 |
