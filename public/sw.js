const CACHE_VERSION = 'dodam-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`

const STATIC_ASSETS = ['/', '/manifest.json']

// 설치: 정적 에셋 프리캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// 활성화: 이전 버전 캐시 자동 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// 요청 유형별 캐시 전략
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // POST 등 비-GET 요청은 무시
  if (request.method !== 'GET') return

  // API / 외부 서비스: Network First + 캐시 폴백
  if (
    url.pathname.startsWith('/api/') ||
    request.url.includes('supabase.co') ||
    request.url.includes('kakao')
  ) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE))
    return
  }

  // 정적 에셋 (이미지, CSS, JS, 폰트): Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // HTML 페이지: Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE))
})

// --- 캐시 전략 함수들 ---

// Cache First: 캐시에 있으면 바로 반환, 없으면 네트워크
function cacheFirst(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) return cached
    return fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone()
        caches.open(cacheName).then((cache) => cache.put(request, clone))
      }
      return response
    })
  })
}

// Network First: 네트워크 우선, 실패 시 캐시 폴백
function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone()
        caches.open(cacheName).then((cache) => cache.put(request, clone))
      }
      return response
    })
    .catch(() =>
      caches.match(request).then((cached) => cached || Response.error())
    )
}

// Stale While Revalidate: 캐시 즉시 반환 + 백그라운드 갱신
function staleWhileRevalidate(request, cacheName) {
  return caches.match(request).then((cached) => {
    const fetchPromise = fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(cacheName).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => cached || caches.match('/'))

    return cached || fetchPromise
  })
}

// ===== 푸시 알림 =====

self.addEventListener('push', (event) => {
  const defaultData = { title: '도담', body: '알림이 도착했어요', url: '/' }
  let data = defaultData

  try {
    if (event.data) {
      data = { ...defaultData, ...event.data.json() }
    }
  } catch {
    // JSON 파싱 실패 시 기본값
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    tag: data.tag || 'dodam-notification',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// 알림 클릭 → 딥링크
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // 없으면 새 탭
      return self.clients.openWindow(url)
    })
  )
})

// 정적 에셋 판별
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)(\?.*)?$/.test(
    pathname
  )
}
