'use client'

import { useState } from 'react'
import BottomSheet from '@/components/ui/BottomSheet'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (ml: number) => void
}

const PRESETS = [60, 90, 120, 150, 180, 210, 240]

export default function FormulaModal({ open, onClose, onSubmit }: Props) {
  const [customMode, setCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState('120')

  const handlePresetClick = (ml: number) => {
    onSubmit(ml)
    setCustomMode(false)
  }

  const handleCustomSubmit = () => {
    const ml = parseInt(customValue)
    if (ml > 0 && ml <= 500) {
      onSubmit(ml)
      setCustomMode(false)
    }
  }

  const handleClose = () => {
    setCustomMode(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="분유량 입력">
      {!customMode ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((ml) => (
              <button
                key={ml}
                onClick={() => handlePresetClick(ml)}
                className="h-12 rounded-xl bg-[#f5f5f5] text-sm font-semibold text-primary active:bg-[#0052FF] active:text-white transition-colors"
              >
                {ml}ml
              </button>
            ))}
            <button
              onClick={() => setCustomMode(true)}
              className="h-12 rounded-xl bg-[#0052FF]/10 text-sm font-semibold text-[#0052FF] active:bg-[#0052FF] active:text-white transition-colors"
            >
              직접 입력
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl font-bold text-[#0052FF]">
              {customValue}ml
            </div>
            <input
              type="number"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="w-full h-12 px-4 text-center text-lg font-semibold border-2 border-[#E8E4DF] rounded-xl focus:border-[#0052FF] outline-none"
              placeholder="분유량을 입력하세요"
              min="1"
              max="500"
              autoFocus
            />
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setCustomMode(false)}
                className="flex-1 h-11 rounded-xl font-medium text-sm bg-[#f5f5f5] text-secondary active:bg-[#E8E4DF] transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={handleCustomSubmit}
                className="flex-1 h-11 rounded-xl font-semibold text-sm bg-[#0052FF] text-white active:scale-[0.98] transition-transform"
              >
                기록하기
              </button>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
