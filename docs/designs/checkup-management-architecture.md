# 임신 검진 관리 시스템 — 상세 설계 문서

> **DAVINCI Phase**: da:system
> **Project**: Dodam Pregnancy App (임신 중 모드 검진 관리)
> **Date**: 2026-04-03
> **Version**: 1.0

---

## 1. Executive Summary

### 1.1 개요
임신 중 모드의 **기다림(/waiting) 페이지**에 검진 스케줄링, 배우자 알림, 검진 결과 저장, 초음파 미디어 업로드 기능을 추가하는 시스템 아키텍처 설계.

### 1.2 핵심 목표
- 검진 일정 관리 (예약, 완료, 커스텀 검진)
- 검진 결과 기록 (상태, 수치, 메모)
- 초음파 사진/영상 업로드 및 갤러리
- 배우자에게 실시간 Push 알림

### 1.3 주요 의사결정
| Decision | Choice | Rationale |
|----------|--------|-----------|
| 데이터 저장 | Supabase (preg_records) | 기존 인프라 활용, RLS 기본 제공 |
| 미디어 스토리지 | Supabase Storage | 통합 스택, signed URL 지원 |
| 알림 전송 | Web Push (VAPID) | 기존 push_tokens 활용 |
| UI 패턴 | 바텀시트 + 타임라인 | 모바일 UX 최적화 |

---

## 2. System Context (C4 Level 1)

### 2.1 System Boundary

```
┌──────────────────────────────────────────────────────────┐
│                    Dodam PWA (Next.js)                   │
│                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   사용자     │───▶│  검진 관리   │───▶│ Supabase   │ │
│  │   (임산부)   │    │  시스템      │    │ Backend    │ │
│  └──────────────┘    └──────────────┘    └────────────┘ │
│         │                    │                  │        │
│         │                    ▼                  │        │
│         │            ┌──────────────┐          │        │
│         └───────────▶│ 배우자 알림  │──────────┘        │
│                      │ 시스템       │                    │
│                      └──────────────┘                    │
└──────────────────────────────────────────────────────────┘
              │                         │
              ▼                         ▼
      ┌──────────────┐         ┌──────────────┐
      │ Web Push API │         │Supabase      │
      │ (VAPID)      │         │Storage       │
      └──────────────┘         └──────────────┘
```

### 2.2 외부 시스템 연동
| System | Protocol | Purpose |
|--------|----------|---------|
| Supabase DB | PostgreSQL + RLS | 검진 데이터 저장 |
| Supabase Storage | HTTPS + signed URL | 초음파 미디어 스토리지 |
| Web Push Service | VAPID | 배우자 알림 전송 |
| Kakao Share | REST API | 미가입 파트너 공유 |

---

## 3. Container Architecture (C4 Level 2)

### 3.1 주요 컨테이너

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐      ┌────────────────┐                │
│  │ /waiting Page  │─────▶│ Checkup        │                │
│  │ (Pregnant)     │      │ Components     │                │
│  └────────────────┘      └────────────────┘                │
│         │                       │                            │
│         │                       ▼                            │
│         │        ┌──────────────────────────┐              │
│         │        │ API Routes               │              │
│         │        │ - /api/notify-partner    │              │
│         │        │ - /api/checkup/upload    │              │
│         │        └──────────────────────────┘              │
│         │                       │                            │
└─────────┼───────────────────────┼────────────────────────────┘
          │                       │
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Supabase Client  │    │ Push Manager     │
│ - pregRecord.ts  │    │ - subscribe.ts   │
│ - storage.ts     │    │ - config.ts      │
└──────────────────┘    └──────────────────┘
          │                       │
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ preg_records     │    │ push_tokens      │
│ - checkup_       │    │ notification_log │
│   schedule       │    └──────────────────┘
│ - checkup_result │
└──────────────────┘
          │
          ▼
┌──────────────────┐
│ ultrasound/      │
│ Storage Bucket   │
└──────────────────┘
```

### 3.2 컴포넌트 책임

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| CheckupScheduleSection | 검진 타임라인 UI, 예약 관리 | React Client Component |
| CheckupResultSheet | 결과 입력 바텀시트 | React + Framer Motion |
| UltrasoundAlbum | 주차별 초음파 갤러리 | React + Lazy Loading |
| CheckupScheduleService | 검진 CRUD 로직 | TypeScript Service |
| StorageService | 미디어 업로드/다운로드 | Supabase Storage SDK |
| PartnerNotifier | 배우자 알림 발송 | Web Push API |

---

## 4. Component Design (C4 Level 3)

### 4.1 Frontend Components

#### 4.1.1 CheckupScheduleSection
```typescript
// 검진 타임라인 + 예약 관리 컴포넌트
// Location: src/components/pregnant/CheckupSchedule.tsx

