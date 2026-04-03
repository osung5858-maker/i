# Media Upload UI — 초음파 사진 & 영상 업로드

## Component Overview

**Purpose**: Supabase Storage 기반 초음파 미디어 업로드 UI 패턴
**Usage**: CheckupResultSheet, UltrasoundAlbum
**Location**: `src/components/pregnant/CheckupSchedule/MediaUpload*.tsx`

---

## Architecture

### Supabase Storage Setup (from da:system)

**Bucket**: `ultrasound`
- Public bucket (signed URLs for 1hr expiry)
- Path structure: `{user_id}/{record_date}/{filename}`
- File policies: Upload own files, read own files

**Example URL**:
```
https://xxx.supabase.co/storage/v1/object/sign/ultrasound/user123/2026-05-15/img1.jpg?token=...
```

---

## Component 1: MediaUploadGrid (Images)

### Visual Design

```
┌─────────────────────────────────────┐
│ 초음파 사진 (최대 5장)                │ ← Section title
├─────────────────────────────────────┤
│ [+] [IMG] [IMG] [IMG] [IMG]         │ ← Horizontal scroll grid
│  96  96   96   96   96  px          │
└─────────────────────────────────────┘
```

**Grid Layout**:
```tsx
<div className="space-y-2">
  <label className="text-caption text-secondary">초음파 사진 (최대 5장)</label>
  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
    {/* Add button (always first) */}
    {images.length < 5 && (
      <label
        htmlFor="image-upload"
        className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-[#D4CFC9] flex flex-col items-center justify-center cursor-pointer hover:bg-[#F5F1EC] active:scale-95 transition-all"
      >
        <PlusIcon className="w-6 h-6 text-secondary" />
        <span className="text-label text-tertiary mt-1">사진 추가</span>
      </label>
    )}

    {/* Image thumbnails */}
    {images.map((img, idx) => (
      <div
        key={idx}
        className="shrink-0 relative w-24 h-24 rounded-xl overflow-hidden border border-[#E8E4DF] group"
      >
        <img
          src={img.preview}
          alt={`초음파 사진 ${idx + 1}`}
          className="w-full h-full object-cover"
        />
        {/* Delete button (hover overlay) */}
        <button
          onClick={() => removeImage(idx)}
          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <TrashIcon className="w-5 h-5 text-white" />
        </button>
        {/* Upload progress overlay */}
        {img.uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-16 h-16">
              <svg className="animate-spin" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeDashoffset="10" />
              </svg>
              <p className="text-white text-label mt-1 text-center">{img.progress}%</p>
            </div>
          </div>
        )}
      </div>
    ))}
  </div>

  <input
    id="image-upload"
    type="file"
    accept="image/jpeg,image/png,image/heic"
    multiple
    onChange={handleImageSelect}
    className="hidden"
  />
</div>
```

### States

1. **Empty State** (0 images):
   - Show only [+] button
   - Placeholder text: "검진 결과와 함께 초음파 사진을 저장하세요"

2. **Uploading State**:
   - Thumbnail with dark overlay
   - Circular progress spinner + percentage text
   - Disable [저장하기] button until upload complete

3. **Complete State**:
   - Thumbnail with image preview
   - Delete button on hover (desktop) or long-press (mobile)

4. **Error State**:
   - Red border around thumbnail
   - Error badge: "업로드 실패"
   - Retry button overlay

5. **Max Reached** (5 images):
   - Hide [+] button
   - Show info text: "최대 5장까지 업로드 가능합니다"

---

## Component 2: VideoUploadSlot (Video)

### Visual Design

```
┌─────────────────────────────────────┐
│ 초음파 영상 (선택사항)                │ ← Section title
├─────────────────────────────────────┤
│ [Empty State]                       │
│   🎬 아이콘                          │
│   영상 업로드 (최대 100MB)           │
│   [파일 선택]                        │
└─────────────────────────────────────┘

OR (after upload):

┌─────────────────────────────────────┐
│ 초음파 영상                          │
│ ┌───────────────────────────────┐  │
│ │  ▶️ Video Thumbnail            │  │ ← Click to preview
│ │  ultrasound_8week.mp4         │  │
│ │  2.4 MB · 00:15               │  │
│ └───────────────────────────────┘  │
│ [삭제]                              │
└─────────────────────────────────────┘
```

**Empty State**:
```tsx
<div className="space-y-2">
  <label className="text-caption text-secondary">초음파 영상 (선택사항)</label>
  <div
    className="border-2 border-dashed border-[#D4CFC9] rounded-xl p-6 text-center"
  >
    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F5F1EC] flex items-center justify-center">
      <VideoIcon className="w-6 h-6 text-secondary" />
    </div>
    <p className="text-body text-secondary mb-1">초음파 영상 업로드</p>
    <p className="text-caption text-tertiary mb-3">최대 100MB · MP4, MOV 형식</p>
    <label
      htmlFor="video-upload"
      className="inline-flex px-4 py-2 bg-[var(--color-primary-bg)] text-[var(--color-primary)] rounded-lg text-caption font-semibold cursor-pointer hover:bg-[var(--color-accent-bg)] active:scale-95 transition-all"
    >
      파일 선택
    </label>
    <input
      id="video-upload"
      type="file"
      accept="video/mp4,video/quicktime"
      onChange={handleVideoSelect}
      className="hidden"
    />
  </div>
</div>
```

