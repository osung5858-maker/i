# UltrasoundAlbum — 주차별 초음파 갤러리

## Component Overview

**Purpose**: 저장된 초음파 사진/영상을 주차별로 그리드 갤러리 형태로 표시
**Location**: `src/components/pregnant/CheckupSchedule/UltrasoundAlbum.tsx`
**Usage**: `/waiting` page "검진 관리" tab 또는 독립 페이지 `/ultrasound-album`

---

## Visual Design

### Layout Structure (Grid View)

```
┌─────────────────────────────────────┐
│ 초음파 앨범 📷                       │ ← Page title
├─────────────────────────────────────┤
│ [4주] [8주] [12주] [20주] [ALL]     │ ← Week filter tabs
├─────────────────────────────────────┤
│ 8주차 · 2026-05-15                  │ ← Week header
│ ┌────┬────┬────┬────┐               │
│ │IMG │IMG │IMG │VID │               │ ← 2×N grid
│ ├────┼────┼────┼────┤               │
│ │IMG │    │    │    │               │
│ └────┴────┴────┴────┘               │
├─────────────────────────────────────┤
│ 12주차 · 2026-06-12                 │
│ ┌────┬────┬────┬────┐               │
│ │IMG │IMG │IMG │    │               │
│ └────┴────┴────┴────┘               │
└─────────────────────────────────────┘
```

**Grid Item Specs**:
- 2 columns layout (mobile)
- Square aspect ratio (1:1)
- 8px gap between items
- Rounded corners (12px)
- Border: 1px solid #E8E4DF

---

## Component Structure

### Main Component

```tsx
export default function UltrasoundAlbum() {
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all')
  const [media, setMedia] = useState<MediaItem[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Fetch media from preg_records
  useEffect(() => {
    fetchUltrasoundMedia().then(setMedia)
  }, [])

  const filteredMedia = selectedWeek === 'all'
    ? media
    : media.filter(m => m.week === selectedWeek)

  const groupedByWeek = groupBy(filteredMedia, 'week')

  return (
    <div className="min-h-screen bg-[var(--color-page-bg)] pb-24">
      <div className="max-w-lg mx-auto px-5 pt-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-heading-2 text-primary flex-1">초음파 앨범</h1>
          <p className="text-caption text-tertiary">{media.length}개 미디어</p>
        </div>

        {/* Week filter tabs */}
        <WeekFilterTabs
          weeks={Array.from(new Set(media.map(m => m.week))).sort()}
          selected={selectedWeek}
          onChange={setSelectedWeek}
        />

        {/* Album grid by week */}
        {Object.entries(groupedByWeek).map(([week, items]) => (
          <WeekSection
            key={week}
            week={Number(week)}
            items={items}
            onItemClick={(idx) => openLightbox(items, idx)}
          />
        ))}

        {/* Empty state */}
        {media.length === 0 && (
          <EmptyState
            icon={<CameraIcon className="w-12 h-12 text-secondary" />}
            title="아직 저장된 초음파가 없어요"
            description="검진 결과를 입력하면 초음파 사진과 영상을 저장할 수 있어요"
          />
        )}
      </div>

      {/* Lightbox viewer */}
      {lightboxOpen && (
        <LightboxViewer
          items={filteredMedia}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
```

---

## Sub-Components

### 1. WeekFilterTabs

