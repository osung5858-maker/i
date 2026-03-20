'use client'

import BottomSheet from '@/components/ui/BottomSheet'

const OPTIONS = [
  { value: 'normal', label: '정상', emoji: '👍' },
  { value: 'soft', label: '묽음', emoji: '💧' },
  { value: 'hard', label: '단단', emoji: '🪨' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (status: string | null) => void
}

export default function PoopSheet({ open, onClose, onSelect }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title="대변 상태">
      <div className="space-y-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full h-14 rounded-xl bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center gap-2 text-sm font-semibold text-[#0A0B0D] dark:text-white active:bg-[#0052FF] active:text-white transition-colors"
          >
            <span className="text-lg">{opt.emoji}</span> {opt.label}
          </button>
        ))}
        <button
          onClick={() => onSelect(null)}
          className="w-full h-12 rounded-xl text-sm font-medium text-[#9B9B9B] active:opacity-70"
        >
          건너뛰기
        </button>
      </div>
    </BottomSheet>
  )
}