┌────────────────────────────────────────┐
│ CheckupScheduleSection                 │
├────────────────────────────────────────┤
│ Props:                                 │
│ - checkups: CheckupSchedule[]          │
│ - onSchedule: (data) => void           │
│ - onComplete: (id) => void             │
├────────────────────────────────────────┤
│ State:                                 │
│ - selectedCheckup: CheckupSchedule?    │
│ - showScheduleSheet: boolean           │
├────────────────────────────────────────┤
│ Responsibilities:                      │
│ 1. 타임라인 렌더링 (주차순)             │
│ 2. 다음 검진 D-day 계산                │
│ 3. 예약 바텀시트 트리거                │
│ 4. 완료 토글 처리                      │
└────────────────────────────────────────┘
```

**내부 구조:**
```
CheckupScheduleSection
├── NextCheckupCard (다음 검진 D-day)
├── CheckupTimeline
│   ├── CheckupTimelineItem (각 검진)
│   │   ├── WeekLabel
│   │   ├── CheckupName
│   │   ├── ScheduleInfo (날짜/병원)
│   │   └── ActionButtons (완료/결과)
│   └── AddCustomButton
└── ScheduleBottomSheet
    ├── CheckupSelector
    ├── DateTimePicker
    ├── HospitalInput
    └── NotifyPartnerToggle
```

#### 4.1.2 CheckupResultSheet
```typescript
// 검진 결과 입력 바텀시트
// Location: src/components/pregnant/CheckupResultSheet.tsx

┌────────────────────────────────────────┐
│ CheckupResultSheet                     │
├────────────────────────────────────────┤
│ Props:                                 │
│ - checkupId: string                    │
│ - checkupName: string                  │
│ - onSave: (result) => void             │
│ - onClose: () => void                  │
├────────────────────────────────────────┤
│ State:                                 │
│ - status: 'normal'|'observe'|'abnormal'│
│ - memo: string                         │
│ - uploadedMedia: MediaFile[]           │
│ - uploadProgress: number               │
├────────────────────────────────────────┤
│ Responsibilities:                      │
│ 1. 결과 상태 선택                      │
│ 2. 이미지/영상 업로드 관리              │
│ 3. 다음 검진 자동 제안                 │
│ 4. 업로드 진행률 표시                  │
└────────────────────────────────────────┘
```

**내부 구조:**
```
CheckupResultSheet
├── StatusSelector (정상/관찰/이상)
├── MemoInput
├── MediaUploadSection
│   ├── ImageUploader (최대 5장)
│   │   ├── ImagePreview[]
│   │   └── AddImageButton
│   ├── VideoUploader (최대 1개)
│   │   ├── VideoPreview
│   │   └── AddVideoButton
│   └── UploadProgress
├── NextCheckupSuggestion
│   ├── SuggestedCheckup
│   ├── DatePicker
│   └── SkipButton
└── SaveButton
```

#### 4.1.3 UltrasoundAlbum
```typescript
// 주차별 초음파 갤러리
// Location: src/components/pregnant/UltrasoundAlbum.tsx

┌────────────────────────────────────────┐
│ UltrasoundAlbum                        │
├────────────────────────────────────────┤
│ Props:                                 │
│ - checkupResults: CheckupResult[]      │
│ - onMediaClick: (url) => void          │
├────────────────────────────────────────┤
│ State:                                 │
│ - selectedWeek: number?                │
│ - lightboxOpen: boolean                │
│ - lightboxMedia: MediaFile?            │
├────────────────────────────────────────┤
│ Responsibilities:                      │
│ 1. 주차별 그리드 레이아웃               │
│ 2. 썸네일 lazy loading                 │
│ 3. 라이트박스 (전체화면)                │
│ 4. 영상 스트리밍 재생                  │
└────────────────────────────────────────┘
```

### 4.2 Backend Services

#### 4.2.1 CheckupScheduleService
```typescript
// Location: src/lib/supabase/pregRecord.ts 확장

