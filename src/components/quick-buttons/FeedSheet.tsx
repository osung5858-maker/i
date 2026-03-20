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
            className="h-12 rounded-xl bg-[#f5f5f5] dark:bg-[#2a2a2a] text-sm font-semibold text-[#0A0B0D] dark:text-white active:bg-[#0052FF] active:text-white transition-colors"
          >
            {ml}ml
          </button>
        ))}
        <button
          onClick={() => onSelect(null)}
          className="h-12 rounded-xl bg-[#f5f5f5] dark:bg-[#2a2a2a] text-sm font-medium text-[#9B9B9B] active:bg-[#0052FF] active:text-white transition-colors"
        >
          건너뛰기
        </button>
      </div>
    </BottomSheet>
  )
}
