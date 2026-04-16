'use client'

import { useEffect, useRef, useState } from 'react'
import { isNativePlatform, initAdMob } from '@/lib/admob'

// Google 공식 테스트 배너 ID
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111'
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716'

interface AdMobBannerProps {
  /** DB ad_settings의 unit_id */
  adUnitId: string | null
  className?: string
}

/**
 * Capacitor 네이티브 AdMob 배너.
 * - 네이티브: showBanner() 오버레이 + 같은 높이 스페이서
 * - 웹: null (기존 KakaoAdFit/AdSense 사용)
 */
export default function AdMobBanner({ adUnitId, className = '' }: AdMobBannerProps) {
  const [spacerHeight, setSpacerHeight] = useState(0)
  const showingRef = useRef(false)
  const isProd = process.env.NODE_ENV === 'production'

  useEffect(() => {
    if (!isNativePlatform()) return

    let cancelled = false

    async function show() {
      await initAdMob()

      const { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } =
        await import('@capacitor-community/admob')

      // 배너 크기 변경 시 스페이서 동기화
      const listener = await AdMob.addListener(
        BannerAdPluginEvents.SizeChanged,
        (info: { width: number; height: number }) => {
          if (!cancelled) setSpacerHeight(info.height)
        },
      )

      // unit ID 결정
      let unitId = adUnitId
      if (!unitId || !isProd) {
        try {
          const { Capacitor } = await import('@capacitor/core')
          unitId =
            Capacitor.getPlatform() === 'ios' ? TEST_BANNER_IOS : TEST_BANNER_ANDROID
        } catch {
          unitId = TEST_BANNER_ANDROID
        }
      }

      try {
        await AdMob.showBanner({
          adId: unitId,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 56, // BottomNav 높이 위
          isTesting: !isProd,
        })
        showingRef.current = true
      } catch (error) {
        console.error('[AdMobBanner] showBanner failed:', error)
      }

      // cleanup 등록
      return () => {
        cancelled = true
        listener.remove()
        if (showingRef.current) {
          AdMob.removeBanner().catch(() => {})
          showingRef.current = false
        }
      }
    }

    let cleanupFn: (() => void) | undefined
    show().then((fn) => {
      if (cancelled) {
        fn?.()
      } else {
        cleanupFn = fn
      }
    })

    return () => {
      cancelled = true
      cleanupFn?.()
    }
  }, [adUnitId, isProd])

  // 웹에서는 아무것도 렌더링하지 않음
  if (!isNativePlatform()) return null

  // 네이티브 배너 오버레이 아래 빈 공간 확보
  if (spacerHeight <= 0) return null

  return (
    <div
      className={`admob-spacer ${className}`}
      style={{ height: spacerHeight, width: '100%' }}
      aria-hidden
    />
  )
}
