# ADR-003: 배우자 알림 전송 방식

## Status
**Accepted** — 2026-04-03

## Context

검진 예약/완료/미디어 업로드 시 배우자(파트너)에게 실시간 알림을 전송해야 합니다.

### 요구사항
- 실시간 알림 (검진 예약 즉시)
- 파트너가 앱에 가입 + 알림 구독 시 전송
- 비가입 파트너에게는 fallback 제공
- 무료 또는 저비용
- 개인정보 보호 (알림 내용 암호화)

### 고려 옵션

#### Option 1: Web Push (VAPID)
- **장점**: 무료, 기존 인프라(push_tokens) 재사용, 브라우저 표준
- **단점**: 파트너 미가입 시 알림 불가, iOS Safari 제약

#### Option 2: SMS (Twilio)
- **장점**: 앱 미설치도 수신 가능, 높은 도달률
- **단점**: 건당 비용 ($0.0075/SMS), 전화번호 수집 필요, 스팸 우려

#### Option 3: Email (SendGrid)
- **장점**: 무료 티어(월 100통), 긴 메시지 가능
- **단점**: 실시간성 낮음, 스팸함 위험, 이메일 수집 필요

#### Option 4: 카카오톡 알림톡
- **장점**: 한국 사용자 친화적, 높은 도달률
- **단점**: 월 고정비 + 건당 비용, 비즈니스 인증 필요

## Decision

**Option 1: Web Push (VAPID)** 우선 사용, 미가입 파트너에게는 **카카오톡 공유** fallback 제공.

## Rationale

### 1. 기존 인프라 활용
```sql
-- 이미 존재하는 테이블
push_tokens (user_id, token, platform)
notification_log (user_id, type, sent_at)
notification_settings (user_id, enabled, dnd_start, dnd_end)
```
→ 검진 알림도 동일 파이프라인 사용 (추가 개발 최소)

### 2. VAPID 설정 완료
```typescript
// src/lib/push/config.ts
export const VAPID_PUBLIC_KEY = 'BITzVh759e8pmLHPItzIKtS2jM1mlartS4otyUwQSVwklXMEdfYEeulWC76gGKLmeLASOsjV8NUy7vstVqR4hxQ'
// VAPID_PRIVATE_KEY → .env.local
```
→ 즉시 사용 가능 (추가 설정 불필요)

### 3. 비용 0원
- Web Push: 무료 (브라우저 표준)
- 카카오톡 공유: 무료 (알림톡 아님, 일반 공유)
- SMS/Email: 건당 비용 발생

### 4. 모바일 알림 UX
```
[앱 알림]
제목: [태명] 검진 예약됐어요!
본문: 5/15(목) 10:30 첫 초음파
액션: 탭 → /waiting?tab=checkup 자동 이동
```
→ SMS보다 상호작용 풍부

### 5. Fallback 전략
```typescript
async function notifyPartner(payload) {
  const partner = await getPartnerUser()
  if (!partner) {
    return { fallback_kakao_share: true }
  }

  const tokens = await getPushTokens(partner.id)
  if (tokens.length === 0) {
    // 파트너가 가입했지만 Push 미구독
    return { fallback_kakao_share: true }
  }

  await sendWebPush(tokens, payload)
  return { success: true }
}
```
→ 미가입 시 카카오톡 공유 링크 자동 생성

## Consequences

### 즉시 효과
- ✅ 빠른 구현 (기존 Push 코드 재사용)
- ✅ 비용 0원
- ✅ 실시간 알림 (< 1초 latency)

### 장기 영향
- ⚠️ **iOS Safari 제약**
  - iOS 16.4+ PWA만 Web Push 지원
  - 완화: 카카오톡 공유 fallback

- ⚠️ **파트너 미가입 시 도달률 낮음**
  - 현재: 카카오톡 공유 링크만 제공
  - 향후: SMS 옵션 추가 고려 (Phase 2)

- ⚠️ **DND(방해금지) 시간 관리**
  - 기존 `notification_settings.dnd_start/end` 재사용
  - 파트너도 개별 설정 가능

### 알림 페이로드 설계
```typescript
interface NotificationPayload {
  type: 'checkup_scheduled' | 'checkup_completed' | 'media_uploaded'
  title: string // 최대 50자
  body: string  // 최대 200자
  deeplink?: string // 앱 내 이동 경로
  metadata?: {
    checkup_id: string
    scheduled_date: string
  }
}

// 예시
{
  type: 'checkup_scheduled',
  title: '[태명] 검진 예약됐어요!',
  body: '5/15(목) 10:30 첫 초음파\n삼성서울병원',
  deeplink: '/waiting?tab=checkup',
  metadata: { checkup_id: 'first_us', scheduled_date: '2026-05-15' }
}
```