**Design**:
```tsx
function WeekFilterTabs({ weeks, selected, onChange }) {
  const tabs = [...weeks, 'all']

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
      {tabs.map(week => (
        <button
          key={week}
          onClick={() => onChange(week)}
          className={`shrink-0 px-4 py-2 rounded-full text-caption font-semibold transition-all ${
            selected === week
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-white text-secondary border border-[#E8E4DF]'
          }`}
        >
          {week === 'all' ? '전체' : `${week}주`}
        </button>
      ))}
    </div>
  )
}
```

**States**:
- Active: Filled coral background, white text
- Inactive: White background, gray text
- Hover: Scale 1.05 (desktop only)

---

### 2. WeekSection

**Design**:
```tsx
function WeekSection({ week, items, onItemClick }) {
  const checkup = items[0]?.checkup // Get associated checkup
  const date = items[0]?.date

  return (
    <section className="space-y-3">
      {/* Week header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-body-emphasis font-bold text-primary">
            {week}주차 · {checkup?.title || '검진'}
          </h2>
          <p className="text-caption text-tertiary">{formatDate(date)}</p>
        </div>
        <span className="text-label text-tertiary">{items.length}개</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, idx) => (
          <MediaThumbnail
            key={idx}
            item={item}
            onClick={() => onItemClick(idx)}
          />
        ))}
      </div>
    </section>
  )
}
```

---

### 3. MediaThumbnail

**Design** (Image):
```tsx
function MediaThumbnail({ item, onClick }) {
  const isVideo = item.type === 'video'

  return (
    <button
      onClick={onClick}
      className="aspect-square rounded-xl overflow-hidden border border-[#E8E4DF] bg-white active:scale-95 transition-transform relative group"
    >
      {/* Thumbnail image */}
      <img
        src={item.thumbnailUrl}
        alt={`${item.week}주차 초음파`}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Video play button overlay */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <PlayIcon className="w-6 h-6 text-[var(--color-primary)] ml-0.5" />
          </div>
        </div>
      )}

      {/* Video duration badge */}
      {isVideo && (
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-label font-medium">
          {item.duration}
        </div>
      )}

      {/* Hover overlay (desktop) */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </button>
  )
}
```

**States**:
1. **Image Thumbnail**:
   - Square aspect ratio
   - Object-fit: cover
   - Border: 1px solid #E8E4DF
   - Hover: Slight darkening overlay

2. **Video Thumbnail**:
   - Same as image
   - Additional: Play button overlay (center)
   - Additional: Duration badge (bottom-right)
   - Hover: Play button scale 1.1

---

## Lightbox Viewer (Full-Screen)

### Visual Design

```
┌─────────────────────────────────────┐
│ [×]                          [⋮]    │ ← Close + Options (top bar)
│                                     │
│                                     │
│         [Media Content]             │ ← Image or Video (center)
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [←]  3 / 12              🗑️ [→]     │ ← Nav + Counter + Delete (bottom bar)
├─────────────────────────────────────┤
│ 8주차 첫 초음파                      │ ← Caption
│ 2026-05-15 · 심박수 145 BPM         │
└─────────────────────────────────────┘
```

**Component**:
```tsx
function LightboxViewer({ items, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const item = items[currentIndex]

  const goNext = () => setCurrentIndex((i) => (i + 1) % items.length)
  const goPrev = () => setCurrentIndex((i) => (i - 1 + items.length) % items.length)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Swipe gestures (mobile)
  const handleSwipe = useSwipeGesture({ onLeft: goNext, onRight: goPrev })

  return (
    <div
      className="fixed inset-0 z-[100] bg-black animate-fadeIn"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
          <MoreIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Media content */}
      <div
        className="h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        {...handleSwipe}
      >
        {item.type === 'image' ? (
          <img
            src={item.url}
            alt={`${item.week}주차 초음파`}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-w-full max-h-full"
          />
        )}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={goPrev}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30"
            disabled={currentIndex === 0}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <p className="text-body font-medium text-white">
              {currentIndex + 1} / {items.length}
            </p>
            <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goNext}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30"
            disabled={currentIndex === items.length - 1}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Caption */}
        <div className="text-center">
          <p className="text-body font-semibold text-white">{item.week}주차 · {item.checkup?.title}</p>
          <p className="text-caption text-white/80">{formatDate(item.date)}</p>
          {item.memo && (
            <p className="text-caption text-white/70 mt-1 line-clamp-2">{item.memo}</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## Data Model

### MediaItem Interface

```typescript
interface MediaItem {
  id: string                  // UUID
  checkup_id: string          // Reference to CheckupSchedule
  week: number                // 8, 12, 20...
  date: string                // "2026-05-15"
  type: 'image' | 'video'
  url: string                 // Supabase Storage signed URL
  thumbnailUrl: string        // For videos, extracted frame
  fileName: string            // "ultrasound_8week.jpg"
  fileSize: number            // bytes
  duration?: string           // "00:15" (videos only)
  checkup?: CheckupSchedule   // Associated checkup data
  memo?: string               // From checkup result
}
```

### Fetching Logic

```typescript
import { fetchPregRecords } from '@/lib/supabase/pregRecord'
import { createClient } from '@/lib/supabase/client'

async function fetchUltrasoundMedia(): Promise<MediaItem[]> {
  // 1. Fetch checkup results
  const results = await fetchPregRecords(['checkup_result'])

  const items: MediaItem[] = []

  // 2. Extract media from each result
  for (const result of results) {
    const data = result.value as CheckupResult

    // Images
    if (data.ultrasound_images) {
      for (const path of data.ultrasound_images) {
        const signedUrl = await getSignedUrl(path)
        items.push({
          id: `${result.id}_img_${items.length}`,
          checkup_id: data.checkup_id,
          week: getWeekFromCheckup(data.checkup_id),
          date: result.record_date,
          type: 'image',
          url: signedUrl,
          thumbnailUrl: signedUrl, // Same for images
          fileName: path.split('/').pop()!,
          fileSize: 0, // Not stored, could fetch from Storage API
          memo: data.memo,
        })
      }
    }

    // Video
    if (data.ultrasound_video) {
      const signedUrl = await getSignedUrl(data.ultrasound_video)
      const thumbnailUrl = await extractVideoThumbnail(signedUrl)
      items.push({
        id: `${result.id}_video`,
        checkup_id: data.checkup_id,
        week: getWeekFromCheckup(data.checkup_id),
        date: result.record_date,
        type: 'video',
        url: signedUrl,
        thumbnailUrl,
        fileName: data.ultrasound_video.split('/').pop()!,
        fileSize: 0,
        duration: '00:15', // Extract from video metadata
        memo: data.memo,
      })
    }
  }

  return items.sort((a, b) => b.date.localeCompare(a.date))
}

// Helper: Get signed URL from Supabase Storage
async function getSignedUrl(path: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('ultrasound')
    .createSignedUrl(path, 3600) // 1hr expiry
  return data?.signedUrl || ''
}

// Helper: Extract video thumbnail (first frame)
async function extractVideoThumbnail(videoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = videoUrl
    video.currentTime = 0.5 // 0.5s into video

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    })

    video.load()
  })
}
```

---

## Interactions

### Swipe Gestures (Mobile)

```typescript
function useSwipeGesture({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current

    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) onLeft()  // Swipe left
      else onRight()          // Swipe right
    }
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  }
}
```

### Pinch-to-Zoom (Future Enhancement)

```typescript
// TODO: Phase 3 — Pinch gesture on lightbox images
function usePinchZoom() {
  const [scale, setScale] = useState(1)
  // Implementation with Hammer.js or native touch events
}
```

---

## Empty State

**Design**:
```tsx
function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-20 h-20 rounded-full bg-[#F5F1EC] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-body-emphasis text-primary font-semibold mb-1">{title}</h3>
      <p className="text-caption text-secondary max-w-xs">{description}</p>
    </div>
  )
}
```

---

## Performance Optimization

### Lazy Loading

```tsx
// Load images lazily
<img
  src={item.thumbnailUrl}
  loading="lazy"
  decoding="async"
  className="..."
