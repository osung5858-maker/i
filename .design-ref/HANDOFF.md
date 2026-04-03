# da:design → da:dev Handoff — Checkup Management Phase 1

## Handoff Summary

**Phase**: da:design (완료) → da:dev (대기)
**Feature**: 임신 검진 관리 시스템
**Scope**: Phase 1 — 검진 타임라인 + 예약 UI
**Date**: 2026-04-03
**Status**: ✅ Design Complete — Ready for Implementation

---

## What Was Designed

### Components Created (Design Refs)
1. **CheckupScheduleSection** (Main component)
   - NextCheckupCard (D-day countdown)
   - CheckupTimeline (vertical timeline)
   - CheckupTimelineItem (3 states: pending/scheduled/completed)
   - AddCustomButton (custom checkup CTA)

2. **ScheduleBottomSheet** (Booking modal)
   - Date/time pickers (native inputs)
   - Hospital input (text)
   - Memo textarea (optional)
   - Notify partner toggle (switch)

3. **Waiting Page Tab Integration**
   - Add 4th tab: "검진 관리"
   - Tab navigation UI
   - Empty state design

### Design Artifacts
- `.design-ref/00-design-summary.md` — Overall design system
- `.design-ref/01-checkup-schedule-section.md` — Timeline component
- `.design-ref/02-schedule-bottom-sheet.md` — Booking modal
- `.design-ref/03-waiting-page-checkup-tab.md` — Tab integration

---

## Design System Used

### Style
- **Theme**: Dodam Design System D (warm coral tones)
- **Primary Color**: `#E8937A` (var(--color-primary))
- **Font**: Pretendard Variable (already loaded)
- **Pattern**: Modern Korean pregnancy app

### Key Design Tokens
```typescript
{
  colors: {
    primary: '#E8937A',
    accentBg: '#FFE0D4',
    completed: '#4CAF50',
    pending: '#D4CFC9',
  },
  typography: {
    heading1: '24px / 700',
    body: '13px / 400',
    caption: '12px / 400',
  },
  spacing: {
    card: '16px',
    gap: '12px',
  },
  radius: {
    card: '12px',
    sheet: '20px 20px 0 0',
  },
}
```

### Existing Patterns Reused
- Card layout → Same as `BabyItemChecklist`
- Bottom sheet → Same as diary sheets
- Tab navigation → Extended from existing 3-tab layout
- Typography classes → `text-heading-3`, `text-body`, `text-caption`

---

## Component Specifications

### 1. CheckupScheduleSection

**Layout Structure**:
```
NextCheckupCard (D-day card)
  ↓
CheckupTimeline
  ├── TimelineItem (4주 첫 방문) [✓ completed]
  ├── TimelineItem (8주 첫 초음파) [📅 scheduled]
  ├── TimelineItem (11주 NT 검사) [○ pending]
  └── AddCustomButton
```

**Timeline Item States**:
| State | Dot Style | Label Color | Actions |
|-------|-----------|-------------|---------|
| Pending | `border-2 border-[#D4CFC9]` hollow | `text-tertiary` | [예약하기] |
| Scheduled | `bg-[var(--color-primary)]` filled | `text-[var(--color-primary)]` | [예약 변경] [완료] |
| Completed | `bg-[#4CAF50]` + checkmark | `text-secondary line-through` | [결과 보기] |

**D-day Badge**:
- Future (D-3): `bg-[var(--color-accent-bg)] text-[var(--color-primary)]`
- Today (D-day): `bg-[var(--color-primary)] text-white` + pulse animation
- Past (D+2): `bg-[#F5F1EC] text-secondary`

**Props**:
```typescript
interface CheckupScheduleSectionProps {
  checkups: CheckupSchedule[]
  onSchedule: (checkupId: string) => void
  onComplete: (checkupId: string) => void
  onViewResult: (checkupId: string) => void
}
```

### 2. ScheduleBottomSheet

**Inputs** (in order):
1. Checkup selector (default vs custom mode)
2. Date picker (native, REQUIRED)
3. Time picker (native, optional)
4. Hospital input (text, optional)
5. Memo textarea (200 chars max, optional)
6. Notify partner toggle (switch, default ON)

**Validation**:
- Date: Required, must be >= today and <= due date
- Other fields: Optional

**Animation**:
- Open: Slide up 300ms ease-out
- Close: Slide down 250ms ease-in
- Backdrop: Fade in/out 200ms

**Props**:
```typescript
interface ScheduleBottomSheetProps {
  open: boolean
  onClose: () => void
  checkup?: CheckupSchedule // For editing
  mode: 'create' | 'edit' | 'custom'
  onSave: (data: ScheduleData) => void
}
```

### 3. Waiting Page Tab Integration

**Tab Structure** (add 4th tab):
```
[ 일기·감성 | 발달·정보 | 검진 관리 | 혜택·준비 ]
                           ↑ NEW
```

