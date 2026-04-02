'use client'

import BottomSheet from '@/components/ui/BottomSheet'
import { CircleIcon, DropletIcon } from '@/components/ui/Icons'

const OPTIONS = [
  { value: 'normal', label: '정상', icon: <CircleIcon className="w-5 h-5 text-[var(--color-primary)]" /> },
  { value: 'soft', label: '묽음', icon: <DropletIcon className="w-5 h-5 text-blue-400" /> },
  { value: 'hard', label: '단단', icon: <CircleIcon className="w-5 h-5 text-[#8B7355]" /> },
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
            className="w-full h-14 rounded-xl bg-[#f5f5f5] flex items-center justify-center gap-2 text-sm font-semibold text-primary active:bg-[#0052FF] active:text-white transition-colors"
          >
            {opt.icon} {opt.label}
          </button>
        ))}
        <button
          onClick={() => onSelect(null)}
          className="w-full h-12 rounded-xl text-sm font-medium text-tertiary active:opacity-70"
        >
          건너뛰기
        </button>
      </div>
    </BottomSheet>
  )
}
