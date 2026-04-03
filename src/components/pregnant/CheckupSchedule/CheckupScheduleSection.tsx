'use client'

import { useState, useEffect, useCallback } from 'react'
import { HospitalIcon, PlusIcon, BellIcon } from '@/components/ui/Icons'
import type { CheckupSchedule, ScheduleFormData } from './types'
import {
  fetchCheckupSchedules,
  saveCheckupSchedule,
  completeCheckup,
  deleteCheckupSchedule,
} from '@/lib/supabase/pregRecord'

// ===== Utility functions =====
function getDaysUntil(dateString: string): number {
  const target = new Date(dateString + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function formatDateDisplay(dateString: string): string {
  const d = new Date(dateString + 'T00:00:00')
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()} (${weekday})`
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? '오후' : '오전'
  const hour = h % 12 || 12
  return `${period} ${hour}:${String(m).padStart(2, '0')}`
}

function haptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20)
}

// ===== NextCheckupCard =====
function NextCheckupCard({ checkup }: { checkup: CheckupSchedule | null }) {
  if (!checkup || !checkup.scheduled_date) return null
  const days = getDaysUntil(checkup.scheduled_date)
  const isToday = days === 0
  const isPast = days < 0

  return (
    <div className="bg-gradient-to-br from-white to-[#FFF8F3] rounded-xl border border-[#FFDDC8]/50 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <HospitalIcon className="w-5 h-5 text-[var(--color-primary)]" />
        <span className="text-subtitle text-primary">다음 검진</span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-heading-1 font-bold ${
            isToday
              ? 'bg-[var(--color-primary)] text-white animate-pulse'
              : isPast
                ? 'bg-[#F5F1EC] text-secondary'
                : 'bg-[var(--color-accent-bg)] text-[var(--color-primary)]'
          }`}
        >
          {isToday ? 'D-day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-body-emphasis font-bold text-primary truncate">
            {checkup.title}
          </p>
          <p className="text-body text-secondary">
            {formatDateDisplay(checkup.scheduled_date)}
            {checkup.scheduled_time && ` ${formatTime12h(checkup.scheduled_time)}`}
          </p>
          {checkup.hospital && (
            <p className="text-caption text-tertiary">{checkup.hospital}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== CheckupTimelineItem =====
function CheckupTimelineItem({
  item,
  onSchedule,
  onComplete,
  onEdit,
  onDelete,
}: {
  item: CheckupSchedule
  onSchedule: () => void
  onComplete: () => void
  onEdit: () => void
  onDelete?: () => void
}) {
  const isCompleted = item.completed
  const isScheduled = !isCompleted && !!item.scheduled_date
  const isPending = !isCompleted && !item.scheduled_date

  return (
    <li className="flex gap-3 items-start group" id={`checkup-${item.checkup_id}`}>
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            isCompleted
              ? 'bg-[#4CAF50] border-[#4CAF50]'
              : isScheduled
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                : 'border-[#D4CFC9] bg-transparent'
          }`}
        >
          {isCompleted && (
            <svg viewBox="0 0 12 12" className="w-3 h-3">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2">
          {item.week && (
            <span className="text-label text-tertiary">{item.week}주</span>
          )}
          <span
            className={`text-body-emphasis font-medium ${
              isCompleted
                ? 'text-secondary line-through'
                : isScheduled
                  ? 'text-[var(--color-primary)] font-bold'
                  : 'text-primary'
            }`}
          >
            {item.title}
          </span>
          {item.scheduled_date && !isCompleted && (
            <span className="text-label text-[var(--color-primary)] font-bold">
              D{getDaysUntil(item.scheduled_date) <= 0
                ? `+${Math.abs(getDaysUntil(item.scheduled_date))}`
                : `-${getDaysUntil(item.scheduled_date)}`}
            </span>
          )}
        </div>

        {isScheduled && item.scheduled_date && (
          <div className="mt-1">
            <p className="text-body text-secondary">
              {formatDateDisplay(item.scheduled_date)}
              {item.scheduled_time && ` ${formatTime12h(item.scheduled_time)}`}
            </p>
            {item.hospital && (
              <p className="text-caption text-tertiary">{item.hospital}</p>
            )}
          </div>
        )}

        {isCompleted && item.completed_date && (
          <p className="text-caption text-tertiary mt-0.5">
            {formatDateDisplay(item.completed_date)} 완료
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          {isPending && (
            <button
              onClick={() => { haptic(); onSchedule() }}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-primary-bg)] text-caption font-semibold text-[var(--color-primary)] active:opacity-80"
            >
              예약하기
            </button>
          )}
          {isScheduled && (
            <>
              <button
                onClick={() => { haptic(); onEdit() }}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-page-bg)] text-caption font-semibold text-secondary active:opacity-80"
              >
                예약 변경
              </button>
              <button
                onClick={() => { haptic(); onComplete() }}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-caption font-bold text-white active:opacity-80"
              >
                완료
              </button>
            </>
          )}
          {item.is_custom && onDelete && (
            <button
              onClick={() => { haptic(); onDelete() }}
              className="px-3 py-1.5 rounded-lg bg-[#FDE8E8] text-caption font-semibold text-[#D05050] active:opacity-80"
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

// ===== ScheduleBottomSheet =====
function ScheduleBottomSheet({
  open,
  onClose,
  checkup,
  mode,
  onSave,
}: {
  open: boolean
  onClose: () => void
  checkup?: CheckupSchedule
  mode: 'create' | 'edit' | 'custom'
  onSave: (data: ScheduleFormData) => void
}) {
  const [date, setDate] = useState(checkup?.scheduled_date || '')
  const [time, setTime] = useState(checkup?.scheduled_time || '')
  const [hospital, setHospital] = useState(checkup?.hospital || '')
  const [memo, setMemo] = useState(checkup?.memo || '')
  const [customTitle, setCustomTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDate(checkup?.scheduled_date || '')
      setTime(checkup?.scheduled_time || '')
      setHospital(checkup?.hospital || '')
      setMemo(checkup?.memo || '')
      setCustomTitle('')
    }
  }, [open, checkup])

  if (!open) return null

  const title = mode === 'custom'
    ? customTitle
    : checkup?.title || '검진 예약'

  const canSave = mode === 'custom'
    ? !!date && !!customTitle.trim()
    : !!date

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    haptic()
    const formData: ScheduleFormData = {
      checkup_id: mode === 'custom'
        ? `custom_${Date.now()}`
        : checkup?.checkup_id || '',
      title: mode === 'custom' ? customTitle.trim() : checkup?.title || '',
      week: checkup?.week,
      scheduled_date: date,
      scheduled_time: time || undefined,
      hospital: hospital.trim() || undefined,
      memo: memo.trim() || undefined,
      is_custom: mode === 'custom',
    }
    onSave(formData)
    setSaving(false)
    onClose()
  }

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

        <div className="px-5 pb-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-subtitle text-primary">
            {mode === 'edit' ? '예약 변경' : mode === 'custom' ? '커스텀 검진 추가' : '검진 예약'}
          </p>

          {/* Checkup info or custom title */}
          {mode === 'custom' ? (
            <div>
              <label className="block text-caption text-secondary mb-2">검진명</label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value.slice(0, 50))}
                placeholder="검진명 입력 (예: 담당의 추가 검진)"
                className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white placeholder:text-tertiary focus:border-[var(--color-primary)]"
                autoFocus
              />
            </div>
          ) : checkup && (
            <div className="bg-[var(--color-page-bg)] rounded-xl p-4 border border-[#E8E4DF]">
              <p className="text-body-emphasis font-bold text-primary">{checkup.title}</p>
              {checkup.week && (
                <p className="text-caption text-tertiary">{checkup.week}주차 권장 검진</p>
              )}
            </div>
          )}

          {/* Date picker */}
          <div>
            <label className="block text-caption text-secondary mb-2">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Time picker */}
          <div>
            <label className="block text-caption text-secondary mb-2">시간 (선택사항)</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Hospital */}
          <div>
            <label className="block text-caption text-secondary mb-2">병원 (선택사항)</label>
            <input
              type="text"
              value={hospital}
              onChange={e => setHospital(e.target.value.slice(0, 50))}
              placeholder="병원명 입력"
              className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white placeholder:text-tertiary focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Memo */}
          <div>
            <label className="block text-caption text-secondary mb-2">메모 (선택사항)</label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value.slice(0, 200))}
              placeholder="공복 필요, 주차권 챙기기 등"
              rows={3}
              className="w-full p-3 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white placeholder:text-tertiary resize-none focus:border-[var(--color-primary)]"
            />
            <p className="text-label text-tertiary text-right mt-1">{memo.length}/200</p>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`w-full py-3.5 rounded-xl text-subtitle font-bold transition-colors ${
              canSave && !saving
                ? 'bg-[var(--color-primary)] text-white active:opacity-80'
                : 'bg-[#E8E4DF] text-tertiary cursor-not-allowed'
            }`}
          >
            {saving ? '저장 중...' : mode === 'edit' ? '수정하기' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== Main Component =====
export default function CheckupScheduleSection() {
  const [checkups, setCheckups] = useState<CheckupSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'custom'>('create')
  const [activeCheckup, setActiveCheckup] = useState<CheckupSchedule | undefined>()
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    haptic()
    setTimeout(() => setToast(null), 2000)
  }

  const loadCheckups = useCallback(async () => {
    try {
      const data = await fetchCheckupSchedules()
      setCheckups(data)
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCheckups() }, [loadCheckups])

  // Find next scheduled (upcoming, not completed)
  const nextCheckup = checkups
    .filter(c => c.scheduled_date && !c.completed)
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''))
    [0] || null

  const handleSchedule = (item: CheckupSchedule) => {
    setActiveCheckup(item)
    setSheetMode('create')
    setSheetOpen(true)
  }

  const handleEdit = (item: CheckupSchedule) => {
    setActiveCheckup(item)
    setSheetMode('edit')
    setSheetOpen(true)
  }

  const handleAddCustom = () => {
    setActiveCheckup(undefined)
    setSheetMode('custom')
    setSheetOpen(true)
  }

  const handleSave = async (formData: ScheduleFormData) => {
    const schedule: CheckupSchedule = {
      checkup_id: formData.checkup_id,
      title: formData.title,
      week: formData.week,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time,
      hospital: formData.hospital,
      memo: formData.memo,
      completed: false,
      is_custom: formData.is_custom,
    }
    await saveCheckupSchedule(schedule)
    await loadCheckups()
    showToast(sheetMode === 'edit' ? '예약이 변경되었어요' : '검진 예약 완료!')
  }

  const handleComplete = async (checkupId: string) => {
    await completeCheckup(checkupId)
    await loadCheckups()
    showToast('검진 완료!')
  }

  const handleDelete = async (checkupId: string) => {
    await deleteCheckupSchedule(checkupId)
    await loadCheckups()
    showToast('검진이 삭제되었어요')
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 bg-[#F5F1EC] rounded-xl animate-pulse" />
        <div className="h-16 bg-[#F5F1EC] rounded-xl animate-pulse" />
        <div className="h-16 bg-[#F5F1EC] rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <section aria-label="검진 일정 관리" className="space-y-3">
      {/* Next Checkup D-day Card */}
      <NextCheckupCard checkup={nextCheckup} />

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-body-emphasis font-bold text-primary">검진 타임라인</p>
          <p className="text-caption text-tertiary">
            {checkups.filter(c => c.completed).length}/{checkups.length} 완료
          </p>
        </div>

        <ol role="list" aria-label="검진 타임라인" className="px-4 pb-3 space-y-1">
          {checkups.map(item => (
            <CheckupTimelineItem
              key={item.checkup_id}
              item={item}
              onSchedule={() => handleSchedule(item)}
              onComplete={() => handleComplete(item.checkup_id)}
              onEdit={() => handleEdit(item)}
              onDelete={item.is_custom ? () => handleDelete(item.checkup_id) : undefined}
            />
          ))}
        </ol>

        {/* Add Custom Button */}
        <button
          onClick={handleAddCustom}
          className="w-full flex items-center justify-center gap-2 py-3 border-t border-dashed border-[#D4CFC9] text-caption text-tertiary active:bg-[#F5F1EC] transition-colors"
          aria-label="커스텀 검진 추가하기"
        >
          <PlusIcon className="w-4 h-4" />
          <span>커스텀 검진 추가</span>
        </button>
      </div>

      {/* Bottom Sheet */}
      <ScheduleBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        checkup={activeCheckup}
        mode={sheetMode}
        onSave={handleSave}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#1A1A1A] px-5 py-2.5 rounded-xl text-body font-bold shadow-[0_8px_30px_rgba(0,0,0,0.3)] max-w-[320px] text-center" style={{ color: '#FFFFFF' }}>
            {toast}
          </div>
        </div>
      )}
    </section>
  )
}
