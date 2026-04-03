# 검진 관리 시스템 — 구현 가이드

> **Target Audience**: Frontend/Backend Developers
> **Prerequisites**: Next.js 16, Supabase, TypeScript
> **Estimated Effort**: 3-4 weeks (1 developer)

---

## 1. 구현 순서 (Phase-based Approach)

### Phase 1: 기반 인프라 (Week 1)
**목표**: DB 스키마, 타입 정의, 기본 CRUD

#### 1.1 Migration 실행
```bash
cd /path/to/dodam
supabase migration new checkup_schedule
# 파일 생성: supabase/migrations/20260405_checkup_schedule.sql

# Migration 내용 작성 (이미 제공됨)
# - preg_records type 확장
# - 인덱스 추가
# - Storage bucket 생성 (수동)
# - RLS 정책 추가

# 로컬 테스트
supabase db reset
supabase migration up

# Production 배포
supabase db push
```

#### 1.2 Storage Bucket 생성
```bash
# CLI로 생성
supabase storage create ultrasound --public false

# 또는 Dashboard에서:
# Storage → New Bucket
# - Name: ultrasound
# - Public: false
# - File size limit: 30MB
# - Allowed MIME: image/jpeg, image/png, video/mp4, video/quicktime
```

#### 1.3 TypeScript 타입 정의
```typescript
// src/types/checkup.ts (신규 파일)
export interface CheckupSchedule {
  checkup_id: string
  title: string
  scheduled_date: string
  scheduled_time?: string
  hospital?: string
  memo?: string
  completed: boolean
  completed_date?: string
  is_custom: boolean
}

export interface CheckupResult {
  checkup_id: string
  date: string
  hospital?: string
  doctor?: string
  status: 'normal' | 'observe' | 'abnormal'
  memo?: string
  measurements?: Record<string, number>
  media: MediaFile[]
}

export interface MediaFile {
  type: 'image' | 'video'
  url: string
  thumbnail_url?: string
  uploaded_at: string
}

export const DEFAULT_CHECKUPS = [
  { id: 'first_visit', week: 4, title: '첫 방문 (임신 확인)' },
  { id: 'first_us', week: 8, title: '첫 초음파 (심박 확인)' },
  { id: 'nt_scan', week: 11, title: 'NT 검사' },
  { id: 'quad_test', week: 16, title: '쿼드 검사' },
  { id: 'detailed_us', week: 20, title: '정밀 초음파' },
  { id: 'glucose_test', week: 24, title: '임신성 당뇨 검사' },
  { id: 'nst_1', week: 28, title: 'NST 검사 (1차)' },
  { id: 'nst_2', week: 32, title: 'NST 검사 (2차)' },
  { id: 'nst_3', week: 36, title: 'NST 검사 (3차)' },
] as const
```

#### 1.4 Service Layer 확장
```typescript
// src/lib/supabase/pregRecord.ts에 추가

import type { CheckupSchedule, CheckupResult } from '@/types/checkup'

/** 검진 일정 생성 */
export async function createCheckupSchedule(data: CheckupSchedule): Promise<void> {
  await upsertPregRecord(data.scheduled_date, 'checkup_schedule', data as unknown as Record<string, unknown>)
}

/** 검진 일정 조회 (전체) */
export async function fetchCheckupSchedules(): Promise<CheckupSchedule[]> {
  const records = await fetchPregRecords(['checkup_schedule'])
  return records.map(r => r.value as unknown as CheckupSchedule)
}

/** 검진 완료 처리 */
export async function completeCheckup(checkupId: string): Promise<void> {
  const schedules = await fetchCheckupSchedules()
  const target = schedules.find(s => s.checkup_id === checkupId)
  if (!target) return

  target.completed = true
  target.completed_date = new Date().toISOString().split('T')[0]
  await upsertPregRecord(target.scheduled_date, 'checkup_schedule', target as unknown as Record<string, unknown>)
}

/** 검진 결과 저장 */
export async function saveCheckupResult(data: CheckupResult): Promise<void> {
  await upsertPregRecord(data.date, 'checkup_result', data as unknown as Record<string, unknown>)
}

/** 검진 결과 조회 */
export async function fetchCheckupResults(): Promise<CheckupResult[]> {
  const records = await fetchPregRecords(['checkup_result'])
  return records.map(r => r.value as unknown as CheckupResult)
}
```

---

### Phase 2: UI 컴포넌트 (Week 2)

