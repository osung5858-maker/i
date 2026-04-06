# Checkup Schedule Feature — Development Report

**Date**: 2026-04-06
**Feature**: 임신 검진 관리 시스템 (Pregnancy Checkup Management)
**Status**: Complete (Phase 1-3 + E2E + UI Redesign)

---

## Executive Summary

임산부를 위한 검진 일정 관리 시스템을 구현했습니다. 9가지 기본 검진(첫 방문~NST 3차)의 타임라인 표시, 예약/완료/결과입력 워크플로, 초음파 미디어 업로드, 배우자 알림까지 전 과정을 다룹니다. 추가로 타임라인 UI를 라디오버튼 스타일에서 구분된 상태 아이콘이 있는 수직 타임라인으로 전면 재설계했고, Playwright 기반 E2E 테스트 21건을 작성했습니다.

| Metric | Value |
|--------|-------|
| Total LOC (feature) | 2,329 |
| Components | 4 (Schedule, Result, Album, Types) |
| E2E Test Cases | 21 |
| API Routes | 2 (AI analyze, cron reminder) |
| Commits | 3 feature + UI redesign + E2E |
| Default Checkups | 9 |
| Files Changed | 43 (991 insertions, 698 deletions) |

---

## Phase Breakdown

### Phase 1: Schedule Management

| Item | Status |
|------|--------|
| 9 default checkup timeline | Done |
| Schedule with date/time/hospital/memo | Done |
| Edit/cancel scheduling | Done |
| Custom checkup creation & deletion | Done |
| D-day countdown card | Done |
| Progress tracking (completed/total) | Done |

**Key Commit**: `bbe1f59` feat: Phase 1 -- checkup schedule management

### Phase 2: Results + Media Upload

| Item | Status |
|------|--------|
| Result entry form (status/memo/hospital/doctor) | Done |
| Status badges (normal/observe/abnormal) | Done |
| Image upload (max 5, JPEG/PNG) | Done |
| Video upload (max 1, 30MB, MP4/MOV) | Done |
| Ultrasound album with lightbox | Done |
| Next checkup auto-scheduling from result | Done |

**Key Commit**: `1b286ce` feat: Phase 2 -- checkup results + media upload

### Phase 3: Partner Notifications

| Item | Status |
|------|--------|
| Notify on schedule (`scheduled`) | Done |
| Notify on completion (`completed`) | Done |
| Notify on result entry (`result`) | Done |
| Notify on ultrasound upload (`ultrasound`) | Done |

**Key Commit**: `85c6a2d` feat: 임신 검진 관리 시스템

### UI Redesign (Post-Phase)

| Item | Status |
|------|--------|
| Remove radio-button-style circles | Done |
| Rounded square status icons | Done |
| Vertical connector lines (green for completed) | Done |
| Content cards with status-dependent backgrounds | Done |
| Colored week badges | Done |
| D-day badge (solid when <= 3 days) | Done |

### E2E Testing (Post-Phase)

| Item | Status |
|------|--------|
| CheckupPage page object | Done |
| Timeline rendering tests (5) | Done |
| Schedule flow tests (5) | Done |
| Edit/Complete tests (2) | Done |
| Custom checkup tests (3) | Done |
| Status icon tests (3) | Done |
| Accessibility tests (3) | Done |
| Auth skip when no credentials | Done |

---

## File Inventory

### Components (src/components/pregnant/CheckupSchedule/)

| File | Lines | Purpose |
|------|-------|---------|
| CheckupScheduleSection.tsx | 703 | Main timeline + schedule sheet |
| CheckupResultSheet.tsx | 550 | Result input + media upload |
| UltrasoundAlbum.tsx | 178 | Media gallery with lightbox |
| types.ts | 56 | TypeScript interfaces |

### Supporting Files

| File | Lines | Purpose |
|------|-------|---------|
| src/constants/checkups.ts | 13 | 9 default checkup definitions |
| src/lib/push/checkupNotify.ts | 54 | Partner notification helper |
| src/lib/utils/checkup-schedule.ts | 64 | Infant checkup schedule calc |
| src/app/api/analyze-checkup/route.ts | 114 | Gemini AI form analysis |
| src/app/api/cron/checkup/route.ts | 156 | Weekly reminder cron |

### Database

| File | Purpose |
|------|---------|
| supabase/migrations/20260405_checkup_schedule.sql | Schema + RLS + storage |