interface CheckupSchedule {
  checkup_id: string
  title: string
  scheduled_date: string
  scheduled_time?: string
  hospital?: string
  memo?: string
  completed: boolean
  completed_date?: string
  is_custom: boolean
}

// 주요 함수
async function createCheckupSchedule(data: Omit<CheckupSchedule, 'checkup_id'>): Promise<void>
async function updateCheckupSchedule(checkupId: string, data: Partial<CheckupSchedule>): Promise<void>
async function completeCheckup(checkupId: string): Promise<void>
async function fetchCheckupSchedules(): Promise<CheckupSchedule[]>
async function deleteCheckupSchedule(checkupId: string): Promise<void>
```

#### 4.2.2 CheckupResultService
```typescript
// Location: src/lib/supabase/pregRecord.ts 확장

interface CheckupResult {
  checkup_id: string
  date: string
  hospital?: string
  doctor?: string
  status: 'normal' | 'observe' | 'abnormal'
  memo?: string
  measurements?: Record<string, number>
  media: MediaFile[]
}

interface MediaFile {
  type: 'image' | 'video'
  url: string
  thumbnail_url?: string
  uploaded_at: string
}

async function saveCheckupResult(data: CheckupResult): Promise<void>
async function fetchCheckupResults(): Promise<CheckupResult[]>
async function fetchCheckupResult(checkupId: string): Promise<CheckupResult | null>
```

#### 4.2.3 StorageService
```typescript
// Location: src/lib/supabase/storage.ts (신규)

interface UploadOptions {
  maxSizeBytes: number
  allowedTypes: string[]
  generateThumbnail?: boolean
}

async function uploadUltrasoundImage(
  checkupId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; thumbnail_url?: string }>

async function uploadUltrasoundVideo(
  checkupId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string }>

async function deleteUltrasoundMedia(url: string): Promise<void>

async function getSignedUrls(paths: string[]): Promise<string[]>
```

#### 4.2.4 PartnerNotificationService
```typescript
// Location: src/app/api/notify-partner/route.ts (신규)

interface NotificationPayload {
  type: 'checkup_scheduled' | 'checkup_completed' | 'media_uploaded'
  title: string
  body: string
  deeplink?: string
  metadata?: Record<string, unknown>
}

async function notifyPartner(payload: NotificationPayload): Promise<void>

// 내부 로직:
// 1. 현재 사용자 → user_id
// 2. user_profiles → partner_user_id 조회 (family 연결)
// 3. push_tokens → 파트너 토큰 조회
// 4. Web Push 발송
// 5. notification_log 기록
```

---

## 5. Data Model

### 5.1 Database Schema

#### 5.1.1 preg_records 확장
```sql
-- 기존 type 제약에 신규 타입 추가
ALTER TABLE preg_records DROP CONSTRAINT preg_records_type_check;
ALTER TABLE preg_records ADD CONSTRAINT preg_records_type_check
  CHECK (type IN (
    'health', 'checkup', 'diary', 'mood', 'fetal_move', 'weight', 'supplement',
    'checkup_status', 'hospital_bag',
    'checkup_schedule',  -- ★ 신규
    'checkup_result'     -- ★ 신규
  ));

-- value 필드는 JSONB로 각 type별 스키마 저장
```

#### 5.1.2 checkup_schedule value 스키마
```jsonc
{
  "checkup_id": "first_us",       // DEFAULT_CHECKUPS id 또는 UUID
  "title": "첫 초음파",
  "scheduled_date": "2026-05-15",
  "scheduled_time": "10:30",       // optional
  "hospital": "삼성서울병원",       // optional
  "memo": "공복 필요",             // optional
  "completed": false,
  "completed_date": null,
  "is_custom": false               // 커스텀 검진 여부
}
```

#### 5.1.3 checkup_result value 스키마
```jsonc
{
  "checkup_id": "first_us",
  "date": "2026-05-15",
  "hospital": "삼성서울병원",       // optional
  "doctor": "김OO",                // optional
  "status": "normal",              // normal | observe | abnormal
  "memo": "심장 박동 확인, 정상",
  "measurements": {                // optional, 검진별 동적 필드
    "fetal_heart_rate": 150,
    "crl": 1.2                     // Crown-Rump Length (cm)
  },
  "media": [
    {
      "type": "image",
      "url": "https://.../storage/v1/object/sign/ultrasound/...",
      "thumbnail_url": "https://.../thumbnail_...",
      "uploaded_at": "2026-05-15T11:00:00Z"
    },
    {
      "type": "video",
      "url": "https://.../video.mp4",
      "uploaded_at": "2026-05-15T11:05:00Z"
    }
  ]
}
```

### 5.2 Supabase Storage Bucket

#### 5.2.1 Bucket Structure
```
ultrasound/
  └─ {user_id}/
     └─ {checkup_id}/
        ├─ img_001.jpg         (원본)
        ├─ thumb_img_001.jpg   (300px 썸네일)
        ├─ img_002.jpg
        ├─ thumb_img_002.jpg
        └─ video_001.mp4
