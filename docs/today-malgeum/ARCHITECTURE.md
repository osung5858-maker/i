# "오늘도, 맑음" System Architecture Document

> **서비스명**: 오늘도, 맑음
> **도메인**: today.dodam.life
> **아키텍처 버전**: v1.0
> **작성일**: 2026-04-09
> **상위 문서**: `docs/today-malgeum/PLAN.md`
> **요구사항**: `docs/today-malgeum/REQUIREMENTS.md`

---

## 목차

1. [System Overview](#1-system-overview)
2. [Architecture Diagrams (C4 Model)](#2-architecture-diagrams-c4-model)
3. [Component Design](#3-component-design)
4. [API Design](#4-api-design)
5. [Data Models](#5-data-models)
6. [Caching Strategy](#6-caching-strategy)
7. [Security Architecture](#7-security-architecture)
8. [Performance Design](#8-performance-design)
9. [Error Handling](#9-error-handling)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [ADRs](#12-architecture-decision-records)

---

## 1. System Overview

### 1.1 System Purpose

"오늘도, 맑음"은 영유아 부모가 **3초 안에** 외출 가능 여부를 판단할 수 있는 **대시보드 서비스**입니다. 4개 공공 API를 매쉬업하여 100점 만점 외출 점수를 제공합니다.

### 1.2 System Characteristics

| 특성 | 값 |
|------|-----|
| 시스템 타입 | 단일 페이지 대시보드 (SPD) |
| 배포 방식 | Next.js 16 App Router + Vercel Serverless |
| 인증 | 없음 (비인증 서비스) |
| 데이터베이스 | 없음 (Stateless) |
| 캐싱 | 인메모리 Map (Serverless Function 내) |
| 외부 의존성 | 4개 공공 API (에어코리아, 기상청×2, 질병관리청) |
| 지역 범위 | 대한민국 전국 (17개 시도 + 주요 시군구) |

### 1.3 Quality Attributes

| 품질 속성 | 목표 | 측정 기준 |
|----------|------|-----------|
| **성능** | 캐시 히트 시 < 200ms | TTFB (Time to First Byte) |
| **성능** | 캐시 미스 시 < 3초 | 4개 API 병렬 호출 포함 전체 응답 시간 |
| **가용성** | 99.5% (월 3.6시간 다운타임 허용) | Vercel 플랫폼 SLA + API 폴백 |
| **확장성** | 동시 사용자 1,000명 | Vercel Serverless 자동 확장 |
| **신뢰성** | API 개별 실패 시 서비스 지속 | 섹션별 Graceful Degradation |
| **보안** | API 키 서버사이드 보관 | 환경변수 + SSRF 방지 |
| **접근성** | 모바일 100% 반응형 | 390px ~ 430px 최적화 |

---

## 2. Architecture Diagrams (C4 Model)

### 2.1 System Context (C4 Level 1)

```
┌───────────────────────────────────────────────────────────────┐
│                         사용자 (부모)                          │
│                  모바일 브라우저 (07:20 AM)                     │
└────────────────────────────┬──────────────────────────────────┘
                             │ HTTPS
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                    today.dodam.life                            │
│                    (Vercel Edge Network)                       │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │          Next.js 16 Application (App Router)            │  │
│  │                                                         │  │
│  │   SSR Page (/today)  ←→  API Routes (/api/today/*)     │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             │ HTTPS (병렬 호출)
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│  에어코리아       │  │  기상청       │  │  질병관리청       │
│  (OpenAPI)       │  │  (OpenAPI)   │  │  (OpenAPI)       │
│                  │  │              │  │                  │
│  • PM2.5/PM10   │  │  • 단기예보  │  │  • 감염병 통계   │
│  • 오존          │  │  • UV Index  │  │  • 주간 발생현황 │
└──────────────────┘  └──────────────┘  └──────────────────┘
```

### 2.2 Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Application Container                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌────────────────────────────────┐   │
│  │   Web Frontend   │     │      API Backend               │   │
│  │   (React 19 +    │◄────┤   (API Routes)                 │   │
│  │   Tailwind 4)    │     │                                │   │
│  │                  │     │  ┌──────────────────────────┐  │   │
│  │  • /today/page   │     │  │ /api/today/score/route   │  │   │
│  │  • Components    │     │  │  (통합 점수 API)          │  │   │
│  │  • Client State  │     │  └────────┬─────────────────┘  │   │
│  └──────────────────┘     │           │                    │   │
│           │               │           ▼                    │   │
│           │               │  ┌────────────────┐            │   │
│           │               │  │  Cache Manager │            │   │
│           │               │  │  (In-Memory)   │            │   │
│           │               │  └────────┬───────┘            │   │
│           │               │           │                    │   │
│           │               │           ▼                    │   │
│           │               │  ┌─────────────────────────┐   │   │
│           │               │  │  External API Clients   │   │   │
│           │               │  │                         │   │   │
│           │               │  │  • airkorea.ts         │   │   │
│           │               │  │  • kma-forecast.ts     │   │   │
│           │               │  │  • kma-uv.ts           │   │   │
│           │               │  │  • kdca-disease.ts     │   │   │
│           │               │  └─────────────────────────┘   │   │
│           │               └────────────────────────────────┘   │
│           │                                                    │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │  localStorage    │                                         │
│  │  (Client-side)   │                                         │
│  │  • region        │                                         │
│  └──────────────────┘                                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 2.3 Component Diagram (C4 Level 3) - API Route

```
┌──────────────────────────────────────────────────────────────┐
│           /api/today/score/route.ts (API Route)              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  GET(request: Request)                                       │
│    │                                                         │
│    ├─► 1. Extract query params (region)                     │
│    │                                                         │
│    ├─► 2. RegionResolver.resolve(region)                    │
│    │       └─► { stationName, nx, ny, areaNo, sidoCd }      │
│    │                                                         │
│    ├─► 3. CacheManager.get(cacheKey)                        │
│    │       ├─► Cache Hit → return cached data               │
│    │       └─► Cache Miss → continue                        │
│    │                                                         │
│    ├─► 4. Promise.allSettled([                              │
│    │       AirKoreaClient.fetch(stationName),              │
│    │       KmaForecastClient.fetch(nx, ny),                │
│    │       KmaUvClient.fetch(areaNo),                      │
│    │       KdcaDiseaseClient.fetch(sidoCd)                 │
│    │     ])                                                  │
│    │       └─► Individual fallbacks on error                │
│    │                                                         │
│    ├─► 5. ScoreEngine.calculate(apiResults)                 │
│    │       ├─► calculateAirScore(pm25, pm10)                │
│    │       ├─► calculateWeatherScore(temp, rain, wind)      │
│    │       ├─► calculateUvScore(uvIndex)                    │
│    │       └─► calculateDiseaseScore(diseases)              │
│    │                                                         │
│    ├─► 6. ClothingRecommender.recommend(temp, rain, wind)   │
│    │                                                         │
│    ├─► 7. Build response JSON                               │
│    │                                                         │
│    ├─► 8. CacheManager.set(cacheKey, response, ttl)         │
│    │                                                         │
│    └─► 9. Return Response(json, 200)                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 Deployment Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Vercel Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Vercel Edge Network (Global CDN)           │    │
│  │         • Static Assets (.js, .css, images)        │    │
│  │         • ISR Cached Pages                         │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │      Vercel Serverless Functions (Seoul Region)    │    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │  /today Page Handler (SSR)                  │   │    │
│  │  │  • Runtime: Node.js 22                      │   │    │
│  │  │  • Memory: 1024MB                           │   │    │
│  │  │  • Timeout: 10s                             │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │  /api/today/score Handler                   │   │    │
│  │  │  • Runtime: Node.js 22                      │   │    │
│  │  │  • Memory: 1024MB                           │   │    │
│  │  │  • Timeout: 10s                             │   │    │
│  │  │  • In-Memory Cache (per instance)           │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                       │                                     │
│                       │ HTTPS (Egress)                      │
│                       ▼                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │          External APIs (공공데이터포털)              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Environment Variables (Vercel Secrets)                     │
│  • AIRKOREA_API_KEY                                         │
│  • KMA_API_KEY                                              │
│  • KDCA_API_KEY                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Component Design

### 3.1 Frontend Components

#### 3.1.1 Component Hierarchy

```
/today/page.tsx (Server Component)
├─ /today/layout.tsx
│  └─ Header (지역명, 업데이트 시간)
│
├─ ScoreCard.tsx (Client Component)
│  ├─ 외출 점수 원형 표시 (0~100)
│  ├─ 판정 메시지 ("오늘도, 맑음")
│  └─ 색상 시스템 (초록/노랑/빨강)
│
├─ DetailRows.tsx (Server Component)
│  ├─ WeatherRow.tsx
│  │  ├─ 기온 (최저/최고)
│  │  ├─ 강수 확률
│  │  └─ 바람 속도
│  │
│  ├─ AirQualityRow.tsx
│  │  ├─ PM2.5 수치
│  │  ├─ PM10 수치
│  │  └─ 등급 (좋음/보통/나쁨)
│  │
│  ├─ UvRow.tsx
│  │  ├─ UV Index
│  │  └─ 등급
│  │
│  └─ DiseaseRow.tsx
│     ├─ 감염병 목록 (수족구, 독감, 수두...)
│     └─ 전주 대비 추이 (⬆️상승 / ➡️유지 / ⬇️감소)
│
├─ ClothingCard.tsx (Server Component)
│  ├─ 옷차림 추천 (기온 기반)
│  └─ 보정 메시지 (강수/바람/UV)
│
├─ RegionSelector.tsx (Client Component)
│  ├─ 시/도 드롭다운
│  ├─ 시/군/구 드롭다운
│  └─ localStorage 저장/로드
│
└─ ShareButton.tsx (Client Component)
   ├─ navigator.share() (네이티브)
   └─ 폴백: URL 복사 + 토스트
```

#### 3.1.2 Component Specifications

| 컴포넌트 | 타입 | Props | 상태 | 설명 |
|---------|------|-------|------|------|
| `ScoreCard` | Client | `score: number, grade: string, message: string` | 애니메이션 상태 | 외출 점수 원형 표시 + 애니메이션 |
| `WeatherRow` | Server | `temp, tempMin, tempMax, rain, wind` | 없음 | 날씨 정보 한 줄 |
| `AirQualityRow` | Server | `pm25, pm10, grade` | 없음 | 대기질 한 줄 |
| `UvRow` | Server | `index, grade` | 없음 | 자외선 한 줄 |
| `DiseaseRow` | Server | `diseases: Array<{name, trend}>` | 없음 | 감염병 목록 + 추이 |
| `ClothingCard` | Server | `main, extras` | 없음 | 옷차림 추천 |
| `RegionSelector` | Client | 없음 | `selectedRegion` | 지역 선택 드롭다운 + localStorage |
| `ShareButton` | Client | `url, title, text` | `shareStatus` | 공유 버튼 |

### 3.2 Backend Modules

#### 3.2.1 Module Structure

```
src/lib/today/
├── api/
│   ├── airkorea.ts         # 에어코리아 API 클라이언트
│   ├── kma-forecast.ts     # 기상청 단기예보 클라이언트
│   ├── kma-uv.ts           # 기상청 UV 클라이언트
│   ├── kdca-disease.ts     # 질병관리청 클라이언트
│   └── cache.ts            # 인메모리 캐시 유틸
│
├── score.ts                # 외출 점수 계산 엔진
├── clothing.ts             # 옷차림 추천 로직
├── grid-converter.ts       # 위경도 → 기상청 격자 변환
└── regions.ts              # 지역 코드 매핑 (측정소/격자/행정코드)
```

#### 3.2.2 Key Module Specifications

**CacheManager (cache.ts)**

```typescript
interface CacheEntry<T> {
  data: T;
  expireAt: number; // Unix timestamp
}

class CacheManager {
  private cache: Map<string, CacheEntry<unknown>>;

  get<T>(key: string): T | null;
  set<T>(key: string, data: T, ttlMs: number): void;
  clear(pattern?: RegExp): void;
  cleanup(): void; // 만료된 엔트리 제거
}

// TTL 설정
const CACHE_TTL = {
  AIRKOREA: 30 * 60 * 1000,      // 30분
  KMA_FORECAST: 60 * 60 * 1000,  // 1시간
  KMA_UV: 6 * 60 * 60 * 1000,    // 6시간
  KDCA: 24 * 60 * 60 * 1000,     // 24시간
};
```

**ScoreEngine (score.ts)**

```typescript
interface ScoreResult {
  total: number; // 0~100
  air: { score: number; pm25: number; grade: string };
  weather: { score: number; temp: number; rain: number; wind: number };
  uv: { score: number; index: number; grade: string };
  disease: { score: number; items: DiseaseItem[] };
  grade: 'clear' | 'caution' | 'stay';
  message: string;
}

function calculateScore(apiResults: ApiResults): ScoreResult;
```

**ClothingRecommender (clothing.ts)**

```typescript
interface ClothingRecommendation {
  main: string; // "긴팔 + 얇은 겉옷"
  extras: string[]; // ["오후 우산 챙기세요"]
}

function recommend(
  temp: number,
  rain: number,
  wind: number,
  uvIndex: number
): ClothingRecommendation;
```

**RegionResolver (regions.ts)**

```typescript
interface RegionMapping {
  name: string; // "서울특별시 강남구"
  stationName: string; // "강남구" (에어코리아)
  nx: number; // 61 (기상청 격자 X)
  ny: number; // 126 (기상청 격자 Y)
  areaNo: string; // "1168000000" (기상청 행정코드)
  sidoCd: string; // "11" (질병관리청 시도코드)
}

const REGIONS: RegionMapping[] = [...];

function resolve(regionName: string): RegionMapping | null;
```

---

## 4. API Design

### 4.1 Internal API Specification

#### 4.1.1 GET /api/today/score

**Purpose**: 지역별 외출 점수 + 상세 데이터 반환

**Request**

```http
GET /api/today/score?region=서울특별시_강남구
```

Query Parameters:
- `region` (required): `{시도}_{시군구}` 형식 (예: `서울특별시_강남구`)

**Response (200 OK)**

```json
{
  "score": 78,
  "grade": "caution",
  "message": "조심해서 나가세요",
  "air": {
    "pm25": 16,
    "pm10": 42,
    "grade": "보통",
    "score": 28
  },
  "weather": {
    "temp": 15,
    "tempMin": 8,
    "tempMax": 18,
    "rain": 30,
    "wind": 3.2,
    "sky": "흐림",
    "score": 23
  },
  "uv": {
    "index": 5,
    "grade": "보통",
    "score": 12
  },
  "disease": {
    "items": [
      {
        "name": "수족구",
        "cases": 127,
        "trend": "up",
        "trendText": "전주 대비 +12%"
      },
      {
        "name": "독감",
        "cases": 84,
        "trend": "same",
        "trendText": "전주 대비 유사"
      }
    ],
    "score": 15
  },
  "clothing": {
    "main": "긴팔 + 얇은 겉옷",
    "extras": ["오후 우산 챙기세요", "일교차 주의 (10°C)"]
  },
  "region": "서울특별시 강남구",
  "updatedAt": "2026-04-09T07:10:00+09:00",
  "cacheHit": false
}
```

**Response (400 Bad Request)**

```json
{
  "error": "INVALID_REGION",
  "message": "지원하지 않는 지역입니다.",
  "code": 400
}
```

**Response (500 Internal Server Error)**

```json
{
  "error": "API_ERROR",
  "message": "외부 API 호출 실패",
  "details": "에어코리아 API 타임아웃",
  "code": 500
}
```

**Caching Strategy**
- Cache Key: `today:score:{region}:{hour}` (시간 단위 키)
- Cache TTL: 최소 TTL 적용 (30분)
- Cache Hit: `cacheHit: true` 플래그

#### 4.1.2 GET /api/today/share (OG Image Generation)

**Purpose**: 카카오톡 공유용 동적 OG 이미지 생성

**Request**

```http
GET /api/today/share?region=서울특별시_강남구
```

**Response**
- Content-Type: `image/png`
- 크기: 1200×630 (OG 표준)
- 동적 생성 내용:
  - 외출 점수 (큰 숫자)
  - 지역명 + 날짜
  - 핵심 정보 3줄 (PM2.5, 기온, 감염병)
  - 옷차림 아이콘

**Implementation**
- Next.js `opengraph-image.tsx` 활용 (App Router 기능)
- `@vercel/og` 라이브러리 사용 (SVG → PNG)

### 4.2 External API Integration

#### 4.2.1 에어코리아 API (대기오염정보)

**Endpoint**
```
https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty
```

**Parameters**
- `serviceKey`: API 키
- `returnType`: `json`
- `numOfRows`: `1`
- `stationName`: 측정소명 (예: `강남구`)
- `dataTerm`: `DAILY`
- `ver`: `1.3` (필수)

**Response Mapping**
```typescript
{
  pm25Value: string,  // PM2.5 농도 (μg/m³)
  pm10Value: string,  // PM10 농도
  pm25Grade: string,  // 등급 (1좋음, 2보통, 3나쁨, 4매우나쁨)
}
```

**Error Handling**
- "-" 값 처리: null 변환
- 타임아웃: 3초
- 재시도: 1회
- 폴백: "측정 불가" 표시

#### 4.2.2 기상청 단기예보 API

**Endpoint**
```
https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst
```

**Parameters**
- `serviceKey`: API 키
- `numOfRows`: `100`
- `dataType`: `JSON`
- `base_date`: `YYYYMMDD` (오늘)
- `base_time`: `0500` (05:00 발표)
- `nx`: 격자 X 좌표
- `ny`: 격자 Y 좌표

**Response Mapping**
```typescript
{
  TMP: string,  // 기온 (°C)
  POP: string,  // 강수확률 (%)
  WSD: string,  // 풍속 (m/s)
  SKY: string,  // 하늘상태 (1맑음, 3구름많음, 4흐림)
  PTY: string,  // 강수형태 (0없음, 1비, 2비/눈, 3눈, 4소나기)
  TMN: string,  // 최저기온
  TMX: string,  // 최고기온
}
```

**좌표 변환**
- 위경도 → Lambert Conformal Conic 격자 변환
- 검증된 변환 함수 사용 (`grid-converter.ts`)

#### 4.2.3 기상청 생활기상지수 API (UV Index)

**Endpoint**
```
https://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4
```

**Parameters**
- `serviceKey`: API 키
- `areaNo`: 10자리 행정코드 (예: `1168000000`)
- `time`: `YYYYMMDDHH`
- `dataType`: `JSON`

**Response Mapping**
```typescript
{
  h0: string,   // 금일 0시 UV Index
  h3: string,   // 금일 3시
  ...
  h24: string,  // 내일 0시
}
```

**시간대별 최댓값 사용**
- 09:00~15:00 시간대 중 최댓값 선택

#### 4.2.4 질병관리청 감염병 API

**Endpoint**
```
https://apis.data.go.kr/1790387/covid19DiseaseDataService/covid19DiseaseData
```

**Parameters**
- `serviceKey`: API 키
- `pageNo`: `1`
- `numOfRows`: `100`
- `sidoCd`: 시도코드 (예: `11` = 서울)
- `diseaseNm`: 질병명 (수족구, 인플루엔자 등)

**Response Mapping**
```typescript
{
  diseaseNm: string,  // 질병명
  caseCnt: number,    // 발생 건수
  createDt: string,   // 집계 날짜
}
```

**대상 질병**
- 수족구병
- 인플루엔자 (독감)
- 수두
- 노로바이러스
- RSV (호흡기세포융합바이러스)
- 로타바이러스

**Fallback Strategy**
- API 승인 대기 중: 목데이터 반환
- API 실패: "데이터 준비 중" 표시

---

## 5. Data Models

### 5.1 Client-side Storage (localStorage)

```typescript
interface LocalStorageData {
  // 선택된 지역
  selectedRegion: string; // "서울특별시_강남구"

  // 최근 조회 이력 (optional, Phase 2)
  recentRegions?: string[];
}
```

### 5.2 In-Memory Cache Structure

```typescript
interface CacheEntry<T> {
  data: T;
  expireAt: number; // Unix timestamp (ms)
}

// Cache Map Structure
Map<string, CacheEntry<unknown>>

// Cache Key Patterns
"airkorea:{stationName}:{YYYYMMDDHH}"
"kma_forecast:{nx}_{ny}:{YYYYMMDDHHMM}"
"kma_uv:{areaNo}:{YYYYMMDDHH}"
"kdca_disease:{sidoCd}:{YYYYMMDD}"
"today_score:{region}:{YYYYMMDDHH}"
```

### 5.3 Region Mapping Data Model

```typescript
interface RegionMapping {
  // 식별자
  id: string; // "seoul_gangnam"

  // 표시명
  name: string; // "서울특별시 강남구"
  sidoName: string; // "서울특별시"
  sigunguName: string; // "강남구"

  // API 파라미터
  stationName: string; // 에어코리아 측정소명
  nx: number; // 기상청 격자 X
  ny: number; // 기상청 격자 Y
  areaNo: string; // 기상청 행정코드 (10자리)
  sidoCd: string; // 질병관리청 시도코드 (2자리)

  // 위경도 (참고용)
  lat: number;
  lng: number;
}

// 최소 지원 지역
const REGIONS: RegionMapping[] = [
  // 서울 25개 자치구
  { id: "seoul_gangnam", name: "서울특별시 강남구", ... },
  { id: "seoul_gangbuk", name: "서울특별시 강북구", ... },
  ...

  // 17개 시도 대표 도시
  { id: "busan_busanjin", name: "부산광역시 부산진구", ... },
  { id: "daegu_jung", name: "대구광역시 중구", ... },
  ...
];
```

### 5.4 Score Calculation Models

```typescript
// 대기질 점수 (35점)
interface AirScore {
  pm25: number;        // PM2.5 농도
  pm10: number;        // PM10 농도
  grade: string;       // "좋음" | "보통" | "나쁨" | "매우나쁨" | "위험"
  score: number;       // 0~35
}

// 날씨 점수 (30점)
interface WeatherScore {
  temp: number;        // 현재 기온
  tempMin: number;     // 최저 기온
  tempMax: number;     // 최고 기온
  rain: number;        // 강수 확률 (%)
  wind: number;        // 풍속 (m/s)
  sky: string;         // "맑음" | "구름많음" | "흐림"
  score: number;       // 0~30
}

// 자외선 점수 (15점)
interface UvScore {
  index: number;       // UV Index (0~11+)
  grade: string;       // "낮음" | "보통" | "높음" | "매우높음" | "위험"
  score: number;       // 0~15
}

// 감염병 점수 (20점)
interface DiseaseScore {
  items: DiseaseItem[];
  score: number;       // 0~20
}

interface DiseaseItem {
  name: string;        // 질병명
  cases: number;       // 발생 건수
  trend: 'up' | 'same' | 'down';
  trendText: string;   // "전주 대비 +12%"
}

// 통합 점수
interface TotalScore {
  total: number;       // 0~100
  air: AirScore;
  weather: WeatherScore;
  uv: UvScore;
  disease: DiseaseScore;
  grade: 'clear' | 'caution' | 'stay';
  message: string;
}
```

---

## 6. Caching Strategy

### 6.1 Cache Architecture

```
Request → Cache Layer → External API
            ↓ Hit
          Response
            ↓ Miss
          API Call → Cache Update → Response
```

### 6.2 Cache TTL Policy

| 데이터 소스 | TTL | 이유 |
|------------|-----|------|
| 에어코리아 PM | 30분 | 실시간 변동 가능 |
| 기상청 단기예보 | 1시간 | 3시간마다 갱신 (base_time: 02, 05, 08, 11, 14, 17, 20, 23) |
| 기상청 UV | 6시간 | 일 단위 예보 |
| 질병관리청 감염병 | 24시간 | 주간 데이터 |
| 통합 점수 | 30분 | 가장 짧은 TTL 적용 (에어코리아 기준) |

### 6.3 Cache Key Design

**Format**: `{source}:{identifier}:{timeKey}`

**Examples**:
```
airkorea:강남구:2026040907
kma_forecast:61_126:202604090500
kma_uv:1168000000:2026040900
kdca_disease:11:20260409
today_score:서울특별시_강남구:2026040907
```

**Time Key Granularity**:
- 에어코리아: 시간 단위 (`YYYYMMDDHH`)
- 기상청 단기예보: base_time 단위 (`YYYYMMDDHHmm`)
- 기상청 UV: 시간 단위
- 질병관리청: 일 단위 (`YYYYMMDD`)
- 통합 점수: 시간 단위

### 6.4 Cache Invalidation

**Vercel Serverless 특성**:
- 각 Serverless Function 인스턴스는 독립적인 메모리 공간 보유
- 콜드 스타트 시 캐시 초기화
- Warm Function은 캐시 유지 (약 5~15분)

**Cleanup Strategy**:
- `CacheManager.cleanup()` 메서드로 만료 엔트리 정기 삭제
- 각 API 호출 전 cleanup 실행

**Cache Bust Scenarios**:
- 사용자가 강제 새로고침 (`Ctrl+Shift+R`)
- Query parameter: `?nocache=1` 추가 시

### 6.5 Cache Hit Ratio Monitoring

**Target**: 80% 이상

**Measurement**:
```typescript
// 응답에 cacheHit 플래그 포함
{
  "cacheHit": true,
  ...
}
```

**Vercel Analytics** 이벤트 로깅:
```typescript
analytics.track('score_api_call', {
  region: 'seoul_gangnam',
  cacheHit: true,
  responseTime: 120, // ms
});
```

---

## 7. Security Architecture

### 7.1 Threat Model (OWASP Top 10 Based)

| 위협 | 영향도 | 완화 전략 |
|------|--------|-----------|
| **API 키 노출** | Critical | 환경변수 서버사이드 보관 (Vercel Secrets) |
| **SSRF (Server-Side Request Forgery)** | High | 외부 API URL 화이트리스트 검증 |
| **Rate Limiting 미비** | Medium | Vercel Rate Limiting + 클라이언트 요청 제한 |
| **XSS (Cross-Site Scripting)** | Low | React 자동 이스케이프 + CSP 헤더 |
| **Injection** | Low | No DB, No User Input in Query |
| **DDoS** | Medium | Vercel Edge Network 방어 + Cloudflare (optional) |

### 7.2 API Key Management

**Storage**:
```bash
# Vercel Environment Variables
AIRKOREA_API_KEY=xxxxxxxxxxxxx
KMA_API_KEY=yyyyyyyyyyyyy
KDCA_API_KEY=zzzzzzzzzzzzz
```

**Access**:
- API Routes 내에서만 `process.env.*` 접근
- 클라이언트 코드에 절대 노출 금지
- `.env.local` 파일 `.gitignore` 등록

**Rotation**:
- 분기별 API 키 재발급 권장
- 로깅 시 API 키 마스킹 (`***`)

### 7.3 SSRF Protection

**Whitelist Validation**:
```typescript
const ALLOWED_API_HOSTS = [
  'apis.data.go.kr',
];

function validateApiUrl(url: string): boolean {
  const urlObj = new URL(url);
  return ALLOWED_API_HOSTS.includes(urlObj.hostname);
}
```

**Request Interception**:
- 모든 외부 API 호출 전 URL 검증
- User-controlled URL 절대 사용 금지

### 7.4 Rate Limiting

**Vercel Rate Limiting** (Built-in):
- Anonymous: 10 requests/10s/IP
- 초과 시: 429 Too Many Requests

**Client-side Throttling**:
```typescript
// 사용자가 지역 변경 시 debounce 적용
const debouncedFetch = debounce(fetchScore, 500);
```

**Cache-first Strategy**:
- 캐시 히트 시 외부 API 호출 없음
- Rate Limiting 우회

### 7.5 CSP (Content Security Policy)

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' https://apis.data.go.kr https://va.vercel-scripts.com;
  frame-src 'none';
  object-src 'none';
```

**적용 위치**: `next.config.ts` headers

### 7.6 Data Privacy

**No PII Collection**:
- 로그인 없음
- 사용자 개인정보 미수집
- localStorage: 지역 선택 정보만 저장

**Analytics**:
- Vercel Analytics: 익명 이벤트만 수집
- IP 주소: 로깅하지 않음

---

## 8. Performance Design

### 8.1 Performance Budget

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| **TTFB** (Time to First Byte) | < 200ms (캐시 히트) | Vercel Analytics |
| **TTFB** (캐시 미스) | < 3s | Vercel Analytics |
| **LCP** (Largest Contentful Paint) | < 2.5s | Web Vitals |
| **FID** (First Input Delay) | < 100ms | Web Vitals |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Web Vitals |
| **Bundle Size** (JS) | < 100KB (gzip) | Next.js Build Analyzer |

### 8.2 Optimization Strategies

#### 8.2.1 Server-Side Rendering (SSR)

- `/today` 페이지: SSR 활용
- OG 메타 태그 동적 생성 (카카오톡 프리뷰)
- 초기 렌더링 속도 개선

#### 8.2.2 API Parallel Fetching

```typescript
// 4개 API 병렬 호출 (순차 호출 대비 4배 빠름)
const [airResult, forecastResult, uvResult, diseaseResult] =
  await Promise.allSettled([
    fetchAirKorea(),
    fetchKmaForecast(),
    fetchKmaUv(),
    fetchKdcaDisease(),
  ]);
```

#### 8.2.3 Code Splitting

- Dynamic Import for ShareButton
- Route-based Code Splitting (기본 제공)

```typescript
const ShareButton = dynamic(() => import('./ShareButton'), {
  ssr: false,
  loading: () => <Skeleton />,
});
```

#### 8.2.4 Image Optimization

- Next.js Image Component 사용
- AVIF/WebP 포맷 자동 변환
- Lazy Loading

### 8.3 Concurrent User Capacity

**목표**: 동시 사용자 1,000명

**Vercel Serverless 자동 확장**:
- Function 인스턴스: 요청 수에 비례하여 자동 생성
- Cold Start: 첫 요청 ~500ms 추가 지연
- Warm Function: 5~15분 유지

**Bottleneck 분석**:
- 외부 API 호출 제한:
  - 에어코리아: 500건/일 (개발), 10,000건/일 (운영)
  - 기상청: 10,000건/일
  - 질병관리청: 1,000건/일
- 캐시 적용 시:
  - 30분 TTL → 하루 최대 48회 실 호출/지역
  - 100개 지역 지원 시: 4,800건/일
  - **모든 API 한도 내 수용 가능**

### 8.4 Monitoring Metrics

**Vercel Analytics**:
- Page Views
- TTFB Distribution
- Web Vitals (LCP, FID, CLS)
- Edge Function Execution Time

**Custom Events**:
```typescript
analytics.track('score_calculated', {
  region: 'seoul_gangnam',
  score: 78,
  cacheHit: true,
  executionTime: 1200, // ms
});
```

---

## 9. Error Handling

### 9.1 Error Types & Recovery

| 에러 유형 | HTTP Status | 복구 전략 |
|----------|-------------|-----------|
| **Invalid Region** | 400 | 사용자에게 지역 목록 제시 |
| **API Timeout** | 504 | 개별 섹션 폴백 ("데이터 없음") |
| **API Rate Limit** | 429 | 캐시 반환 (stale cache) + 재시도 |
| **API Error (5xx)** | 502 | 개별 섹션 폴백 |
| **Network Error** | 503 | 전체 에러 페이지 ("잠시 후 다시 시도") |
| **Cache Error** | 500 | 캐시 무시, 직접 API 호출 |

### 9.2 Graceful Degradation

**원칙**: 4개 API 중 일부 실패 시에도 서비스 지속

```typescript
const [airResult, forecastResult, uvResult, diseaseResult] =
  await Promise.allSettled([...]);

// 개별 결과 처리
const airData = airResult.status === 'fulfilled'
  ? airResult.value
  : { fallback: true, score: 0, message: "대기질 데이터 없음" };
```

**섹션별 Fallback UI**:
```tsx
{airData.fallback ? (
  <div className="text-gray-400">대기질 데이터 없음</div>
) : (
  <AirQualityRow {...airData} />
)}
```

### 9.3 Error Logging

**Vercel Log Drain** 연동 (optional):
- 에러 로그 → External Service (Sentry, Datadog)
- 알림: Critical 에러 시 Slack/Email

**로그 포맷**:
```typescript
console.error('[API_ERROR]', {
  source: 'airkorea',
  error: error.message,
  region: 'seoul_gangnam',
  timestamp: new Date().toISOString(),
});
```

### 9.4 User-facing Error Messages

```typescript
const ERROR_MESSAGES = {
  INVALID_REGION: "지원하지 않는 지역입니다. 다시 선택해주세요.",
  API_TIMEOUT: "데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
  NETWORK_ERROR: "인터넷 연결을 확인해주세요.",
  UNKNOWN_ERROR: "일시적인 오류가 발생했습니다. 새로고침 해주세요.",
};
```

---

## 10. Deployment Architecture

### 10.1 Vercel Configuration

**vercel.json** (optional, 대부분 자동):
```json
{
  "regions": ["icn1"],
  "functions": {
    "src/app/api/today/score/route.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/today/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=1800, stale-while-revalidate=3600"
        }
      ]
    }
  ]
}
```

### 10.2 Environment Variables

**Production** (Vercel Dashboard):
```bash
# API Keys (서버사이드만 접근)
AIRKOREA_API_KEY=
KMA_API_KEY=
KDCA_API_KEY=

# Feature Flags
ENABLE_DISEASE_API=false  # 승인 대기 중일 때
```

**Development** (`.env.local`):
```bash
AIRKOREA_API_KEY=dev_key
KMA_API_KEY=dev_key
KDCA_API_KEY=dev_key
```

### 10.3 Domain Configuration

**Primary Domain**: `today.dodam.life`

**DNS Record** (Vercel 자동 설정):
```
CNAME today.dodam.life → cname.vercel-dns.com
```

**SSL/TLS**: Vercel 자동 발급 (Let's Encrypt)

### 10.4 Build & Deploy Pipeline

**Git Branch Strategy**:
```
main → Production (today.dodam.life)
```

**Vercel Automatic Deploy**:
- `git push origin main` → 자동 빌드 + 배포
- Preview Deployments: PR 생성 시 자동 Preview URL

**Build Command**:
```bash
npm run build
```

**Build Output**:
- `.next/` 디렉토리 생성
- Serverless Functions → Vercel Functions
- Static Assets → CDN

---

## 11. Monitoring & Observability

### 11.1 Metrics Collection

**Vercel Analytics** (Built-in):
- Page Views
- Unique Visitors
- Web Vitals (LCP, FID, CLS)
- Function Execution Time
- Edge Request Count

**Custom Events**:
```typescript
import { track } from '@vercel/analytics';

// 점수 조회
track('score_fetched', {
  region: 'seoul_gangnam',
  score: 78,
  cacheHit: true,
});

// 공유 버튼 클릭
track('share_clicked', {
  region: 'seoul_gangnam',
  method: 'native_share',
});
```

### 11.2 Logging Strategy

**Log Levels**:
- `ERROR`: API 실패, 예상치 못한 에러
- `WARN`: API 타임아웃, 폴백 적용
- `INFO`: API 호출 성공, 캐시 히트/미스
- `DEBUG`: (Development only) 상세 디버깅

**Log Format**:
```typescript
console.log('[INFO]', {
  event: 'api_call',
  source: 'airkorea',
  region: 'seoul_gangnam',
  duration: 1200,
  cacheHit: false,
  timestamp: new Date().toISOString(),
});
```

### 11.3 Alerting

**Critical Alerts** (Vercel Dashboard):
- Function Error Rate > 5%
- Function Execution Time > 10s
- Build Failure

**External Monitoring** (optional, Phase 2):
- Uptime Monitoring: UptimeRobot (무료)
- Error Tracking: Sentry

### 11.4 Health Check

**Endpoint**: `/api/health`

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
```

---

## 12. Architecture Decision Records

### ADR-001: 별도 프로젝트 vs 도담 내 라우트

**Status**: Accepted

**Context**:
"오늘도, 맑음"을 별도 Next.js 프로젝트로 만들지, 기존 도담 프로젝트 내 `/today` 라우트로 만들지 결정 필요.

**Decision**:
도담 프로젝트 내 `/today` 라우트로 구현.

**Rationale**:
- **인프라 비용 절감**: Vercel 프로젝트 추가 불필요
- **배포 파이프라인 통합**: 도담과 동일한 CI/CD
- **공통 의존성 공유**: Next.js, Tailwind, Supabase Client 등
- **도메인 설정 간편**: 서브도메인 추가만

**Consequences**:
- 긍정: 인프라 비용 0, 배포 간소화
- 부정: 도담과 의존성 결합 (단, `/today` 디렉토리 격리로 완화)

---

### ADR-002: Redis vs 인메모리 캐시

**Status**: Accepted

**Context**:
API 응답 캐싱을 위해 Redis 외부 서비스 사용 vs Node.js 인메모리 Map 사용.

**Decision**:
인메모리 Map 사용 (Vercel KV 미사용).

**Rationale**:
- **3일 MVP 일정**: Redis/Vercel KV 셋업 오버헤드 불필요
- **비용**: 인메모리 무료, Vercel KV 유료 ($10+/월)
- **공공 API 재호출 비용 낮음**: 무료 API, 응답 속도 1~2초
- **콜드 스타트 허용**: 첫 요청 느려도 UX 영향 최소 (07:20 사용 패턴)

**Consequences**:
- 긍정: 구현 간단, 비용 0
- 부정: Serverless 콜드 스타트 시 캐시 초기화 (첫 요청 2~3초)
- 완화: 트래픽 증가 시 Vercel KV로 전환 가능 (마이그레이션 1일)

---

### ADR-003: SSR vs CSR

**Status**: Accepted

**Context**:
`/today` 페이지를 서버 사이드 렌더링(SSR)으로 할지, 클라이언트 사이드 렌더링(CSR)으로 할지 결정.

**Decision**:
SSR (Server-Side Rendering).

**Rationale**:
- **OG 메타 태그**: 카카오톡 공유 시 동적 프리뷰 이미지 필수 → SSR 필수
- **초기 렌더링 속도**: CSR보다 First Paint 빠름
- **SEO**: 검색 엔진 크롤링 가능 (Phase 2 SEO 대비)

**Consequences**:
- 긍정: 카카오톡 공유 바이럴 기능 구현 가능
- 부정: Vercel Serverless Function 실행 비용 미세 증가 (무시 가능)

---

### ADR-004: 질병관리청 API 미승인 대응

**Status**: Accepted

**Context**:
질병관리청 API 승인에 2~5영업일 소요. 승인 대기 시 개발/배포 전략 필요.

**Decision**:
목데이터로 개발 진행, 배포 시 "준비 중" 폴백.

**Rationale**:
- **3일 MVP 일정 준수**: API 승인 대기 시 일정 초과
- **Graceful Degradation**: 감염병 섹션만 "데이터 준비 중" 표시, 나머지 서비스 정상 작동
- **Feature Flag**: `ENABLE_DISEASE_API=false` 환경변수로 제어

**Consequences**:
- 긍정: 일정 지연 없이 배포 가능
- 부정: 초기 사용자에게 감염병 실데이터 제공 불가 (단, 핵심 기능은 작동)

---

### ADR-005: 지역 범위 (전국 vs 주요 도시)

**Status**: Accepted

**Context**:
전국 250+ 시군구 모두 지원 vs 주요 도시만 지원.

**Decision**:
Phase 1: 서울 25개 구 + 17개 시도 대표 도시 (총 ~50개 지역)
Phase 2: 사용자 피드백 기반 확대

**Rationale**:
- **데이터 매핑 작업 최소화**: 250+ 지역 측정소명/격자/행정코드 매핑 = 2일 소요
- **80/20 법칙**: 사용자 80%는 주요 도시 거주
- **검증 후 확대**: Phase 1에서 리텐션 검증 후 지역 확대 결정

**Consequences**:
- 긍정: 개발 시간 단축, 핵심 사용자 커버
- 부정: 농어촌 사용자 제외 (단, Phase 2 확대 가능)

---

### ADR-006: 외부 API 타임아웃 전략

**Status**: Accepted

**Context**:
공공 API 응답 지연 시 사용자 대기 시간 최소화 필요.

**Decision**:
- 개별 API 타임아웃: 3초
- 전체 요청 타임아웃: 10초 (Vercel Function Limit)
- 타임아웃 시 해당 섹션만 폴백

**Rationale**:
- **사용자 경험**: 3초 이상 대기 = 이탈률 증가
- **Graceful Degradation**: 일부 API 실패 시에도 서비스 지속
- **Vercel Limit**: 10초 초과 시 Function Timeout

**Consequences**:
- 긍정: 사용자 대기 시간 최소화, 서비스 안정성 증가
- 부정: 일부 데이터 누락 가능 (단, 폴백 메시지로 설명)

---

## Version History

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2026-04-09 | 초안 작성 (C4 Level 1-3, API 설계, 캐싱, 보안, 성능, 배포) | Claude Opus 4.6 |

---

## References

- **PLAN.md**: `docs/today-malgeum/PLAN.md`
- **REQUIREMENTS.md**: `docs/today-malgeum/REQUIREMENTS.md`
- **RISKS.md**: `docs/today-malgeum/RISKS.md`
- **Idea Brief**: `docs/ideas/today-malgeum-2026-04-09.md`

---

**다음 단계**: `/da:design` 스킬로 UI/UX 상세 설계 또는 `/da:dev` 스킬로 구현 시작.
