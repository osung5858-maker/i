# "오늘도, 맑음" — 구현 계획서

> **서비스명**: 오늘도, 맑음
> **도메인**: today.dodam.life
> **작성일**: 2026-04-09
> **상태**: Plan 완료 → 승인 대기
> **요구사항**: `docs/today-malgeum/REQUIREMENTS.md`
> **리스크**: `docs/today-malgeum/RISKS.md`

---

## 1. 아키텍처 (C4 Level 1)

```
┌─────────────────────────────────────────────────────┐
│                    사용자 (부모)                       │
│              모바일 브라우저 (07:20 AM)                │
└─────────────────┬───────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────┐
│              today.dodam.life (Vercel)               │
│  ┌───────────────────────────────────────────────┐  │
│  │           Next.js 16 (App Router)              │  │
│  │                                                │  │
│  │  ┌──────────┐  ┌──────────────────────────┐   │  │
│  │  │  메인    │  │  API Routes               │   │  │
│  │  │  페이지  │  │  /api/score               │   │  │
│  │  │  (SSR)  │  │  /api/weather             │   │  │
│  │  │         │  │  /api/air                  │   │  │
│  │  │         │  │  /api/uv                   │   │  │
│  │  │         │  │  /api/disease              │   │  │
│  │  └──────────┘  └──────────┬───────────────┘   │  │
│  │                           │                    │  │
│  │                  ┌────────▼────────┐           │  │
│  │                  │  캐시 레이어    │           │  │
│  │                  │  (인메모리 Map) │           │  │
│  │                  └────────┬────────┘           │  │
│  └───────────────────────────┼───────────────────┘  │
└──────────────────────────────┼──────────────────────┘
                               │ 캐시 미스 시
                  ┌────────────┼────────────┐
                  ▼            ▼            ▼
          ┌──────────┐ ┌──────────┐ ┌──────────┐
          │에어코리아│ │ 기상청   │ │질병관리청│
          │PM2.5/10 │ │기온/강수 │ │감염병    │
          │         │ │바람/UV  │ │주간통계  │
          └──────────┘ └──────────┘ └──────────┘
```

### 핵심 설계 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| 프론트엔드 | Next.js 16 (App Router) | 도담 기존 스택, SSR로 OG 메타 동적 생성 |
| 백엔드 | Next.js API Routes | 별도 서버 불필요 |
| 캐시 | 인메모리 Map (Node.js) | 3일 MVP에 Redis 불필요. Vercel Serverless 함수 콜드 스타트 시 재구축 허용 |
| DB | 없음 | 로그인/개인화 없으므로 DB 불필요 |
| 배포 | Vercel | today.dodam.life 서브도메인. 도담 기존 인프라 |
| 스타일 | Tailwind CSS 4 | 도담 기존 스택 |
| 지역 저장 | localStorage | 클라이언트 사이드, 서버 부하 없음 |

---

## 2. 프로젝트 구조

```
"오늘도, 맑음"은 도담 모노레포 내 별도 앱이 아닌,
도담 프로젝트의 /today 라우트로 구현합니다.

src/
├── app/
│   └── today/
│       ├── page.tsx              # 메인 대시보드
│       ├── layout.tsx            # today 전용 레이아웃
│       └── opengraph-image.tsx   # 동적 OG 이미지
├── components/
│   └── today/
│       ├── ScoreCard.tsx         # 외출 점수 (중앙 큰 원)
│       ├── WeatherRow.tsx        # 기온/바람 한 줄
│       ├── AirQualityRow.tsx     # PM2.5 한 줄
│       ├── UVRow.tsx             # 자외선 한 줄
│       ├── DiseaseRow.tsx        # 감염병 한 줄 (트렌드 아이콘)
│       ├── ClothingCard.tsx      # 옷차림 추천 카드
│       ├── RegionSelector.tsx    # 지역 선택 드롭다운
│       └── ShareButton.tsx       # 카카오톡/공유 버튼
├── lib/
│   └── today/
│       ├── api/
│       │   ├── airkorea.ts       # 에어코리아 API 클라이언트
│       │   ├── kma-forecast.ts   # 기상청 단기예보 클라이언트
│       │   ├── kma-uv.ts         # 기상청 UV 클라이언트
│       │   ├── kdca-disease.ts   # 질병관리청 클라이언트
│       │   └── cache.ts          # 인메모리 캐시 유틸
│       ├── score.ts              # 100점 외출 점수 계산
│       ├── clothing.ts           # 옷차림 추천 로직
│       ├── grid-converter.ts     # 위경도 → 기상청 격자 변환
│       └── regions.ts            # 지역 코드 매핑 (시도/시군구/측정소)
└── app/
    └── api/
        └── today/
            ├── score/route.ts    # 통합 점수 API
            └── share/route.ts    # OG 이미지 생성 API
```