```

#### 5.2.2 Bucket Policy
```sql
-- RLS 정책: 본인 + 파트너만 접근
CREATE POLICY "Ultrasound media access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ultrasound'
  AND (
    -- 본인 폴더
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- 파트너 폴더 (family 연결)
    (storage.foldername(name))[1] IN (
      SELECT partner_user_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  )
);

-- Signed URL 설정: 1시간 만료
-- 클라이언트에서 getSignedUrls() 호출 시 expiresIn: 3600 설정
```

### 5.3 Entity Relationship

```
user_profiles
├── user_id (PK)
├── partner_user_id (FK → auth.users)
└── ...

preg_records
├── id (PK)
├── user_id (FK → auth.users)
├── record_date
├── type ('checkup_schedule' | 'checkup_result')
└── value (JSONB)
    └─ checkup_schedule
       └─ checkup_result
          └─ media[] → Supabase Storage

push_tokens
├── user_id (FK → auth.users)
└── token

notification_log
├── user_id (FK → auth.users)
├── type ('checkup_scheduled' | ...)
└── sent_at
```

---

## 6. API Design

### 6.1 API Endpoints

#### 6.1.1 검진 스케줄 API (Client-side)
```typescript
// Frontend에서 직접 Supabase 호출 (RLS 적용)

POST /preg_records (upsert via pregRecord.ts)
Request Body:
{
  record_date: "2026-05-15",
  type: "checkup_schedule",
  value: {
    checkup_id: "first_us",
    title: "첫 초음파",
    scheduled_date: "2026-05-15",
    scheduled_time: "10:30",
    hospital: "삼성서울병원",
    memo: "공복 필요",
    completed: false,
    is_custom: false
  }
}

Response: 201 Created

GET /preg_records?type=checkup_schedule
Response: 200 OK
[
  {
    id: "uuid",
    record_date: "2026-05-15",
    type: "checkup_schedule",
    value: { ... }
  }
]

DELETE /preg_records?id={uuid}
Response: 204 No Content
```

#### 6.1.2 검진 결과 API (Client-side)
```typescript
POST /preg_records
Request Body:
{
  record_date: "2026-05-15",
  type: "checkup_result",
  value: {
    checkup_id: "first_us",
    date: "2026-05-15",
    status: "normal",
    memo: "심장 박동 정상",
    media: [
      {
        type: "image",
        url: "https://...",
        thumbnail_url: "https://...",
        uploaded_at: "2026-05-15T11:00:00Z"
      }
    ]
  }
}

Response: 201 Created
```

#### 6.1.3 초음파 업로드 API
```typescript
POST /api/checkup/upload (신규 API Route)
Request: multipart/form-data
{
  checkup_id: "first_us",
  file: <File>,
  type: "image" | "video"
}

Response: 200 OK
{
  url: "https://.../storage/v1/object/sign/ultrasound/{user_id}/{checkup_id}/img_001.jpg",
  thumbnail_url: "https://.../thumb_img_001.jpg", // 이미지만
  uploaded_at: "2026-05-15T11:00:00Z"
}

Error Cases:
- 413: File too large (image >10MB, video >30MB)
- 415: Unsupported file type
- 409: Max files exceeded (image >5, video >1 per checkup)
```

#### 6.1.4 배우자 알림 API
```typescript
POST /api/notify-partner (신규 API Route)
Request Body:
{
  type: "checkup_scheduled" | "checkup_completed" | "media_uploaded",
  title: "[태명] 검진 예약됐어요!",
  body: "5/15(목) 10:30 첫 초음파",
  deeplink: "/waiting?tab=checkup",
  metadata: {
    checkup_id: "first_us",
    scheduled_date: "2026-05-15"
  }
}

