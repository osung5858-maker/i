# CheckupResultSheet — 검진 결과 입력 바텀시트

## Component Overview

**Purpose**: 검진 완료 후 결과를 기록하는 통합 바텀시트
**Trigger**: CheckupTimelineItem의 [완료] 버튼 클릭
**Location**: `src/components/pregnant/CheckupSchedule/CheckupResultSheet.tsx`

---

## Visual Design

### Layout Structure

```
┌─────────────────────────────────────┐
│ Handle Bar (4px × 40px gray)        │ ← 드래그 핸들
├─────────────────────────────────────┤
│ 검진 결과 입력                        │ ← 제목 (text-subtitle)
├─────────────────────────────────────┤
│ [검진 정보 카드]                      │
│ 8주 첫 초음파 · 2026-05-15 (목)     │ ← 회색 배경, 읽기 전용
├─────────────────────────────────────┤
│ 결과 상태                             │ ← text-caption
│ [ ✅정상 ] [ ⚠️관찰필요 ] [ ❌이상 ]  │ ← 3-button selector
├─────────────────────────────────────┤
│ 메모 (선택사항)                       │
│ [Textarea: 200자 max]                │
├─────────────────────────────────────┤
│ 수치 기록 (선택사항)                  │ ← Expandable section
│ • 아기 심박수: ___ BPM               │
│ • 체중: ___ g                        │
│ • CRL: ___ mm                        │
├─────────────────────────────────────┤
│ 초음파 사진 (최대 5장)                │
│ [+] [썸네일] [썸네일] [썸네일] [썸네일] │ ← Grid layout
├─────────────────────────────────────┤
│ 초음파 영상 (선택사항)                │
│ [영상 업로드 슬롯 — progress bar]     │
├─────────────────────────────────────┤
│ 다음 검진 예약                        │ ← User feedback: integrated
│ [ ] 다음 검진 일정 함께 잡기          │ ← Checkbox
│ (체크 시 Date picker 확장)           │
├─────────────────────────────────────┤
│ [저장하기] (primary button)          │
└─────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Result Status Selector (3-button)

**States**:
- ✅ **정상** (Normal) — Green accent
- ⚠️ **관찰필요** (Requires observation) — Yellow/Orange accent
- ❌ **이상소견** (Abnormal) — Red accent

**Visual Design**:
```tsx
<div className="flex gap-2">
  <button
    className={`flex-1 py-3 rounded-xl border-2 transition-all ${
      status === 'normal'
        ? 'bg-[#E8F5EE] border-[#4CAF50] text-[#4CAF50]'
        : 'bg-white border-[#E8E4DF] text-secondary'
    }`}
  >
    <span className="text-xl mb-1">✅</span>
    <p className="text-caption font-semibold">정상</p>
  </button>
  <button
    className={`flex-1 py-3 rounded-xl border-2 transition-all ${
      status === 'observe'
        ? 'bg-[#FFF8E6] border-[#E8937A] text-[#E8937A]'
        : 'bg-white border-[#E8E4DF] text-secondary'
    }`}
  >
    <span className="text-xl mb-1">⚠️</span>
    <p className="text-caption font-semibold">관찰필요</p>
  </button>
  <button
    className={`flex-1 py-3 rounded-xl border-2 transition-all ${
      status === 'abnormal'
        ? 'bg-[#FFF0F0] border-[#D05050] text-[#D05050]'
        : 'bg-white border-[#E8E4DF] text-secondary'
    }`}
  >
    <span className="text-xl mb-1">❌</span>
    <p className="text-caption font-semibold">이상소견</p>
  </button>
</div>
```

**Interaction**:
- Single selection (radio button behavior)
- Active state: Filled background + colored border
- Inactive state: White background + gray border
- Haptic feedback on tap

---

### 2. Measurement Fields (Expandable)

**Default State**: Collapsed section with "수치 기록 (선택사항)" + chevron down icon

**Expanded State**:
```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <label className="text-caption text-secondary">아기 심박수</label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        placeholder="120"
        className="w-20 h-9 px-3 rounded-lg border border-[#E8E4DF] text-right text-body-emphasis"
      />
      <span className="text-caption text-tertiary">BPM</span>
    </div>
  </div>
  <div className="flex items-center justify-between">
    <label className="text-caption text-secondary">체중 (추정)</label>
    <div className="flex items-center gap-2">
      <input type="number" className="..." />
      <span className="text-caption text-tertiary">g</span>
    </div>
  </div>
  <div className="flex items-center justify-between">
    <label className="text-caption text-secondary">CRL (머리-엉덩이 길이)</label>
    <div className="flex items-center gap-2">
      <input type="number" className="..." />
      <span className="text-caption text-tertiary">mm</span>
    </div>
  </div>