/>
```

### Virtual Scrolling (Optional)

```tsx
// For very large albums (>100 items), use react-window
import { FixedSizeGrid } from 'react-window'

<FixedSizeGrid
  columnCount={2}
  columnWidth={180}
  height={600}
  rowCount={Math.ceil(items.length / 2)}
  rowHeight={180}
  width={400}
>
  {({ columnIndex, rowIndex, style }) => (
    <div style={style}>
      <MediaThumbnail item={items[rowIndex * 2 + columnIndex]} />
    </div>
  )}
</FixedSizeGrid>
```

### Thumbnail Caching

```typescript
// Cache thumbnails in localStorage (base64)
const THUMBNAIL_CACHE_KEY = 'dodam_ultrasound_thumbnails'

function cacheThumbnail(itemId: string, dataUrl: string) {
  const cache = JSON.parse(localStorage.getItem(THUMBNAIL_CACHE_KEY) || '{}')
  cache[itemId] = dataUrl
  localStorage.setItem(THUMBNAIL_CACHE_KEY, JSON.stringify(cache))
}

function getCachedThumbnail(itemId: string): string | null {
  const cache = JSON.parse(localStorage.getItem(THUMBNAIL_CACHE_KEY) || '{}')
  return cache[itemId] || null
}
```

---

## Accessibility

### ARIA Labels

```tsx
<section aria-label="초음파 앨범" role="region">
  <h1 id="album-title">초음파 앨범</h1>

  <div role="tablist" aria-label="주차 필터">
    <button role="tab" aria-selected={selected === week}>
      {week}주
    </button>
  </div>

  <div role="grid" aria-labelledby="week-header">
    <button
      role="gridcell"
      aria-label={`${item.week}주차 초음파 사진, ${formatDate(item.date)}`}
      onClick={openLightbox}
    >
      <img alt="" role="presentation" />
    </button>
  </div>
</section>
```

### Keyboard Navigation

- Tab: Move between thumbnails
- Enter/Space: Open lightbox
- Arrow keys: Navigate in lightbox
- Escape: Close lightbox

### Screen Reader Support

```typescript
// Announce lightbox open
announceToScreenReader(`라이트박스 열림. ${currentIndex + 1}번째 미디어, 총 ${items.length}개`)

// Announce navigation
announceToScreenReader(`${currentIndex + 1}번째 미디어로 이동`)
```

---

## Related Components

- `CheckupResultSheet.tsx` — Creates media records
- `MediaUploadGrid.tsx` — Uploads media to Storage
- `LightboxViewer.tsx` — Full-screen viewer

---

## Design Tokens

```typescript
export const ALBUM_TOKENS = {
  grid: {
    columns: 2,
    gap: 8,
    itemAspectRatio: 1,
    itemBorderRadius: 12,
  },
  thumbnail: {
    size: 180, // px (calculated based on screen width)
    playButtonSize: 48,
    durationBadgePadding: 8,
  },
  lightbox: {
    backdropColor: 'rgba(0, 0, 0, 1)',
    navButtonSize: 40,
    closeButtonSize: 40,
  },
  animation: {
    fadeIn: 'fadeIn 0.2s ease-out',
    slideIn: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
}
```

---

## Future Enhancements (Out of Scope)

- Download button (save to device gallery)
- Share button (Kakao, SNS)
- Print/PDF export
- Slideshow mode (auto-advance)
- Pinch-to-zoom on lightbox
- Image editing (crop, rotate, filters)
- Video trimming
- Comparison view (side-by-side weeks)

---

**Design Phase**: Phase 2B
**Component Type**: Gallery + Lightbox
**Priority**: Medium
**Dependencies**: CheckupResultSheet (Phase 2A), Supabase Storage
**Status**: Design Complete — Ready for Implementation
