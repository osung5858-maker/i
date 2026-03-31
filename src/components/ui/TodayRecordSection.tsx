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
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[14px] font-bold text-[#1A1918]">오늘 기록</p>
        {count > 0 && (
          <span
            className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {count}
          </span>
        )}
        {headerRight && <div className="ml-auto">{headerRight}</div>}
      </div>

      {/* 요약 타일 */}
      {tiles && tiles.length > 0 && (
        <div className={`grid ${colsCls} gap-1.5 ${hasActivity ? 'mb-3' : ''}`}>
          {tiles.map(t => (
            <div key={t.label} className="bg-[#F8F6F3] rounded-xl py-2.5 text-center">
              <p className="text-[10px] text-[#9E9A95] mb-0.5">{t.label}</p>
              <p className="text-[14px] font-bold" style={{ color: t.color || '#1A1918' }}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 활동 칩 */}
      {hasActivity && (
        <div className="flex flex-wrap gap-1.5">
          {chips!.map(c => (
            <span
              key={c.key}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-semibold"
              style={{ background: c.color + '1A', color: c.color }}
            >
              <c.Icon className="w-3.5 h-3.5" />
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {count === 0 && !hasActivity && (
        <p className="text-[13px] text-[#9E9A95] text-center py-2">
          {emptyMessage ?? '아래 버튼으로 오늘의 첫 기록을 남겨보세요'}
        </p>
      )}

      {/* 푸터 슬롯 */}
      {footer && (
        <div className={count > 0 || hasActivity ? 'mt-3 pt-3 border-t border-[#E8E4DF]' : 'mt-2'}>
          {footer}
        </div>
      )}
    </div>
  )
}