</div>
```

**Common Measurements** (week-dependent):
- 4-8주: CRL, 심박수
- 12-15주: BPD (머리 직경), FL (대퇴골 길이)
- 20-40주: BPD, FL, AC (배 둘레), EFW (예상 체중)

**Dynamic Fields**: Show relevant fields based on checkup week

---

### 3. Media Upload Section

See `06-media-upload-ui.md` for detailed specs.

**Quick Summary**:
- 사진: Grid with + button, max 5 images, 96×96px thumbnails
- 영상: Single slot, max 100MB, progress bar during upload
- Upload to Supabase Storage `ultrasound` bucket
- Signed URLs with 1hr expiry

---

### 4. Next Checkup Integrated Scheduler

**Visual Design**:
```tsx
<div className="border-t border-[#E8E4DF] pt-3 mt-4">
  <label className="flex items-center gap-2 text-body-emphasis text-primary">
    <input
      type="checkbox"
      checked={scheduleNext}
      onChange={(e) => setScheduleNext(e.target.checked)}
      className="w-5 h-5 rounded border-2 border-[#D4CFC9] text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
    />
    <span>다음 검진 일정 함께 잡기</span>
  </label>

  {scheduleNext && (
    <div className="mt-3 space-y-2 animate-slideDown">
      <div>
        <label className="block text-caption text-secondary mb-1">다음 검진일</label>
        <input type="date" className="..." />
      </div>
      <div>
        <label className="block text-caption text-secondary mb-1">시간 (선택)</label>
        <input type="time" className="..." />
      </div>
    </div>
  )}
</div>
```

**Auto-suggestion Logic**:
- If current checkup is "8주 첫 초음파" → Suggest "11주 NT 검사" (3 weeks later)
- Pre-fill date field with `currentDate + 21 days`
- User can modify or uncheck

---

## Data Model

### ResultData Interface

```typescript
interface CheckupResult {
  checkup_id: string           // References CheckupSchedule
  status: 'normal' | 'observe' | 'abnormal'
  memo?: string                // Optional, max 200 chars
  measurements?: {
    heartRate?: number         // BPM
    weight?: number            // grams
    crl?: number               // mm (4-12주)
    bpd?: number               // mm (12주+)
    fl?: number                // mm (12주+)
    ac?: number                // mm (20주+)
    efw?: number               // grams (20주+)
    [key: string]: number | undefined
  }
  ultrasound_images?: string[] // Supabase Storage URLs (max 5)
  ultrasound_video?: string    // Supabase Storage URL
  next_checkup?: {
    scheduled_date: string
    scheduled_time?: string
  }
  created_at: string           // ISO timestamp
}
```

### Storage Schema

**Type**: `preg_records` table (type = "checkup_result")

```json
{
  "record_date": "2026-05-15",
  "type": "checkup_result",
  "value": {
    "checkup_id": "first_us",
    "status": "normal",
    "memo": "아기 심박수 정상, 건강하게 자라는 중!",
    "measurements": {
      "heartRate": 145,
      "crl": 15
    },
    "ultrasound_images": [
      "ultrasound/user123/2026-05-15/img1.jpg",
      "ultrasound/user123/2026-05-15/img2.jpg"
    ],
    "ultrasound_video": "ultrasound/user123/2026-05-15/video.mp4"
  }
}
```

---

## Interaction Flow

### Happy Path

1. User taps [완료] on scheduled checkup
2. CheckupResultSheet slides up (300ms)
3. Focus on result status selector
4. User taps ✅ **정상**
5. User types memo: "아기 심박수 정상!"
6. User expands measurement section
7. Enters heart rate: 145 BPM
8. User taps [+ 사진 추가], selects 2 images
9. Images upload (progress bar 0% → 100%)
10. User checks "다음 검진 일정 함께 잡기"
11. Date picker expands, pre-filled with suggested date
12. User taps [저장하기]
13. Sheet closes, timeline updates (completed ✓)
14. Toast: "검진 결과 저장 완료!"

### Edge Cases

1. **No status selected**: Disable [저장하기] button
2. **Upload fails**: Show error badge + retry button
3. **Video > 100MB**: Show error "파일 크기는 100MB 이하여야 합니다"
4. **Next checkup already scheduled**: Show info banner "이미 예약된 검진이 있어요"

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Status | Required | "[저장하기] 버튼 비활성" |
| Memo | Optional, max 200 chars | "200자 이하로 입력해주세요" |
| Measurements | Optional, numeric only | "숫자만 입력 가능합니다" |
| Images | Max 5, < 10MB each | "사진은 최대 5장, 각 10MB 이하" |
| Video | Max 1, < 100MB | "영상은 100MB 이하여야 합니다" |

---

## Styling

### Colors

```css
/* Status Buttons */
--status-normal-bg: #E8F5EE;
--status-normal-border: #4CAF50;
--status-normal-text: #4CAF50;

--status-observe-bg: #FFF8E6;
--status-observe-border: #E8937A;
--status-observe-text: #E8937A;

