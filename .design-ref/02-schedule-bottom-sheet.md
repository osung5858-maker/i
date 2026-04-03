# ScheduleBottomSheet — Design Reference

## Overview
검진 예약/수정 바텀시트 — 날짜/시간 선택, 병원 입력, 배우자 알림 토글

## Visual Design

### Layout Structure
```
┌─────────────────────────────────────────┐
│ ─────  (handle bar)                     │
│                                         │
│ 검진 예약                                │ ← Title
│                                         │
│ ┌─────────────────────────────────┐     │
│ │ 첫 초음파                        │     │ ← Checkup selector
│ │ 8주차 권장 검진                  │     │
│ └─────────────────────────────────┘     │
│                                         │
│ 날짜                                     │
│ ┌─────────────────────────────────┐     │
│ │ 2026-05-15 (목)         📅      │     │ ← Date picker
│ └─────────────────────────────────┘     │
│                                         │
│ 시간 (선택사항)                          │
│ ┌─────────────────────────────────┐     │
│ │ 10:30                   🕒      │     │ ← Time picker
│ └─────────────────────────────────┘     │
│                                         │
│ 병원 (선택사항)                          │
│ ┌─────────────────────────────────┐     │
│ │ 삼성서울병원                     │     │ ← Hospital input
│ └─────────────────────────────────┘     │
│                                         │
│ 메모 (선택사항)                          │
│ ┌─────────────────────────────────┐     │
│ │ 공복 필요                        │     │ ← Memo textarea
│ └─────────────────────────────────┘     │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │ 🔔 파트너에게 알림 보내기  ☑    │     │ ← Notify toggle
│ └─────────────────────────────────┘     │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │      저장하기                     │     │ ← Save button
│ └─────────────────────────────────┘     │
│                                         │
│ safe-area-inset-bottom                  │
└─────────────────────────────────────────┘
```