### 발송 제약
| 조건 | 발송 여부 |
|------|-----------|
| 파트너 미가입 | ❌ → Kakao Share fallback |
| 파트너 가입 + Push 미구독 | ❌ → Kakao Share fallback |
| 파트너 가입 + Push 구독 + DND 시간 | ⏸ → 다음날 아침 발송 (예정) |
| 파트너 가입 + Push 구독 + DND 외 | ✅ 즉시 발송 |

### 개인정보 보호
- **전송 내용**: 태명, 검진명, 날짜만 (의료 수치 제외)
- **암호화**: HTTPS 전송, JWT 서명
- **로그**: notification_log에 기록 (30일 후 자동 삭제)

## Performance Considerations

### 발송 속도
```
사용자 "저장" 클릭
→ DB 저장 (200ms)
→ /api/notify-partner 호출 (100ms)
→ Web Push 발송 (500ms)
→ 파트너 수신 (~1초)

Total: ~2초 이내
```

### 재시도 로직
```typescript
async function sendWebPushWithRetry(tokens, payload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await webpush.sendNotification(tokens[0], JSON.stringify(payload))
      return { success: true }
    } catch (error) {
      if (error.statusCode === 410) {
        // 토큰 만료 → 삭제
        await deletePushToken(tokens[0])
        return { success: false, reason: 'token_expired' }
      }
      if (i === retries - 1) throw error
      await sleep(1000 * (i + 1)) // 1s, 2s, 3s
    }
  }
}
```

### 실패 처리
| Error Code | 의미 | 처리 |
|------------|------|------|
| 410 Gone | 토큰 만료/구독 해지 | DB에서 토큰 삭제 |
| 404 Not Found | 잘못된 endpoint | DB에서 토큰 삭제 |
| 429 Too Many Requests | Rate limit | 1분 후 재시도 |
| 500 Server Error | Push 서비스 오류 | 재시도 3회 |

## Alternatives Considered

### SMS를 선택하지 않은 이유
- **비용**: 월 1000건 발송 시 $7.50 (연 $90)
- **전화번호 수집**: 추가 개인정보 동의 필요
- **스팸 우려**: 한국 정보통신망법 위반 리스크
- **실시간성**: Push와 비슷하지만 비용 발생

### Email을 선택하지 않은 이유
- **실시간성 낮음**: 발송 후 ~1분 소요 (SMTP 큐)
- **스팸함**: Gmail 등에서 자동 분류될 수 있음
- **모바일 UX**: 앱 내 이동 불가 (deeplink 미지원)

### 카카오톡 알림톡을 선택하지 않은 이유
- **비용**: 월 고정비 $30 + 건당 $0.008
- **비즈니스 인증**: 사업자등록증, 카카오 심사 필요
- **개발 복잡도**: API 연동, 템플릿 사전 등록

## Security Considerations

### VAPID Key 관리
```bash
# .env.local (서버 사이드 only)
VAPID_PRIVATE_KEY=<private-key>
VAPID_PUBLIC_KEY=BITzVh759e8pmLHPItzIKtS2jM1mlartS4otyUwQSVwklXMEdfYEeulWC76gGKLmeLASOsjV8NUy7vstVqR4hxQ

# 클라이언트 노출 OK (public key)
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
```

### 파트너 검증
```typescript
// 배우자 연결 검증 (RLS + 애플리케이션 레벨)
const partner = await supabase
  .from('user_profiles')
  .select('partner_user_id')
  .eq('user_id', currentUserId)
  .single()

if (!partner?.partner_user_id) {
  return { error: 'NO_PARTNER' }
}
```

### 알림 내용 제약
```typescript
// 민감 정보 제외 (검진 결과 수치, 의사 소견 등)
const allowedFields = ['checkup_id', 'title', 'scheduled_date']
const sanitized = pick(payload.metadata, allowedFields)
```

## Future Enhancements (Phase 2+)

| Feature | Priority | Complexity |
|---------|----------|------------|
| SMS 옵션 (Twilio) | Medium | Low |
| 검진 D-1 자동 알림 | High | Medium |
| 파트너 알림 설정 세분화 | Low | Low |
| 그룹 알림 (가족 전체) | Medium | Medium |

## References
- Web Push Protocol: https://datatracker.ietf.org/doc/html/rfc8030
- VAPID: https://datatracker.ietf.org/doc/html/rfc8292
- web-push 라이브러리: https://github.com/web-push-libs/web-push
- 기존 Push 구현: `/src/lib/push/subscribe.ts`

## Review & Approval
- Architect: da:system (2026-04-03)
- Security Review: Pending
- Status: Accepted
