'use client'

import { useState, useEffect, useRef } from 'react'
import { CameraIcon, XIcon, PlusIcon } from '@/components/ui/Icons'
import type { CheckupSchedule, CheckupStatus, CheckupResult, CheckupMedia } from './types'
import { DEFAULT_CHECKUPS } from '@/constants/checkups'
import {
  saveCheckupResult,
  fetchCheckupResult,
  getCurrentUserId,
} from '@/lib/supabase/pregRecord'
import {
  uploadUltrasoundImage,
  uploadUltrasoundVideo,
  getSignedUrl,
  deleteMedia,
} from '@/lib/supabase/storage'

const STATUS_OPTIONS: { value: CheckupStatus; label: string; color: string; bg: string }[] = [
  { value: 'normal', label: '정상', color: '#4CAF50', bg: '#E8F5E9' },
  { value: 'observe', label: '관찰필요', color: '#E8A317', bg: '#FFF8E1' },
  { value: 'abnormal', label: '이상소견', color: '#D05050', bg: '#FDE8E8' },
]

const MAX_IMAGES = 5
const MAX_VIDEO = 1

function haptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20)
}

interface LocalMedia {
  id: string
  type: 'image' | 'video'
  file?: File
  path?: string // already uploaded
  previewUrl: string
  uploading: boolean
  progress: number
  error?: string
}

interface Props {
  open: boolean
  onClose: () => void
  checkup: CheckupSchedule
  onSaved?: () => void
}

