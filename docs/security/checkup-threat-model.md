# 검진 관리 시스템 — 보안 위협 모델

> **OWASP Top 10 (2021) 기반 위협 분석**
> **Date**: 2026-04-03
> **Version**: 1.0

---

## 1. 시스템 자산 (Assets)

### 1.1 민감 데이터 분류
| 자산 | 민감도 | 저장 위치 | 보호 수준 |
|------|--------|-----------|-----------|
| 초음파 사진/영상 | ★★★ 높음 (의료정보) | Supabase Storage | RLS + Signed URL (1h) |
| 검진 결과 (수치/소견) | ★★★ 높음 | preg_records.value | RLS + HTTPS only |
| 검진 일정 (날짜/병원) | ★★ 중간 | preg_records.value | RLS |
| 배우자 연결 정보 | ★★ 중간 | user_profiles.partner_user_id | RLS |
| Push 토큰 | ★ 낮음 | push_tokens | RLS |

### 1.2 데이터 흐름 (Data Flow)
```
사용자 (HTTPS)
  → Next.js API Route (JWT 검증)
    → Supabase Client (RLS 적용)
      → PostgreSQL (preg_records)
      → Storage (ultrasound bucket)

배우자 (Web Push)
  ← Push Service (VAPID)
    ← /api/notify-partner (JWT 검증)
      ← Supabase (partner_user_id 조회)
```

---

## 2. OWASP Top 10 위협 분석

### A01: Broken Access Control (접근 제어 오류)

#### 위협 시나리오
| # | 공격 | 영향 |
|---|------|------|
| T1 | 타인의 초음파 사진 직접 URL 접근 | 개인정보 유출 (의료정보) |
| T2 | 파트너 아닌 제3자가 검진 결과 조회 | 프라이버시 침해 |
| T3 | API Route 직접 호출하여 타인 검진 수정 | 데이터 무결성 손상 |

#### 대응 (Mitigation)
```sql
-- RLS 정책 1: preg_records 본인만 접근
CREATE POLICY "preg_records_own" ON preg_records
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS 정책 2: Storage 본인 + 파트너만 접근
CREATE POLICY "ultrasound_own_partner" ON storage.objects
FOR SELECT USING (
  bucket_id = 'ultrasound'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] IN (
      SELECT partner_user_id::text FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

-- RLS 정책 3: 업로드는 본인 폴더만
CREATE POLICY "ultrasound_upload_own" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'ultrasound'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

```typescript
// API Route에서 추가 검증
// src/app/api/notify-partner/route.ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) return new Response('Unauthorized', { status: 401 })

const { data: profile } = await supabase
  .from('user_profiles')
  .select('partner_user_id')
  .eq('user_id', user.id)
  .single()

if (!profile?.partner_user_id) {
  return new Response('No partner linked', { status: 404 })
}
```

**검증 방법:**
```bash
# Penetration Test
curl -H "Authorization: Bearer <타인_JWT>" \
  https://dodam.app/api/checkup/upload \
  -F "checkup_id=first_us" \
  -F "file=@malicious.jpg"

# Expected: 403 Forbidden (RLS 거부)
```

---

### A02: Cryptographic Failures (암호화 실패)

#### 위협 시나리오
| # | 공격 | 영향 |
|---|------|------|
| T4 | Signed URL 만료 전 URL 유출 → 타인이 다운로드 | 초음파 사진 유출 |
| T5 | HTTP로 초음파 업로드 → 중간자 공격 (MITM) | 전송 중 데이터 탈취 |
| T6 | 평문 검진 결과 로그 저장 | 서버 로그 유출 시 의료정보 노출 |

#### 대응
```typescript
// 1. Signed URL 1시간 만료 강제
const { data } = await supabase.storage
  .from('ultrasound')
  .createSignedUrl(path, 3600) // 1 hour only

// 2. HTTPS Only 강제
// next.config.ts
{
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
      ]
    }]
  }
}

// 3. 민감 정보 로깅 금지
// ❌ console.log('Checkup result:', result.memo)
// ✅ console.log('Checkup result saved:', { checkup_id: result.checkup_id })
```

**검증 방법:**
```bash
# SSL Labs 테스트
https://www.ssllabs.com/ssltest/analyze.html?d=dodam.app

