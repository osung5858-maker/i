# 보안 & 최적화 권장사항

생성일: 2026-04-02
우선순위: 선택적 개선 (출시 블로커 아님)

---

## ✅ 현재 보안 상태: 우수

### 검증 완료 항목
- ✅ **API 키 하드코딩**: 0건 (모두 환경 변수 사용)
- ✅ **비밀번호/토큰**: 0건 (하드코딩 없음)
- ✅ **eval() 사용**: 0건 (안전)
- ✅ **innerHTML 직접 조작**: 0건 (안전)
- ✅ **이미지 alt 속성**: 모두 존재
- ✅ **민감 정보 노출**: 없음

### 안전한 코드
- `dangerouslySetInnerHTML`: 1건 (JSON-LD 구조화 데이터 - 안전)

---

## 🟡 선택적 개선 사항

### 1. Console Logs 제거 (P1 - 권장)

**현황**: 43건의 console.log/error/warn 발견

**위치**:
- `src/app/town/page.tsx`
- `src/app/api/*/route.ts` (여러 API 라우트)
- `src/components/ads/GoogleAdBanner.tsx`

**영향**:
- 프로덕션 번들 크기 미세 증가
- 브라우저 성능 미세 저하
- 민감 정보 노출 가능성 (낮음)

**해결 방법**:
```bash
# 개발 환경에서만 로그 출력
if (process.env.NODE_ENV === 'development') {
  console.log('디버그 정보')
}

# 또는 환경별 로거 래퍼 사용
const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') console.log(...args)
  },
  error: (...args: any[]) => console.error(...args) // 에러는 항상 로그
}
```

**권장 작업**:
```bash
# API 라우트의 디버그 로그만 제거 (유지보수 시 헷갈릴 수 있음)
find src/app/api -name "*.ts" -exec sed -i '' '/console\.log/d' {} \;
```

---

### 2. setTimeout/setInterval Cleanup (P2 - 선택)

**현황**: 72건의 타이머 사용 (cleanup 누락 가능성)

**영향**:
- 컴포넌트 언마운트 후에도 타이머 실행 가능
- 메모리 누수 가능성 (매우 낮음 - 대부분 짧은 타이머)

**예시 패턴**:
```tsx
// ❌ Before (메모리 누수 가능성)
useEffect(() => {
  setTimeout(() => setShow(true), 100)
}, [])

// ✅ After (cleanup)
useEffect(() => {
  const timer = setTimeout(() => setShow(true), 100)
  return () => clearTimeout(timer)
}, [])
```

**권장 작업**:
- 출시 후 점진적 개선
- 긴 주기 타이머(> 5초)만 우선 처리

---

### 3. 프로덕션 최적화 (P2 - 선택)

#### A. 환경 변수 직접 접근 (72건)
**현황**: `process.env.NEXT_PUBLIC_*` 직접 접근

**개선**:
```typescript
// lib/config.ts
export const config = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://dodam.life',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // ... 중앙 관리
} as const

// 사용처
import { config } from '@/lib/config'
console.log(config.siteUrl)
```

**장점**:
- 타입 안전성 향상
- 기본값 중앙 관리
- 환경 변수 누락 시 즉시 감지

---

### 4. 이미지 최적화 (P2 - 선택)

**현황**:
- `public/` 폴더 크기: 3.19MB
- Next.js Image 컴포넌트 미사용 (대부분 `<img>` 태그 직접 사용)

**개선**:
```tsx
// Before
<img src="/icon-512.png" alt="아이콘" />

// After (자동 최적화)
import Image from 'next/image'
<Image src="/icon-512.png" alt="아이콘" width={512} height={512} />
```

**장점**:
- 자동 WebP 변환
- Lazy loading
- 반응형 크기 조정
- 번들 크기 감소 (~30%)

---

### 5. API 라우트 Rate Limiting (P3 - 선택)

**현황**: AI API 엔드포인트에 Rate Limit 없음

**위치**:
- `/api/ai-preparing`
- `/api/ai-pregnant`
- `/api/ai-parenting`
- `/api/ai-card`

