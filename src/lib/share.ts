/**
 * Reusable share utility — Web Share API with clipboard fallback.
 * Enables viral loops by making it easy to share key screens.
 */

import { trackEvent } from '@/lib/analytics'

export interface ShareData {
  title: string
  text: string
  url: string
}

/**
 * Share content using the best available method:
 * 1. Kakao Share SDK (if initialized)
 * 2. Web Share API (mobile browsers)
 * 3. Clipboard fallback (desktop)
 *
 * Returns true if share was initiated successfully.
 */
export async function shareContent(
  data: ShareData,
  options?: {
    /** Optional image URL for Kakao card */
    imageUrl?: string
    /** Source screen for analytics */
    source?: string
  }
): Promise<boolean> {
  const { title, text, url } = data
  const imageUrl = options?.imageUrl || 'https://i.dodam.life/icon-512.png'
  const source = options?.source || 'unknown'

  trackEvent('share_clicked', { source, url })

  // 1. Try Kakao Share if available
  if (typeof window !== 'undefined' && (window as any).Kakao?.isInitialized?.()) {
    try {
      ;(window as any).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description: text,
          imageUrl,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '도담에서 보기', link: { mobileWebUrl: url, webUrl: url } }],
      })
      trackEvent('share_completed', { source, method: 'kakao' })
      return true
    } catch {
      // Fall through to next method
    }
  }

  // 2. Try Web Share API
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url })
      trackEvent('share_completed', { source, method: 'web_share' })
      return true
    } catch {
      // User cancelled or API error — fall through
    }
  }

  // 3. Clipboard fallback
  try {
    await navigator.clipboard.writeText(url)
    window.dispatchEvent(
      new CustomEvent('dodam-toast', {
        detail: { message: '링크가 복사되었어요!' },
      })
    )
    trackEvent('share_completed', { source, method: 'clipboard' })
    return true
  } catch {
    return false
  }
}

/**
 * Convenience: share a milestone achievement
 */
export function shareMilestone(milestoneName: string, date: string) {
  return shareContent(
    {
      title: `도담 - ${milestoneName}`,
      text: `우리 아이가 ${date}에 "${milestoneName}"을 달성했어요!`,
      url: 'https://i.dodam.life/milestone',
    },
    { source: 'milestone' }
  )
}

/**
 * Convenience: share growth analysis results
 */
export function shareGrowthAnalysis(summary: string) {
  return shareContent(
    {
      title: '도담 - AI 성장 분석 결과',
      text: summary.slice(0, 120) + (summary.length > 120 ? '...' : ''),
      url: 'https://i.dodam.life/growth/analyze',
    },
    { source: 'growth_analysis' }
  )
}
