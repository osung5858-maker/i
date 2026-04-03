# Waiting Page — Checkup Tab Integration

## Overview
기존 `/waiting` 페이지 (임신 중 모드)에 "검진 관리" 탭 추가

## Tab Structure

### Current Tabs (Before)
```
┌────────────────────────────────────────┐
│ [ 일기·감성 | 발달·정보 | 혜택·준비 ]   │
└────────────────────────────────────────┘
```

### Updated Tabs (After)
```
┌──────────────────────────────────────────────────┐
│ [ 일기·감성 | 발달·정보 | 검진 관리 | 혜택·준비 ]   │
└──────────────────────────────────────────────────┘
```

## Tab Navigation Design

### Tab Bar Layout
```tsx
<div className="flex border-b border-[#E8E4DF]">
  {TABS.map(tab => (
    <button
      key={tab.key}
      onClick={() => setTab(tab.key)}
      className={`flex-1 py-2.5 text-caption font-semibold text-center relative transition-colors ${
        currentTab === tab.key
          ? 'text-[var(--color-primary)] bg-[var(--color-accent-bg)]/30'
          : 'text-tertiary'
      }`}
    >
      {tab.label}
      {currentTab === tab.key && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--color-primary)] rounded-full" />
      )}
    </button>
  ))}
</div>
```

### Tab Configuration
```typescript
const TABS = [
  { key: 'diary' as const, label: '일기·감성' },
  { key: 'info' as const, label: '발달·정보' },
  { key: 'checkup' as const, label: '검진 관리' },
  { key: 'benefit' as const, label: '혜택·준비' },
]

type TabKey = 'diary' | 'info' | 'checkup' | 'benefit'
const [tab, setTab] = useState<TabKey>('diary')
```

### Active Tab Indicator
- **Selected tab**:
  - Text: `text-[var(--color-primary)]`
  - Background: `bg-[var(--color-accent-bg)]/30` (light coral tint)
  - Bottom border: `h-0.5 bg-[var(--color-primary)] rounded-full`
- **Inactive tab**:
  - Text: `text-tertiary`
  - No background
  - No border

### Tab Transition
```css
.tab-content {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Checkup Tab Content

### Tab Layout Structure
```
┌─────────────────────────────────────────┐
│ [ 일기·감성 | 발달·정보 | 검진 관리 | 혜택·준비 ]
├─────────────────────────────────────────┤
│                                         │
│ NextCheckupCard                         │
│ ┌───────────────────────────────────┐   │
│ │ 🏥 다음 검진                       │   │
│ │ D-3 | 5/15 (목) 10:30              │   │
│ │ 첫 초음파 · 삼성서울병원           │   │
│ └───────────────────────────────────┘   │
│                                         │
│ CheckupTimeline                         │
│ ┌───────────────────────────────────┐   │
│ │ ● 4주  첫 방문 (임신 확인)  [✓]   │   │
│ │ ● 8주  첫 초음파           [📅]   │   │
│ │ ○ 11주 NT 검사             [+]    │   │
│ │ ○ 16주 쿼드 검사           [+]    │   │
│ │ ...                               │   │
│ │ + 커스텀 검진 추가                 │   │
│ └───────────────────────────────────┘   │
│                                         │
│ UltrasoundAlbum (Phase 2)               │
│ ┌───────────────────────────────────┐   │
│ │ 8주 첫 초음파 (5/15)               │   │
│ │ [img] [img] [video]                │   │
│ └───────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Tab Content Implementation
```tsx
{tab === 'checkup' && (
  <div className="p-3 space-y-3">
    {/* 다음 검진 D-day */}
    <NextCheckupCard
      checkup={nextCheckup}
      onViewResult={() => setResultSheetOpen(true)}
    />

    {/* 검진 타임라인 */}
    <CheckupScheduleSection
      checkups={checkups}
      onSchedule={handleSchedule}
      onComplete={handleComplete}
      onViewResult={handleViewResult}
    />

    {/* 초음파 앨범 (Phase 2) */}
    {hasUltrasounds && (
      <UltrasoundAlbum
        checkupResults={results}
        onMediaClick={handleMediaClick}
      />
    )}
  </div>
)}
```