Response: 200 OK
{
  success: true,
  sent_to_partner: true, // 파트너가 없거나 미가입 시 false
  fallback_kakao_share: true // 미가입 시 카카오톡 공유 링크 제공
}

Internal Flow:
1. auth.uid() → 현재 사용자
2. user_profiles → partner_user_id 조회
3. push_tokens → 파트너 토큰 조회
4. Web Push 발송 (web-push 라이브러리)
5. notification_log 기록
```

### 6.2 Error Handling

| HTTP Code | Error Type | Handling |
|-----------|-----------|----------|
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden (RLS) | Show "접근 권한 없음" toast |
| 409 | Conflict (duplicate) | Update instead of insert |
| 413 | Payload Too Large | Show "파일 크기 초과" toast + 압축 권장 |
| 415 | Unsupported Media | Show "지원하지 않는 파일 형식" toast |
| 500 | Server Error | Retry 3회 후 "잠시 후 다시 시도" toast |

---

## 7. Security Architecture

### 7.1 Authentication & Authorization

#### 7.1.1 RLS (Row Level Security) 정책
```sql
-- preg_records: 본인만 접근
CREATE POLICY "Users manage own preg_records"
ON preg_records FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ultrasound storage: 본인 + 파트너
CREATE POLICY "Ultrasound media access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ultrasound'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[1] IN (
      SELECT partner_user_id::text FROM user_profiles
      WHERE user_id = auth.uid()
    )
  )
);
```

#### 7.1.2 Signed URL 정책
- **만료 시간**: 1시간 (3600초)
- **갱신 전략**: 클라이언트에서 렌더링 직전 재발급
- **캐싱**: 브라우저 메모리만 (localStorage 금지 — 만료 URL 저장 방지)

### 7.2 Data Privacy

#### 7.2.1 민감 정보 분류
| Data Type | Sensitivity | Protection |
|-----------|-------------|------------|
| 초음파 사진/영상 | 높음 (의료 정보) | RLS + signed URL + 1시간 만료 |
| 검진 결과 (수치/소견) | 높음 | RLS + HTTPS only |
| 검진 일정 | 중간 | RLS |
| 병원명/담당의 | 중간 | RLS |

#### 7.2.2 GDPR/개인정보보호법 준수
- **사용자 동의**: 초음파 업로드 시 "파트너와 공유됩니다" 명시
- **삭제 권리**: 검진 삭제 시 Storage 파일도 자동 삭제
- **데이터 이동**: 향후 내보내기 기능 추가 계획

### 7.3 Threat Model (OWASP Top 10 기반)

| Threat | Mitigation |
|--------|------------|
| **A01: Broken Access Control** | Supabase RLS 강제 적용, partner 연결 검증 |
| **A02: Cryptographic Failures** | HTTPS only, signed URL 암호화 전송 |
| **A03: Injection** | Supabase SDK 사용 (Prepared Statements), SQL 직접 작성 금지 |
| **A04: Insecure Design** | 파트너 알림 전송 전 family 연결 검증 |
| **A05: Security Misconfiguration** | Storage bucket public 접근 금지, RLS 필수 |
| **A07: Identification Failures** | Supabase Auth 사용, JWT 기반 인증 |
| **A08: Software Integrity Failures** | npm audit 정기 실행, Supabase SDK 최신 버전 유지 |
| **A09: Logging Failures** | notification_log 기록, 업로드 실패 로그 수집 |
| **A10: SSRF** | 외부 URL 호출 없음 (Supabase 내부만) |

---

## 8. Performance & Scalability

### 8.1 Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| 검진 타임라인 렌더링 (FCP) | < 1.5s | Lighthouse |
| 초음파 썸네일 로딩 (LCP) | < 2.0s | Lighthouse |
| 업로드 진행률 갱신 (FPS) | 60 FPS | DevTools Performance |
| 검진 예약 저장 (API latency) | < 500ms | Supabase Dashboard |

### 8.2 Caching Strategy

#### 8.2.1 Client-side Caching
```typescript
// 검진 일정 캐시 (localStorage fallback)
// - 온라인: Supabase 실시간 조회
// - 오프라인: localStorage 캐시 읽기
// - 동기화: 재접속 시 자동 sync

localStorage.setItem('dodam_checkup_schedules_cache', JSON.stringify(schedules))
localStorage.setItem('dodam_checkup_schedules_sync_at', Date.now())

