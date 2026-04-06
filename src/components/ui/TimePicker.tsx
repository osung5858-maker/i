'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface TimePickerProps {
  value: string          // "HH:mm" 24h format or ""
  onChange: (v: string) => void
  onClose: () => void
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1) // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i)      // 0..59

function parse24h(val: string): { period: '오전' | '오후'; hour12: number; minute: number } {
  if (!val) return { period: '오전', hour12: 9, minute: 0 }
  const [h, m] = val.split(':').map(Number)
  return {
    period: h >= 12 ? '오후' : '오전',
    hour12: h % 12 || 12,
    minute: m,
  }
}

function to24h(period: '오전' | '오후', hour12: number, minute: number): string {
  let h = hour12
  if (period === '오전' && h === 12) h = 0
  else if (period === '오후' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// Snap-scroll wheel column
function WheelColumn({
  items,
  selected,
  onSelect,
  renderItem,
}: {
  items: (string | number)[]
  selected: string | number
  onSelect: (v: string | number) => void
  renderItem?: (v: string | number, active: boolean) => React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const itemH = 44
  const isScrolling = useRef(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll to selected on mount
  useEffect(() => {
    const idx = items.indexOf(selected)
    if (idx >= 0 && ref.current) {
      ref.current.scrollTop = idx * itemH
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    isScrolling.current = true
    scrollTimer.current = setTimeout(() => {
      isScrolling.current = false
      if (!ref.current) return
      const idx = Math.round(ref.current.scrollTop / itemH)
      const clamped = Math.max(0, Math.min(idx, items.length - 1))
      onSelect(items[clamped])
    }, 80)
  }, [items, itemH, onSelect])

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-none"
      style={{ height: itemH * 5, scrollbarWidth: 'none' }}
      onScroll={handleScroll}
    >
      {/* Top padding for centering */}
      <div style={{ height: itemH * 2 }} />
      {items.map(item => {
        const active = item === selected
        return (
          <div
            key={String(item)}
            className={`snap-center flex items-center justify-center transition-all ${
              active
                ? 'text-primary font-bold text-[18px]'
                : 'text-tertiary text-[15px]'
            }`}
            style={{ height: itemH }}
            onClick={() => {
              onSelect(item)
              const idx = items.indexOf(item)
              ref.current?.scrollTo({ top: idx * itemH, behavior: 'smooth' })
            }}
          >
            {renderItem ? renderItem(item, active) : String(item)}
          </div>
        )
      })}
      {/* Bottom padding for centering */}
      <div style={{ height: itemH * 2 }} />
    </div>
  )
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  const parsed = parse24h(value)
  const [period, setPeriod] = useState<'오전' | '오후'>(parsed.period)
  const [hour, setHour] = useState(parsed.hour12)
  const [minute, setMinute] = useState(parsed.minute)

  const handleConfirm = () => {
    onChange(to24h(period, hour, minute))
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const displayTime = `${period} ${hour}:${String(minute).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={handleCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)] animate-[slideUp_0.25s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with preview */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button onClick={handleCancel} className="text-body text-secondary py-1 px-1 active:opacity-60">
            취소
          </button>
          <p className="text-subtitle text-primary font-bold">{displayTime}</p>
          <button onClick={handleConfirm} className="text-body text-[var(--color-primary)] font-bold py-1 px-1 active:opacity-60">
            확인
          </button>
        </div>

        {/* Wheel area */}
        <div className="relative flex px-4 pb-4" style={{ height: 44 * 5 }}>
          {/* Highlight bar */}
          <div
            className="absolute left-4 right-4 rounded-xl bg-[var(--color-primary-bg)] pointer-events-none"
            style={{ top: 44 * 2, height: 44 }}
          />

          {/* AM/PM */}
          <WheelColumn
            items={['오전', '오후']}
            selected={period}
            onSelect={v => setPeriod(v as '오전' | '오후')}
          />

          {/* Hour */}
          <WheelColumn
            items={HOURS_12}
            selected={hour}
            onSelect={v => setHour(v as number)}
            renderItem={(v, active) => (
              <span>{String(v).padStart(2, '0')}</span>
            )}
          />

          {/* Separator */}
          <div className="flex items-center justify-center w-4 text-primary font-bold text-lg" style={{ height: 44 * 5 }}>
            :
          </div>

          {/* Minute */}
          <WheelColumn
            items={MINUTES}
            selected={minute}
            onSelect={v => setMinute(v as number)}
            renderItem={(v, active) => (
              <span>{String(v).padStart(2, '0')}</span>
            )}
          />
        </div>
      </div>
    </div>
  )
}