#### 2.1 CheckupScheduleSection 컴포넌트
```typescript
// src/components/pregnant/CheckupSchedule.tsx (신규)
'use client'

import { useState, useEffect } from 'react'
import { fetchCheckupSchedules, createCheckupSchedule, completeCheckup } from '@/lib/supabase/pregRecord'
import type { CheckupSchedule } from '@/types/checkup'
import { DEFAULT_CHECKUPS } from '@/types/checkup'

export default function CheckupScheduleSection() {
  const [schedules, setSchedules] = useState<CheckupSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleSheet, setShowScheduleSheet] = useState(false)
  const [selectedCheckup, setSelectedCheckup] = useState<typeof DEFAULT_CHECKUPS[number] | null>(null)

  useEffect(() => {
    loadSchedules()
  }, [])

  async function loadSchedules() {
    setLoading(true)
    const data = await fetchCheckupSchedules()
    setSchedules(data)
    setLoading(false)
  }

  const nextCheckup = schedules
    .filter(s => !s.completed && s.scheduled_date)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0]

  const dDay = nextCheckup
    ? Math.ceil((new Date(nextCheckup.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-4 p-4">
      {/* 다음 검진 카드 */}
      {nextCheckup && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">다음 검진</div>
              <div className="text-lg font-bold mt-1">{nextCheckup.title}</div>
              <div className="text-sm text-gray-700 mt-1">
                {nextCheckup.scheduled_date} {nextCheckup.scheduled_time}
              </div>
              {nextCheckup.hospital && (
                <div className="text-xs text-gray-600 mt-0.5">{nextCheckup.hospital}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-pink-600">D-{dDay}</div>
              <div className="text-xs text-gray-600 mt-1">남은 날</div>
            </div>
          </div>
        </div>
      )}

      {/* 검진 타임라인 */}
      <div className="space-y-2">
        <h3 className="font-bold text-gray-800">검진 타임라인</h3>
        {DEFAULT_CHECKUPS.map(checkup => {
          const schedule = schedules.find(s => s.checkup_id === checkup.id)
          return (
            <CheckupTimelineItem
              key={checkup.id}
              checkup={checkup}
              schedule={schedule}
              onSchedule={() => {
                setSelectedCheckup(checkup)
                setShowScheduleSheet(true)
              }}
              onComplete={() => completeCheckup(checkup.id).then(loadSchedules)}
            />
          )
        })}
      </div>

      {/* 예약 바텀시트 */}
      {showScheduleSheet && selectedCheckup && (
        <ScheduleBottomSheet
          checkup={selectedCheckup}
          onClose={() => setShowScheduleSheet(false)}
          onSave={async (data) => {
            await createCheckupSchedule({
              checkup_id: selectedCheckup.id,
              title: selectedCheckup.title,
              ...data,
              completed: false,
              is_custom: false,
            })
            await loadSchedules()
            setShowScheduleSheet(false)
          }}
        />
      )}
    </div>
  )
}

function CheckupTimelineItem({ checkup, schedule, onSchedule, onComplete }: any) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
      {/* 주차 라벨 */}
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
        <span className="text-xs font-bold text-pink-700">{checkup.week}주</span>
      </div>

      {/* 검진 정보 */}
      <div className="flex-1">
        <div className="font-semibold text-gray-800">{checkup.title}</div>
        {schedule?.scheduled_date && (
          <div className="text-xs text-gray-600 mt-0.5">
            {schedule.scheduled_date} {schedule.scheduled_time}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        {schedule?.completed ? (
          <div className="text-green-600 text-sm">✓ 완료</div>
        ) : schedule ? (
          <button
            onClick={onComplete}
            className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs"
          >
            완료
          </button>
        ) : (
          <button
            onClick={onSchedule}
            className="px-3 py-1 bg-pink-100 text-pink-700 rounded text-xs"
          >
            예약
          </button>
        )}
      </div>
    </div>
  )
}

function ScheduleBottomSheet({ checkup, onClose, onSave }: any) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [hospital, setHospital] = useState('')
  const [memo, setMemo] = useState('')
  const [notifyPartner, setNotifyPartner] = useState(true)

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl p-6 w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{checkup.title} 예약</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">시간 (선택)</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">병원 (선택)</label>
            <input
              type="text"
              value={hospital}
              onChange={e => setHospital(e.target.value)}
              placeholder="예: 삼성서울병원"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">메모 (선택)</label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="예: 공복 필요"
              className="w-full border rounded-lg p-2"
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyPartner}
              onChange={e => setNotifyPartner(e.target.checked)}
            />
            <span className="text-sm">배우자에게도 알림</span>
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 rounded-lg font-semibold"
          >
            취소
          </button>
          <button
            onClick={() => onSave({ scheduled_date: date, scheduled_time: time, hospital, memo })}
            disabled={!date}
            className="flex-1 py-3 bg-pink-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### 2.2 기다림 페이지 탭 추가
```typescript
// src/app/waiting/page.tsx (수정)
// 기존 PregnantWaitingPage 컴포넌트에 탭 추가

