'use client'

export interface RecordTile {
  label: string
  value: string
  color?: string // hex
}

export interface RecordChip {
  key: string
  label: string
  Icon: React.FC<{ className?: string }>
  color: string // hex
}

interface Props {
  count: number
  tiles?: RecordTile[]
  chips?: RecordChip[]
  emptyMessage?: string
  footer?: React.ReactNode
  headerRight?: React.ReactNode
}

export default function TodayRecordSection({ count, tiles, chips, emptyMessage, footer, headerRight }: Props) {
  const colsCls =
    tiles?.length === 2 ? 'grid-cols-2' :
    tiles?.length === 3 ? 'grid-cols-3' :
    tiles?.length === 4 ? 'grid-cols-4' : 'grid-cols-3'

  const hasActivity = (chips?.length ?? 0) > 0

  return (
    <div className="dodam-card">
      {/* 헤더 */}
      <div className="flex items-center mb-3" style={{ gap: 'var(--spacing-2)' }}>
        <p className="text-body-emphasis">오늘 기록</p>
        {count > 0 && (
          <span
            className="rounded-full font-semibold text-label"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              padding: '2px var(--spacing-2)'
            }}
          >
            {count}
          </span>
        )}
        {headerRight && <div className="ml-auto">{headerRight}</div>}
      </div>

      {/* 요약 타일 */}
      {tiles && tiles.length > 0 && (
        <div className={`grid ${colsCls} ${hasActivity ? 'mb-3' : ''}`} style={{ gap: 'var(--spacing-2)' }}>
          {tiles.map(t => (
            <div
              key={t.label}
              className="rounded-xl text-center"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                padding: 'var(--spacing-3) var(--spacing-2)'
              }}
            >
              <p className="text-label mb-0.5" style={{ color: 'var(--neutral-400)' }}>{t.label}</p>
              <p className="text-body-emphasis" style={{ color: t.color || 'var(--color-text-primary)' }}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 활동 칩 */}
      {hasActivity && (
        <div className="flex flex-wrap" style={{ gap: 'var(--spacing-2)' }}>
          {chips!.map(c => (
            <span
              key={c.key}
              className="flex items-center rounded-full text-caption-bold"
              style={{
                background: c.color + '1A',
                color: c.color,
                gap: 'var(--spacing-1)',
                padding: 'var(--spacing-2) var(--spacing-3)',
                fontWeight: 700,
              }}
            >
              <c.Icon className="w-3.5 h-3.5" />
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {count === 0 && !hasActivity && (
        <p className="text-body text-center" style={{
          color: 'var(--neutral-400)',
          padding: 'var(--spacing-2) 0'
        }}>
          {emptyMessage ?? '아래 버튼으로 오늘의 첫 기록을 남겨보세요'}
        </p>
      )}

      {/* 푸터 슬롯 */}
      {footer && (
        <div
          className={count > 0 || hasActivity ? 'border-t' : ''}
          style={{
            marginTop: count > 0 || hasActivity ? 'var(--spacing-3)' : 'var(--spacing-2)',
            paddingTop: count > 0 || hasActivity ? 'var(--spacing-3)' : 0,
            borderColor: 'var(--border-default)'
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