// 만료: 1시간
const CACHE_EXPIRY = 3600000
```

#### 8.2.2 Image Optimization
| Stage | Optimization |
|-------|--------------|
| Upload | 클라이언트 리사이즈 (max 1200px), JPEG quality 85% |
| Thumbnail | Supabase Image Transformation (width=300) |
| Delivery | Lazy loading + IntersectionObserver |
| CDN | Supabase CDN 자동 적용 |

### 8.3 Scalability Design

#### 8.3.1 Database Indexing
```sql
-- 검진 조회 최적화
CREATE INDEX IF NOT EXISTS idx_preg_records_checkup_schedule
ON preg_records(user_id, type, record_date DESC)
WHERE type IN ('checkup_schedule', 'checkup_result');
```

#### 8.3.2 Upload Concurrency
- **동시 업로드**: 최대 3개 파일 병렬 업로드
- **큐잉**: 3개 초과 시 순차 대기
- **실패 처리**: 재시도 3회, 실패 시 사용자에게 수동 재업로드 안내

#### 8.3.3 Storage Quotas
| User Type | Quota | Enforcement |
|-----------|-------|-------------|
| Free Tier | 검진당 최대 5 이미지 + 1 영상 | 클라이언트 검증 + DB 제약 |
| Premium (미래) | 검진당 최대 10 이미지 + 3 영상 | 동일 |

---

## 9. Deployment & Infrastructure

### 9.1 Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│               Vercel (Edge Network)              │
│  ┌────────────────────────────────────────────┐ │
│  │   Next.js App (SSR + SSG + ISR)           │ │
│  │   - /waiting page (SSR)                    │ │
│  │   - API Routes (/api/notify-partner)       │ │
│  └────────────────────────────────────────────┘ │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│            Supabase (Managed Services)           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐│
│  │ PostgreSQL  │  │  Storage    │  │   Auth   ││
│  │ (preg_      │  │ (ultrasound)│  │  (JWT)   ││
│  │  records)   │  │             │  │          ││
│  └─────────────┘  └─────────────┘  └──────────┘│
└──────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│           Web Push Service (VAPID)               │
│  - Chrome Push Service                           │
│  - Firefox Push Service                          │
│  - Safari Push Notification (미래)                │
└──────────────────────────────────────────────────┘
```

### 9.2 CI/CD Pipeline

#### 9.2.1 GitHub Actions Workflow
```yaml
name: Deploy Checkup Feature
on:
  push:
    branches: [main]
    paths:
      - 'src/components/pregnant/Checkup*'
      - 'src/lib/supabase/pregRecord.ts'
      - 'src/app/api/notify-partner/**'

jobs:
  test:
    - run: npm run lint
    - run: npm run test:e2e -- --grep "checkup"

  deploy:
    - run: vercel --prod
    - run: supabase db push (migration)
```

#### 9.2.2 Database Migration Strategy
```bash
# Phase 1: Schema 확장 (안전 — 기존 데이터 영향 없음)
supabase migration create checkup_schedule
# 20260405_checkup_schedule.sql:
# - ALTER TABLE preg_records DROP/ADD CONSTRAINT type_check
# - CREATE POLICY ultrasound_media_access

# Phase 2: Storage Bucket 생성
supabase storage create ultrasound --public false

# Phase 3: RLS Policy 적용
supabase db push
```

### 9.3 Monitoring & Observability

#### 9.3.1 Key Metrics
| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| 업로드 성공률 | Vercel Analytics | < 95% |
| 알림 발송률 | Supabase Logs | < 90% |
| API Response Time | Vercel Metrics | > 2s (P95) |
| Storage 용량 | Supabase Dashboard | > 80% quota |

#### 9.3.2 Error Tracking
```typescript
// Sentry 연동 (향후)
Sentry.captureException(error, {
  tags: {
    component: 'checkup-upload',
    checkup_id: checkupId,
    file_size: file.size,
  },
  level: 'error',
})
```

#### 9.3.3 Logging Strategy
```typescript
// notification_log 기록
await supabase.from('notification_log').insert({
  user_id: partnerUserId,
  type: 'checkup_scheduled',
  title: payload.title,
  body: payload.body,
  deeplink: payload.deeplink,
  sent_at: new Date().toISOString(),
})

// 업로드 실패 로그 (미래 분석용)
console.error('[Upload Failed]', {
  checkupId,
  fileName: file.name,
  fileSize: file.size,
  error: error.message,
})
```

