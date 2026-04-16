// ===== 도담 서비스 워커 v3 =====
// 캐시 전략 제거 — 개발 중 캐시로 인한 "이전 버전 표시" 문제 근본 해결
// 푸시 알림 기능만 유지

// 설치 즉시 활성화 (이전 SW 대체)
self.addEventListener('install', () => {
  self.skipWaiting()
})

// 활성화 시 모든 기존 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// fetch 이벤트: 캐시 없이 네트워크로 직접 전달 (브라우저 기본 동작)
// 아무 처리 안 하면 서비스 워커가 요청을 가로채지 않음

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
    badge: '/badge-96.png',
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
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
