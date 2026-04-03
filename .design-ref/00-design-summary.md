# Checkup Management System — Phase 1 Design Summary

## Project Context
**Feature**: 임신 검진 관리 시스템 (Pregnancy Checkup Management)
**Phase**: Phase 1 — UI/UX Design
**Platform**: Dodam Pregnancy App (도담 임신 앱)
**Mode**: Pregnant Mode (임신 중 모드)
**Page**: `/waiting` (기다림 페이지)

## Design Language

### Visual Style
- **Theme**: Modern Korean pregnancy app
- **Tone**: Warm, reassuring, nurturing
- **Color Palette**: Coral-based (warm, gentle)
- **Font**: Pretendard Variable (already in use)
- **Design System**: Dodam Design System D (defined in `globals.css`)

### Primary Colors
- **Primary**: `#E8937A` (Coral — warm, pregnancy-friendly)
- **Primary Light**: `#F0A890`
- **Primary BG**: `#FFF5F2` (very light coral background)
- **Accent**: `#D07A62` (deeper coral)
- **Accent BG**: `#FFE0D4` (light coral highlight)

### Semantic Colors
- **Success/Completed**: `#4CAF50` (green)
- **Warning/Pending**: `#D4CFC9` (gray)
- **Danger/Alert**: `#D05050` (red)
- **Info**: `#4A90D9` (blue)

### Typography Scale (from `globals.css`)
| Element | Class | Size | Weight | Usage |
|---------|-------|------|--------|-------|
| Display | `text-display` | 32px | 700 | Hero titles |
| Heading 1 | `text-heading-1` | 24px | 700 | Page titles, D-day numbers |
| Heading 2 | `text-heading-2` | 20px | 700 | Section titles |
| Heading 3 | `text-heading-3` | 18px | 700 | Card titles, checkup names |
| Subtitle | `text-subtitle` | 15px | 600 | Form labels, button text |
| Body Emphasis | `text-body-emphasis` | 14px | 600 | Important text |
| Body | `text-body` | 13px | 400 | Default text |
| Caption | `text-caption` | 12px | 400 | Meta info, dates |
| Label | `text-label` | 11px | 500 | Tags, small labels |

### Spacing Scale (4px base)
- `spacing-1`: 4px
- `spacing-2`: 8px
- `spacing-3`: 12px (most common card padding)
- `spacing-4`: 16px (section padding)
- `spacing-5`: 20px
- `spacing-6`: 24px
- `spacing-8`: 32px

### Border Radius
- `radius-sm`: 8px
- `radius-md`: 12px (most common for cards/inputs)
- `radius-lg`: 16px
- `radius-xl`: 20px (bottom sheets)
- `radius-full`: 9999px (circles, pills)

### Shadows
- `shadow-xs`: `0 1px 2px rgba(0, 0, 0, 0.04)`
- `shadow-sm`: `0 1px 3px rgba(0, 0, 0, 0.06)` (cards)
- `shadow-md`: `0 2px 8px rgba(0, 0, 0, 0.08)`
- `shadow-lg`: `0 4px 12px rgba(0, 0, 0, 0.10)` (modals)

## Component Breakdown

### Phase 1 Components

#### 1. CheckupScheduleSection
**File**: `src/components/pregnant/CheckupSchedule/CheckupScheduleSection.tsx`
**Purpose**: 검진 타임라인 + 예약 관리 메인 컨테이너

**Sub-components**:
- `NextCheckupCard`: 다음 검진 D-day 카드
- `CheckupTimeline`: 주차별 검진 목록 (vertical timeline)
- `CheckupTimelineItem`: 개별 검진 아이템 (completed/scheduled/pending states)
- `AddCustomButton`: 커스텀 검진 추가 버튼

**Key Features**:
- D-day countdown (D-7, D-3, D-day, D+2)
- 3-state timeline dots (completed ✓, scheduled 📅, pending ○)
- Inline CTA buttons ([예약하기], [완료], [결과 보기])

#### 2. ScheduleBottomSheet
**File**: `src/components/pregnant/CheckupSchedule/ScheduleBottomSheet.tsx`
**Purpose**: 검진 예약/수정 바텀시트

**Inputs**:
- Checkup selector (default checkups vs custom input)
- Date picker (native date input + custom icon)
- Time picker (optional, native time input)
- Hospital input (text input, optional)
- Memo textarea (optional, 200 chars max)
- Notify partner toggle (switch component)

**Validation**:
- Date: Required, must be >= today, <= due date
- Other fields: Optional

#### 3. Waiting Page Tab Integration
**File**: `src/app/waiting/page.tsx` (modify existing)
**Purpose**: 검진 관리 탭 추가

**Tab Structure**:
```
[ 일기·감성 | 발달·정보 | 검진 관리 | 혜택·준비 ]
                            ↑ NEW
```