---

## 10. Reliability & Disaster Recovery

### 10.1 Backup Strategy

| Data Type | Backup Frequency | Retention | Tool |
|-----------|------------------|-----------|------|
| preg_records | Daily (Supabase 자동) | 7 days | Supabase Backups |
| ultrasound media | 없음 (사용자 직접 저장 권장) | - | - |
| notification_log | Weekly | 30 days | Supabase Backups |

### 10.2 Failure Scenarios

#### 10.2.1 Supabase Outage
| Scenario | Impact | Mitigation |
|----------|--------|------------|
| DB 다운 | 검진 조회/저장 불가 | localStorage 캐시 읽기 → "잠시 후 다시 시도" 안내 |
| Storage 다운 | 업로드/조회 불가 | "미디어 서비스 점검 중" 안내, 재시도 버튼 |
| Auth 다운 | 로그인 불가 | 기존 세션 유지 (JWT 만료 전), 새 로그인 차단 |

#### 10.2.2 Push 발송 실패
```typescript
// 재시도 로직
async function notifyPartnerWithRetry(payload: NotificationPayload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await sendPush(payload)
      return { success: true }
    } catch (error) {
      if (i === retries - 1) {
        // 최종 실패 → Fallback: 카카오톡 공유 링크 생성
        return { success: false, fallback_kakao_share: true }
      }
      await sleep(1000 * (i + 1)) // 1s, 2s, 3s
    }
  }
}
```

### 10.3 RTO/RPO

| Service | RTO (Recovery Time) | RPO (Data Loss) |
|---------|---------------------|-----------------|
| 검진 조회 | < 5분 (캐시 fallback) | 0 (Supabase 자동 복구) |
| 검진 저장 | < 10분 | < 5분 (마지막 백업) |
| 미디어 업로드 | < 30분 | 없음 (실패 시 재업로드) |

---

## 11. Open Questions & Future Work

### 11.1 Open Questions

| # | Question | Decision Required By |
|---|----------|---------------------|
| Q1 | 파트너 연결 방식: user_profiles.partner_user_id vs caregivers 테이블? | Backend Architect |
| Q2 | 초음파 영상 압축: 클라이언트 vs 서버? | Frontend/Infra |
| Q3 | 검진 알림 시간: 예약 D-1 자동 발송? | Product Manager |
| Q4 | 커스텀 검진 주차 입력: 자동 계산 vs 수동 입력? | UX Designer |

### 11.2 Future Enhancements (Phase 2+)

| Feature | Priority | Complexity |
|---------|----------|------------|
| 검진 결과 PDF 출력 | Medium | Low |
| 검진 알림 스케줄러 (D-1 자동) | High | Medium |
| 초음파 AI 분석 (성별 예측) | Low | High |
| 병원 리뷰 연동 (places 테이블) | Medium | Medium |
| 검진 공유 (가족 전체) | High | Low |

---

## 12. Appendix

### 12.1 DEFAULT_CHECKUPS 상수
```typescript
// src/constants/checkups.ts (신규)
export const DEFAULT_CHECKUPS = [
  { id: 'first_visit', week: 4, title: '첫 방문 (임신 확인)' },
  { id: 'first_us', week: 8, title: '첫 초음파 (심박 확인)' },
  { id: 'nt_scan', week: 11, title: 'NT 검사 (목덜미 투명대)' },
  { id: 'quad_test', week: 16, title: '쿼드 검사 (기형아 검사)' },
  { id: 'detailed_us', week: 20, title: '정밀 초음파' },
  { id: 'glucose_test', week: 24, title: '임신성 당뇨 검사' },
  { id: 'nst_1', week: 28, title: 'NST 검사 (1차)' },
  { id: 'nst_2', week: 32, title: 'NST 검사 (2차)' },
  { id: 'nst_3', week: 36, title: 'NST 검사 (3차)' },
]
```