---

## 3. 데이터 흐름

```
사용자 → [지역 선택] → localStorage 저장
                      → /api/today/score?region=서울_강남구 호출

/api/today/score:
  1. 캐시 확인 (region + TTL별)
  2. 캐시 미스 시 4개 API 병렬 호출:
     ├── airkorea.ts  → PM2.5, PM10    (캐시 30분)
     ├── kma-forecast → 기온, 강수, 바람 (캐시 1시간)
     ├── kma-uv       → UV Index       (캐시 6시간)
     └── kdca-disease → 감염병 주간     (캐시 24시간)
  3. score.ts → 4개 결과 → 100점 계산
  4. clothing.ts → 기온+보정 → 옷차림 추천
  5. 통합 응답 반환

응답 JSON:
{
  "score": 78,
  "grade": "caution",         // "clear" | "caution" | "stay"
  "message": "조심해서 나가세요",
  "air": { "pm25": 16, "grade": "보통", "score": 28 },
  "weather": { "temp": 15, "tempMin": 8, "tempMax": 18, "rain": 30, "wind": 3.2, "score": 23 },
  "uv": { "index": 5, "grade": "보통", "score": 12 },
  "disease": { "items": [...], "score": 15 },
  "clothing": { "main": "긴팔 + 얇은 겉옷", "extras": ["오후 우산 챙기세요"] },
  "region": "서울 강남구",
  "updatedAt": "2026-04-09T07:10:00+09:00"
}
```

---

## 4. 지역 → API 매핑

```
사용자 지역 선택: "서울특별시 강남구"
                    │
    ┌───────────────┼───────────────────────────┐
    ▼               ▼                           ▼
에어코리아:     기상청:                    질병관리청:
stationName     nx=61, ny=126              sidoCd=11 (서울)
= "강남구"      (Lambert 격자 좌표)

기상청 UV:
areaNo = "1168000000" (강남구 행정코드)
```

**regions.ts**에 시도/시군구별 매핑 테이블 필요:
- 에어코리아 측정소명
- 기상청 격자 좌표 (nx, ny)
- 기상청 행정코드 (areaNo)
- 질병관리청 시도코드 (sidoCd)

---

## 5. Implementation Roadmap

### Phase 1: API 연동 + 점수 엔진 (Day 1)

| Task | 설명 | 예상 시간 |
|------|------|-----------|
| T-01 | 프로젝트 구조 셋업 (`/today` 라우트, lib 디렉토리) | 30분 |
| T-02 | 지역 매핑 데이터 작성 (regions.ts) — 주요 도시 17개 시도 + 서울 25개 구 | 1시간 |
| T-03 | 기상청 격자 변환 함수 (grid-converter.ts) | 30분 |
| T-04 | 인메모리 캐시 유틸 (cache.ts) — TTL별 Map 관리 | 30분 |
| T-05 | 에어코리아 API 클라이언트 + 테스트 | 1시간 |
| T-06 | 기상청 단기예보 API 클라이언트 + 테스트 | 1시간 |
| T-07 | 기상청 UV API 클라이언트 + 테스트 | 30분 |
| T-08 | 질병관리청 API 클라이언트 + 테스트 (목데이터 폴백 포함) | 1시간 |
| T-09 | 외출 점수 계산 엔진 (score.ts) | 1시간 |
| T-10 | 옷차림 추천 로직 (clothing.ts) | 30분 |
| T-11 | 통합 API Route (/api/today/score) — 4개 병렬 호출 + 점수 계산 | 1시간 |

### Phase 2: UI 구현 (Day 2)