export default function CheckupResultSheet({ open, onClose, checkup, onSaved }: Props) {
  const [status, setStatus] = useState<CheckupStatus>('normal')
  const [memo, setMemo] = useState('')
  const [hospital, setHospital] = useState('')
  const [doctor, setDoctor] = useState('')
  const [date, setDate] = useState('')
  const [media, setMedia] = useState<LocalMedia[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [existingResult, setExistingResult] = useState<CheckupResult | null>(null)

  // Next checkup scheduling
  const [nextCheckupId, setNextCheckupId] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('')

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Load existing result on open
  useEffect(() => {
    if (!open) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    fetchCheckupResult(checkup.checkup_id).then(async (result) => {
      if (result) {
        setExistingResult(result)
        setStatus(result.status)
        setMemo(result.memo || '')
        setHospital(result.hospital || '')
        setDoctor(result.doctor || '')
        setDate(result.date)
        // Resolve media URLs
        const loaded: LocalMedia[] = []
        for (const m of result.media || []) {
          try {
            const url = await getSignedUrl(m.path)
            loaded.push({
              id: m.path,
              type: m.type,
              path: m.path,
              previewUrl: url,
              uploading: false,
              progress: 100,
            })
          } catch { /* skip broken */ }
        }
        setMedia(loaded)
      } else {
        setExistingResult(null)
        setStatus('normal')
        setMemo('')
        setHospital(checkup.hospital || '')
        setDoctor('')
        setDate(checkup.completed_date || today)
        setMedia([])
      }
      setNextCheckupId('')
      setNextDate('')
      setNextTime('')
      setLoading(false)
    })
  }, [open, checkup])

  if (!open) return null

  const imageCount = media.filter(m => m.type === 'image').length
  const videoCount = media.filter(m => m.type === 'video').length

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const userId = await getCurrentUserId()
    if (!userId) return
    const remaining = MAX_IMAGES - imageCount
    const selected = Array.from(files).slice(0, remaining)

    for (const file of selected) {
      const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const preview = URL.createObjectURL(file)
      const item: LocalMedia = { id, type: 'image', file, previewUrl: preview, uploading: true, progress: 0 }
      setMedia(prev => [...prev, item])

      try {
        const path = await uploadUltrasoundImage(userId, checkup.checkup_id, file, (pct) => {
          setMedia(prev => prev.map(m => m.id === id ? { ...m, progress: pct } : m))
        })
        setMedia(prev => prev.map(m => m.id === id ? { ...m, path, uploading: false, progress: 100 } : m))
      } catch (err) {
        setMedia(prev => prev.map(m =>
          m.id === id ? { ...m, uploading: false, error: (err as Error).message } : m
        ))
      }
    }
    e.target.value = ''
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const userId = await getCurrentUserId()
    if (!userId) return
    if (videoCount >= MAX_VIDEO) return

    const id = `vid_${Date.now()}`
    const preview = URL.createObjectURL(file)
    const item: LocalMedia = { id, type: 'video', file, previewUrl: preview, uploading: true, progress: 0 }
    setMedia(prev => [...prev, item])

    try {
      const path = await uploadUltrasoundVideo(userId, checkup.checkup_id, file, (pct) => {
        setMedia(prev => prev.map(m => m.id === id ? { ...m, progress: pct } : m))
      })
      setMedia(prev => prev.map(m => m.id === id ? { ...m, path, uploading: false, progress: 100 } : m))
    } catch (err) {
      setMedia(prev => prev.map(m =>
        m.id === id ? { ...m, uploading: false, error: (err as Error).message } : m
      ))
    }
    e.target.value = ''
  }

  const removeMedia = async (item: LocalMedia) => {
    if (item.path) {
      try { await deleteMedia(item.path) } catch { /* ignore */ }
    }
    if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
    setMedia(prev => prev.filter(m => m.id !== item.id))
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    haptic()
    try {
      const mediaEntries: CheckupMedia[] = media
        .filter(m => m.path && !m.error)
        .map(m => ({
          type: m.type,
          path: m.path!,
          uploaded_at: new Date().toISOString(),
        }))

      const result: CheckupResult = {
        checkup_id: checkup.checkup_id,
        date,
        hospital: hospital.trim() || undefined,
        doctor: doctor.trim() || undefined,
        status,
        memo: memo.trim() || undefined,
        media: mediaEntries,
      }
      await saveCheckupResult(result)
      onSaved?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const isUploading = media.some(m => m.uploading)

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 animate-fadeIn" onClick={onClose}>
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)] animate-slideUp"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#E0E0E0] rounded-full" />
        </div>

        <div className="px-5 pb-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <p className="text-subtitle text-primary">
            {existingResult ? '결과 수정' : '결과 입력'}
          </p>

          {/* Checkup info */}
          <div className="bg-[var(--color-page-bg)] rounded-xl p-3 border border-[#E8E4DF]">
            <p className="text-body-emphasis font-bold text-primary">{checkup.title}</p>
            {checkup.week && <p className="text-caption text-tertiary">{checkup.week}주차 검진</p>}
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Date */}
              <div>
                <label className="block text-caption text-secondary mb-2">검진 날짜</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Status selector */}
              <div>
                <label className="block text-caption text-secondary mb-2">검사 결과</label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { haptic(); setStatus(opt.value) }}
                      className="flex-1 py-2.5 rounded-xl text-body font-semibold transition-all active:scale-95"
                      style={{
                        backgroundColor: status === opt.value ? opt.bg : '#F5F1EC',
                        color: status === opt.value ? opt.color : '#8A8784',
                        border: status === opt.value ? `2px solid ${opt.color}` : '2px solid transparent',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Memo */}
              <div>
                <label className="block text-caption text-secondary mb-2">소견/메모</label>
                <textarea
                  value={memo}
                  onChange={e => setMemo(e.target.value.slice(0, 500))}
                  placeholder="검사 결과, 의사 소견 등을 기록하세요"
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white placeholder:text-tertiary resize-none focus:border-[var(--color-primary)]"
                />
                <p className="text-label text-tertiary text-right mt-1">{memo.length}/500</p>
              </div>

              {/* Hospital + Doctor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption text-secondary mb-2">병원</label>
                  <input
                    type="text"
                    value={hospital}
                    onChange={e => setHospital(e.target.value.slice(0, 50))}
                    placeholder="병원명"
                    className="w-full h-11 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white placeholder:text-tertiary focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-caption text-secondary mb-2">담당의</label>
                  <input
                    type="text"
                    value={doctor}
                    onChange={e => setDoctor(e.target.value.slice(0, 20))}
                    placeholder="담당의 이름"
                    className="w-full h-11 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white placeholder:text-tertiary focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              {/* Media upload: Images */}
              <div>
                <label className="block text-caption text-secondary mb-2">
                  초음파 사진 ({imageCount}/{MAX_IMAGES})
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {media.filter(m => m.type === 'image').map(item => (
                    <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden border border-[#E8E4DF]">
                      <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                      {item.uploading && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-10 h-1.5 bg-white/40 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${item.progress}%`, backgroundColor: 'var(--color-primary)' }}
                            />
                          </div>
                        </div>
                      )}
                      {item.error && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                          <span className="text-label text-white bg-red-500 px-1.5 py-0.5 rounded">오류</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeMedia(item)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <XIcon className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {imageCount < MAX_IMAGES && (
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-[#D4CFC9] flex flex-col items-center justify-center gap-1 active:bg-[#F5F1EC]"
                    >
                      <CameraIcon className="w-5 h-5 text-tertiary" />
                      <span className="text-label text-tertiary">추가</span>
                    </button>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              {/* Media upload: Video */}
              <div>
                <label className="block text-caption text-secondary mb-2">
                  초음파 동영상 ({videoCount}/{MAX_VIDEO})
                </label>
                {media.filter(m => m.type === 'video').map(item => (
                  <div key={item.id} className="relative rounded-xl overflow-hidden border border-[#E8E4DF] h-32">
                    <video src={item.previewUrl} className="w-full h-full object-cover" />
                    {item.uploading && (
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <div className="w-full h-2 bg-white/40 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${item.progress}%`, backgroundColor: 'var(--color-primary)' }}
                          />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => removeMedia(item)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <XIcon className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
                {videoCount < MAX_VIDEO && (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full h-16 rounded-xl border-2 border-dashed border-[#D4CFC9] flex items-center justify-center gap-2 active:bg-[#F5F1EC]"
                  >
                    <PlusIcon className="w-4 h-4 text-tertiary" />
                    <span className="text-caption text-tertiary">동영상 추가 (30MB 이하)</span>
                  </button>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="hidden"
                  onChange={handleVideoSelect}
                />
              </div>

              {/* Next checkup scheduling */}
              <div className="border-t border-[#E8E4DF] pt-4">
                <label className="block text-caption text-secondary mb-2">다음 검진 예약 (선택)</label>
                <select
                  value={nextCheckupId}
                  onChange={e => setNextCheckupId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white focus:border-[var(--color-primary)]"
                >
                  <option value="">선택 안 함</option>
                  {DEFAULT_CHECKUPS.map(dc => (
                    <option key={dc.id} value={dc.id}>{dc.title} ({dc.week}주)</option>
                  ))}
                </select>
                {nextCheckupId && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <input
                      type="date"
                      value={nextDate}
                      onChange={e => setNextDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white focus:border-[var(--color-primary)]"
                    />
                    <input
                      type="time"
                      value={nextTime}
                      onChange={e => setNextTime(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white focus:border-[var(--color-primary)]"
                    />
                  </div>
                )}
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!date || saving || isUploading}
                className={`w-full py-3.5 rounded-xl text-subtitle font-bold transition-colors ${
                  date && !saving && !isUploading
                    ? 'bg-[var(--color-primary)] text-white active:opacity-80'
                    : 'bg-[#E8E4DF] text-tertiary cursor-not-allowed'
                }`}
              >
                {saving ? '저장 중...' : isUploading ? '업로드 중...' : '결과 저장'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