### Tests

| File | Lines | Purpose |
|------|-------|---------|
| tests/checkup-schedule.spec.ts | 356 | 21 E2E test cases |
| tests/page-objects/CheckupPage.ts | 258 | Page object model |
| tests/global.setup.ts | 161 | Auth setup (rewritten) |
| tests/fixtures/auth.fixture.ts | +6 | CheckupPage fixture added |
| playwright.config.ts | +4 | @next/env for .env.local |

### Documentation

| File | Purpose |
|------|---------|
| docs/designs/checkup-implementation-guide.md | Implementation guide |
| docs/designs/checkup-management-architecture.md | Architecture design |
| docs/security/checkup-threat-model.md | Security threat model |
| docs/api/checkup-api-spec.yaml | API specification |
| docs/diagrams/checkup-*.mmd (3 files) | Mermaid diagrams |

---

## Test Coverage

### E2E Test Suites (21 tests)

```
Checkup Schedule
  Timeline Rendering
    - should display checkup timeline with default items
    - should show progress count (completed/total)
    - should display all 9 default checkup titles
    - should display week badges for each checkup
    - should show "예약하기" button on pending checkups
  Schedule a Checkup
    - should open schedule form when clicking 예약하기
    - should save schedule with date
    - should display D-day badge after scheduling
    - should show next checkup card after scheduling
    - should cancel schedule form
  Edit Schedule
    - should open edit form with existing data
  Complete Checkup
    - should mark checkup as completed
  Custom Checkup
    - should add a custom checkup
    - should show delete button only for custom checkups
    - should delete a custom checkup
  Timeline Status Icons
    - should show pending icon for unscheduled checkups
    - should show calendar icon for scheduled checkups
    - should show checkmark icon for completed checkups
  Accessibility
    - should pass axe-core checks on checkup timeline
    - should have proper ARIA roles on timeline
    - should have labeled add button
```

### Auth Requirement

Tests skip gracefully when `SUPABASE_SERVICE_ROLE_KEY` is not in `.env.local`. The global setup:
1. Loads `.env.local` via `@next/env`
2. Creates test user with service role key
3. Signs in via `signInWithPassword` for real cookies
4. Saves storageState with Supabase auth cookies
5. If sign-in fails, writes minimal state and tests skip

---

## Architecture Notes

### Data Flow

```
User -> CheckupScheduleSection -> preg_records (type: checkup_schedule)
     -> CheckupResultSheet     -> preg_records (type: checkup_result)
                               -> storage/ultrasound (media files)
     -> checkupNotify          -> /api/push/partner -> FCM/WebPush
```

### Middleware Auth

The Next.js middleware (`src/lib/supabase/middleware.ts`) checks Supabase session cookies on every request. Protected routes (including `/waiting`) redirect to `/onboarding` without valid auth. The `proxy.ts` wrapper catches errors (e.g., missing env vars) and passes through.

### Timeline UI Architecture

```
CheckupScheduleSection
  ├── NextCheckupCard (D-day countdown)
  ├── Progress counter (X/Y 완료)
  ├── <ol> Timeline (role="list")
  │   └── CheckupTimelineItem[] (role="listitem")
  │       ├── Status icon (rounded-lg, colored)
  │       ├── Vertical connector line
  │       └── Content card (status-dependent bg)
  │           ├── Title + week badge
  │           ├── Schedule details (date/hospital)
  │           └── Action buttons (state-dependent)
  ├── Add custom button (aria-label)
  └── ScheduleBottomSheet (date/time/hospital/memo form)
```

---

## Known Issues & Technical Debt

| Issue | Severity | Notes |
|-------|----------|-------|
| `ultrasound` storage bucket requires manual creation | Medium | Cannot be auto-created via migration |
| E2E tests need SUPABASE_SERVICE_ROLE_KEY | Low | Tests skip gracefully without it |
| Partner notifications need `partner_user_id` set | Low | Part of family linking feature |
| No offline support for schedule changes | Low | Requires service worker sync |

---

## Environment Requirements

```bash
# Required for full functionality
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...              # AI analysis
CRON_SECRET=...                 # Weekly reminder

# Required for E2E tests
SUPABASE_SERVICE_ROLE_KEY=...   # Test user creation
TEST_USER_EMAIL=...             # Optional (default: e2e-test@dodam.local)
TEST_USER_PASSWORD=...          # Optional (default: TestPassword123!)
```
