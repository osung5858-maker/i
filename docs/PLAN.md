# PLAN: 임신 중 검진 관리 + 기다림 페이지 콘텐츠 확장

## 개요

임신 중 모드의 **기다림(/waiting) 페이지**에 검진 스케줄링, 배우자 알림, 검진 결과 저장, 초음파 미디어 업로드 기능을 추가한다.

### 현황 분석
- 현재: `DEFAULT_CHECKUPS` 하드코딩 + `checkup_status` boolean 맵 (done/not-done)
- 부족: 실제 예약 날짜, 결과 기록, 사진/영상 업로드, 배우자 알림 없음
- 인프라: Push 알림(VAPID + push_tokens), Supabase Storage, preg_records 테이블 활용 가능

---

## Template Foundation
- **frontend_template**: none (기존 dodam 코드베이스에 기능 추가)
- **strategy**: incremental (기존 waiting/page.tsx PregnantWaitingPage에 섹션 추가)

---

## 기능 명세

### F-01: 검진 스케줄 관리
| 항목 | 내용 |
|------|------|
| **설명** | 주차별 기본 검진 + 사용자 커스텀 검진 날짜 예약/관리 |
| **데이터** | `preg_records` type='checkup_schedule' |
| **UI** | 기다림 페이지 내 "검진 일정" 카드 → 다음 검진 카운트다운 + 전체 타임라인 |

**상세:**
- DEFAULT_CHECKUPS 9개 항목에 `scheduledDate` 필드 추가
- 날짜 선택 → DatePicker 바텀시트
- "커스텀 검진 추가" (제목 + 날짜 + 메모)
- 검진 완료 토글 시 `completedDate` 기록
- D-day 카운트다운: "첫 초음파 D-3"

### F-02: 배우자 알림
| 항목 | 내용 |
|------|------|
| **설명** | 검진 예약/완료/결과 등록 시 배우자(파트너)에게 Push 알림 |
| **조건** | 파트너가 앱에 가입 + Push 구독 + 같은 가정(family) 연결 |
| **데이터** | 기존 `push_tokens` + `notification_log` 활용 |

**상세:**
- 검진 예약 시: "[태명] 검진 예약됐어요! [날짜] [검진명]"
- 검진 완료 시: "[태명] [검진명] 완료! 결과를 확인해보세요"
- 초음파 업로드 시: "[태명] 새 초음파 사진이 올라왔어요"
- API Route: `/api/notify-partner` → 파트너 user_id 조회 → Push 발송

### F-03: 검진 결과 저장
| 항목 | 내용 |
|------|------|
| **설명** | 각 검진별 결과(수치, 소견, 메모) 기록 |
| **데이터** | `preg_records` type='checkup_result' |
| **UI** | 검진 완료 시 결과 입력 바텀시트 |

**상세:**
- 기본 필드: 검진일, 담당의/병원명(선택), 메모
- 주요 수치: 체중, 혈압, 태아 크기 (검진 종류별 동적 필드)
- 소견: 자유 텍스트
- 결과: 정상/관찰필요/이상소견 선택

### F-04: 초음파 사진/영상 업로드
| 항목 | 내용 |
|------|------|
| **설명** | 검진 결과에 초음파 사진/영상 첨부 |
| **스토리지** | Supabase Storage `ultrasound/{user_id}/{checkup_id}/` |
| **제한** | 사진 최대 5장 + 영상 1개(30MB) per 검진 |

**상세:**
- 이미지: JPEG/PNG, 최대 10MB, 자동 리사이즈(1200px)
- 영상: MP4/MOV, 최대 30MB
- 갤러리 UI: 그리드 + 탭으로 전체 보기
- 타임라인: 주차별 초음파 변화 보기 (4주→8주→12주...)

---

## 데이터 모델

### 신규 preg_records type 추가

```sql
-- 기존 type CHECK에 추가
ALTER TABLE preg_records DROP CONSTRAINT preg_records_type_check;
ALTER TABLE preg_records ADD CONSTRAINT preg_records_type_check
  CHECK (type IN (
    'health', 'checkup', 'diary', 'mood', 'fetal_move', 'weight', 'supplement',
    'checkup_status', 'hospital_bag',
    'checkup_schedule', 'checkup_result'  -- 신규
  ));
```

### checkup_schedule value 구조
```jsonc
{
  "checkup_id": "first_us",       // DEFAULT_CHECKUPS id 또는 custom UUID
  "title": "첫 초음파",
  "scheduled_date": "2026-05-15",
  "scheduled_time": "10:30",       // 선택
  "hospital": "삼성서울병원",       // 선택
  "memo": "공복 필요",
  "completed": false,
  "completed_date": null,
  "is_custom": false               // 사용자 추가 검진 여부
}
```

### checkup_result value 구조
```jsonc
{
  "checkup_id": "first_us",
  "date": "2026-05-15",
  "hospital": "삼성서울병원",
  "doctor": "김OO",                // 선택
  "status": "normal",              // normal | observe | abnormal
  "memo": "심장 박동 확인, 정상",
  "measurements": {                // 검진별 동적 필드
    "fetal_heart_rate": 150,
    "crl": 1.2                     // Crown-Rump Length (cm)
  },
  "media": [                       // 초음파 미디어
    {
      "type": "image",
      "url": "https://...supabase.co/storage/v1/...",
      "thumbnail_url": "https://...",
      "uploaded_at": "2026-05-15T11:00:00Z"
    }
  ]
}
```

