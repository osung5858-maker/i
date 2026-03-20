'use client'

import { useState, useEffect, useCallback } from 'react'
import { syncPendingEvents } from '@/lib/offline/sync'
import { getPendingCount } from '@/lib/offline/db'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = async () => {
      setIsOnline(true)
      // 온라인 복귀 시 자동 동기화
      setSyncing(true)
      const synced = await syncPendingEvents()
      setSyncing(false)
      if (synced > 0) {
        setPendingCount(await getPendingCount())
      }
    }

    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 초기 pending 카운트
    getPendingCount().then(setPendingCount)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const refreshPending = useCallback(async () => {
    setPendingCount(await getPendingCount())
  }, [])

  return { isOnline, pendingCount, syncing, refreshPending }
}
