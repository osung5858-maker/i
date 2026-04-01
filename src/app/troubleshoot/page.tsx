'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'
import TroubleshootCard from '@/components/ai-cards/TroubleshootCard'

export default function TroubleshootPage() {
  const [ageMonths, setAgeMonths] = useState(0)

  useEffect(() => {
    try {
      const birthdate = localStorage.getItem('dodam_child_birthdate')
      if (birthdate) {
        const birth = new Date(birthdate)
        const now = new Date()
        setAgeMonths((now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()))
      }
    } catch { /* */ }
  }, [])

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]">
      <PageHeader title="육아 SOS" showBack />
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-4">
        <p className="text-[13px] text-[#6B6966] mb-4 text-center">
          아이에게 무슨 일이 생겼나요? AI가 체크리스트와 대응 방법을 알려드려요.
        </p>
        <TroubleshootCard ageMonths={ageMonths} />
      </div>
    </div>
  )
}
