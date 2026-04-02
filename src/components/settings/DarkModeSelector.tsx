'use client'

import { SunIcon, MoonIcon, SparkleIcon } from '@/components/ui/Icons'

export default function DarkModeSelector() {
  return (
    <div className="flex gap-2 px-1">
      <div className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[var(--color-primary-bg)] ring-2 ring-[var(--color-primary)]">
        <SunIcon className="w-5 h-5 text-[var(--color-primary)]" />
        <span className="text-caption font-semibold text-[var(--color-primary)]">라이트</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[#F5F5F5] opacity-40">
        <MoonIcon className="w-5 h-5 text-tertiary" />
        <span className="text-caption font-semibold text-tertiary">다크</span>
        <span className="text-[9px] text-tertiary">준비 중</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[#F5F5F5] opacity-40">
        <SparkleIcon className="w-5 h-5 text-tertiary" />
        <span className="text-caption font-semibold text-tertiary">자동</span>
        <span className="text-[9px] text-tertiary">준비 중</span>
      </div>
    </div>
  )
}
