# 도담 (Dodam) 전체 QA 리포트
**생성일**: 2026-04-01
**프로젝트**: 도담 · AI 육아 파트너
**버전**: 0.1.0
**총 코드 라인**: 34,105 lines

---

## 📊 종합 평가

| 분야 | 상태 | 점수 |
|------|------|------|
| 코드 품질 | ⚠️ 개선 필요 | 65/100 |
| 보안 | ✅ 양호 | 85/100 |
| 성능 | ✅ 양호 | 80/100 |
| 접근성 | ⚠️ 개선 필요 | 60/100 |
| 타입 안정성 | 🔴 심각 | 45/100 |
| 빌드 | 🔴 실패 | 0/100 |

**총평**: 기능적으로는 완성도가 높으나, **타입 에러로 인한 빌드 실패**가 가장 큰 이슈입니다. 즉시 수정이 필요합니다.

---

## 🔴 **CRITICAL** - 즉시 수정 필요

### 1. **빌드 실패 (TypeScript 에러)**

**우선순위**: 🔴 P0 (최고)

```
❌ src/app/preparing/page.tsx:288:28
Type error: Argument of type 'unknown[]' is not assignable to parameter of type 'SetStateAction<string[]>'.
```

**영향도**: 프로덕션 배포 불가능

**수정 방법**:
```typescript
// Before (line 288)
setPrepTodayDone(types) // types는 unknown[]

// After
setPrepTodayDone(types as string[])
// 또는
const typedTypes: string[] = types.filter((t): t is string => typeof t === 'string')
setPrepTodayDone(typedTypes)
```

---

### 2. **TypeScript 컴파일 에러 (3건)**

**우선순위**: 🔴 P0

#### 2-1. GlobalHeader.tsx:243 - XIcon 미정의
```typescript
❌ error TS2304: Cannot find name 'XIcon'
```

**수정**: `XIcon` import 추가 또는 다른 아이콘으로 교체

#### 2-2. DevResetButton.tsx:32,34 - implicit any
```typescript
❌ error TS7031: Binding element 'children' implicitly has an 'any' type
❌ error TS7006: Parameter 'c' implicitly has an 'any' type
```

**수정**:
```typescript
// Before
function Component({ children }) {
  children.forEach(c => ...)
}

// After
function Component({ children }: { children: React.ReactNode }) {
  React.Children.forEach(children, (c: React.ReactElement) => ...)
}
```

---

### 3. **React Hooks Purity 위반**

**우선순위**: 🟠 P1

```typescript
❌ src/app/allergy/page.tsx:89:11
Cannot call impure function during render: Date.now()
```

**문제**: 렌더링 중 `Date.now()` 호출 → 순수성 위반

**수정**:
```typescript
// Before
const handleAdd = () => {
  const entry = {
    id: Date.now().toString(36), // ❌ 렌더 함수에서 호출
    ...
  }
}

// After
const handleAdd = () => {
  const entry = {
    id: crypto.randomUUID(), // ✅ 또는 useId() 훅 사용
    ...
  }
}
```

---

## 🟡 **HIGH** - 빠른 수정 권장

### 4. **타입 안정성 - Explicit Any 남용 (19건)**

**우선순위**: 🟠 P1

**영향 파일**:
- `src/app/api/ai-*.ts` (11건)
- `src/app/api/cron/*.ts` (2건)

**문제**:
```typescript
❌ error: Unexpected any. Specify a different type

// 예시
async function handler(req: any) { ... } // ❌
const data: any = await res.json() // ❌
```

**수정 방법**:
```typescript
// ✅ 올바른 타입 지정
import { NextRequest } from 'next/server'

async function handler(req: NextRequest) {
  const data: GeminiResponse = await res.json()
}

// 타입 정의
interface GeminiResponse {
  mainInsight?: string
  nextAction?: string
  // ...
}
```

---

### 5. **미사용 변수 (5건)**

**우선순위**: 🟡 P2

**파일**:
- `ai-name/route.ts:38` - `e` 미사용
- `ai-preparing/route.ts:196` - `e` 미사용