--status-abnormal-bg: #FFF0F0;
--status-abnormal-border: #D05050;
--status-abnormal-text: #D05050;
```

### Typography

- Title: `text-subtitle` (15px / 600)
- Section labels: `text-caption` (12px / 400)
- Input text: `text-body-emphasis` (14px / 600)
- Button text: `text-caption` (12px / 600)

### Spacing

- Sheet padding: `px-5 pb-5`
- Section gap: `space-y-4`
- Input gap: `space-y-2`
- Bottom safe area: `pb-[env(safe-area-inset-bottom)]`

### Animations

```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideDown {
  animation: slideDown 0.2s ease-out;
}
```

---

## Props Interface

```typescript
interface CheckupResultSheetProps {
  open: boolean
  onClose: () => void
  checkup: CheckupSchedule              // Checkup being completed
  onSave: (result: CheckupResult) => void
  suggestedNextDate?: string            // Pre-fill next checkup date
}
```

---

## Error Handling

### Upload Errors

```tsx
{uploadError && (
  <div className="mt-2 p-3 bg-[#FFF0F0] border border-[#D05050] rounded-lg">
    <p className="text-caption text-[#D05050] font-medium">
      업로드 실패: {uploadError}
    </p>
    <button
      onClick={retryUpload}
      className="mt-2 px-3 py-1 bg-white border border-[#D05050] rounded-lg text-caption text-[#D05050]"
    >
      다시 시도
    </button>
  </div>
)}
```

### Network Errors

```tsx
{networkError && (
  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] animate-fadeIn">
    <div className="bg-[#D05050] px-5 py-2.5 rounded-xl text-body font-bold text-white shadow-xl">
      네트워크 오류. 다시 시도해주세요.
    </div>
  </div>
)}
```

---

## Accessibility

### ARIA Labels

```tsx
<div role="dialog" aria-modal="true" aria-labelledby="result-title">
  <h2 id="result-title" className="text-subtitle">검진 결과 입력</h2>

  <div role="radiogroup" aria-label="결과 상태 선택">
    <button role="radio" aria-checked={status === 'normal'}>✅ 정상</button>
    <button role="radio" aria-checked={status === 'observe'}>⚠️ 관찰필요</button>
    <button role="radio" aria-checked={status === 'abnormal'}>❌ 이상소견</button>
  </div>

  <input
    type="file"
    accept="image/jpeg,image/png,image/heic"
    aria-label="초음파 사진 업로드"
  />
</div>
```

### Keyboard Navigation

- Tab order: Status selector → Memo → Measurements → Media → Next checkup → Save
- Enter key: Submit form (if valid)
- Escape key: Close sheet (with confirmation if data entered)

### Screen Reader Announcements

```typescript
// After save success
announceToScreenReader('검진 결과가 저장되었습니다')

// After upload complete
announceToScreenReader('사진 업로드 완료')
```

---

## Performance

### Lazy Loading

```tsx
const CheckupResultSheet = dynamic(
  () => import('./CheckupResultSheet'),
  { loading: () => <div className="h-96 animate-pulse bg-[#F5F1EC]" /> }
)
```

### Image Optimization

- Compress images before upload (max 1920px width)
- Generate thumbnails client-side (Canvas API)
- Use WebP format when supported

### Upload Progress

```tsx
{uploading && (
  <div className="mt-2">
    <div className="flex justify-between text-caption text-secondary mb-1">
      <span>업로드 중...</span>
      <span>{uploadProgress}%</span>
    </div>
    <div className="w-full h-2 bg-[#E8E4DF] rounded-full overflow-hidden">
      <div
        className="h-full bg-[var(--color-primary)] transition-all duration-300"
        style={{ width: `${uploadProgress}%` }}
      />
    </div>
  </div>
)}
```

---

## Design Tokens

```typescript
export const RESULT_SHEET_TOKENS = {
  status: {
    normal: { bg: '#E8F5EE', border: '#4CAF50', text: '#4CAF50' },
    observe: { bg: '#FFF8E6', border: '#E8937A', text: '#E8937A' },
    abnormal: { bg: '#FFF0F0', border: '#D05050', text: '#D05050' },
  },
  upload: {
    maxImages: 5,
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    acceptedFormats: ['image/jpeg', 'image/png', 'image/heic', 'video/mp4'],
  },
  animation: {
    slideUp: 'slideUp 0.3s ease-out',
    fadeIn: 'fadeIn 0.2s ease-out',
  },
}
```

---

## Related Components

- `CheckupScheduleSection.tsx` — Triggers result sheet via [완료] button
- `MediaUploadGrid.tsx` — Image grid component (see 06-media-upload-ui.md)
- `VideoUploadSlot.tsx` — Video upload component (see 06-media-upload-ui.md)
- `UltrasoundAlbum.tsx` — Displays saved images (see 07-ultrasound-album.md)

---

## Future Enhancements (Out of Scope)

- OCR: Auto-extract measurements from uploaded checkup report photo
- AI analysis: Detect anomalies in ultrasound images
- Export to PDF: Generate checkup summary report
- Share with doctor: Send result via secure link

---

**Design Phase**: Phase 2A
**Component Type**: Bottom Sheet (Modal)
**Priority**: High
**Dependencies**: Supabase Storage setup, pregRecord.ts CRUD functions
**Status**: Design Complete — Ready for Implementation