**Tab Content**:
- NextCheckupCard (at top)
- CheckupScheduleSection (timeline)
- UltrasoundAlbum (Phase 2 — placeholder)

## Design Patterns (from existing components)

### Card Pattern (BabyItemChecklist, HospitalGuide)
```css
.dodam-card {
  background: white;
  border: 1px solid #E8E4DF;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  padding: 16px;
}
```

### Button Pattern
```css
.dodam-btn-primary {
  background: var(--color-primary);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
}

.dodam-btn-secondary {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border: 1px solid var(--color-accent-bg);
}
```

### Bottom Sheet Pattern
```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  background: white;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease-out;
}
```

### Tab Navigation Pattern (existing in /waiting)
```tsx
<div className="flex border-b border-[#E8E4DF]">
  {TABS.map(tab => (
    <button className={`flex-1 py-2.5 text-caption font-semibold ${
      active ? 'text-[var(--color-primary)] bg-[var(--color-accent-bg)]/30' : 'text-tertiary'
    }`}>
      {tab.label}
      {active && <div className="absolute bottom-0 h-0.5 bg-[var(--color-primary)]" />}
    </button>
  ))}
</div>
```

## Key Interactions

### Timeline Item States
1. **Pending (예약 전)**:
   - Dot: Hollow circle `border-2 border-[#D4CFC9]`
   - Label: `text-tertiary`
   - Action: `[예약하기]` button

2. **Scheduled (예약됨)**:
   - Dot: Filled coral `bg-[var(--color-primary)]`
   - Label: `text-[var(--color-primary)] font-bold`
   - Info: Date, time, hospital
   - Actions: `[예약 변경]`, `[완료]` buttons

3. **Completed (완료)**:
   - Dot: Filled green `bg-[#4CAF50]` with checkmark
   - Label: `text-secondary line-through`
   - Action: `[결과 보기]` button

### D-day Badge States
1. **Future (D-7, D-3)**:
   - Background: `bg-[var(--color-accent-bg)]`
   - Text: `text-[var(--color-primary)]`
   - Border: `border-[var(--color-primary)]`

2. **Today (D-day)**:
   - Background: `bg-[var(--color-primary)]`
   - Text: `text-white`
   - Animation: Pulse effect

3. **Past (D+2)**:
   - Background: `bg-[#F5F1EC]`
   - Text: `text-secondary`
   - No animation

### Bottom Sheet Animations
- **Open**: Slide up from bottom (300ms ease-out)
- **Close**: Slide down (250ms ease-in)
- **Backdrop**: Fade in/out (200ms)

### Button Press Feedback
- Active state: `active:opacity-80 active:scale-98`
- Transition: `duration-100 ease-in`
- Haptic feedback (if supported): 20ms vibration

## Responsive Breakpoints

### Mobile (default, < 430px)
- Full width layout
- Tab labels: `text-caption` (12px)
- Cards: `px-4 py-3`
- Bottom sheet: Full width

### Tablet (> 768px)
- Max width: `max-w-lg mx-auto`
- Tab labels: `text-body` (13px)
- Cards: `px-6 py-4`

## Accessibility Features

### Semantic HTML
- `<section>`, `<article>`, `<nav>`, `<button>` (not `<div>`)
- `<ol role="list">` for timeline
- `<div role="tablist">` for tab navigation

### ARIA Labels
- All interactive elements have `aria-label`
- Tab panels: `role="tabpanel"` + `aria-labelledby`
- Bottom sheet: `role="dialog"` + `aria-modal="true"`
- Toggle switch: `role="switch"` + `aria-checked`

### Focus Management
- Bottom sheet opens → focus first input
- Bottom sheet closes → focus back to trigger
- Tab keyboard navigation (Arrow keys)

### Color Contrast
- Primary text on white: 7.1:1 (WCAG AAA)
- Secondary text: 4.8:1 (WCAG AA)
- All interactive elements: Minimum 3:1

### Screen Reader Support
- Announce tab changes
- Announce save success/error
- Announce D-day changes

## Animation Performance

