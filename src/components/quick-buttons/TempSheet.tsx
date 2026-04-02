'use client'

import { useState } from 'react'
import BottomSheet from '@/components/ui/BottomSheet'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (celsius: number) => void
}

export default function TempSheet({ open, onClose, onSubmit }: Props) {
  const [value, setValue] = useState('36.5')

  const handleSubmit = () => {
    const num = parseFloat(value)
    if (num >= 34 && num <= 42) {
      onSubmit(num)
    }
  }

  const celsius = parseFloat(value) || 0
  const isHigh = celsius >= 37.5
  const isCritical = celsius >= 38.5

  return (
    <BottomSheet open={open} onClose={onClose} title="체온 입력">
      <div className="flex flex-col items-center gap-4">
        <div className={`text-5xl font-bold transition-colors ${
          isCritical ? 'text-red-500' : isHigh ? 'text-orange-500' : 'text-primary'
        }`}>
          {value}°C
        </div>

        {isCritical && (
          <p className="text-xs text-red-500 font-medium">고열이에요. 소아과 상담을 추천드려요.</p>
        )}
        {isHigh && !isCritical && (
          <p className="text-xs text-orange-500 font-medium">미열이에요. 경과를 살펴보세요.</p>
        )}

        <input
          type="range"
          min="35"
          max="41"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-blue-300 via-green-300 via-60% to-red-400 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0052FF]"
        />
        <div className="flex justify-between w-full text-body-emphasis text-tertiary">
          <span>35°C</span><span>37.5°C</span><span>38.5°C</span><span>41°C</span>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full h-[52px] rounded-xl font-semibold text-subtitle bg-[#0052FF] text-white active:scale-[0.98] transition-transform mt-2"
        >
          기록하기
        </button>
      </div>
    </BottomSheet>
  )
}
