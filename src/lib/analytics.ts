/**
 * Lightweight analytics abstraction layer.
 *
 * Logs key user events into a queue that can later be connected to
 * any analytics provider (Amplitude, Mixpanel, PostHog, GA4, etc.).
 *
 * In production, events are also forwarded to Vercel Analytics (if available)
 * via the window.va helper.
 */

// ─── Event types ───
export type AnalyticsEvent =
  | 'page_view'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'mode_selected'
  | 'record_created'
  | 'ai_analysis_triggered'
  | 'ai_analysis_completed'
  | 'share_clicked'
  | 'share_completed'
  | 'milestone_recorded'
  | 'growth_record_saved'
  | 'push_prompt_shown'
  | 'push_prompt_accepted'
  | 'push_prompt_dismissed'
  | 'community_post_created'
  | 'market_item_listed'

export interface AnalyticsPayload {
  [key: string]: string | number | boolean | undefined
}

interface QueuedEvent {
  event: AnalyticsEvent
  properties: AnalyticsPayload
  timestamp: number
}

// ─── Event queue (in-memory, capped at 200) ───
const MAX_QUEUE = 200
let eventQueue: QueuedEvent[] = []

/**
 * Track an analytics event.
 * Safe to call on server (no-ops) and in client components.
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties: AnalyticsPayload = {}
): void {
  if (typeof window === 'undefined') return

  const entry: QueuedEvent = {
    event,
    properties: {
      ...properties,
      path: window.location.pathname,
    },
    timestamp: Date.now(),
  }

  // Push to in-memory queue (FIFO, capped)
  eventQueue.push(entry)
  if (eventQueue.length > MAX_QUEUE) {
    eventQueue = eventQueue.slice(-MAX_QUEUE)
  }

  // Forward to Vercel Analytics custom events if available
  try {
    const va = (window as any).va
    if (typeof va === 'function') {
      va('event', { name: event, ...properties })
    }
  } catch {
    // Silently ignore
  }

  // Forward to Google Analytics (GA4) if available
  try {
    const gtag = (window as any).gtag
    if (typeof gtag === 'function') {
      if (event === 'page_view') {
        gtag('event', 'page_view', { page_path: properties.path })
      } else {
        gtag('event', event, properties)
      }
    }
  } catch {
    // Silently ignore
  }

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[analytics] ${event}`, properties)
  }
}

/**
 * Track a page view. Call from layout or route components.
 */
export function trackPageView(path?: string): void {
  trackEvent('page_view', { path: path || (typeof window !== 'undefined' ? window.location.pathname : '/') })
}

/**
 * Get the current event queue (for debugging or future batch send).
 */
export function getEventQueue(): readonly QueuedEvent[] {
  return eventQueue
}

/**
 * Flush / clear the queue (e.g. after successful batch upload).
 */
export function flushQueue(): QueuedEvent[] {
  const flushed = [...eventQueue]
  eventQueue = []
  return flushed
}