### Hardware Acceleration
```css
.parallax-layer, .reveal, .timeline-item {
  will-change: transform;
}
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Design Token Export

```typescript
export const CHECKUP_DESIGN_TOKENS = {
  // Colors
  colors: {
    primary: '#E8937A',
    primaryLight: '#F0A890',
    primaryBg: '#FFF5F2',
    accent: '#D07A62',
    accentBg: '#FFE0D4',
    completed: '#4CAF50',
    pending: '#D4CFC9',
    danger: '#D05050',
    info: '#4A90D9',
  },

  // Typography
  typography: {
    display: { size: 32, weight: 700 },
    heading1: { size: 24, weight: 700 },
    heading2: { size: 20, weight: 700 },
    heading3: { size: 18, weight: 700 },
    subtitle: { size: 15, weight: 600 },
    bodyEmphasis: { size: 14, weight: 600 },
    body: { size: 13, weight: 400 },
    caption: { size: 12, weight: 400 },
    label: { size: 11, weight: 500 },
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },

  // Border Radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  // Shadows
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
    md: '0 2px 8px rgba(0, 0, 0, 0.08)',
    lg: '0 4px 12px rgba(0, 0, 0, 0.10)',
    xl: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },

  // Component Specific
  checkup: {
    dotSize: 20,
    dotBorderWidth: 2,
    timelineGap: 12,
    cardPadding: 16,
    sheetBorderRadius: 20,
    handleBarWidth: 40,
    handleBarHeight: 4,
  },
}
```

## Design Artifacts

### Reference Files
1. `01-checkup-schedule-section.md` — Main timeline component
2. `02-schedule-bottom-sheet.md` — Booking modal
3. `03-waiting-page-checkup-tab.md` — Tab integration

### Figma Assets (if available)
- Component specs: `/designs/checkup-management/`
- Icon library: `/designs/icons/`
- Color palette: `/designs/tokens/`

## Implementation Notes

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + CSS Variables
- **State**: React useState/useEffect
- **Data**: Supabase (PostgreSQL + RLS + Storage)
- **Icons**: Custom SVG icons from `src/components/ui/Icons.tsx`

### Data Flow
1. Fetch checkups: `fetchCheckupSchedules()` (from `pregRecord.ts`)
2. Display timeline: Sort by week, render items
3. Schedule checkup: `createCheckupSchedule()` → Refetch list
4. Complete checkup: Update status → Open result sheet
5. Notify partner: `POST /api/notify-partner` (Web Push)

### File Structure
```
src/
├── app/
│   └── waiting/
│       └── page.tsx (modify: add "검진 관리" tab)
├── components/
│   └── pregnant/
│       └── CheckupSchedule/
│           ├── CheckupScheduleSection.tsx
│           ├── NextCheckupCard.tsx
│           ├── CheckupTimeline.tsx
│           ├── CheckupTimelineItem.tsx
│           ├── ScheduleBottomSheet.tsx
│           ├── AddCustomButton.tsx
│           └── types.ts
├── lib/
│   └── supabase/
│       └── pregRecord.ts (extend: add checkup CRUD functions)
└── constants/
    └── checkups.ts (NEW: DEFAULT_CHECKUPS array)
```

## Design Review Checklist

### Visual Consistency
- [ ] Matches existing dodam coral theme
- [ ] Uses Pretendard font family
- [ ] Consistent spacing (4px base grid)
- [ ] Consistent border radius (12px cards)
- [ ] Matches existing component patterns (BabyItemChecklist, HospitalGuide)

### UX Flow
- [ ] Clear 3-state timeline (pending/scheduled/completed)
- [ ] Intuitive D-day countdown
- [ ] Easy checkup booking (minimal inputs)
- [ ] Smooth bottom sheet transitions
- [ ] Helpful empty states

### Accessibility
- [ ] WCAG AA color contrast
- [ ] Semantic HTML
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation support
- [ ] Screen reader announcements
- [ ] Focus management
- [ ] Reduced motion support

### Performance
- [ ] Hardware-accelerated animations
- [ ] Lazy loading for tab content
- [ ] Skeleton screens while loading
- [ ] Optimized re-renders (React.memo, useMemo)

### Mobile-First
- [ ] Touch-friendly tap targets (44px minimum)
- [ ] Safe area insets (notch/home indicator)
- [ ] Native date/time pickers
- [ ] No horizontal scroll
- [ ] Responsive typography

## Next Steps (Phase 2)

### Checkup Result Input (out of scope for Phase 1)
- CheckupResultSheet component
- Status selector (normal/observe/abnormal)
- Memo input
- Ultrasound media upload (images/videos)
- Next checkup suggestion

### Ultrasound Album (out of scope for Phase 1)
- Week-based gallery grid
- Lazy loading thumbnails
- Lightbox viewer
- Video streaming support

### Partner Notification (backend only in Phase 1)
- Web Push integration
- Notification log tracking
- Fallback to Kakao share

## Design System Alignment

### Follows Dodam Design Principles
1. **Warm & Reassuring**: Coral tones, rounded corners, gentle shadows
2. **Clear Hierarchy**: Typography scale, spacing rhythm, visual weight
3. **Accessible**: High contrast, semantic HTML, keyboard support
4. **Mobile-First**: Touch targets, native inputs, bottom sheets
5. **Consistent**: Matches existing `/waiting` page patterns

### Reuses Existing Patterns
- Card layout (same as BabyItemChecklist)
- Bottom sheet (same as diary/journal sheets)
- Tab navigation (same as existing 3-tab layout)
- Button styles (primary/secondary/outline)
- Typography classes (text-heading-3, text-body, text-caption)

---

**Design Phase**: ✅ COMPLETE
**Next Phase**: da:dev (Implementation)
**Owner**: Frontend Architect + UX Designer
**Reviewed**: 2026-04-03