### Empty State (No Checkups)
```tsx
{checkups.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="w-20 h-20 rounded-full bg-[var(--color-page-bg)] flex items-center justify-center mb-4">
      <HospitalIcon className="w-10 h-10 text-tertiary" />
    </div>
    <p className="text-body-emphasis font-bold text-primary mb-1">
      첫 검진을 예약해보세요
    </p>
    <p className="text-caption text-secondary mb-4">
      주차별 권장 검진을 확인하고 일정을 관리할 수 있어요
    </p>
    <button
      onClick={() => setScheduleSheetOpen(true)}
      className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-bold active:opacity-80"
    >
      검진 예약하기
    </button>
  </div>
)}
```

## Integration with Existing Tabs

### Tab 1: 일기·감성 (Unchanged)
- 기다림 일기
- 이름 짓기
- 마음 체크
- 바이오리듬/별자리/운세

### Tab 2: 발달·정보 (Unchanged)
- VerticalFetalGuide (주차별 발달 가이드)
- HospitalGuide (병원 가이드)

### Tab 3: 검진 관리 (★ NEW)
- NextCheckupCard
- CheckupScheduleSection
- UltrasoundAlbum (Phase 2)

### Tab 4: 혜택·준비 (Unchanged)
- BenefitTabs (정부 지원 혜택)
- BabyItemChecklist (아기 용품 체크리스트)

## Tab State Management

### URL Query Parameter (Optional)
```typescript
import { useRouter, useSearchParams } from 'next/navigation'

const router = useRouter()
const searchParams = useSearchParams()

useEffect(() => {
  const tabParam = searchParams.get('tab') as TabKey | null
  if (tabParam && TABS.some(t => t.key === tabParam)) {
    setTab(tabParam)
  }
}, [searchParams])

const handleTabChange = (newTab: TabKey) => {
  setTab(newTab)
  router.push(`/waiting?tab=${newTab}`, { scroll: false })
}
```

### Deep Link Support
```
/waiting?tab=checkup → 검진 관리 탭으로 직접 이동
/waiting?tab=checkup&schedule=true → 검진 관리 탭 + 예약 바텀시트 열림
```

### Push Notification Deep Link
```typescript
// Push notification payload
{
  deeplink: '/waiting?tab=checkup',
  metadata: { checkup_id: 'first_us' }
}

// Handle deep link on page load
useEffect(() => {
  const checkupId = searchParams.get('checkup_id')
  if (checkupId && tab === 'checkup') {
    // Scroll to checkup item
    const element = document.getElementById(`checkup-${checkupId}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}, [searchParams, tab])
```

## Tab Badge (Unread Indicator)

### Show Badge for Upcoming Checkups
```tsx
<button className="relative ...">
  {tab.label}
  {tab.key === 'checkup' && upcomingCount > 0 && (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
      {upcomingCount > 9 ? '9+' : upcomingCount}
    </span>
  )}
</button>
```

### Badge Logic
```typescript
const upcomingCount = checkups.filter(c => {
  if (!c.scheduled_date || c.completed) return false
  const daysUntil = getDaysUntil(c.scheduled_date)
  return daysUntil >= 0 && daysUntil <= 7 // Within next 7 days
}).length
```

## Responsive Behavior

### Mobile (< 430px)
- Tab labels: `text-caption` (12px)
- 4 tabs: Each occupies 25% width (`flex-1`)
- If tab label is too long → Truncate with ellipsis

### Tablet (> 768px)
- Tab labels: `text-body` (13px)
- Max width: `max-w-lg mx-auto` (centered container)

### Tab Label Truncation (if needed)
```tsx
<button className="...">
  <span className="truncate max-w-[80px]">{tab.label}</span>
  {/* Active indicator */}
</button>
```

## Accessibility

### Tab Keyboard Navigation
```tsx
<div role="tablist" aria-label="기다림 페이지 탭">
  {TABS.map((tab, index) => (
    <button
      key={tab.key}
      role="tab"
      aria-selected={currentTab === tab.key}
      aria-controls={`tabpanel-${tab.key}`}
      id={`tab-${tab.key}`}
      tabIndex={currentTab === tab.key ? 0 : -1}
      onKeyDown={(e) => handleTabKeyDown(e, index)}
      className="..."
    >
      {tab.label}
    </button>
  ))}
</div>

<div
  role="tabpanel"
  id={`tabpanel-${currentTab}`}
  aria-labelledby={`tab-${currentTab}`}
  className="..."
>
  {/* Tab content */}