**Uploading State**:
```tsx
<div className="border border-[#E8E4DF] rounded-xl p-4 bg-[#F5F1EC]">
  <div className="flex items-center gap-3 mb-2">
    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
      <VideoIcon className="w-5 h-5 text-[var(--color-primary)]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-body-emphasis text-primary truncate">{video.name}</p>
      <p className="text-caption text-tertiary">{formatFileSize(video.size)}</p>
    </div>
  </div>

  {/* Progress bar */}
  <div className="space-y-1">
    <div className="flex justify-between text-caption text-secondary">
      <span>업로드 중...</span>
      <span>{uploadProgress}%</span>
    </div>
    <div className="w-full h-2 bg-white rounded-full overflow-hidden">
      <div
        className="h-full bg-[var(--color-primary)] transition-all duration-300"
        style={{ width: `${uploadProgress}%` }}
      />
    </div>
  </div>
</div>
```

**Complete State**:
```tsx
<div className="border border-[#E8E4DF] rounded-xl overflow-hidden bg-white">
  {/* Video thumbnail with play button */}
  <div className="relative aspect-video bg-black">
    <video src={video.url} className="w-full h-full object-contain" />
    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
      <button className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform">
        <PlayIcon className="w-8 h-8 text-[var(--color-primary)] ml-1" />
      </button>
    </div>
  </div>

  {/* Video info + delete */}
  <div className="p-3 flex items-center justify-between">
    <div className="flex-1">
      <p className="text-body-emphasis text-primary truncate">{video.name}</p>
      <p className="text-caption text-tertiary">{video.size} · {video.duration}</p>
    </div>
    <button
      onClick={removeVideo}
      className="px-3 py-1.5 rounded-lg bg-[#FDE8E8] text-caption font-semibold text-[#D05050] active:opacity-80"
    >
      삭제
    </button>
  </div>
</div>
```

---

## Upload Logic

### Client-Side Flow

```typescript
// 1. File selection
const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])

  // Validate count
  if (images.length + files.length > 5) {
    showToast('사진은 최대 5장까지 업로드할 수 있어요')
    return
  }

  // Validate size
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      showToast(`${file.name}은 10MB 이하 파일만 업로드 가능해요`)
      return
    }
  }

  // Create preview URLs
  const newImages = files.map(file => ({
    file,
    preview: URL.createObjectURL(file),
    uploading: false,
    progress: 0,
  }))

  setImages(prev => [...prev, ...newImages])
}

// 2. Upload to Supabase Storage
const uploadImage = async (image: ImageFile, index: number) => {
  const supabase = createClient()
  const userId = (await supabase.auth.getUser()).data.user?.id
  const recordDate = new Date().toISOString().split('T')[0]
  const fileName = `${Date.now()}_${index}.jpg`
  const filePath = `${userId}/${recordDate}/${fileName}`

  setImages(prev => {
    const next = [...prev]
    next[index].uploading = true
    return next
  })

  const { data, error } = await supabase.storage
    .from('ultrasound')
    .upload(filePath, image.file, {
      onUploadProgress: (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100)
        setImages(prev => {
          const next = [...prev]
          next[index].progress = percent
          return next
        })
      },
    })

  if (error) {
    setImages(prev => {
      const next = [...prev]
      next[index].error = error.message
      next[index].uploading = false
      return next
    })
    return null
  }

  setImages(prev => {
    const next = [...prev]
    next[index].uploading = false
    next[index].url = data.path
    return next
  })

  return data.path
}

// 3. Get signed URL for display
const getSignedUrl = async (path: string) => {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('ultrasound')
    .createSignedUrl(path, 3600) // 1hr expiry
  return data?.signedUrl
}
```

### Retry Logic

```typescript
const retryUpload = async (index: number) => {
  const image = images[index]
  if (!image.file) return

  // Reset error state
  setImages(prev => {
    const next = [...prev]
    next[index].error = undefined
    next[index].progress = 0
    return next
  })

  // Retry upload
  await uploadImage(image, index)
}
```

---

## Utility Functions

### Image Compression (Client-side)

```typescript
import imageCompression from 'browser-image-compression'

const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  }
  return await imageCompression(file, options)
}
```

### File Size Formatter