### Container Styling
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
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease-out;
}
```

### Handle Bar
```
┌─────────────────────────────────────────┐
│          ─────────                      │ ← 40px wide, 4px tall
│                                         │    bg-[#E0E0E0]
│                                         │    rounded-full
└─────────────────────────────────────────┘
```
- Width: `w-10` (40px)
- Height: `h-1` (4px)
- Color: `bg-[#E0E0E0]`
- Margin: `mx-auto pt-3 pb-2`

## Component Sections

### 1. Title Section
```tsx
<p className="text-subtitle text-primary mb-4">검진 예약</p>
```
- Font: `text-subtitle` (15px, semibold)
- Color: `text-primary`
- Margin bottom: `mb-4` (16px)

### 2. Checkup Selector
For **default checkups**:
```tsx
<div className="bg-[var(--color-page-bg)] rounded-xl p-4 border border-[#E8E4DF]">
  <p className="text-body-emphasis font-bold text-primary">첫 초음파</p>
  <p className="text-caption text-tertiary">8주차 권장 검진</p>
</div>
```

For **custom checkups**:
```tsx
<input
  type="text"
  placeholder="검진명 입력 (예: 담당의 추가 검진)"
  className="w-full p-3 rounded-xl border border-[#E8E4DF] text-body-emphasis focus:border-[var(--color-primary)]"
/>
```

### 3. Date Picker Input
```tsx
<label className="block text-caption text-secondary mb-2">날짜</label>
<div className="relative">
  <input
    type="date"
    value={selectedDate}
    onChange={handleDateChange}
    className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis
               bg-white focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/25"
  />
  <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary pointer-events-none" />
</div>
```

**Native date input styling**:
- Hide default calendar icon: `input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0; }`
- Custom icon overlaid on right side

### 4. Time Picker Input
```tsx
<label className="block text-caption text-secondary mb-2">시간 (선택사항)</label>
<div className="relative">
  <input
    type="time"
    value={selectedTime}
    onChange={handleTimeChange}
    className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis
               bg-white focus:border-[var(--color-primary)]"
  />
  <ClockIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary pointer-events-none" />
</div>
```

### 5. Hospital Input
```tsx
<label className="block text-caption text-secondary mb-2">병원 (선택사항)</label>
<input
  type="text"
  placeholder="병원명 입력"
  value={hospital}
  onChange={handleHospitalChange}
  className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis
             bg-white placeholder:text-tertiary focus:border-[var(--color-primary)]"
/>
```

### 6. Memo Textarea
```tsx
<label className="block text-caption text-secondary mb-2">메모 (선택사항)</label>
<textarea
  placeholder="공복 필요, 주차권 챙기기 등"
  value={memo}
  onChange={handleMemoChange}
  rows={3}
  maxLength={200}
  className="w-full p-3 rounded-xl border border-[#E8E4DF] text-body-emphasis
             bg-white placeholder:text-tertiary resize-none
             focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/25"
/>
<p className="text-label text-tertiary text-right mt-1">{memo.length}/200</p>
```

### 7. Notify Partner Toggle
```tsx
<div className="flex items-center justify-between p-4 rounded-xl bg-[#F0F9F4] border border-[var(--color-accent-bg)]">
  <div className="flex items-center gap-2">
    <BellIcon className="w-5 h-5 text-[var(--color-primary)]" />
    <span className="text-body font-medium text-primary">파트너에게 알림 보내기</span>
  </div>
  <button
    onClick={toggleNotify}
    className={`w-12 h-7 rounded-full transition-colors ${
      notifyPartner ? 'bg-[var(--color-primary)]' : 'bg-[#D4CFC9]'
    }`}
  >
    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
      notifyPartner ? 'translate-x-5' : 'translate-x-1'
    }`} />
  </button>
</div>
```

**Toggle switch design**:
- ON state: `bg-[var(--color-primary)]`, circle `translate-x-5`
- OFF state: `bg-[#D4CFC9]`, circle `translate-x-1`
- Transition: `transition-all duration-200`

### 8. Save Button
```tsx
<button
  onClick={handleSave}
  disabled={!selectedDate}
  className={`w-full py-3.5 rounded-xl text-subtitle font-bold transition-colors ${
    selectedDate
      ? 'bg-[var(--color-primary)] text-white active:opacity-80'
      : 'bg-[#E8E4DF] text-tertiary cursor-not-allowed'
  }`}
>
  저장하기
</button>
```

**Button states**:
- **Enabled**: `bg-[var(--color-primary)] text-white`
- **Disabled**: `bg-[#E8E4DF] text-tertiary cursor-not-allowed`
- **Active (press)**: `active:opacity-80 active:scale-98`

## User Interactions

### Opening Animation
```css
@keyframes slideUp {
  from { transform: translate(-50%, 100%); }
  to { transform: translate(-50%, 0); }
}
```
- Duration: `300ms`
- Easing: `ease-out`

### Closing Animation
```css
@keyframes slideDown {
  from { transform: translate(-50%, 0); }
  to { transform: translate(-50%, 100%); }
}
```
- Duration: `250ms`
- Easing: `ease-in`

### Backdrop Overlay
```tsx
<div
  className="fixed inset-0 z-[90] bg-black/40"
  onClick={handleClose}
>
  <div
    className="absolute bottom-0 left-1/2 -translate-x-1/2 ..."
    onClick={(e) => e.stopPropagation()}
  >
    {/* Bottom sheet content */}
  </div>
</div>
```
- z-index: `z-[90]` (above most UI, below toasts)
- Backdrop: `bg-black/40` (40% opacity black)

### Handle Bar Drag (Future Enhancement)
- Detect vertical drag on handle bar
- Close sheet if dragged down > 100px

## Form Validation

### Required Fields
- ✅ **Date**: Required (button disabled if empty)
- ❌ **Time**: Optional
- ❌ **Hospital**: Optional
- ❌ **Memo**: Optional

### Date Validation
```typescript
const today = new Date()
const minDate = new Date(today.setDate(today.getDate() - 30)) // 30 days ago
const maxDate = new Date(dueDate) // Until due date

function isValidDate(dateString: string): boolean {
  const selected = new Date(dateString)
  return selected >= minDate && selected <= maxDate
}
```

### Error States
```tsx
{dateError && (
  <p className="text-caption text-[#D05050] mt-1">
    예정일 이후 날짜는 선택할 수 없어요
  </p>
)}
```

## Notify Partner Logic

### Toggle Behavior
1. **ON (true)**:
   - Background: `bg-[#F0F9F4]` (light green)
   - Border: `border-[var(--color-accent-bg)]`
   - Icon color: `text-[var(--color-primary)]`

2. **OFF (false)**:
   - Background: `bg-[#F5F1EC]`
   - Border: `border-[#E8E4DF]`
   - Icon color: `text-tertiary`

### Partner Not Linked State
```tsx
{!hasPartner && (
  <p className="text-caption text-[#C4A35A] mt-2 px-4">
    파트너 연결 후 알림을 보낼 수 있어요
  </p>
)}
```

## Save Flow

### Success Flow
1. Validate form (date required)
2. Call `createCheckupSchedule()` API
3. If `notifyPartner` is true → call `/api/notify-partner`
4. Close bottom sheet
5. Refetch checkup list
6. Show toast: "검진 예약 완료!"
7. Haptic feedback (if supported)

### Error Handling
```typescript
try {
  await createCheckupSchedule(data)
  if (notifyPartner) await notifyPartner(payload)
  onClose()
  showToast('검진 예약 완료!')
} catch (error) {
  console.error('Checkup schedule error:', error)
  showToast('저장 실패. 다시 시도해주세요')
}
```

## Accessibility

### Focus Management
- When sheet opens → focus on first input (date picker)
- When sheet closes → focus back to trigger button

### Keyboard Navigation
- Tab order: Date → Time → Hospital → Memo → Toggle → Save
- Escape key: Close sheet

### ARIA Labels
```tsx
<div role="dialog" aria-modal="true" aria-labelledby="sheet-title">
  <p id="sheet-title" className="sr-only">검진 예약 양식</p>

  <label htmlFor="date-input">날짜 (필수)</label>
  <input id="date-input" type="date" aria-required="true" />

  <label htmlFor="time-input">시간 (선택사항)</label>
  <input id="time-input" type="time" aria-required="false" />

  <button aria-label="파트너에게 알림 보내기 켜짐/꺼짐" role="switch" aria-checked={notifyPartner}>
    {/* Toggle switch */}
  </button>
</div>
```

### Screen Reader Announcements
```tsx
// On save success
announceToScreenReader('검진 예약이 저장되었습니다')

// On save error
announceToScreenReader('저장에 실패했습니다. 다시 시도해주세요')
```

## Typography Scale
| Element | Class | Font Size | Weight | Color |
|---------|-------|-----------|--------|-------|
| Title | `text-subtitle` | 15px | 600 | `text-primary` |
| Label | `text-caption` | 12px | 400 | `text-secondary` |
| Input text | `text-body-emphasis` | 14px | 600 | `text-primary` |
| Placeholder | `text-body` | 13px | 400 | `text-tertiary` |
| Error | `text-caption` | 12px | 400 | `text-[#D05050]` |
| Button | `text-subtitle` | 15px | 700 | `text-white` |

## Design Tokens
```typescript
const SHEET_TOKENS = {
  // Container
  borderRadius: '20px 20px 0 0',
  maxWidth: '430px',
  padding: '20px',
  shadow: '0 -4px 24px rgba(0, 0, 0, 0.15)',

  // Handle bar
  handleWidth: '40px',
  handleHeight: '4px',
  handleColor: '#E0E0E0',

  // Input fields
  inputHeight: '48px',
  inputBorderRadius: '12px',
  inputBorder: '#E8E4DF',
  inputFocusBorder: 'var(--color-primary)',

  // Toggle switch
  toggleWidth: '48px',
  toggleHeight: '28px',
  toggleCircleSize: '20px',

  // Button
  buttonHeight: '48px',
  buttonBorderRadius: '12px',
}
```

## Implementation Notes

### State Management
```typescript
interface ScheduleSheetProps {
  open: boolean
  onClose: () => void
  checkup?: CheckupSchedule // For editing existing
  mode: 'create' | 'edit' | 'custom'
}

const [selectedDate, setSelectedDate] = useState('')
const [selectedTime, setSelectedTime] = useState('')
const [hospital, setHospital] = useState('')
const [memo, setMemo] = useState('')
const [notifyPartner, setNotifyPartner] = useState(true)
const [saving, setSaving] = useState(false)
```

### Date Formatting
```typescript
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

function formatDateDisplay(dateString: string): string {
  const d = new Date(dateString)
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()} (${weekday})`
}
```

### Time Formatting
```typescript
function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? '오후' : '오전'
  const hour = h % 12 || 12
  return `${period} ${hour}:${String(m).padStart(2, '0')}`
}
```

## Edge Cases
1. **No due date set**: Disable date validation, allow any future date
2. **Partner not linked**: Disable notify toggle + show info text
3. **Past date selected**: Show warning "이미 지난 날짜예요. 오늘 이후 날짜를 선택해주세요"
4. **Custom checkup with no title**: Disable save button
5. **Edit mode**: Pre-fill all fields, change button text to "수정하기"

## File Location
```
src/components/pregnant/CheckupSchedule/
├── ScheduleBottomSheet.tsx (main component)
├── CheckupSelector.tsx (default vs custom mode)
├── NotifyPartnerToggle.tsx
└── types.ts
```

## Related Components
- CheckupScheduleSection (parent component)
- CheckupResultSheet (result input after completion)
- Toast component (for success/error messages)
