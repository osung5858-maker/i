'use client'

import { useState, useEffect, useCallback } from 'react'
import { HospitalIcon, PlusIcon, BellIcon } from '@/components/ui/Icons'
import type { CheckupSchedule, ScheduleFormData, CheckupResult } from './types'
import {
  fetchCheckupSchedules,
  saveCheckupSchedule,
  completeCheckup,
  deleteCheckupSchedule,
  fetchAllCheckupResults,
} from '@/lib/supabase/pregRecord'
import CheckupResultSheet from './CheckupResultSheet'
import UltrasoundAlbum from './UltrasoundAlbum'
import TimePicker from '@/components/ui/TimePicker'
import { notifyPartnerCheckup } from '@/lib/push/checkupNotify'

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

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: '정상', color: '#4CAF50', bg: '#E8F5E9' },
  observe: { label: '관찰필요', color: '#E8A317', bg: '#FFF8E1' },
  abnormal: { label: '이상소견', color: '#D05050', bg: '#FDE8E8' },
}

// ===== CheckupTimelineItem =====
function CheckupTimelineItem({
  item,
  result,
  isLast,
  onSchedule,
  onComplete,
  onEdit,
  onDelete,
  onResultInput,
  onResultView,
}: {
  item: CheckupSchedule
  result?: CheckupResult | null
  isLast: boolean
  onSchedule: () => void
  onComplete: () => void
  onEdit: () => void
  onDelete?: () => void
  onResultInput: () => void
  onResultView: () => void
}) {
  const isCompleted = item.completed
  const isScheduled = !isCompleted && !!item.scheduled_date
  const isPending = !isCompleted && !item.scheduled_date
  const hasResult = !!result
  const badge = result ? STATUS_BADGE[result.status] : null

  return (
    <li className="flex gap-3 items-stretch" id={`checkup-${item.checkup_id}`}>
      {/* Timeline rail: icon + vertical line */}
      <div className="flex flex-col items-center w-8 shrink-0">
        {/* Status icon */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isCompleted
              ? 'bg-[#4CAF50]'
              : isScheduled
                ? 'bg-[var(--color-primary)]'
                : 'bg-[#F0EDE9]'
          }`}
        >
          {isCompleted ? (
            <svg viewBox="0 0 16 16" className="w-4 h-4">
              <path d="M3 8l4 4 6-6" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          ) : isScheduled ? (
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
              <rect x="2" y="3" width="12" height="11" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M2 7h12" stroke="white" strokeWidth="1.5" />
              <path d="M5 1v3M11 1v3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <div className="w-2 h-2 rounded-full bg-[#C4BFB8]" />
          )}
        </div>
        {/* Vertical connector line */}
        {!isLast && (
          <div className={`flex-1 w-0.5 my-1 rounded-full ${
            isCompleted ? 'bg-[#4CAF50]/30' : 'bg-[#E8E4DF]'
          }`} />
        )}
      </div>

      {/* Content card */}
      <div className={`flex-1 min-w-0 pb-4 ${isLast ? '' : ''}`}>
        <div className={`rounded-xl p-3 ${
          isScheduled
            ? 'bg-[var(--color-primary-bg)] border border-[var(--color-primary)]/20'
            : isCompleted
              ? 'bg-[#FAFAF8]'
              : 'bg-white border border-[#E8E4DF]'
        }`}>
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            {item.week && (
              <span className={`text-label font-bold px-1.5 py-0.5 rounded ${
                isScheduled
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : isCompleted
                    ? 'bg-[#E8F5E9] text-[#4CAF50]'
                    : 'bg-[#F0EDE9] text-tertiary'
              }`}>
                {item.week}주
              </span>
            )}
            <span
              className={`text-body-emphasis font-medium flex-1 min-w-0 ${
                isCompleted ? 'text-secondary' : 'text-primary'
              }`}
            >
              {item.title}
            </span>
            {item.scheduled_date && !isCompleted && (
              <span className={`text-label font-bold px-2 py-0.5 rounded-full ${
                getDaysUntil(item.scheduled_date) <= 3
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
              }`}>
                {getDaysUntil(item.scheduled_date) === 0 ? 'D-day'
                  : getDaysUntil(item.scheduled_date) > 0
                    ? `D-${getDaysUntil(item.scheduled_date)}`
                    : `D+${Math.abs(getDaysUntil(item.scheduled_date))}`}
              </span>
            )}
            {badge && (
              <span
                className="text-label font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
            )}
          </div>

          {/* Schedule details */}
          {isScheduled && item.scheduled_date && (
            <div className="mt-1.5 flex items-center gap-1.5 text-body text-secondary">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0 text-tertiary">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>
                {formatDateDisplay(item.scheduled_date)}
                {item.scheduled_time && ` ${formatTime12h(item.scheduled_time)}`}
              </span>
              {item.hospital && (
                <>
                  <span className="text-tertiary">·</span>
                  <span className="text-tertiary truncate">{item.hospital}</span>
                </>
              )}
            </div>
          )}

          {/* Completion info */}
          {isCompleted && item.completed_date && (
            <p className="text-caption text-tertiary mt-1">
              {formatDateDisplay(item.completed_date)} 완료
              {result?.media && result.media.length > 0 && (
                <span className="ml-1 text-[var(--color-primary)]">
                  · 사진 {result.media.filter(m => m.type === 'image').length}장
                </span>
              )}
            </p>
          )}

          {result?.memo && (
            <p className="text-caption text-secondary mt-1 line-clamp-1">{result.memo}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-2.5">
            {isPending && (
              <button
                onClick={() => { haptic(); onSchedule() }}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-caption font-bold text-white active:opacity-80 transition-opacity"
              >
                예약하기
              </button>
            )}
            {isScheduled && (
              <>
                <button
                  onClick={() => { haptic(); onComplete() }}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-caption font-bold text-white active:opacity-80 transition-opacity"
                >
                  검진 완료
                </button>
                <button
                  onClick={() => { haptic(); onEdit() }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E8E4DF] text-caption font-semibold text-secondary active:opacity-80 transition-opacity"
                >
                  변경
                </button>
              </>
            )}
            {isCompleted && !hasResult && (
              <button
                onClick={() => { haptic(); onResultInput() }}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--color-accent-bg)] text-caption font-semibold text-[var(--color-primary)] active:opacity-80 transition-opacity"
              >
                결과 입력
              </button>
            )}
            {isCompleted && hasResult && (
              <button
                onClick={() => { haptic(); onResultView() }}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E8E4DF] text-caption font-semibold text-secondary active:opacity-80 transition-opacity"
              >
                결과 보기
              </button>
            )}
            {item.is_custom && onDelete && (
              <button
                onClick={() => { haptic(); onDelete() }}
                className="px-3 py-1.5 rounded-lg text-caption font-semibold text-[#D05050] active:opacity-80 transition-opacity ml-auto"
              >
                삭제
              </button>
            )}
          </div>
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
  const [timePickerOpen, setTimePickerOpen] = useState(false)

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
    <div className="fixed inset-0 z-[90] bg-[var(--color-page-bg)] animate-fadeIn flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#E8E4DF]">
        <button
          onClick={onClose}
          className="text-body text-secondary active:opacity-60 py-1 px-2 -ml-2"
        >
          취소
        </button>
        <p className="text-subtitle text-primary font-bold">
          {mode === 'edit' ? '예약 변경' : mode === 'custom' ? '커스텀 검진 추가' : '검진 예약'}
        </p>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={`text-body font-bold py-1 px-2 -mr-2 ${
            canSave && !saving ? 'text-[var(--color-primary)] active:opacity-60' : 'text-tertiary'
          }`}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">
        {/* Checkup info or custom title */}
        {mode === 'custom' ? (
          <div>
            <label className="block text-caption text-secondary mb-2">검진명</label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value.slice(0, 50))}
              placeholder="검진명 입력 (예: 담당의 추가 검진)"
              className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white placeholder:text-tertiary focus:border-[var(--color-primary)] focus:outline-none"
              autoFocus
            />
          </div>
        ) : checkup && (
          <div className="bg-white rounded-xl p-4 border border-[#E8E4DF]">
            <p className="text-body-emphasis font-bold text-primary">{checkup.title}</p>
            {checkup.week && (
              <p className="text-caption text-tertiary">{checkup.week}주차 권장 검진</p>
            )}
          </div>
        )}

        {/* Date picker — button that opens hidden native input */}
        <div className="relative isolate">
          <label className="block text-caption text-secondary mb-2">날짜</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const inp = document.getElementById('schedule-date-input') as HTMLInputElement
                inp?.showPicker?.()
                inp?.focus()
              }}
              className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white text-left focus:border-[var(--color-primary)] focus:outline-none"
            >
              {date || <span className="text-tertiary">날짜 선택</span>}
            </button>
            <input
              id="schedule-date-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="absolute inset-0 opacity-0 pointer-events-none"
              tabIndex={-1}
            />
          </div>
        </div>

        {/* Time picker — custom wheel with confirm/cancel */}
        <div className="relative isolate">
          <label className="block text-caption text-secondary mb-2">시간 (선택사항)</label>
          <button
            type="button"
            onClick={() => setTimePickerOpen(true)}
            className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white text-left focus:border-[var(--color-primary)] focus:outline-none"
          >
            {time ? formatTime12h(time) : <span className="text-tertiary">시간 선택</span>}
          </button>
          {timePickerOpen && (
            <TimePicker
              value={time}
              onChange={setTime}
              onClose={() => setTimePickerOpen(false)}
            />
          )}
        </div>

        {/* Hospital */}
        <div className="relative isolate">
          <label className="block text-caption text-secondary mb-2">병원 (선택사항)</label>
          <input
            type="text"
            inputMode="text"
            value={hospital}
            onChange={e => setHospital(e.target.value.slice(0, 50))}
            placeholder="병원명 입력"
            className="w-full h-12 px-4 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white placeholder:text-tertiary focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>

        {/* Memo */}
        <div className="relative isolate">
          <label className="block text-caption text-secondary mb-2">메모 (선택사항)</label>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value.slice(0, 200))}
            placeholder="공복 필요, 주차권 챙기기 등"
            maxLength={200}
            rows={3}
            className="w-full p-3 rounded-xl border border-[#E8E4DF] text-body-emphasis bg-white placeholder:text-tertiary resize-none focus:border-[var(--color-primary)] focus:outline-none"
          />
          <p className="text-label text-tertiary text-right mt-1">{memo.length}/200</p>
        </div>

        {/* Bottom save button (duplicated for scroll visibility) */}
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

  // Phase 2: result state
  const [results, setResults] = useState<Map<string, CheckupResult>>(new Map())
  const [resultSheetOpen, setResultSheetOpen] = useState(false)
  const [resultCheckup, setResultCheckup] = useState<CheckupSchedule | null>(null)
  const [albumKey, setAlbumKey] = useState(0)

  const showToast = (msg: string) => {
    setToast(msg)
    haptic()
    setTimeout(() => setToast(null), 2000)
  }

  const loadResults = useCallback(async () => {
    try {
      const allResults = await fetchAllCheckupResults()
      const map = new Map<string, CheckupResult>()
      for (const r of allResults) map.set(r.checkup_id, r)
      setResults(map)
    } catch { /* silent */ }
  }, [])

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

  useEffect(() => { loadCheckups(); loadResults() }, [loadCheckups, loadResults])

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
    // 배우자에게 알림 (비동기, 실패해도 무시)
    if (sheetMode !== 'edit') {
      notifyPartnerCheckup({
        type: 'scheduled',
        checkupTitle: schedule.title,
        date: schedule.scheduled_date,
      })
    }
  }

  const handleComplete = async (checkupId: string) => {
    await completeCheckup(checkupId)
    await loadCheckups()
    showToast('검진 완료!')
    // 배우자에게 알림
    const item = checkups.find(c => c.checkup_id === checkupId)
    if (item) {
      notifyPartnerCheckup({ type: 'completed', checkupTitle: item.title })
    }
  }

  const handleDelete = async (checkupId: string) => {
    await deleteCheckupSchedule(checkupId)
    await loadCheckups()
    showToast('검진이 삭제되었어요')
  }

  const handleResultInput = (item: CheckupSchedule) => {
    setResultCheckup(item)
    setResultSheetOpen(true)
  }

  const handleResultSaved = async () => {
    await loadResults()
    setAlbumKey(k => k + 1)
    showToast('검진 결과가 저장되었어요')
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

        <ol role="list" aria-label="검진 타임라인" className="px-4 pb-3 max-h-[420px] overflow-y-auto">
          {checkups.map((item, idx) => (
            <CheckupTimelineItem
              key={item.checkup_id}
              item={item}
              result={results.get(item.checkup_id)}
              isLast={idx === checkups.length - 1}
              onSchedule={() => handleSchedule(item)}
              onComplete={() => handleComplete(item.checkup_id)}
              onEdit={() => handleEdit(item)}
              onDelete={item.is_custom ? () => handleDelete(item.checkup_id) : undefined}
              onResultInput={() => handleResultInput(item)}
              onResultView={() => handleResultInput(item)}
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

      {/* Ultrasound Album */}
      <UltrasoundAlbum key={albumKey} />

      {/* Schedule Bottom Sheet */}
      <ScheduleBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        checkup={activeCheckup}
        mode={sheetMode}
        onSave={handleSave}
      />

      {/* Result Bottom Sheet */}
      {resultCheckup && (
        <CheckupResultSheet
          open={resultSheetOpen}
          onClose={() => { setResultSheetOpen(false); setResultCheckup(null) }}
          checkup={resultCheckup}
          onSaved={handleResultSaved}
        />
      )}

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