```typescript
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

### Video Duration Extractor

```typescript
const getVideoDuration = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src)
      const duration = Math.floor(video.duration)
      const min = Math.floor(duration / 60)
      const sec = duration % 60
      resolve(`${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`)
    }
    video.src = URL.createObjectURL(file)
  })
}
```

---

## Error Handling

### Common Errors

| Error | User Message | Recovery |
|-------|--------------|----------|
| File too large | "파일 크기는 10MB(영상 100MB) 이하여야 합니다" | Prompt user to select smaller file |
| Invalid format | "지원하지 않는 파일 형식입니다 (JPEG, PNG, MP4만 가능)" | Show accepted formats |
| Upload failed | "업로드 실패. 네트워크 연결을 확인해주세요" | Retry button |
| Quota exceeded | "저장 공간이 부족합니다" | Contact support |
| Network timeout | "업로드 시간 초과. 다시 시도해주세요" | Retry with exponential backoff |

### Error UI Component

```tsx
{uploadError && (
  <div className="mt-2 p-3 bg-[#FFF0F0] border border-[#D05050] rounded-lg flex items-start gap-2">
    <AlertIcon className="w-4 h-4 text-[#D05050] shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-caption text-[#D05050] font-medium">{uploadError}</p>
      {retryable && (
        <button
          onClick={handleRetry}
          className="mt-2 text-caption text-[#D05050] underline"
        >
          다시 시도
        </button>
      )}
    </div>
  </div>
)}
```

---

## Performance Optimization

### Progressive Loading

```tsx
// Load images lazily
<img
  src={image.preview}
  loading="lazy"
  decoding="async"
  className="..."
/>
```

### Thumbnail Generation

```typescript
// Generate thumbnail before upload (reduce file size)
const generateThumbnail = async (file: File): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()

  return new Promise((resolve) => {
    img.onload = () => {
      const size = 384 // 96px * 4 for Retina
      canvas.width = size
      canvas.height = size

      // Draw cropped thumbnail
      const scale = Math.max(size / img.width, size / img.height)
      const x = (size / 2) - (img.width / 2) * scale
      const y = (size / 2) - (img.height / 2) * scale
      ctx?.drawImage(img, x, y, img.width * scale, img.height * scale)

      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}
```

### Parallel Uploads

```typescript
// Upload multiple images in parallel (max 3 concurrent)
const uploadImages = async (files: ImageFile[]) => {
  const concurrency = 3
  const chunks = []

  for (let i = 0; i < files.length; i += concurrency) {
    chunks.push(files.slice(i, i + concurrency))
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map((img, idx) => uploadImage(img, idx)))
  }
}
```

---

## Mobile-Specific Features

### Camera Integration

```tsx
<input
  type="file"
  accept="image/*"
  capture="environment"  // Prefer rear camera
  onChange={handleCameraCapture}
/>
```

### Orientation Handling

```typescript
// Fix image rotation from EXIF data
import { getOrientation, resetOrientation } from 'get-orientation'

const fixImageOrientation = async (file: File): Promise<File> => {
  const orientation = await getOrientation(file)
  if (orientation === 1) return file // No rotation needed

  return await resetOrientation(file, orientation)
}
```

---

## Design Tokens

```typescript
export const MEDIA_UPLOAD_TOKENS = {
  image: {
    maxCount: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
    thumbnailSize: 96, // 96×96px
    acceptedFormats: ['image/jpeg', 'image/png', 'image/heic'],
    compressionQuality: 0.85,
  },
  video: {
    maxCount: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    acceptedFormats: ['video/mp4', 'video/quicktime'],
    thumbnailAspectRatio: 16 / 9,
  },
  upload: {
    concurrency: 3,
    chunkSize: 1024 * 1024, // 1MB chunks
    timeout: 60000, // 60s
    retryAttempts: 3,
    retryDelay: 1000, // 1s, exponential backoff
  },
  storage: {
    bucket: 'ultrasound',
    signedUrlExpiry: 3600, // 1hr
    pathTemplate: '{userId}/{recordDate}/{fileName}',
  },
}
```

---

## Accessibility

### ARIA Labels

```tsx
<input
  type="file"
  accept="image/*"
  multiple
  aria-label="초음파 사진 업로드"
  aria-describedby="image-upload-hint"
/>
<p id="image-upload-hint" className="sr-only">
  최대 5장, 각 10MB 이하의 JPEG 또는 PNG 파일을 업로드할 수 있습니다
</p>
```

### Keyboard Navigation

- Tab to [파일 선택] button
- Enter/Space to open file picker
- Tab to each thumbnail
- Enter/Space to preview or delete

### Screen Reader Announcements

```typescript
// After upload complete
announceToScreenReader(`사진 ${index + 1}번 업로드 완료`)

// After delete
announceToScreenReader(`사진 ${index + 1}번 삭제됨`)

// Upload progress
announceToScreenReader(`업로드 ${progress}% 완료`, { polite: true })
```

---

## Related Components

- `CheckupResultSheet.tsx` — Uses MediaUploadGrid + VideoUploadSlot
- `UltrasoundAlbum.tsx` — Displays uploaded media in gallery view
- `LightboxViewer.tsx` — Full-screen image/video viewer (Phase 2B)

---

## Future Enhancements (Out of Scope)

- Drag-and-drop file upload
- Image cropping/rotation editor
- Video trimming (select start/end time)
- Bulk upload progress indicator
- Cloud sync status indicator

---

**Design Phase**: Phase 2A
**Component Type**: Form Input + Upload Handler
**Priority**: High
**Dependencies**: Supabase Storage bucket setup, browser-image-compression (optional)
**Status**: Design Complete — Ready for Implementation