**Tab Content** (검진 관리):
```tsx
{tab === 'checkup' && (
  <div className="p-3 space-y-3">
    <NextCheckupCard checkup={nextCheckup} />
    <CheckupScheduleSection
      checkups={checkups}
      onSchedule={handleSchedule}
      onComplete={handleComplete}
    />
  </div>
)}
```

**Empty State**:
- Show when `checkups.length === 0`
- Icon: Hospital icon (gray)
- Text: "첫 검진을 예약해보세요"
- CTA: "검진 예약하기" button

---

## Data Model (from da:system)

### CheckupSchedule Interface
```typescript
interface CheckupSchedule {
  checkup_id: string           // "first_us" or UUID (custom)
  title: string                // "첫 초음파"
  week?: number                // 8 (optional for custom)
  scheduled_date?: string      // "2026-05-15"
  scheduled_time?: string      // "10:30"
  hospital?: string            // "삼성서울병원"
  memo?: string                // "공복 필요"
  completed: boolean           // false
  completed_date?: string      // null
  is_custom: boolean           // false (true for custom checkups)
}
```

### DEFAULT_CHECKUPS Constant
```typescript
// src/constants/checkups.ts (NEW FILE)
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

---

## File Structure

### New Files to Create
```
src/
├── components/
│   └── pregnant/
│       └── CheckupSchedule/
│           ├── CheckupScheduleSection.tsx (main component)
│           ├── NextCheckupCard.tsx
│           ├── CheckupTimeline.tsx
│           ├── CheckupTimelineItem.tsx
│           ├── ScheduleBottomSheet.tsx
│           ├── AddCustomButton.tsx
│           └── types.ts
└── constants/
    └── checkups.ts (DEFAULT_CHECKUPS array)
```

### Files to Modify
```
src/
├── app/
│   └── waiting/
│       └── page.tsx
│           └── Add 4th tab "검진 관리"
│           └── Import CheckupScheduleSection
│           └── Handle tab state
└── lib/
    └── supabase/
        └── pregRecord.ts
            └── Add fetchCheckupSchedules()
            └── Add createCheckupSchedule()
            └── Add updateCheckupSchedule()
            └── Add completeCheckup()