| Task | 설명 | 예상 시간 |
|------|------|-----------|
| T-12 | today 레이아웃 (layout.tsx) — 헤더, 지역명, 컬러 시스템 | 30분 |
| T-13 | 외출 점수 카드 (ScoreCard.tsx) — 큰 원, 점수, 판정 메시지 | 1시간 |
| T-14 | 날씨/대기질/UV/감염병 한 줄 rows | 1.5시간 |
| T-15 | 옷차림 추천 카드 (ClothingCard.tsx) | 30분 |
| T-16 | 지역 선택기 (RegionSelector.tsx) + localStorage 연동 | 1시간 |
| T-17 | 메인 페이지 조립 (page.tsx) — 데이터 fetch + 렌더링 | 1시간 |
| T-18 | 컬러 시스템 적용 — 초록/노랑/빨강 배경 전환 | 30분 |
| T-19 | 모바일 최적화 — 390px~430px, 스크롤 없이 핵심 표시 | 30분 |

### Phase 3: 공유 + 배포 (Day 3)

| Task | 설명 | 예상 시간 |
|------|------|-----------|
| T-20 | 동적 OG 이미지 생성 (opengraph-image.tsx) | 1.5시간 |
| T-21 | 공유 버튼 (ShareButton.tsx) — navigator.share() + 폴백 | 30분 |
| T-22 | Vercel Analytics 연동 (이벤트 로깅) | 30분 |
| T-23 | today.dodam.life 도메인 설정 (Vercel) | 15분 |
| T-24 | 배포 + 실기기 테스트 (iOS Safari, Android Chrome) | 1시간 |
| T-25 | 최종 QA — 점수 계산 정확성, API 폴백, 반응형 | 1시간 |

---

## 6. Template Foundation

```yaml
frontend_template: none (제로베이스)
backend_template: none
strategy: zero-base
```

사유: "오늘도, 맑음"은 도담 프로젝트 내 `/today` 라우트로 구현. 기존 도담 Next.js 16 프로젝트에 라우트/컴포넌트를 추가하는 방식이므로 별도 템플릿 불필요.

---

## 7. 주요 기술 결정 (ADR 요약)

### ADR-01: 별도 프로젝트 vs 도담 내 라우트

- **결정**: 도담 프로젝트 내 `/today` 라우트
- **이유**: 별도 프로젝트 시 Vercel 프로젝트 추가 배포 필요. 도담 내 라우트로 인프라 비용 0, 배포 파이프라인 공유
- **트레이드오프**: 도담과 의존성 결합. 단, 코드는 `/today` 디렉토리에 격리

### ADR-02: Redis vs 인메모리 캐시

- **결정**: 인메모리 Map
- **이유**: 3일 MVP에 Redis 셋업 오버헤드 불필요. Vercel Serverless 콜드 스타트 시 캐시 소실되지만, 공공 API 재호출 비용이 낮음
- **트레이드오프**: 콜드 스타트 시 첫 요청 느림 (2~3초). 트래픽 증가 시 Vercel KV 전환 가능

### ADR-03: SSR vs CSR

- **결정**: SSR (서버 사이드 렌더링)
- **이유**: OG 메타 태그 동적 생성에 SSR 필수. 카카오톡 공유 시 프리뷰 이미지가 핵심 바이럴 요소
- **트레이드오프**: Vercel 서버 비용 미세 증가

### ADR-04: 질병관리청 API 미승인 시 대응

- **결정**: 목데이터로 개발 + 배포 시 "준비 중" 폴백
- **이유**: API 승인 2~5영업일 예상. 대기하면 3일 MVP 일정 불가
- **트레이드오프**: 감염병 섹션이 초기에 실데이터 없을 수 있음

---

## 8. 일정 요약

```
Day 1: API 연동 + 점수 엔진 (T-01 ~ T-11)
Day 2: UI 구현 (T-12 ~ T-19)
Day 3: 공유 + 배포 + QA (T-20 ~ T-25)

→ Day 3 저녁: today.dodam.life 라이브
→ Week 2~4: 사용자 반응 관찰 (D1/D7 리텐션, 시간대 패턴, 공유율)
→ Week 4: 데이터 기반 결정 (강화 / 피벗 / 버리기)
```

---

## 9. Complexity Estimate

```yaml
complexity: MODERATE
rationale:
  - 3 phases, 25 tasks
  - 신규 파일 15+ 개 생성 (Greenfield Guard → 최소 MODERATE)
  - 외부 API 4개 연동 (비동기/에러 처리 복잡도)
  - 좌표 변환, 캐시, 점수 계산 등 비즈니스 로직 존재
  - 단, AI/DB/인증 없어 COMPLEX 미만
```
