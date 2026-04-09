# "오늘도, 맑음" Security Architecture & Threat Model

> **버전**: 1.0
> **작성일**: 2026-04-09
> **상위 문서**: `ARCHITECTURE.md`
> **보안 프레임워크**: OWASP Top 10 2025, NIST Cybersecurity Framework

---

## 목차

1. [Security Overview](#1-security-overview)
2. [Threat Model (STRIDE)](#2-threat-model-stride)
3. [OWASP Top 10 Coverage](#3-owasp-top-10-coverage)
4. [API Key Management](#4-api-key-management)
5. [Network Security](#5-network-security)
6. [Data Privacy](#6-data-privacy)
7. [Security Monitoring](#7-security-monitoring)
8. [Incident Response](#8-incident-response)

---

## 1. Security Overview

### 1.1 Security Posture

"오늘도, 맑음"은 **비인증 공개 서비스**로, 개인정보를 수집하지 않는 Read-Only 대시보드입니다. 보안 위협의 대부분은 **외부 API 의존성**과 **API 키 노출**에서 발생합니다.

### 1.2 Security Principles

| 원칙 | 적용 |
|------|------|
| **Least Privilege** | API 키는 서버사이드만 접근, 최소 권한 |
| **Defense in Depth** | 다층 보안 (CSP, CORS, Rate Limiting) |
| **Fail Secure** | API 실패 시에도 안전한 폴백 |
| **Minimize Attack Surface** | No DB, No Auth, No User Input |
| **Zero Trust** | 외부 API URL 화이트리스트 검증 |

### 1.3 Security Zones

```
┌─────────────────────────────────────────────────────────┐
│                    Public Zone (Internet)                │
│  • 사용자 브라우저                                        │
│  • CDN (Vercel Edge)                                     │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS (TLS 1.3)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                Application Zone (Vercel)                 │
│  • Next.js Frontend (Public Assets)                      │
│  • Serverless Functions (API Routes)                     │
│    - Environment Variables (API Keys)                    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS + API Key
                        ▼
┌─────────────────────────────────────────────────────────┐
│              External API Zone (공공데이터포털)           │
│  • 에어코리아 API                                         │
│  • 기상청 API                                            │
│  • 질병관리청 API                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Threat Model (STRIDE)

### 2.1 STRIDE Analysis

#### Spoofing (신원 위장)

| 위협 | 설명 | 영향 | 완화 |
|------|------|------|------|
| **API 키 도용** | 공격자가 탈취한 API 키로 공공 API 호출 | Medium | 서버사이드 보관, 환경변수, 키 로테이션 |
| **Referer Spoofing** | 다른 도메인에서 API 키 재사용 | Low | Vercel Functions는 내부 네트워크 |

**완화 전략**:
- API 키는 `process.env.*`로만 접근 (클라이언트 노출 불가)
- `.env.local` 파일 `.gitignore` 등록
- Vercel Secrets 암호화 저장

#### Tampering (데이터 변조)

| 위협 | 설명 | 영향 | 완화 |
|------|------|------|------|
| **API 응답 변조** | 중간자 공격으로 API 응답 조작 | Medium | HTTPS 강제 (HSTS), TLS 1.3 |
| **캐시 포이즈닝** | 악의적 데이터를 캐시에 주입 | Low | 캐시 키 검증, TTL 제한 |

**완화 전략**:
- 모든 외부 API 호출 HTTPS 강제
- Strict-Transport-Security 헤더 적용
- 캐시 키에 지역+시간 포함 (충돌 방지)

#### Repudiation (부인)

| 위협 | 설명 | 영향 | 완화 |
|------|------|------|------|
| **악의적 요청 추적 불가** | 공격자의 대량 요청 출처 불명 | Low | Vercel Logs, IP 로깅 (선택) |

**완화 전략**:
- Vercel Analytics 이벤트 로깅
- 에러 로그에 타임스탬프 포함

#### Information Disclosure (정보 노출)

| 위협 | 설명 | 영향 | 완화 |
|------|------|------|------|
| **API 키 노출** | 클라이언트 코드나 로그에 API 키 노출 | **Critical** | 서버사이드 전용, 로그 마스킹 |
| **에러 메시지 상세 노출** | 스택 트레이스나 내부 경로 노출 | Low | Production 에러 메시지 일반화 |
| **소스 코드 노출** | `.env.local` 파일 Git 커밋 | **Critical** | `.gitignore` 필수 등록 |

**완화 전략**:
```typescript
// ✅ 올바른 방법
const apiKey = process.env.AIRKOREA_API_KEY; // 서버사이드만

// ❌ 잘못된 방법
const apiKey = 'abcd1234'; // 하드코딩 금지
```

```typescript
// 로그 마스킹
console.log(`API Key: ${apiKey.slice(0, 4)}***`);
```

#### Denial of Service (서비스 거부)

| 위협 | 설명 | 영향 | 완화 |
|------|------|------|------|
| **API Rate Limit 소진** | 공격자가 대량 요청으로 한도 소진 | Medium | 캐싱, Vercel Rate Limiting |
| **캐시 무력화 공격** | `nocache=1` 파라미터로 캐시 우회 | Low | 파라미터 인증 또는 제거 |
| **Serverless Cold Start 공격** | 대량 동시 요청으로 Function 생성 | Low | Vercel 자동 스케일링 |

**완화 전략**:
- 캐시 TTL 30분 → 실제 API 호출 최소화
- Vercel Rate Limiting: 10 req/10s/IP
- `nocache` 파라미터 프로덕션 비활성화

#### Elevation of Privilege (권한 상승)

| 위협 | 설명 | 영향 | 완화 |
|------|------|------|------|
| **관리자 기능 없음** | 인증 없는 서비스로 권한 개념 없음 | N/A | N/A |

**완화 전략**: 해당 없음 (비인증 서비스)

### 2.2 Threat Severity Matrix

```
     ┌──────────────────────────────────────────┐
     │   Impact                                  │
High │  [API 키 노출]      [SSRF 공격]          │
     │  (Critical)        (High)                 │
     │                                           │
Med  │  [API Rate Limit]  [캐시 포이즈닝]       │
     │  (Medium)          (Low)                  │
     │                                           │
Low  │  [에러 메시지]     [Cold Start 공격]     │
     │  (Low)             (Low)                  │
     └──────────────────────────────────────────┘
           Low           Med          High
                   Likelihood
```

---

## 3. OWASP Top 10 Coverage

### A01:2021 – Broken Access Control

**위험**: ❌ 해당 없음 (인증 없는 공개 서비스)

**완화**: N/A

---

### A02:2021 – Cryptographic Failures

**위험**: 🟡 Medium (API 키 전송 시)

**완화**:
- 모든 통신 HTTPS 강제
- TLS 1.3 사용 (Vercel 기본)
- API 키는 환경변수로 보관 (암호화)

**구현**:
```typescript
// next.config.ts
headers: [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
],
```

---

### A03:2021 – Injection

**위험**: 🟢 Low (DB 없음, User Input 최소)

**완화**:
- URL 파라미터: 화이트리스트 검증
- SQL Injection: DB 없음 (N/A)
- Command Injection: 없음

**구현**:
```typescript
// 지역 검증
const ALLOWED_REGIONS = ['서울특별시_강남구', ...];
if (!ALLOWED_REGIONS.includes(region)) {
  return Response.json({ error: 'INVALID_REGION' }, { status: 400 });
}
```

---

### A04:2021 – Insecure Design

**위험**: 🟡 Medium (외부 API 의존성)

**완화**:
- Graceful Degradation (API 실패 시 폴백)
- 캐시 TTL로 API 장애 시 Stale Cache 제공
- 개별 API 실패 시 서비스 지속

---

### A05:2021 – Security Misconfiguration

**위험**: 🟡 Medium (CSP, CORS 설정)

**완화**:
- CSP 헤더 엄격 설정
- CORS: Same-Origin (기본)
- 불필요한 HTTP 메서드 비활성화

**구현**:
```typescript
// next.config.ts
headers: [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "connect-src 'self' https://apis.data.go.kr",
      "img-src 'self' data: https:",
      "object-src 'none'",
    ].join('; '),
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
],
```

---

### A06:2021 – Vulnerable and Outdated Components

**위험**: 🟢 Low (정기 업데이트)

**완화**:
- Dependabot 활성화 (GitHub)
- `npm audit` 정기 실행
- Next.js, React 최신 LTS 버전 사용

**구현**:
```bash
# CI/CD 파이프라인
npm audit --production
npm audit fix
```

---

### A07:2021 – Identification and Authentication Failures

**위험**: ❌ 해당 없음 (인증 없음)

**완화**: N/A

---

### A08:2021 – Software and Data Integrity Failures

**위험**: 🟢 Low (CDN Subresource Integrity)

**완화**:
- Next.js 번들 무결성 검증 (기본 제공)
- Vercel Edge CDN 무결성

---

### A09:2021 – Security Logging and Monitoring Failures

**위험**: 🟡 Medium (로깅 최소)

**완화**:
- Vercel Logs 활성화
- 에러 로깅 (Sentry 연동 고려)
- Analytics 이벤트 추적

**구현**:
```typescript
console.error('[API_ERROR]', {
  source: 'airkorea',
  error: error.message,
  region: 'seoul_gangnam',
  timestamp: new Date().toISOString(),
});
```

---

### A10:2021 – Server-Side Request Forgery (SSRF)

**위험**: 🔴 High (외부 API 호출)

**완화**:
- 외부 API URL 화이트리스트
- User-controlled URL 절대 금지
- DNS Rebinding 방어

**구현**:
```typescript
const ALLOWED_API_HOSTS = [
  'apis.data.go.kr',
];

function validateApiUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_API_HOSTS.includes(urlObj.hostname);
  } catch {
    return false;
  }
}

// API 호출 전 검증
if (!validateApiUrl(apiUrl)) {
  throw new Error('Unauthorized API host');
}
```

---

## 4. API Key Management

### 4.1 Storage

**환경변수 (Vercel Secrets)**:

```bash
# Production (Vercel Dashboard)
AIRKOREA_API_KEY=xxxxxxxxxxxxxxxxxxx
KMA_API_KEY=yyyyyyyyyyyyyyyyyyyy
KDCA_API_KEY=zzzzzzzzzzzzzzzzzzz
```

**로컬 개발 (`.env.local`)**:

```bash
# .env.local (Git에 커밋 금지)
AIRKOREA_API_KEY=dev_key_abcd
KMA_API_KEY=dev_key_efgh
KDCA_API_KEY=dev_key_ijkl
```

**`.gitignore` 필수 등록**:

```
.env*.local
.env.production
```

### 4.2 Access Control

**서버사이드 전용**:

```typescript
// ✅ Correct: API Route에서만 접근
// src/app/api/today/score/route.ts
export async function GET(request: Request) {
  const apiKey = process.env.AIRKOREA_API_KEY;
  // ...
}

// ❌ Wrong: 클라이언트 컴포넌트에서 접근 금지
// src/components/today/ScoreCard.tsx
'use client';
const apiKey = process.env.AIRKOREA_API_KEY; // undefined (클라이언트)
```

### 4.3 Rotation Policy

**분기별 키 갱신**:

1. 공공데이터포털에서 신규 API 키 발급
2. Vercel Dashboard → Environment Variables 업데이트
3. 구 키 비활성화 (1주 후)
4. 로그에서 구 키 사용 여부 확인

**긴급 키 폐기 (노출 시)**:

1. 즉시 Vercel Dashboard에서 키 변경
2. 공공데이터포털에서 구 키 폐기
3. Git History 스캔 (노출 커밋 확인)
4. GitHub Secrets Scanning 알림 확인

### 4.4 Logging Mask

```typescript
function maskApiKey(key: string): string {
  if (key.length <= 8) return '***';
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
}

console.log(`Using API Key: ${maskApiKey(apiKey)}`);
// Output: "Using API Key: abcd********xyz9"
```

---

## 5. Network Security

### 5.1 TLS/SSL Configuration

**Vercel 자동 SSL (Let's Encrypt)**:

- TLS 1.3 (최신)
- HSTS Preload
- Certificate Pinning (Vercel 관리)

**HSTS 헤더**:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 5.2 CORS Policy

**Same-Origin 기본값**:

```typescript
// API Route는 Same-Origin만 허용
// CORS 헤더 불필요 (Next.js 기본값)
```

**OG Image 엔드포인트**:

```typescript
// /api/today/share (OG Image)
// → 카카오톡 크롤러 접근 허용
headers: {
  'Access-Control-Allow-Origin': '*', // OG Image만 허용
}
```

### 5.3 Firewall Rules (Vercel)

**Vercel Firewall (Pro Plan, optional)**:

- IP Whitelist (관리자 IP)
- Geo-blocking (한국 외 차단, optional)
- Rate Limiting (10 req/10s/IP)

### 5.4 DDoS Protection

**Vercel Edge Network**:

- Global CDN (자동 DDoS 방어)
- Rate Limiting (Built-in)
- Cloudflare 연동 (optional, Pro Plan)

---

## 6. Data Privacy

### 6.1 PII Collection

**수집 데이터**: 없음 (Zero PII)

| 데이터 | 수집 여부 | 저장 위치 |
|--------|----------|-----------|
| 이름, 이메일 | ❌ | N/A |
| 위치 정보 | ❌ (선택한 지역명만) | localStorage (클라이언트) |
| 쿠키 | ❌ | N/A |
| IP 주소 | ❌ (로깅 안 함) | N/A |

**Vercel Analytics**:

- 익명 이벤트만 수집 (IP 로깅 안 함)
- EU GDPR 준수

### 6.2 localStorage Data

**저장 내용**:

```json
{
  "selectedRegion": "서울특별시_강남구"
}
```

**특징**:

- 클라이언트 사이드만 접근 (서버 전송 안 함)
- 개인정보 아님 (공개 지역명)

### 6.3 Privacy Policy

**간소화된 개인정보 처리방침**:

```
"오늘도, 맑음"은 개인정보를 수집하지 않습니다.
- 로그인 불필요
- 이름, 이메일, 연락처 미수집
- 선택한 지역 정보는 기기에만 저장됩니다.
```

---

## 7. Security Monitoring

### 7.1 Logging Strategy

**Vercel Logs**:

```typescript
// 로그 레벨
enum LogLevel {
  ERROR = 'ERROR',   // API 실패, 예상치 못한 에러
  WARN = 'WARN',     // API 타임아웃, 폴백 적용
  INFO = 'INFO',     // API 호출 성공, 캐시 히트
  DEBUG = 'DEBUG',   // (Development only)
}

// 로그 포맷
console.error('[ERROR]', {
  level: 'ERROR',
  event: 'api_call_failed',
  source: 'airkorea',
  region: 'seoul_gangnam',
  error: error.message,
  timestamp: new Date().toISOString(),
});
```

### 7.2 Alerting Rules

**Vercel Dashboard Alerts**:

| 조건 | 임계값 | 알림 방법 |
|------|--------|-----------|
| Function Error Rate | > 5% | Email |
| Function Timeout | > 10s | Email |
| Build Failure | 1회 | Email |

**External Monitoring (optional, Phase 2)**:

- Sentry: 에러 트래킹
- UptimeRobot: 가용성 모니터링 (무료)

### 7.3 Security Audit Log

**주요 이벤트**:

- API 키 변경
- 환경변수 수정
- 배포 (Vercel Git Integration)

**Vercel Deployment Log**:

```
2026-04-09 07:00:00 - Deployment #123 started (main branch)
2026-04-09 07:02:30 - Environment variables loaded (3 secrets)
2026-04-09 07:05:00 - Build completed successfully
2026-04-09 07:05:30 - Deployment live: today.dodam.life
```

---

## 8. Incident Response

### 8.1 Incident Types

| 인시던트 | 심각도 | 대응 시간 |
|----------|--------|-----------|
| API 키 노출 | **Critical** | 즉시 (15분 이내) |
| DDoS 공격 | High | 1시간 이내 |
| API 장애 (전체) | High | 1시간 이내 |
| API 장애 (부분) | Medium | 4시간 이내 |
| 배포 실패 | Medium | 4시간 이내 |

### 8.2 Incident Response Plan

#### API 키 노출 (Critical)

**Step 1: 즉시 격리**

```bash
# Vercel Dashboard → Environment Variables
# 1. 즉시 새 API 키로 변경
# 2. Redeploy 트리거
```

**Step 2: 피해 평가**

```bash
# 공공데이터포털 → 내 API → 사용 통계
# - 비정상 호출 급증 확인
# - 노출된 키 사용 내역 확인
```

**Step 3: 복구**

- 구 키 공공데이터포털에서 폐기
- Git History 스캔 (노출 커밋 확인)
- 필요 시 커밋 히스토리 정리 (`git filter-branch`)

**Step 4: 사후 분석**

- 노출 원인 파악 (Git 커밋, 로그 노출, 코드 리뷰)
- 재발 방지 (`.gitignore` 검증, Pre-commit Hook)

#### DDoS 공격 (High)

**Step 1: 감지**

- Vercel Dashboard → Analytics → Unusual Traffic Spike

**Step 2: 완화**

```typescript
// Vercel Rate Limiting 강화 (vercel.json)
{
  "headers": [
    {
      "source": "/api/today/(.*)",
      "headers": [
        {
          "key": "X-RateLimit-Limit",
          "value": "5" // 10 → 5로 감소
        }
      ]
    }
  ]
}
```

**Step 3: 차단**

- Vercel Firewall (Pro Plan): IP 블랙리스트
- Cloudflare 연동 (optional)

#### 전체 API 장애 (High)

**Step 1: 폴백 활성화**

```bash
# Vercel Environment Variables
ENABLE_CACHE_STALE=true  # Stale Cache 제공
```

**Step 2: 사용자 알림**

```typescript
// API Route에서 전체 폴백 메시지
return Response.json({
  message: "외부 API 장애로 일부 데이터를 표시할 수 없습니다.",
  fallback: true,
}, { status: 200 });
```

### 8.3 Communication Plan

**내부 통지**:

- Slack 알림 (Vercel Integration)
- 담당자 Email

**외부 공지** (필요 시):

- 서비스 상태 페이지 (Vercel Status)
- 사용자 공지 배너 (API 장애 시)

---

## 9. Security Checklist

### 9.1 Development Phase

- [ ] `.env.local` 파일 `.gitignore` 등록
- [ ] API 키 하드코딩 금지 (코드 리뷰)
- [ ] 외부 API URL 화이트리스트 검증
- [ ] HTTPS 강제 (HTTP → HTTPS 리다이렉트)
- [ ] CSP 헤더 설정
- [ ] CORS 정책 확인

### 9.2 Deployment Phase

- [ ] Vercel Secrets에 API 키 등록
- [ ] Production 환경변수 검증
- [ ] HSTS Preload 신청
- [ ] Vercel Firewall 활성화 (optional)
- [ ] Vercel Analytics 활성화

### 9.3 Post-Deployment

- [ ] API 키 사용량 모니터링 (일일)
- [ ] Vercel Logs 검토 (주간)
- [ ] `npm audit` 실행 (주간)
- [ ] API 키 로테이션 (분기)
- [ ] Penetration Testing (선택, Phase 2)

---

## Version History

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0 | 2026-04-09 | 초안 작성 (STRIDE, OWASP Top 10, Incident Response) | Claude Opus 4.6 |

---

## References

- OWASP Top 10 2021: https://owasp.org/Top10/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- Vercel Security: https://vercel.com/security
