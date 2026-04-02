'use client'

import BottomSheet from '@/components/ui/BottomSheet'

const PRESETS = [60, 90, 120, 150, 180, 210, 240]

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (ml: number | null) => void
}

export default function FeedSheet({ open, onClose, onSelect }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title="수유량 선택">
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PRESETS.map((ml) => (
          <button
            key={ml}
            onClick={() => onSelect(ml)}
            className="h-12 rounded-xl bg-[#f5f5f5] text-sm font-semibold text-primary active:bg-[#0052FF] active:text-white transition-colors"
          >
            {ml}ml
          </button>
        ))}
        <button
          onClick={() => onSelect(null)}
          className="h-12 rounded-xl bg-[#f5f5f5] text-sm font-medium text-tertiary active:bg-[#0052FF] active:text-white transition-colors"
        >
          건너뛰기
        </button>
      </div>
    </BottomSheet>
  )
}