# Expected: A+ rating
```

---

### A03: Injection (SQL/NoSQL 인젝션)

#### 위협 시나리오
| # | 공격 | 영향 |
|---|------|------|
| T7 | 검진 메모에 SQL 구문 삽입 → DB 조작 | 데이터 변조/삭제 |
| T8 | 병원명에 XSS 스크립트 삽입 → 클라이언트 실행 | 세션 탈취 |

#### 대응
```typescript
// 1. Supabase SDK 사용 (Prepared Statements 자동)
// ✅ 안전
await supabase.from('preg_records').insert({
  type: 'checkup_schedule',
  value: { hospital: userInput } // 자동 이스케이프
})

// ❌ 절대 금지 — 직접 SQL 작성
// await supabase.rpc('raw_sql', { query: `INSERT INTO ... VALUES ('${userInput}')` })

// 2. XSS 방지 — React 자동 이스케이프 + CSP
// next.config.ts
{
  async headers() {
    return [{
      source: '/(.*)',
      headers: [{
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' https://*.supabase.co data:;"
      }]
    }]
  }
}

// 3. 입력 검증 (클라이언트 + 서버)
function validateCheckupInput(data: CheckupSchedule) {
  if (data.memo && data.memo.length > 500) throw new Error('Memo too long')
  if (data.hospital && /[<>"]/.test(data.hospital)) throw new Error('Invalid characters')
}
```

**검증 방법:**
```bash
# SQL Injection 테스트
curl -X POST /api/checkup/schedule \
  -d '{"hospital": "Test'; DROP TABLE preg_records;--"}'

# Expected: 400 Bad Request (검증 실패)
```

---

### A04: Insecure Design (안전하지 않은 설계)

#### 위협 시나리오
| # | 공격 | 영향 |
|---|------|------|
| T9 | 배우자 연결 없이 알림 발송 가능 → 스팸 | 서비스 어뷰징 |
| T10 | 초음파 파일 무제한 업로드 → Storage 폭주 | 비용 폭증 |

#### 대응
```typescript
// 1. 파트너 연결 검증 (비즈니스 로직)
async function notifyPartner(payload: NotificationPayload) {
  const partner = await getPartnerUser()
  if (!partner) {
    throw new Error('NO_PARTNER_LINKED')
  }
  // ... 알림 발송
}

// 2. 업로드 제한 (클라이언트 + 서버)
const MAX_IMAGES = 5
const MAX_VIDEOS = 1
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024 // 30MB

function validateMediaUpload(file: File, existingMedia: MediaFile[]) {
  if (file.type.startsWith('image/')) {
    const imageCount = existingMedia.filter(m => m.type === 'image').length
    if (imageCount >= MAX_IMAGES) throw new Error('MAX_IMAGES_EXCEEDED')
    if (file.size > MAX_IMAGE_SIZE) throw new Error('IMAGE_TOO_LARGE')
  }
  // ... video 검증
}
```

---

### A05: Security Misconfiguration (보안 설정 오류)

#### 위협 시나리오
| # | 공격 | 영향 |
|---|------|------|
| T11 | Storage Bucket public 접근 허용 | 전체 초음파 공개 |
| T12 | RLS 비활성화 상태 배포 | 모든 데이터 공개 |
| T13 | VAPID Private Key 노출 | 임의 사용자에게 Push 발송 |

#### 대응
```bash
# 1. Storage Bucket 설정 검증
supabase storage get ultrasound
# Expected: public: false

# 2. RLS 활성화 검증
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'preg_records';
# Expected: rowsecurity = true

# 3. 환경변수 관리
# .env.local (절대 커밋 금지)
VAPID_PRIVATE_KEY=<secret>
SUPABASE_SERVICE_ROLE_KEY=<secret>

# .env.example (커밋 OK)
VAPID_PRIVATE_KEY=your_private_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

```typescript
// 클라이언트에서 Private Key 사용 금지
// ✅ 서버 사이드만
// src/app/api/notify-partner/route.ts
import webpush from 'web-push'
webpush.setVapidDetails(
  'mailto:support@dodam.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY! // 서버 환경변수
)
```

---

### A07: Identification and Authentication Failures (인증 실패)

#### 위협 시나리오
| # | 공격 | 영향 |
|---|------|------|
| T14 | JWT 만료 후에도 API 접근 가능 | 세션 탈취 지속 |
| T15 | Refresh Token 탈취 → 영구 접근 | 계정 탈취 |

#### 대응
```typescript
// 1. JWT 만료 검증 (Supabase 자동)
const { data: { user } } = await supabase.auth.getUser()
if (!user) return new Response('Unauthorized', { status: 401 })

// 2. Refresh Token Rotation (Supabase 기본 설정)
// - Access Token: 1시간 만료
// - Refresh Token: 자동 회전 (재사용 불가)

// 3. 로그아웃 시 토큰 무효화
await supabase.auth.signOut()
```

---

### A08: Software and Data Integrity Failures (무결성 실패)

#### 위협 시나리오
| # | 공격 | 영향 |
|---|------|------|
| T16 | npm 패키지 악성 코드 → VAPID Key 탈취 | Push 스팸 발송 |
| T17 | Storage 파일 변조 → 초음파 조작 | 신뢰성 훼손 |

#### 대응
```bash
# 1. npm audit 정기 실행
npm audit --production
npm audit fix

# 2. Dependency 버전 고정
# package-lock.json 커밋 (자동 업데이트 방지)

# 3. Supabase Storage 버전 관리 (향후)
# - 파일 업로드 시 SHA-256 해시 기록
# - 다운로드 시 해시 검증
```

```typescript
// 파일 무결성 검증 (Phase 2)
async function uploadWithHash(file: File) {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  const hashHex = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const { data } = await supabase.storage
    .from('ultrasound')
    .upload(path, file, { metadata: { sha256: hashHex } })

  return { url: data.path, hash: hashHex }
}
```

---

### A09: Security Logging and Monitoring Failures (로깅 실패)

#### 위협 시나리오
| # | 공격 | 영향 |
|---|------|------|
| T18 | 불법 접근 시도 미탐지 | 공격 대응 지연 |
| T19 | 업로드 실패 원인 추적 불가 | 버그 수정 지연 |

#### 대응
```typescript
// 1. notification_log 기록
await supabase.from('notification_log').insert({
  user_id: partnerUserId,
  type: 'checkup_scheduled',
  title: payload.title,
  sent_at: new Date().toISOString(),
})

// 2. 업로드 실패 로그
try {
  await uploadUltrasound(file)
} catch (error) {
  console.error('[Upload Failed]', {
    userId: user.id,
    checkupId,
    fileName: file.name,
    fileSize: file.size,
    error: error.message,
    timestamp: new Date().toISOString(),
  })
  // 향후 Sentry 연동
}

// 3. 의심 활동 감지
// - 1분 내 10회 이상 업로드 시도 → Rate Limit
// - RLS 거부 5회 이상 → IP 차단 고려
```

---

### A10: Server-Side Request Forgery (SSRF)

#### 위협 시나리오
| # | 공격 | 영향 |
|---|------|------|
| T20 | 외부 URL 업로드 → 내부 서버 스캔 | 인프라 정보 유출 |

#### 대응
```typescript
// 1. 직접 파일 업로드만 허용 (URL 입력 금지)
// ✅ File 객체만
async function uploadUltrasound(file: File) { ... }

// ❌ URL 입력 금지
// async function uploadFromUrl(url: string) { ... }

// 2. 외부 API 호출 제한
// - Supabase API만 호출 (내부망)
// - 카카오톡 공유: 클라이언트에서 직접 호출 (서버 경유 없음)
```

---

## 3. 위협 우선순위 (Risk Matrix)

| 위협 ID | 위협 | 영향 | 가능성 | 우선순위 |
|---------|------|------|--------|----------|
| T1 | 타인 초음파 직접 접근 | 높음 | 중간 | ★★★ Critical |
| T2 | 타인 검진 결과 조회 | 높음 | 중간 | ★★★ Critical |
| T4 | Signed URL 유출 | 높음 | 낮음 | ★★ High |
| T8 | XSS 공격 | 중간 | 중간 | ★★ High |
| T11 | Storage 공개 설정 | 높음 | 낮음 | ★★ High |
| T13 | VAPID Key 노출 | 중간 | 낮음 | ★ Medium |
| T10 | 무제한 업로드 | 낮음 | 중간 | ★ Medium |
| T18 | 로깅 부족 | 낮음 | 높음 | ★ Medium |

---

## 4. 보안 체크리스트 (배포 전 필수)

### 4.1 인프라
- [ ] Supabase RLS 활성화 확인 (`preg_records`, `storage.objects`)
- [ ] Storage Bucket `ultrasound` public=false 확인
- [ ] HTTPS Only (HSTS 헤더 적용)
- [ ] CSP 헤더 적용

### 4.2 인증/권한
- [ ] API Route에서 `auth.getUser()` 검증
- [ ] 파트너 연결 검증 (`partner_user_id` 존재 확인)
- [ ] Signed URL 만료 시간 1시간 설정

### 4.3 데이터 검증
- [ ] 업로드 파일 크기 검증 (이미지 10MB, 영상 30MB)
- [ ] 업로드 파일 개수 검증 (이미지 5개, 영상 1개)
- [ ] 입력 문자열 길이 검증 (메모 500자, 병원명 100자)
- [ ] XSS 방지 (React 자동 이스케이프 + CSP)

### 4.4 환경변수
- [ ] `.env.local` 파일 `.gitignore` 등록
- [ ] `VAPID_PRIVATE_KEY` 서버 환경변수만 사용
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 노출 금지

### 4.5 모니터링
- [ ] `notification_log` 테이블 기록 확인
- [ ] 업로드 실패 로그 수집
- [ ] Vercel Analytics 활성화

---

## 5. Penetration Testing 시나리오

### 5.1 접근 제어 테스트
```bash
# Test 1: 타인 검진 조회 시도
curl -H "Authorization: Bearer <user_A_jwt>" \
  https://dodam.app/api/checkup?user_id=<user_B_id>
# Expected: 403 Forbidden

# Test 2: 타인 초음파 직접 URL 접근
curl https://.../storage/v1/object/public/ultrasound/<user_B_id>/img.jpg
# Expected: 404 Not Found (public 버킷 아님)

# Test 3: Signed URL 만료 확인
curl "<signed_url_from_2_hours_ago>"
# Expected: 403 Forbidden (URL 만료)
```

### 5.2 주입 공격 테스트
```bash
# Test 4: XSS 시도
curl -X POST /api/checkup/schedule \
  -d '{"hospital": "<script>alert(1)</script>"}'
# Expected: 저장 성공하지만, 렌더링 시 이스케이프됨

# Test 5: SQL Injection
curl -X POST /api/checkup/schedule \
  -d '{"memo": "Test'; DELETE FROM preg_records;--"}'
# Expected: 저장되지만 Supabase SDK가 자동 이스케이프
```

### 5.3 Rate Limiting 테스트
```bash
# Test 6: 업로드 폭주
for i in {1..20}; do
  curl -X POST /api/checkup/upload -F "file=@test.jpg"
done
# Expected: 10회 이후 429 Too Many Requests (향후 구현)
```

---

## 6. 사고 대응 계획 (Incident Response)

### 6.1 초음파 데이터 유출 시
1. **즉시 조치**
   - 해당 파일 Storage에서 삭제
   - Signed URL 만료 대기 (1시간)
   - 사용자에게 알림 발송

2. **조사**
   - `notification_log` + Supabase Logs 확인
   - 접근 IP, 시간, user_id 추적

3. **재발 방지**
   - RLS 정책 재검토
   - Signed URL 만료 시간 단축 (30분)

### 6.2 VAPID Key 유출 시
1. **즉시 조치**
   - 새 VAPID Key 생성
   - 모든 사용자 Push 재구독 요청

2. **조사**
   - `.env.local` 커밋 이력 확인
   - npm 패키지 악성 코드 스캔

3. **재발 방지**
   - `.env.local` `.gitignore` 강제
   - Pre-commit hook: 환경변수 스캔

---

## 7. Compliance & Privacy

### 7.1 개인정보보호법 준수
- **수집 동의**: 초음파 업로드 시 "파트너와 공유됩니다" 명시
- **목적 제한**: 검진 기록 용도로만 사용
- **보관 기간**: 사용자 계정 삭제 시 즉시 삭제
- **삭제 권리**: 검진 삭제 → Storage 파일 자동 삭제

### 7.2 의료정보 보호
- **암호화**: HTTPS 전송, Supabase 저장 시 자동 암호화 (AES-256)
- **접근 제한**: 본인 + 파트너만 (RLS)
- **로그 보관**: 30일 후 자동 삭제

---

## 8. References

- OWASP Top 10 (2021): https://owasp.org/Top10/
- Supabase Security Best Practices: https://supabase.com/docs/guides/auth/row-level-security
- Web Push Security: https://datatracker.ietf.org/doc/html/rfc8030
- 개인정보보호법: https://www.law.go.kr/법령/개인정보보호법

---

**Version**: 1.0
**Last Updated**: 2026-04-03
**Next Review**: 2026-07-03 (3개월 후)