**수정**:
```typescript
// Before
} catch(e) { // ❌ 미사용

// After
} catch { // ✅ 변수 제거
```

---

## 🟢 **MEDIUM** - 개선 권장

### 6. **보안 - dangerouslySetInnerHTML 사용**

**우선순위**: 🟡 P2

**위치**: `src/app/layout.tsx:110, 124`

**현재 상태**:
- ✅ 테마 초기화 스크립트 (정적 코드, XSS 위험 없음)
- ✅ JSON-LD 스키마 (JSON.stringify 사용, 안전)

**평가**: 현재 사용은 안전하나, CSP 정책으로 추가 보호 중

---

### 7. **Console 로그 남용 (13건)**

**우선순위**: 🟢 P3

**파일**:
- `town/page.tsx:2`
- `api/analyze-checkup/route.ts:2`
- `DevResetButton.tsx:1`

**권장 사항**:
```typescript
// 개발 환경에서만 로그 출력
if (process.env.NODE_ENV === 'development') {
  console.log(...)
}
```

---

### 8. **접근성 (Accessibility) 이슈**

**우선순위**: 🟡 P2

**현황**:
- `alt=""` 빈 텍스트: 13건 (장식용 이미지는 OK)
- `aria-label` 사용: 21건 (양호)

**개선 사항**:
```tsx
// 의미 있는 이미지에는 alt 텍스트 필수
<Image src={...} alt="아이 프로필 사진" />

// 버튼에 aria-label 추가
<button aria-label="메뉴 열기">☰</button>
```

---

### 9. **ESLint 경고 (Android Native Bridge)**

**우선순위**: 🟢 P3

**위치**: `android/app/build/intermediates/.../native-bridge.js`

**내용**: Capacitor 자동 생성 파일의 경고 (16건)

**조치**: 무시 가능 (빌드 결과물)

---

## 📈 성능 분석

### 번들 크기

| 항목 | 크기 | 평가 |
|------|------|------|
| `.next/static` | 2.2 MB | ✅ 양호 |
| `public` | 48 MB | ⚠️ 큼 (이미지/폰트) |
| `node_modules` | 596 MB | ⚠️ 큼 |

**권장 사항**:
1. `public` 디렉토리 이미지 최적화 (WebP, AVIF)
2. 미사용 의존성 제거 (`npm prune`)
3. Dynamic Import로 코드 스플리팅 강화

---

### 성능 최적화 현황

✅ **잘 구현된 부분**:
- Image 최적화 (AVIF/WebP)
- Dynamic Import 사용 (FeedSheet, PoopSheet 등)
- 캐싱 전략 (Static: 1년, Images: 1일)
- 오프라인 우선 아키텍처 (IndexedDB)

⚠️ **개선 가능**:
- 60+ 페이지 라우트 (필요시 동적 로딩)
- AI API 응답 캐싱 강화

---

## 🔒 보안 분석

### ✅ 잘 구현된 보안 기능

1. **CSP (Content Security Policy)** 설정 ✅
   - XSS 방어
   - Inline script 제한 (테마 초기화 예외)

2. **보안 헤더** ✅
   - HSTS, X-Frame-Options, X-Content-Type-Options

3. **암호화** ✅
   - AES-GCM 사용 (`crypto.ts`)
   - 레거시 평문 → 암호화 마이그레이션

4. **Rate Limiting** ✅
   - API 요청 제한 (`rate-limit.ts`)

5. **Supabase RLS** ✅
   - Row Level Security 활성화

### ⚠️ 주의 필요

1. **민감 정보 하드코딩 검사** (30개 파일)
   - 대부분 환경변수 사용 중 (양호)
   - `push_token`, `invite_token` 등은 DB 저장 (OK)

2. **키즈노트 비밀번호 처리**
   - 암호화 저장 중 (`kn_credentials_enc`)
   - ✅ 평문 레거시 자동 마이그레이션

---

## 🧪 테스트 커버리지

**현황**: ❌ 테스트 파일 0개

**권장 사항**:
1. 유닛 테스트 (Jest + React Testing Library)
   - 주요 컴포넌트 (AiCareCard, BottomNav)
   - 유틸 함수 (crypto, care-flow)