**개선**:
```typescript
// lib/rate-limit.ts
import { RateLimiterMemory } from 'rate-limiter-flexible'

const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 60, // per minute
})

export async function checkRateLimit(userId: string) {
  try {
    await rateLimiter.consume(userId)
    return true
  } catch {
    return false
  }
}

// API 라우트에서
if (!await checkRateLimit(userId)) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

**장점**:
- Gemini API 비용 절감
- 악용 방지
- 서버 부하 감소

---

## 🚀 성능 최적화 기회

### 번들 분석
```bash
npm run build
npx @next/bundle-analyzer
```

**예상 개선**:
- 이미지 최적화: -30% 번들 크기
- 코드 스플리팅: -15% 초기 로드
- Tree-shaking: -5% 미사용 코드 제거

---

## 📊 우선순위 요약

### 출시 전 (선택)
- [ ] ⏳ API 라우트 console.log 제거 (10분)
- [ ] ⏳ 환경 변수 중앙 관리 (30분)

### 출시 후 1개월
- [ ] ⏳ setTimeout/setInterval cleanup (2-3시간)
- [ ] ⏳ Next.js Image 마이그레이션 (4-6시간)
- [ ] ⏳ 번들 분석 및 최적화 (1일)

### 출시 후 3개월
- [ ] ⏳ Rate Limiting 도입 (4시간)
- [ ] ⏳ Sentry 에러 추적 (2시간)
- [ ] ⏳ 성능 모니터링 (Vercel Analytics)

---

## 🛡️ 보안 체크리스트 (현재 상태)

| 항목 | 상태 | 비고 |
|------|------|------|
| HTTPS 강제 | ✅ | Vercel 자동 적용 |
| 환경 변수 관리 | ✅ | `.gitignore` 포함 |
| API 키 보안 | ✅ | 서버 전용 키 분리 |
| XSS 방지 | ✅ | React 자동 escaping |
| CSRF 방지 | ✅ | Supabase 내장 |
| SQL Injection | ✅ | Supabase RLS + 파라미터화 |
| 인증/인가 | ✅ | Supabase Auth |
| Rate Limiting | 🟡 | 권장 (비필수) |
| 콘텐츠 보안 정책 | 🟡 | 권장 (비필수) |

---

## 💡 결론

### 현재 보안 상태
**✅ 프로덕션 레벨 (A등급)**

- 핵심 보안 사항 모두 충족
- 민감 정보 노출 없음
- React/Next.js 기본 보안 기능 활용

### 최적화 여지
**🟡 개선 가능 (B등급)**

- Console logs 제거로 미세 개선 가능
- 이미지 최적화로 성능 향상 가능
- Rate limiting으로 비용 절감 가능

### 권장 사항
**즉시 출시 가능합니다!**

위 개선 사항들은 모두 **선택적**이며, 출시를 막는 요소가 아닙니다.

출시 후 사용자 피드백을 받으면서 점진적으로 개선하는 것을 권장합니다.

---

## 🔧 즉시 적용 가능한 Quick Wins

### 1. API 로그 정리 (5분)
```bash
# API 라우트의 디버그 로그만 제거
find src/app/api -name "*.ts" -exec sed -i '' '/console\.log.*DEBUG/d' {} \;
```

### 2. 환경 변수 검증 추가 (5분)
```typescript
// lib/config.ts
function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing env: ${key}`)
  return value
}

export const config = {
  geminiApiKey: requireEnv('GEMINI_API_KEY'),
  // ...
}
```

### 3. Vercel 환경 변수 체크 (배포 시)
```bash
# Vercel Dashboard에서 모든 환경 변수 설정 확인
# - NEXT_PUBLIC_* (8개)
# - Server-side keys (3개)
```

---

## 📈 추가 모니터링 권장

### Vercel Analytics (무료)
- 페이지 로드 시간
- Core Web Vitals
- 사용자 지역 분포

### Sentry (선택)
- 에러 추적
- 성능 모니터링
- 사용자 피드백

### Google Analytics 4 (선택)
- 사용자 행동 분석
- 전환율 추적
- A/B 테스트

---

**최종 결론**: 현재 상태로 안전하게 출시 가능합니다! 🚀

위 개선사항들은 출시 후 여유가 생겼을 때 천천히 적용하시면 됩니다.
