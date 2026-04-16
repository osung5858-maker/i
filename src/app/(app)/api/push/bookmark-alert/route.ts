import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendFcmToToken, type FcmMessage } from '@/lib/push/fcm'
import { sendWebPush, isWebPushSubscription } from '@/lib/push/webpush'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit'

/**
 * POST /api/push/bookmark-alert — 찜한 유저들에게 상품 관련 알림
 * Body: { itemId, itemTitle, alertType: 'new_chat' | 'price_drop', newPrice? }
 */
export async function POST(request: Request) {
  const ct = request.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  try {
    const { itemId, itemTitle, alertType, newPrice } = await request.json()
    if (!itemId || !itemTitle || !alertType) {
      return NextResponse.json({ error: 'itemId, itemTitle, alertType required' }, { status: 400 })
    }

    // Auth check
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getClientIP(request)
    const { limited } = checkRateLimit(`push-bookmark:${user.id}:${ip}`, { limit: 10, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: '요청이 너무 많아요.' }, { status: 429 })

    // Service role client to query all users' bookmarks (bypasses RLS)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // 소유권 검증: 요청자가 해당 상품의 판매자인지 확인
    const { data: item } = await adminSupabase
      .from('market_items')
      .select('id, user_id')
      .eq('id', itemId)
      .single()

    if (!item || item.user_id !== user.id) {
      return NextResponse.json({ error: '본인 상품에 대해서만 알림을 보낼 수 있습니다' }, { status: 403 })
    }

    // Find users who bookmarked this market item
    const { data: bookmarkRows } = await adminSupabase
      .from('user_records')
      .select('user_id, value')
      .eq('type', 'market_bookmarks')

    if (!bookmarkRows || bookmarkRows.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no bookmarks' })
    }

    // Filter users whose bookmarks contain this itemId (exclude the sender)
    const targetUserIds = bookmarkRows
      .filter(row => {
        const ids = (row.value as { ids?: string[] })?.ids || []
        return ids.includes(itemId) && row.user_id !== user.id
      })
      .map(row => row.user_id)

    if (targetUserIds.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no matching bookmarks' })
    }

    // Build notification
    const safeTitle = itemTitle.slice(0, 50)
    let title: string
    let body: string
    const deeplink = `/town?tab=market`

    if (alertType === 'new_chat') {
      title = '찜한 상품에 거래 문의가 왔어요'
      body = `"${safeTitle}"에 새로운 채팅이 시작되었어요. 서두르세요!`
    } else if (alertType === 'price_drop') {
      title = '찜한 상품이 할인되었어요!'
      body = newPrice != null
        ? `"${safeTitle}" 가격이 ${Number(newPrice).toLocaleString()}원으로 내려갔어요`
        : `"${safeTitle}" 가격이 인하되었어요`
    } else {
      return NextResponse.json({ error: 'Invalid alertType' }, { status: 400 })
    }

    // Send push to each bookmarker
    let sent = 0
    for (const targetUserId of targetUserIds.slice(0, 50)) { // cap at 50
      const { data: tokens } = await adminSupabase
        .from('push_tokens')
        .select('token, platform')
        .eq('user_id', targetUserId)

      if (!tokens || tokens.length === 0) continue

      for (const t of tokens) {
        try {
          const fcmMsg: FcmMessage = { title, body, url: deeplink, tag: `market_${alertType}` }
          let ok = false
          if (isWebPushSubscription(t.token)) {
            ok = await sendWebPush(t.token, { title, body, url: deeplink, tag: `market_${alertType}` })
          } else {
            ok = await sendFcmToToken(t.token, fcmMsg)
          }
          if (ok) sent++
        } catch (pushErr) {
          console.error(`[push/bookmark-alert] Error:`, pushErr)
        }
      }

      // Notification log (ignore errors)
      await adminSupabase.from('notification_log').insert({
        user_id: targetUserId,
        type: `market_${alertType}`,
        title,
        body,
        deeplink,
      })
    }

    return NextResponse.json({ sent, targets: targetUserIds.length })
  } catch (err) {
    console.error('Bookmark alert error:', err)
    return NextResponse.json({ error: 'Push failed' }, { status: 500 })
  }
}