### 12.2 Migration File
```sql
-- supabase/migrations/20260405_checkup_schedule.sql

-- 1. preg_records type 확장
ALTER TABLE preg_records DROP CONSTRAINT IF EXISTS preg_records_type_check;
ALTER TABLE preg_records ADD CONSTRAINT preg_records_type_check
  CHECK (type IN (
    'health','checkup','diary','mood','fetal_move','weight','supplement',
    'checkup_status','hospital_bag','checkup_schedule','checkup_result'
  ));

-- 2. Storage Bucket 생성 (Supabase Dashboard에서 수동 또는 CLI)
-- supabase storage create ultrasound --public false

-- 3. RLS Policy
CREATE POLICY "Ultrasound media access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ultrasound'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[1] IN (
      SELECT partner_user_id::text FROM user_profiles
      WHERE user_id = auth.uid()
    )
  )
);

-- 4. Index 추가
CREATE INDEX IF NOT EXISTS idx_preg_records_checkup
ON preg_records(user_id, type, record_date DESC)
WHERE type IN ('checkup_schedule', 'checkup_result');

DO $$ BEGIN
  RAISE NOTICE '✅ Checkup management schema migration completed';
END $$;
```

### 12.3 File Structure
```
src/
├── app/
│   ├── waiting/
│   │   └── page.tsx (PregnantWaitingPage — "검진 관리" 탭 추가)
│   └── api/
│       ├── notify-partner/
│       │   └── route.ts (신규)
│       └── checkup/
│           └── upload/
│               └── route.ts (신규)
├── components/
│   └── pregnant/
│       ├── CheckupSchedule.tsx (신규)
│       ├── CheckupResultSheet.tsx (신규)
│       └── UltrasoundAlbum.tsx (신규)
├── lib/
│   ├── supabase/
│   │   ├── pregRecord.ts (확장)
│   │   └── storage.ts (신규)
│   └── push/
│       └── notify.ts (확장)
└── constants/
    └── checkups.ts (신규)

supabase/
└── migrations/
    └── 20260405_checkup_schedule.sql (신규)
```

---

## 13. ADRs (Architecture Decision Records)

### ADR-001: preg_records 테이블 재사용 vs 신규 checkups 테이블

**Status**: Accepted
**Date**: 2026-04-03

**Context**
검진 데이터를 저장하기 위해 두 가지 선택지 고려:
1. 기존 `preg_records` 테이블의 `type` 확장 (checkup_schedule, checkup_result)
2. 신규 `checkups` 테이블 생성 (별도 스키마)

**Decision**
preg_records 테이블을 재사용하기로 결정.

**Rationale**
- 기존 인프라 활용 (RLS, indexing 기반 동일)
- 검진도 "임신 기록"의 일부 → 개념적으로 통합 저장 합리적
- 마이그레이션 간소화 (type 제약만 확장)
- 향후 유저 레코드 통합 조회 시 일관성

**Consequences**
- 장점: 인프라 중복 없음, 빠른 구현
- 단점: 검진 전용 제약 조건 추가 어려움 (JSONB 스키마 검증 필요)

---

### ADR-002: 초음파 미디어 저장소 선택

**Status**: Accepted
**Date**: 2026-04-03

**Context**
초음파 사진/영상 저장 방식:
1. Supabase Storage
2. AWS S3 + CloudFront
3. Vercel Blob

**Decision**
Supabase Storage 사용.

**Rationale**
- 통합 스택 (DB + Storage 동일 플랫폼)
- RLS 정책 일관성 (DB RLS와 Storage policy 통합 관리)
- Signed URL 기본 지원 (1시간 만료)
- 추가 서비스 계정/비용 불필요

**Consequences**
- 장점: 개발 속도 향상, 보안 정책 통합
- 단점: Supabase 종속성 증가, CDN 성능 AWS보다 낮을 수 있음

---

### ADR-003: 배우자 알림 전송 방식

**Status**: Accepted
**Date**: 2026-04-03

**Context**
배우자에게 검진 알림 발송 방법:
1. Web Push (VAPID)
2. SMS (Twilio)
3. Email (SendGrid)

**Decision**
Web Push (VAPID) 우선, 미가입 시 카카오톡 공유 fallback.

**Rationale**
- 기존 Push 인프라 활용 (push_tokens, VAPID 키 존재)
- 무료 (SMS/Email은 단가 발생)
- 모바일 알림 UX 우수
- 파트너 미가입 시 카카오톡 공유로 대체 가능

**Consequences**
- 장점: 비용 0원, 즉시 구현 가능
- 단점: 파트너가 앱 미설치 시 알림 불가 (fallback 필요)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-03 | da:system | Initial architecture design |

---

**END OF DOCUMENT**
