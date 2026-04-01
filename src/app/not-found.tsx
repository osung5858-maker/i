'use client'

import Link from 'next/link'
import { HomeIcon, ArrowLeftIcon } from '@/components/ui/Icons'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-page-bg)] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
          <span className="text-5xl">🔍</span>
        </div>

        <h1 className="text-6xl font-bold text-[var(--color-primary)] mb-2">
          404
        </h1>

        <h2 className="text-xl font-bold text-[#1A1918] mb-2">
          페이지를 찾을 수 없어요
        </h2>

        <p className="text-sm text-[#6B6966] mb-8">
          요청하신 페이지가 존재하지 않거나<br />
          주소가 변경되었을 수 있습니다.
        </p>

        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] text-white font-semibold active:opacity-80 flex items-center justify-center gap-2"
          >
            <HomeIcon className="w-5 h-5" />
            홈으로 가기
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full py-3 px-4 rounded-xl bg-[#E8E4DF] text-[#1A1918] font-semibold active:opacity-80 flex items-center justify-center gap-2"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            이전 페이지로
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E8E4DF]">
          <p className="text-xs text-[#9E9A95] mb-3">
            자주 찾는 메뉴
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/record" className="py-2 px-3 rounded-lg bg-[var(--color-page-bg)] text-[#6B6966] active:bg-[#E8E4DF]">
              기록
            </Link>
            <Link href="/growth" className="py-2 px-3 rounded-lg bg-[var(--color-page-bg)] text-[#6B6966] active:bg-[#E8E4DF]">
              성장
            </Link>
            <Link href="/guide" className="py-2 px-3 rounded-lg bg-[var(--color-page-bg)] text-[#6B6966] active:bg-[#E8E4DF]">
              가이드
            </Link>
            <Link href="/community" className="py-2 px-3 rounded-lg bg-[var(--color-page-bg)] text-[#6B6966] active:bg-[#E8E4DF]">
              커뮤니티
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