### Supabase Storage 버킷
```
ultrasound/
  └─ {user_id}/
     └─ {checkup_id}/
        ├─ img_001.jpg
        ├─ img_002.jpg
        └─ video_001.mp4
```

---

## UI 설계

### 기다림 페이지 — PregnantWaitingPage 탭 구조 변경

**현재 탭:** `일기·감성` | `발달·정보` | `혜택·준비`

**변경 후:** `일기·감성` | `검진 관리` | `발달·정보` | `혜택·준비`

### 검진 관리 탭 레이아웃

```
┌─────────────────────────────┐
│ ✦ 다음 검진                  │
│ ┌─────────────────────────┐ │
│ │ 정밀 초음파    D-5       │ │
│ │ 5/15(목) 10:30          │ │
│ │ 삼성서울병원              │ │
│ │ [완료] [결과 입력]       │ │
│ └─────────────────────────┘ │
│                             │
│ 📋 검진 타임라인            │
│ ── 8주 ✅ 첫 초음파 (완료)  │
│ ── 11주 ✅ NT 검사 (완료)   │
│ ── 16주 ◯ 쿼드 검사        │
│ ── 20주 📅 5/15 정밀 초음파 │
│ ...                         │
│                             │
│ [+ 검진 추가]               │
│                             │
│ 🖼 초음파 앨범              │
│ ┌─────┬─────┬─────┐        │
│ │8주  │11주 │20주 │        │
│ │ 🖼  │ 🖼  │ 🖼  │        │
│ └─────┴─────┴─────┘        │
│ [전체보기 →]                │
└─────────────────────────────┘
```

### 바텀시트: 검진 예약
```
┌─────────────────────────────┐
│ ─── (drag handle)           │
│ 검진 예약                    │
│                             │
│ 검진명: [정밀 초음파    ▼]  │
│ 날짜:   [2026-05-15    📅] │
│ 시간:   [10:30         🕐] │
│ 병원:   [삼성서울병원   📍] │
│ 메모:   [공복 필요...      ] │
│                             │
│ [취소]  [배우자에게도 알림 ✓] │
│         [저장]              │
└─────────────────────────────┘
```

### 바텀시트: 결과 입력 + 다음 검진 예약
```
┌─────────────────────────────┐
│ ─── (drag handle)           │
│ 정밀 초음파 결과             │
│                             │
│ 상태: [✅정상] [⚠️관찰] [❌이상] │
│ 메모: [심장 박동 정상...    ] │
│                             │
│ 📷 초음파 사진 (0/5)       │
│ [+ 사진 추가]               │
│                             │
│ 🎥 초음파 영상 (0/1)       │
│ [+ 영상 추가]               │
│                             │
│ ── 다음 검진 예약 ──        │
│ 검진: [NST 검사 (1차)  ▼]  │
│ 날짜: [2026-06-10     📅]  │
│ 시간: [10:30          🕐]  │
│ (자동으로 다음 검진 제안)    │
│                             │
│         [저장]              │
└─────────────────────────────┘
```

---

## 구현 순서

### Phase 1: DB + 검진 스케줄 (핵심)
1. Supabase migration: preg_records type 확장
2. `CheckupScheduleSection` 컴포넌트 — 타임라인 + 예약 바텀시트
3. 기다림 페이지에 "검진 관리" 탭 추가
4. 검진 예약 CRUD (생성/수정/완료/삭제)

### Phase 2: 검진 결과 + 미디어
5. `CheckupResultSheet` 컴포넌트 — 결과 입력 바텀시트
6. Supabase Storage 버킷 생성 + 업로드 유틸
7. 이미지/영상 업로드 + 썸네일 생성
8. `UltrasoundAlbum` 컴포넌트 — 주차별 초음파 갤러리

### Phase 3: 배우자 알림
9. `/api/notify-partner` API Route
10. 파트너 user_id 조회 로직 (family 연결)
11. 검진 예약/완료/업로드 시 알림 트리거
12. 알림 수신 설정 (on/off)

---

## 리스크

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | Supabase Storage 용량 | 영상 파일 크기 | 30MB 제한 + 클라이언트 압축 |
| R2 | 파트너 미가입 | 알림 발송 불가 | 카카오톡 공유 fallback |
| R3 | 오프라인 업로드 | 대용량 파일 끊김 | 재시도 로직 + 진행률 표시 |
| R4 | 개인정보 보호 | 초음파=민감 의료정보 | RLS + signed URL (1시간 만료) |

---

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `supabase/migrations/20260405_checkup_schedule.sql` | 신규: type 확장 + Storage 버킷 |
| `src/app/waiting/page.tsx` | 수정: PregnantWaitingPage에 검진 관리 탭 추가 |
| `src/components/pregnant/CheckupSchedule.tsx` | 신규: 검진 타임라인 + 예약 |
| `src/components/pregnant/CheckupResultSheet.tsx` | 신규: 결과 입력 바텀시트 |
| `src/components/pregnant/UltrasoundAlbum.tsx` | 신규: 초음파 갤러리 |
| `src/lib/supabase/pregRecord.ts` | 수정: checkup_schedule/result CRUD 함수 |
| `src/lib/supabase/storage.ts` | 신규: 초음파 업로드 유틸 |
| `src/app/api/notify-partner/route.ts` | 신규: 배우자 알림 API |
| `src/components/bnb/BottomNav.tsx` | 수정: 토스트 라벨 추가 |