const tabs = [
  { id: 'diary', label: '일기·감성', icon: '📝' },
  { id: 'checkup', label: '검진 관리', icon: '🏥' }, // ★ 신규
  { id: 'development', label: '발달·정보', icon: '👶' },
  { id: 'benefits', label: '혜택·준비', icon: '🎁' },
]

// 탭 콘텐츠 렌더링
{activeTab === 'checkup' && <CheckupScheduleSection />}
```

---

### Phase 3: 미디어 업로드 (Week 3)

#### 3.1 Storage 서비스 레이어
```typescript
// src/lib/supabase/storage.ts (신규)
import { createClient } from '@/lib/supabase/client'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024 // 30MB

export async function uploadUltrasoundImage(
  checkupId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; thumbnail_url: string }> {
  if (file.size > MAX_IMAGE_SIZE) throw new Error('이미지 크기는 10MB 이하여야 합니다')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  // 클라이언트 리사이즈 (1200px)
  const resized = await resizeImage(file, { maxWidth: 1200, quality: 0.85 })

  const fileName = `img_${Date.now()}.jpg`
  const path = `${user.id}/${checkupId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('ultrasound')
    .upload(path, resized, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) throw error

  // Signed URL 생성 (1시간)
  const { data: urlData } = await supabase.storage
    .from('ultrasound')
    .createSignedUrl(data.path, 3600)

  // 썸네일 URL (Supabase Image Transformation)
  const thumbnailUrl = `${urlData.signedUrl.split('?')[0]}?width=300`

  return {
    url: urlData.signedUrl,
    thumbnail_url: thumbnailUrl,
  }
}

async function resizeImage(file: File, options: { maxWidth: number; quality: number }): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, options.maxWidth / img.width)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', options.quality)
    }
  })
}
```

#### 3.2 CheckupResultSheet 컴포넌트
```typescript
// src/components/pregnant/CheckupResultSheet.tsx (신규)
'use client'

import { useState } from 'react'
import { saveCheckupResult } from '@/lib/supabase/pregRecord'
import { uploadUltrasoundImage } from '@/lib/supabase/storage'
import type { CheckupResult, MediaFile } from '@/types/checkup'

export default function CheckupResultSheet({ checkupId, checkupName, onClose, onSave }: any) {
  const [status, setStatus] = useState<'normal' | 'observe' | 'abnormal'>('normal')
  const [memo, setMemo] = useState('')
  const [media, setMedia] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (media.filter(m => m.type === 'image').length + files.length > 5) {
      alert('이미지는 최대 5장까지 업로드 가능합니다')
      return
    }

    setUploading(true)
    for (const file of files) {
      try {
        const { url, thumbnail_url } = await uploadUltrasoundImage(
          checkupId,
          file,
          (percent) => setUploadProgress(percent)
        )
        setMedia(prev => [...prev, {
          type: 'image',
          url,
          thumbnail_url,
          uploaded_at: new Date().toISOString(),
        }])
      } catch (error) {
        alert((error as Error).message)
      }
    }
    setUploading(false)
    setUploadProgress(0)
  }

  async function handleSave() {
    const result: CheckupResult = {
      checkup_id: checkupId,
      date: new Date().toISOString().split('T')[0],
      status,
      memo,
      media,
    }
    await saveCheckupResult(result)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl p-6 w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{checkupName} 결과</h2>

        {/* 상태 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">상태</label>
          <div className="flex gap-2">
            {(['normal', 'observe', 'abnormal'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 rounded-lg font-semibold ${
                  status === s
                    ? s === 'normal' ? 'bg-green-600 text-white'
                      : s === 'observe' ? 'bg-yellow-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'bg-gray-200'
                }`}
              >
                {s === 'normal' ? '✅ 정상' : s === 'observe' ? '⚠️ 관찰' : '❌ 이상'}
              </button>
            ))}
          </div>
        </div>

        {/* 메모 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">메모</label>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="예: 심장 박동 확인, 정상"
            className="w-full border rounded-lg p-2"
            rows={4}
          />
        </div>

        {/* 이미지 업로드 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">
            초음파 사진 ({media.filter(m => m.type === 'image').length}/5)
          </label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {media.filter(m => m.type === 'image').map((m, i) => (
              <img key={i} src={m.thumbnail_url} className="w-full aspect-square object-cover rounded" />
            ))}
          </div>
          {media.filter(m => m.type === 'image').length < 5 && (
            <label className="block w-full py-3 bg-pink-100 text-pink-700 rounded-lg text-center cursor-pointer">
              + 사진 추가
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
          {uploading && (
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-pink-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={uploading}
          className="w-full py-3 bg-pink-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </div>
  )
}
```

---

### Phase 4: 배우자 알림 (Week 4)

#### 4.1 API Route
```typescript
// src/app/api/notify-partner/route.ts (신규)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:support@dodam.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, title, body, deeplink, metadata } = await req.json()

  // 파트너 조회
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('partner_user_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.partner_user_id) {
    return NextResponse.json({ success: false, fallback_kakao_share: true })
  }

  // 파트너 Push 토큰 조회
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', profile.partner_user_id)

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ success: false, fallback_kakao_share: true })
  }

  // Push 발송
  const payload = JSON.stringify({ title, body, deeplink, metadata })
  try {
    await webpush.sendNotification(tokens[0], payload)

    // 로그 기록
    await supabase.from('notification_log').insert({
      user_id: profile.partner_user_id,
      type,
      title,
      body,
      deeplink,
    })

    return NextResponse.json({ success: true, sent_to_partner: true })
  } catch (error) {
    console.error('Push 발송 실패:', error)
    return NextResponse.json({ success: false, fallback_kakao_share: true })
  }
}
```

#### 4.2 클라이언트 통합
```typescript
// CheckupScheduleSection에서 호출
async function handleScheduleSave(data: any) {
  // 검진 예약 저장
  await createCheckupSchedule({ ... })

  // 배우자 알림 발송
  if (notifyPartner) {
    await fetch('/api/notify-partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'checkup_scheduled',
        title: `[태명] 검진 예약됐어요!`,
        body: `${data.scheduled_date} ${checkup.title}`,
        deeplink: '/waiting?tab=checkup',
        metadata: { checkup_id: checkup.id },
      }),
    })
  }
}
```

---

## 2. 테스트 시나리오

### 2.1 Unit Tests (Jest)
```typescript
// __tests__/lib/supabase/pregRecord.test.ts
describe('Checkup Schedule CRUD', () => {
  it('should create checkup schedule', async () => {
    await createCheckupSchedule({
      checkup_id: 'first_us',
      title: '첫 초음파',
      scheduled_date: '2026-05-15',
      completed: false,
      is_custom: false,
    })
    const schedules = await fetchCheckupSchedules()
    expect(schedules).toHaveLength(1)
    expect(schedules[0].checkup_id).toBe('first_us')
  })
})
```

### 2.2 E2E Tests (Playwright)
```typescript
// tests/checkup.spec.ts
import { test, expect } from '@playwright/test'

test('검진 예약 플로우', async ({ page }) => {
  await page.goto('/waiting')
  await page.click('text=검진 관리')

  // 첫 초음파 예약 버튼 클릭
  await page.click('text=예약', { nth: 0 })

  // 날짜 입력
  await page.fill('input[type="date"]', '2026-05-15')
  await page.fill('input[type="time"]', '10:30')

  // 저장
  await page.click('text=저장')

  // 확인
  await expect(page.locator('text=D-')).toBeVisible()
})
```

---

## 3. 배포 체크리스트

### 3.1 환경변수 설정
```bash
# Vercel Dashboard → Settings → Environment Variables
VAPID_PRIVATE_KEY=<your-private-key>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BITzVh759e8pmLHPItzIKtS2jM1mlartS4otyUwQSVwklXMEdfYEeulWC76gGKLmeLASOsjV8NUy7vstVqR4hxQ
```

### 3.2 Supabase 설정
- [ ] Migration 실행 완료
- [ ] Storage Bucket `ultrasound` 생성 (public=false)
- [ ] RLS 정책 활성화 확인

### 3.3 성능 체크
- [ ] Lighthouse 점수 확인 (LCP < 2.5s)
- [ ] 초음파 업로드 속도 테스트 (10MB → < 3s)

---

## 4. Troubleshooting

### 문제 1: RLS 정책 적용 안 됨
```sql
-- RLS 활성화 확인
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'preg_records';

-- 정책 리스트 확인
\d+ preg_records
```

### 문제 2: Storage 업로드 실패 (403)
```typescript
// Bucket 이름 확인
const { data } = await supabase.storage.getBucket('ultrasound')
console.log(data.public) // false여야 함

// 폴더 구조 확인
// {user_id}/{checkup_id}/img_001.jpg
```

### 문제 3: Push 알림 미발송
```typescript
// Push 토큰 확인
const { data } = await supabase.from('push_tokens').select('*').eq('user_id', partnerId)
console.log(data) // 토큰 존재 확인

// VAPID Key 확인
console.log(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) // BITz...로 시작
```

---

## 5. References

- Architecture Doc: `/docs/designs/checkup-management-architecture.md`
- API Spec: `/docs/api/checkup-api-spec.yaml`
- Threat Model: `/docs/security/checkup-threat-model.md`
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
