'use client'

import { useEffect } from 'react'
import { migrateToSecure } from '@/lib/secureStorage'

// 앱 첫 로드 시 민감 localStorage 값을 AES-GCM 암호화로 1회 마이그레이션
const SENSITIVE_KEYS = [
  'dodam_child_name',
  'dodam_child_birthdate',
  'dodam_due_date',
  'dodam_last_period',
  'dodam_cycle_length',
]

export default function SecurityMigrator() {
  useEffect(() => {
    migrateToSecure(SENSITIVE_KEYS)
  }, [])
  return null
}
