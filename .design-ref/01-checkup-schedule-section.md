# CheckupScheduleSection — Design Reference

## Overview
검진 타임라인 + 예약 관리 + 다음 검진 D-day 카드 통합 컴포넌트

## Visual Design

### Style Guide
- **Primary Color**: `var(--color-primary)` (#E8937A — Coral)
- **Font Family**: Pretendard Variable
- **Tone**: Warm, reassuring, pregnancy-focused
- **Motion**: Subtle transitions (0.3s cubic-bezier(0.16, 1, 0.3, 1))

### Layout Structure
```
┌─────────────────────────────────────────┐
│ NextCheckupCard                         │
│ ┌───────────────────────────────────┐   │
│ │ 🏥 다음 검진                       │   │
│ │ D-3 | 5/15 (목) 10:30              │   │
│ │ 첫 초음파 · 삼성서울병원          │   │
│ └───────────────────────────────────┘   │
│                                         │
│ CheckupTimeline                         │
│ ┌───────────────────────────────────┐   │
│ │ ● 4주  첫 방문 (임신 확인)         │   │
│ │ ● 8주  첫 초음파                   │ ← Scheduled
│ │ ○ 11주 NT 검사                     │ ← Pending
│ │ ○ 16주 쿼드 검사                   │   │
│ │ ○ 20주 정밀 초음파                 │   │
│ │ ○ 24주 임신성 당뇨 검사            │   │
│ │ + 커스텀 검진 추가                 │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### NextCheckupCard Design
- **Background**: Gradient `from-white to-[#FFF8F3]`
- **Border**: `border-[#FFDDC8]/50` (subtle coral border)
- **Padding**: 16px (p-4)
- **Border Radius**: 12px (rounded-xl)
- **Shadow**: `shadow-sm`

#### Card Content Layout
```
┌──────────────────────────────────────┐
│ 🏥  다음 검진                         │ ← Icon + Title (text-subtitle)
│                                       │
│ D-3                                   │ ← D-day Badge (text-heading-1)
│                                       │
│ 5/15 (목) 10:30                       │ ← Date/Time (text-body-emphasis)
│ 첫 초음파 · 삼성서울병원               │ ← Checkup Name + Hospital
│                                       │
│ [결과 입력하기]                        │ ← CTA Button (if completed)
└──────────────────────────────────────┘
```

#### D-day Badge Styling
- **Positive (D-3, D-7)**:
  - Text: `text-[var(--color-primary)]`
  - Background: `bg-[var(--color-accent-bg)]`
  - Border: `border-[var(--color-primary)]`
- **Today (D-day)**:
  - Text: `text-white`
  - Background: `bg-[var(--color-primary)]`
  - Pulse animation
- **Past (D+2)**:
  - Text: `text-secondary`
  - Background: `bg-[#F5F1EC]`

### CheckupTimeline Design

#### Timeline Item Structure
```
┌──────────────────────────────────────┐
│ ● 8주  첫 초음파               [✓]   │ ← Completed (green dot)
│    5/15 (목) 10:30                   │
│    삼성서울병원                       │
│    [결과 보기]                        │
├──────────────────────────────────────┤
│ ● 11주 NT 검사                [📅]   │ ← Scheduled (coral dot)
│    5/22 (목) 14:00                   │
│    삼성서울병원                       │
│    [예약 변경] [완료]                 │
├──────────────────────────────────────┤
│ ○ 16주 쿼드 검사              [+]    │ ← Pending (gray outline dot)
│    예약 전                            │
│    [예약하기]                         │
└──────────────────────────────────────┘
```

#### Timeline Dot States
1. **Completed** (완료):
   - Dot: `bg-[#4CAF50]` (green filled circle)
   - Border: `border-[#4CAF50]`
   - Icon: Checkmark inside
   - Week label: `text-secondary line-through`

2. **Scheduled** (예약됨):
   - Dot: `bg-[var(--color-primary)]` (coral filled)
   - Border: `border-[var(--color-primary)]`
   - Icon: Calendar icon
   - Week label: `text-[var(--color-primary)] font-bold`

3. **Pending** (예약 전):
   - Dot: `border-2 border-[#D4CFC9] bg-transparent` (hollow)
   - Week label: `text-tertiary`

#### Timeline Item Padding/Spacing
- Container: `px-4 py-3`
- Gap between items: `gap-3` (12px)
- Left indent (from dot): `ml-8` (32px — for alignment)

### AddCustomButton Design
```
┌──────────────────────────────────────┐
│ + 커스텀 검진 추가                     │
│   담당의 권장 검진을 직접 등록할 수 있어요 │
└──────────────────────────────────────┘
```
- Background: `bg-[var(--color-page-bg)]`
- Border: `border-2 border-dashed border-[#D4CFC9]`
- Hover: `border-[var(--color-primary)]`
- Text: `text-caption text-tertiary`

## Component Interactions

### User Flows
1. **예약하기 플로우**:
   - Pending item → [예약하기] 버튼 클릭
   - ScheduleBottomSheet 열림
   - Date/Time Picker → Hospital Input → 저장
   - Timeline 업데이트 (Pending → Scheduled)

2. **결과 입력 플로우**:
   - Scheduled item → [완료] 버튼 클릭
   - Status 업데이트 (Scheduled → Completed)
   - CheckupResultSheet 자동 열림
   - 결과 상태/메모/초음파 업로드
   - 다음 검진 자동 제안

3. **커스텀 검진 추가 플로우**:
   - [+ 커스텀 검진 추가] 버튼 클릭
   - ScheduleBottomSheet 열림 (커스텀 모드)
   - 검진명 입력 + Date/Time + Hospital
   - Timeline에 추가 (주차 자동 계산)

### Micro-interactions
1. **Timeline Item Hover**:
   - Background: `hover:bg-[#F5F1EC]` (subtle highlight)
   - Transition: `transition-colors duration-200`

2. **Button Press Feedback**:
   - Active state: `active:scale-98 active:opacity-80`
   - Haptic feedback (if supported)

3. **D-day Badge Pulse** (Today only):
   ```css
   @keyframes pulse-coral {
     0%, 100% { box-shadow: 0 0 0 0 rgba(232, 147, 122, 0.4); }
     50% { box-shadow: 0 0 0 8px rgba(232, 147, 122, 0); }
   }
   ```

## Responsive Design

### Mobile (< 430px)
- Timeline items: Full width, no horizontal scroll
- NextCheckupCard: Single column layout
- Buttons: Full width `w-full`

### Tablet (> 768px)
- Timeline: Max width `max-w-lg mx-auto`
- Buttons: Inline `inline-flex`

## Accessibility

### Semantic HTML
```html
<section aria-label="검진 일정 관리">
  <div role="article" aria-label="다음 검진: 첫 초음파">
    <!-- NextCheckupCard content -->
  </div>

  <ol role="list" aria-label="검진 타임라인">
    <li role="listitem" aria-label="8주 첫 초음파, 완료">
      <!-- Timeline item -->
    </li>
  </ol>
</section>
```

### ARIA Labels
- Scheduled button: `aria-label="5월 15일 목요일 오전 10시 30분, 첫 초음파 예약 변경"`
- Completed checkmark: `aria-label="검진 완료"`
- Add custom button: `aria-label="커스텀 검진 추가하기"`

### Focus States
- All buttons: `focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]`
- Skip navigation: Screen reader only text

### Color Contrast
- Primary text on white: 7.1:1 (WCAG AAA)
- Secondary text: 4.8:1 (WCAG AA)
- Timeline dots: Minimum 3:1 border contrast

## Animation Timings
- List item reveal: `stagger-delay: 100ms` (0ms, 100ms, 200ms, ...)
- Bottom sheet slide-up: `duration-300 ease-out`
- Button press: `duration-100 ease-in`
- D-day badge pulse: `2.4s infinite ease-in-out`

## Typography Scale
| Element | Class | Font Size | Weight | Color |
|---------|-------|-----------|--------|-------|
| Section title | `text-heading-3` | 18px | 700 | `text-primary` |
| D-day number | `text-heading-1` | 24px | 700 | `text-[var(--color-primary)]` |
| Checkup name | `text-body-emphasis` | 14px | 600 | `text-primary` |
| Date/Time | `text-body` | 13px | 400 | `text-secondary` |
| Hospital | `text-caption` | 12px | 400 | `text-tertiary` |
| Week label | `text-label` | 11px | 500 | `text-tertiary` |

## Design Tokens
```typescript
const CHECKUP_TOKENS = {
  // Colors
  primary: 'var(--color-primary)',         // #E8937A
  accentBg: 'var(--color-accent-bg)',      // #FFE0D4
  border: '#FFDDC8',

  // Status colors
  completed: '#4CAF50',
  scheduled: 'var(--color-primary)',
  pending: '#D4CFC9',

  // Spacing
  cardPadding: '16px',
  itemGap: '12px',
  dotSize: '20px',

  // Border radius
  card: '12px',
  button: '12px',
  dot: '9999px',

  // Shadows
  cardShadow: 'var(--shadow-sm)',
  buttonShadow: 'var(--shadow-xs)',
}
```

## Implementation Notes

### State Management
```typescript
interface CheckupSchedule {
  checkup_id: string
  title: string
  week: number
  scheduled_date?: string
  scheduled_time?: string
  hospital?: string
  memo?: string
  completed: boolean
  completed_date?: string
  is_custom: boolean
}

const [checkups, setCheckups] = useState<CheckupSchedule[]>([])
const [nextCheckup, setNextCheckup] = useState<CheckupSchedule | null>(null)
```

### Data Fetching
```typescript
// On component mount
useEffect(() => {
  fetchCheckupSchedules().then(schedules => {
    setCheckups(sortByWeek(schedules))
    setNextCheckup(findNextScheduled(schedules))
  })
}, [])
```

### Sorting Logic
```typescript
function sortByWeek(checkups: CheckupSchedule[]) {
  return checkups.sort((a, b) => {
    // Custom checkups: sort by scheduled_date
    if (a.is_custom && b.is_custom) {
      return a.scheduled_date.localeCompare(b.scheduled_date)
    }
    // Default checkups: sort by week
    return a.week - b.week
  })
}
```

### Next Checkup Calculation
```typescript
function findNextScheduled(checkups: CheckupSchedule[]) {
  const today = new Date()
  const scheduled = checkups
    .filter(c => c.scheduled_date && !c.completed)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  return scheduled[0] || null
}

function getDaysUntil(dateString: string): number {
  const target = new Date(dateString)
  const today = new Date()
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000)
  return diff
}
```

## Design System Alignment
- Uses existing dodam design tokens from `globals.css`
- Matches `/waiting` page card pattern (BabyItemChecklist, HospitalGuide)
- Consistent with pregnant mode color scheme (warm coral tones)
- Pretendard font family (already loaded)

## Edge Cases
1. **No scheduled checkups**: Show empty state + "첫 검진 예약하기" CTA
2. **All completed**: Show congratulations message + "다음 단계" guide
3. **Past due (D+N)**: Show "놓친 검진" warning + "지금 예약하기" urgent CTA
4. **No hospital info**: Display "병원 미정" placeholder
5. **Custom checkup without week**: Auto-calculate week from due date

## File Location
```
src/components/pregnant/CheckupSchedule/
├── CheckupScheduleSection.tsx (main component)
├── NextCheckupCard.tsx
├── CheckupTimeline.tsx
├── CheckupTimelineItem.tsx
├── AddCustomButton.tsx
└── types.ts
```

## Related Components
- ScheduleBottomSheet (see 02-schedule-bottom-sheet.md)
- CheckupResultSheet (see 03-checkup-result-sheet.md)
- UltrasoundAlbum (future Phase 2)
