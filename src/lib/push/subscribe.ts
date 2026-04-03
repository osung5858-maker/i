/**
 * 웹 푸시 구독 관리
 */

import { VAPID_PUBLIC_KEY } from './config'
import { createClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * 푸시 알림 구독 시작
 * @returns { ok: true } | { ok: false, reason: 'sw' | 'permission' | 'error' }
 */
export async function subscribePush(): Promise<{ ok: boolean; reason?: 'sw' | 'permission' | 'error' }> {
  try {
    // 0. Service Worker / PushManager 지원 확인
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, reason: 'sw' }
    }

    // 1. SW 등록 여부 확인 (개발 환경에서는 unregister되므로 없을 수 있음)
    const regs = await navigator.serviceWorker.getRegistrations()
    if (regs.length === 0) {
      return { ok: false, reason: 'sw' }
    }

    // 2. 권한 요청
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'permission' }

    // 3. 서비스 워커 등록 확인
    const registration = await navigator.serviceWorker.ready

    // 3. 구독
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })

    // 4. Supabase에 토큰 저장
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, reason: 'error' }

    const token = JSON.stringify(subscription)
    const platform = /iPhone|iPad/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'web'

    await supabase.from('push_tokens').upsert(
      { user_id: user.id, token, platform },
      { onConflict: 'user_id,token' }
    )

    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * 푸시 알림 구독 해제
 */
export async function unsubscribePush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()

      // DB에서도 제거
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('push_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('token', JSON.stringify(subscription))
      }
    }
    return true
  } catch {
    return false
  }
}

/**
 * 현재 푸시 구독 상태 확인
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
