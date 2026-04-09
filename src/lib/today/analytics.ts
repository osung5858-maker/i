/**
 * Analytics event tracking wrapper for "오늘도, 맑음"
 *
 * Uses @vercel/analytics track() under the hood.
 * Provides a thin abstraction so event names stay consistent
 * and we can swap the backend later without touching components.
 */

import { track } from '@vercel/analytics';

type AllowedValue = string | number | boolean | null | undefined;

/** Known event names for type safety */
export type TodayEventName =
  | 'page_view'
  | 'share_click'
  | 'share_complete'
  | 'region_change'
  | 'score_loaded'
  | 'detail_view';

/**
 * Track a custom analytics event.
 *
 * @param name  - One of the predefined event names
 * @param props - Flat key-value properties (no nested objects)
 *
 * @example
 * trackEvent('share_click', { region: '서울특별시_강남구', method: 'native' });
 */
export function trackEvent(
  name: TodayEventName,
  props?: Record<string, AllowedValue>,
): void {
  try {
    track(name, props ?? {});
  } catch {
    // Silently ignore in environments where analytics script isn't loaded
    // (e.g., SSR, test runners, ad-blockers)
  }
}