2. E2E 테스트 (Playwright)
   - 온보딩 플로우
   - 기록 저장/동기화
   - 오프라인 시나리오

---

## 📋 상세 이슈 목록

### 🔴 P0 - 즉시 수정 (빌드 차단)

| # | 파일 | 라인 | 이슈 | 해결 방법 |
|---|------|------|------|-----------|
| 1 | `preparing/page.tsx` | 288 | `unknown[]` → `string[]` 타입 불일치 | Type assertion 또는 필터링 |
| 2 | `GlobalHeader.tsx` | 243 | `XIcon` 미정의 | Import 추가 |
| 3 | `DevResetButton.tsx` | 32, 34 | Implicit `any` 타입 | 명시적 타입 지정 |

### 🟠 P1 - 빠른 수정 권장

| # | 파일 | 라인 | 이슈 | 해결 방법 |
|---|------|------|------|-----------|
| 4 | `allergy/page.tsx` | 89 | React Purity 위반 (`Date.now()`) | `crypto.randomUUID()` 사용 |
| 5 | `api/ai-*.ts` | 다수 | Explicit `any` 남용 (19건) | 인터페이스 정의 |
| 6 | `api/ai-name/route.ts` | 38, 196 | 미사용 변수 `e` | 변수 제거 |

### 🟡 P2 - 개선 권장

| # | 파일 | 라인 | 이슈 | 해결 방법 |
|---|------|------|------|-----------|
| 7 | 전체 | - | Console.log 13건 | 개발 환경 조건부 로그 |
| 8 | 전체 | - | 빈 `alt=""` 13건 | 의미 있는 alt 텍스트 추가 |

### 🟢 P3 - 낮은 우선순위

| # | 파일 | 라인 | 이슈 | 해결 방법 |
|---|------|------|------|-----------|
| 9 | `android/.../native-bridge.js` | - | ESLint 경고 16건 | 무시 (빌드 결과물) |

---

## ✅ 액션 아이템

### 즉시 수정 (오늘)

- [ ] `preparing/page.tsx:288` 타입 에러 수정
- [ ] `GlobalHeader.tsx:243` XIcon import 추가
- [ ] `DevResetButton.tsx` implicit any 수정
- [ ] 빌드 성공 확인

### 단기 (이번 주)

- [ ] `allergy/page.tsx` React Purity 위반 수정
- [ ] API 라우트 19개 타입 정의 추가
- [ ] 미사용 변수 제거 (5건)
- [ ] Console.log 조건부 처리

### 중기 (이번 달)

- [ ] 접근성 개선 (alt 텍스트, ARIA 라벨)
- [ ] 번들 크기 최적화 (public 디렉토리)
- [ ] 유닛 테스트 작성 시작
- [ ] E2E 테스트 설정

---

## 📈 프로젝트 통계

- **총 파일**: 200+ 파일
- **총 코드 라인**: 34,105 lines
- **페이지 라우트**: 60+ 라우트
- **컴포넌트**: 100+ 컴포넌트
- **API 라우트**: 18개
- **테스트 커버리지**: 0% (미구현)

---

## 💡 권장 사항

### 1. **즉시 조치**
빌드 실패를 막기 위해 TypeScript 에러 3건을 최우선 수정하세요.

### 2. **타입 안정성 강화**
`any` 타입 19건을 구체적인 인터페이스로 교체하여 런타임 에러를 사전 방지하세요.

### 3. **테스트 도입**
핵심 기능(기록 저장, AI 분석, 오프라인 동기화)에 대한 테스트를 작성하세요.

### 4. **성능 모니터링**
프로덕션 환경에서 Web Vitals (LCP, FID, CLS)를 측정하여 사용자 경험을 개선하세요.

### 5. **보안 주기적 점검**
`npm audit`를 정기적으로 실행하여 의존성 취약점을 확인하세요.

---

## 📞 연락처

QA 관련 문의: [프로젝트 담당자]
이슈 트래킹: GitHub Issues

---

**QA 담당**: Claude Code
**검토 완료일**: 2026-04-01