```

---

## Implementation Tasks (for da:dev)

### Phase 1A: Core Components (Priority 1)
- [ ] Create `CheckupScheduleSection.tsx`
  - [ ] NextCheckupCard component
  - [ ] CheckupTimeline component
  - [ ] CheckupTimelineItem component (3 states)
  - [ ] AddCustomButton component
- [ ] Create `ScheduleBottomSheet.tsx`
  - [ ] Date/time pickers (native inputs)
  - [ ] Hospital + memo inputs
  - [ ] Notify partner toggle
  - [ ] Form validation
  - [ ] Save logic

### Phase 1B: Data Layer (Priority 1)
- [ ] Create `src/constants/checkups.ts` (DEFAULT_CHECKUPS)
- [ ] Extend `pregRecord.ts`:
  - [ ] `fetchCheckupSchedules(): Promise<CheckupSchedule[]>`
  - [ ] `createCheckupSchedule(data): Promise<void>`
  - [ ] `updateCheckupSchedule(id, data): Promise<void>`
  - [ ] `completeCheckup(id): Promise<void>`

### Phase 1C: Page Integration (Priority 2)
- [ ] Modify `/waiting/page.tsx`:
  - [ ] Add "검진 관리" tab to TABS array
  - [ ] Add tab content conditional rendering
  - [ ] Fetch checkup data on mount
  - [ ] Handle tab state + URL param

### Phase 1D: Polish (Priority 3)
- [ ] Add animations (slide-up sheet, timeline reveal)
- [ ] Add haptic feedback (button presses)
- [ ] Add empty state
- [ ] Add loading skeleton
- [ ] Add error handling + toasts
- [ ] Add accessibility (ARIA labels, focus management)

---

## Out of Scope (Phase 2)

### Checkup Result Input
- CheckupResultSheet component
- Status selector (normal/observe/abnormal)
- Ultrasound media upload (images/videos)
- Next checkup auto-suggestion

### Ultrasound Album
- Week-based gallery grid
- Lightbox viewer
- Video streaming

### Partner Notification
- `/api/notify-partner` route (backend implementation)
- Web Push VAPID integration
- Notification log tracking

---

## Design Decisions (ADRs)

### ADR-001: Timeline Dot States
**Decision**: Use 3 distinct visual states (hollow/coral/green)
**Rationale**: Clear visual hierarchy, matches pregnancy journey progression
**Alternative**: 2 states (pending/done) — Rejected, less informative

### ADR-002: Bottom Sheet vs Modal
**Decision**: Use bottom sheet (slide up from bottom)
**Rationale**: Mobile-first UX, thumb-friendly on iOS/Android
**Alternative**: Center modal — Rejected, harder to reach on tall screens

### ADR-003: Native Date Picker vs Custom Calendar
**Decision**: Use native `<input type="date">`
**Rationale**: Leverages OS date picker (iOS/Android), no extra bundle size
**Alternative**: react-datepicker — Rejected, adds 60KB + UX mismatch

### ADR-004: Tab Layout (4 tabs vs Dropdown)
**Decision**: Add 4th tab to existing 3-tab layout
**Rationale**: All tabs visible, 1-tap access, consistent navigation
**Alternative**: Overflow dropdown — Rejected, adds friction

---

## Accessibility Checklist

- [ ] Semantic HTML (`<section>`, `<article>`, `<button>`)
- [ ] ARIA labels on all interactive elements
- [ ] Tab keyboard navigation (Arrow keys)
- [ ] Bottom sheet focus management (trap focus)
- [ ] Screen reader announcements (save success/error)
- [ ] Color contrast WCAG AA (7.1:1 primary, 4.8:1 secondary)
- [ ] Touch targets 44px minimum
- [ ] Reduced motion support

---

## Testing Scenarios

### Happy Path
1. User opens /waiting → "검진 관리" tab
2. Sees timeline with default checkups (all pending)
3. Taps [예약하기] on "8주 첫 초음파"
4. Selects date (5/15), time (10:30), hospital (삼성서울병원)
5. Toggles "파트너에게 알림 보내기" ON
6. Taps "저장하기"
7. Bottom sheet closes, timeline updates (8주 → scheduled)
8. NextCheckupCard shows "D-3 | 5/15 (목) 10:30"

### Edge Cases
1. **No checkups scheduled**: Show empty state
2. **Past due checkup**: D-day badge shows "D+3" (gray)
3. **Custom checkup without week**: Auto-calculate from due date
4. **Partner not linked**: Disable notify toggle + show info text
5. **Invalid date (past due date)**: Show error "예정일 이후 날짜는 선택할 수 없어요"

---

## Dependencies

### Backend (Already Implemented)
- `supabase/migrations/20260405_checkup_schedule.sql` (DB schema)
- Supabase RLS policies (preg_records table)

### Frontend (Existing)
- React 19 + Next.js 15
- Tailwind CSS (configured)
- Pretendard font (loaded)
- Icons (`src/components/ui/Icons.tsx`)

### New Dependencies (None)
No new npm packages required — uses native inputs + existing stack

---

## Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| FCP (First Contentful Paint) | < 1.5s | Lighthouse |
| LCP (Largest Contentful Paint) | < 2.0s | Lighthouse |
| Timeline render | < 200ms | DevTools |
| Bottom sheet animation | 60 FPS | DevTools Performance |

---

## Design Review Sign-Off

### Visual Consistency
- ✅ Matches dodam coral theme
- ✅ Uses Pretendard font
- ✅ Consistent spacing (4px grid)
- ✅ Consistent radius (12px cards, 20px sheets)
- ✅ Reuses existing patterns (BabyItemChecklist, HospitalGuide)

### UX Flow
- ✅ Clear 3-state timeline
- ✅ Intuitive D-day countdown
- ✅ Minimal booking inputs (date required only)
- ✅ Smooth bottom sheet transitions
- ✅ Helpful empty states

### Accessibility
- ✅ WCAG AA contrast
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus management

### Mobile-First
- ✅ Touch targets 44px+
- ✅ Safe area insets
- ✅ Native date/time pickers
- ✅ No horizontal scroll
- ✅ Responsive typography

---

## Handoff Artifacts

### Design Files
- `.design-ref/00-design-summary.md` — Overview
- `.design-ref/01-checkup-schedule-section.md` — Timeline specs
- `.design-ref/02-schedule-bottom-sheet.md` — Booking modal specs
- `.design-ref/03-waiting-page-checkup-tab.md` — Tab integration specs

### Architecture Reference
- `docs/designs/checkup-management-architecture.md` (from da:system)

### Migration File
- `supabase/migrations/20260405_checkup_schedule.sql` (already created)

---

## Next Step: da:dev

**Action**: Implement Phase 1 components based on design refs
**Owner**: Frontend developer
**Timeline**: TBD
**Blockers**: None (design complete, backend ready)

**Entry Point**: Start with `CheckupScheduleSection.tsx` → then `ScheduleBottomSheet.tsx` → then `/waiting` page integration

**Quick Start Command**:
```bash
# Create component directory
mkdir -p src/components/pregnant/CheckupSchedule

# Create types file first
touch src/components/pregnant/CheckupSchedule/types.ts

# Then create main components
touch src/components/pregnant/CheckupSchedule/CheckupScheduleSection.tsx
touch src/components/pregnant/CheckupSchedule/ScheduleBottomSheet.tsx
```

---

**Design Phase**: ✅ COMPLETE
**Status**: Ready for Implementation
**Contact**: Design artifacts in `.design-ref/` folder
**Date**: 2026-04-03