</div>
```

### Arrow Key Navigation
```typescript
function handleTabKeyDown(e: React.KeyboardEvent, index: number) {
  const { key } = e
  if (key === 'ArrowLeft') {
    const prevIndex = (index - 1 + TABS.length) % TABS.length
    setTab(TABS[prevIndex].key)
    document.getElementById(`tab-${TABS[prevIndex].key}`)?.focus()
  } else if (key === 'ArrowRight') {
    const nextIndex = (index + 1) % TABS.length
    setTab(TABS[nextIndex].key)
    document.getElementById(`tab-${TABS[nextIndex].key}`)?.focus()
  }
}
```

### Screen Reader Announcements
```tsx
// On tab change
announceToScreenReader(`${TABS.find(t => t.key === newTab)?.label} 탭으로 이동`)
```

## Animation & Performance

### Tab Content Lazy Loading
```tsx
{tab === 'checkup' && (
  <Suspense fallback={<CheckupTabSkeleton />}>
    <CheckupTabContent />
  </Suspense>
)}
```

### Skeleton Screen (While Loading)
```tsx
function CheckupTabSkeleton() {
  return (
    <div className="p-3 space-y-3">
      {/* NextCheckupCard skeleton */}
      <div className="h-32 bg-[#F5F1EC] rounded-xl animate-pulse" />

      {/* Timeline skeleton */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-[#F5F1EC] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

### Prefetch Checkup Data
```typescript
// Prefetch checkup data when hovering over tab (desktop)
<button
  onMouseEnter={() => {
    if (tab.key === 'checkup' && !checkupsLoaded) {
      prefetchCheckups()
    }
  }}
  className="..."
>
  {tab.label}
</button>
```

## Typography & Spacing

### Tab Bar
- Height: `py-2.5` (10px top/bottom)
- Font: `text-caption font-semibold` (12px, 600)
- Active indicator: `h-0.5` (2px)
- Gap from content: `mb-0` (border acts as separator)

### Tab Content
- Padding: `p-3` (12px all sides)
- Gap between sections: `space-y-3` (12px)

## Design Tokens
```typescript
const TAB_TOKENS = {
  // Tab bar
  tabHeight: '44px',
  tabBorderColor: '#E8E4DF',
  tabActiveColor: 'var(--color-primary)',
  tabInactiveColor: 'var(--color-text-tertiary)',
  tabActiveBg: 'rgba(var(--color-accent-bg), 0.3)',
  indicatorHeight: '2px',

  // Tab content
  contentPadding: '12px',
  contentGap: '12px',

  // Badge
  badgeSize: '20px',
  badgeFontSize: '10px',
  badgeColor: 'var(--color-primary)',
}
```

## Implementation Notes

### State Persistence
```typescript
// Save last active tab to localStorage
useEffect(() => {
  localStorage.setItem('dodam_waiting_last_tab', tab)
}, [tab])

// Restore last tab on mount
useEffect(() => {
  const lastTab = localStorage.getItem('dodam_waiting_last_tab') as TabKey
  if (lastTab && TABS.some(t => t.key === lastTab)) {
    setTab(lastTab)
  }
}, [])
```

### Tab Badge Update
```typescript
// Update badge count when checkups change
useEffect(() => {
  const count = checkups.filter(c => {
    if (!c.scheduled_date || c.completed) return false
    const daysUntil = getDaysUntil(c.scheduled_date)
    return daysUntil >= 0 && daysUntil <= 7
  }).length
  setUpcomingCount(count)
}, [checkups])
```

## Edge Cases
1. **No checkups scheduled**: Show empty state + CTA
2. **All checkups completed**: Show "모든 검진 완료!" message + next steps guide
3. **Past due checkups**: Show "놓친 검진" warning banner
4. **First visit to tab**: Show onboarding tooltip (optional)
5. **Deep link with invalid tab**: Fallback to 'diary' tab

## File Location
```
src/app/waiting/page.tsx
├── (PregnantWaitingPage component)
│   ├── Tab navigation
│   ├── Tab content (diary | info | checkup | benefit)
│   └── Checkup tab content:
│       ├── <NextCheckupCard />
│       ├── <CheckupScheduleSection />
│       └── <UltrasoundAlbum /> (Phase 2)
```

## Related Components
- CheckupScheduleSection (see 01-checkup-schedule-section.md)
- ScheduleBottomSheet (see 02-schedule-bottom-sheet.md)
- NextCheckupCard (inline in CheckupScheduleSection)
- UltrasoundAlbum (Phase 2)
