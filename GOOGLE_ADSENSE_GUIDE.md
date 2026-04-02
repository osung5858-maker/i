# 📱 도담 - 구글 애드센스 광고 배치 가이드

## 🎯 광고 수익화 전략

### 수익 예상
- **DAU 1,000명 기준**: 월 $100-300 (₩130,000-390,000)
- **DAU 5,000명 기준**: 월 $500-1,500 (₩650,000-1,950,000)
- **DAU 10,000명 기준**: 월 $1,000-3,000 (₩1,300,000-3,900,000)

---

## 🔧 설정 방법

### 1. 환경 변수 설정

`.env.local` 파일에 추가:
```bash
NEXT_PUBLIC_GOOGLE_ADSENSE_ID=ca-pub-XXXXXXXXXXXXXXXX
```

### 2. Google AdSense 스크립트 추가

`src/app/layout.tsx`에 다음 추가:
```tsx
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        {/* Google AdSense */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

## 📍 권장 광고 배치 위치

### ✅ 현재 적용된 위치

#### 1. **알림 페이지** (`src/app/notifications/page.tsx`)
- **위치 1**: 페이지 상단 (헤더 아래)
  - 형식: Display Banner (반응형)
  - 이유: 높은 시인성, 페이지 진입 시 자연스럽게 노출
  ```tsx
  <GoogleAdBanner adSlot="알림페이지_상단_배너" className="my-4" />
  ```

- **위치 2**: 알림 목록 중간 (5개 이상 알림 시)
  - 형식: In-Feed Ad
  - 이유: 콘텐츠 사이에 자연스럽게 녹아듦, 높은 클릭률
  ```tsx
  <GoogleAdBanner
    adSlot="알림페이지_피드내_광고"
    format="in-feed"
    layoutKey="-fb+5w+4e-db+86"
  />
  ```

---

### 🎯 추가 추천 위치 (우선순위 순)

#### 우선순위 1: 고트래픽 콘텐츠 페이지

##### 1. **커뮤니티 페이지** (`src/app/community/page.tsx`)
```tsx
// 게시글 목록 상단
<GoogleAdBanner
  adSlot="커뮤니티_상단_배너"
  className="mb-4"
/>

// 게시글 5개마다 피드 내 광고
{posts.map((post, index) => (
  <div key={post.id}>
    <PostCard post={post} />
    {(index + 1) % 5 === 0 && (
      <GoogleAdBanner
        adSlot="커뮤니티_피드내_광고"
        format="in-feed"
        className="my-3"
      />
    )}
  </div>
))}
```

**예상 효과**: 월 $150-450 (커뮤니티 활성화 시)

##### 2. **소모임 목록** (`src/app/town/page.tsx`)
```tsx
// 피드 탭 상단
<GoogleAdBanner
  adSlot="소모임_피드_상단"
  className="mb-3"
/>

// 소모임 목록 상단
<GoogleAdBanner
  adSlot="소모임_목록_상단"
  className="mb-3"
/>
```

**예상 효과**: 월 $100-300

##### 3. **가이드 페이지** (`src/app/guide/page.tsx`)
```tsx
// 긴 콘텐츠 중간 (in-article 광고)
<GoogleAdBanner
  adSlot="가이드_기사내_광고"
  format="in-article"
  className="my-6"
/>
```

**예상 효과**: 월 $80-200 (가이드 조회 빈도에 따라)

---

#### 우선순위 2: 유틸리티 페이지

##### 4. **성장 기록 페이지** (`src/app/growth/page.tsx`)
```tsx
// 차트 하단
<GoogleAdBanner
  adSlot="성장기록_차트하단"
  className="mt-6"
/>
```

##### 5. **이유식 가이드** (`src/app/babyfood/page.tsx`)
```tsx
// 가이드 하단
<GoogleAdBanner
  adSlot="이유식_하단_배너"
  className="mt-4"
/>
```

##### 6. **예방접종 일정** (`src/app/vaccination/page.tsx`)
```tsx
// 일정표 하단
<GoogleAdBanner
  adSlot="예방접종_하단_배너"
  className="mt-4"
/>
```

**예상 효과 (3개 합산)**: 월 $100-250

---

#### 우선순위 3: 설정/보조 페이지

##### 7. **설정 페이지** (`src/app/settings/page.tsx`)
```tsx
// 설정 항목 하단
<GoogleAdBanner
  adSlot="설정_하단_배너"
  className="mt-6"
/>
```

##### 8. **더보기 페이지** (`src/app/more/page.tsx`)
```tsx
// 페이지 하단
<GoogleAdBanner
  adSlot="더보기_하단_배너"
  className="mt-4"
/>
```

**예상 효과 (2개 합산)**: 월 $50-100

---

### ❌ 광고를 배치하지 말아야 할 위치

1. **메인 홈 페이지** (`src/app/page.tsx`)
   - 이유: 첫 인상이 중요, 광고로 인한 이탈 방지
   - 대안: 사용자 정착 후 (7일+ 사용자)에게만 노출 고려

2. **온보딩 페이지** (`src/app/onboarding/page.tsx`)
   - 이유: 회원가입/설정 과정 방해 금지

3. **긴급 정보 페이지** (`src/app/emergency/page.tsx`)
   - 이유: 긴급 상황에서 광고는 부적절

4. **프라이버시/약관 페이지**
   - 이유: 법적/윤리적 문서는 순수하게 유지

---

## 📊 광고 성과 최적화 팁

### 1. **광고 배치 A/B 테스트**
```typescript
// 사용자 그룹을 나눠서 테스트
const userId = user?.id
const showAd = userId ? parseInt(userId.slice(-1), 16) % 2 === 0 : true

{showAd && <GoogleAdBanner adSlot="..." />}
```

### 2. **광고 로딩 지연 (Lazy Loading)**
```tsx
import dynamic from 'next/dynamic'

const GoogleAdBanner = dynamic(() => import('@/components/ads/GoogleAdBanner'), {
  ssr: false,
  loading: () => <div className="h-20 bg-gray-100 animate-pulse rounded" />
})
```

### 3. **광고 클릭률 추적**
```typescript
// Google Analytics 이벤트
gtag('event', 'ad_impression', {
  ad_slot: 'notifications_top_banner',
  page_path: '/notifications'
})
```

### 4. **사용자 세그먼트별 광고 전략**
```typescript
// 신규 사용자 (7일 이내): 광고 최소화
// 활성 사용자 (7-30일): 적절한 광고
// 충성 사용자 (30일+): 프리미엄 구독 유도 (광고 제거 옵션)

const daysSinceSignup = getDaysSinceSignup(user)
const showAds = daysSinceSignup >= 7
```

---

## 💰 예상 수익 계산

### 기본 가정
- **RPM (1,000 노출당 수익)**: $1.5-5 (육아 카테고리)
- **CTR (클릭률)**: 1-3%
- **페이지뷰/DAU**: 10-20회

### 시나리오별 예상

| DAU | 월 페이지뷰 | 광고 노출 | RPM | 월 예상 수익 (₩) |
|-----|------------|----------|-----|----------------|
| 1,000 | 300,000 | 150,000 | $3 | ₩585,000 |
| 5,000 | 1,500,000 | 750,000 | $3 | ₩2,925,000 |
| 10,000 | 3,000,000 | 1,500,000 | $3 | ₩5,850,000 |

*주의: 실제 수익은 광고 품질, 사용자 국가, 계절성 등에 따라 변동*

---

## 🚀 단계별 도입 전략

### Phase 1: 테스트 (1-2주)
1. ✅ 알림 페이지에만 광고 배치 (완료)
2. 데이터 수집 (노출수, CTR, RPM)
3. 사용자 피드백 수집

### Phase 2: 확장 (2-4주)
4. 커뮤니티, 소모임 페이지 추가
5. A/B 테스트 실시
6. 광고 배치 최적화

### Phase 3: 최적화 (1-2개월)
7. 가이드, 유틸리티 페이지 추가
8. 사용자 세그먼트별 전략 적용
9. 프리미엄 구독 옵션 도입 고려

---

## ⚠️ 주의사항

### 1. **사용자 경험 우선**
- 광고가 페이지 로딩을 5% 이상 느리게 하면 제거
- 사용자 이탈률 5% 이상 증가 시 광고 줄이기
- 부정적 피드백 수집 시 즉시 조정

### 2. **Google AdSense 정책 준수**
- 클릭 유도 금지 ("광고를 클릭해주세요" X)
- 광고와 콘텐츠 명확히 구분
- 페이지당 광고 수 제한 (최대 3-4개)

### 3. **성능 모니터링**
```typescript
// Core Web Vitals 추적
import { getCLS, getFID, getLCP } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getLCP(console.log)
```

---

## 📈 성공 지표 (KPI)

| 지표 | 목표 | 측정 방법 |
|------|------|---------|
| RPM | $3+ | Google AdSense 대시보드 |
| CTR | 1.5%+ | Google AdSense 대시보드 |
| 사용자 이탈률 | <5% 증가 | Google Analytics |
| 페이지 로딩 시간 | <3초 | Lighthouse, PageSpeed Insights |
| 광고 수익/크레딧 비용 | 2:1 이상 | 월간 재무 리포트 |

---

## 🛠️ 구현 체크리스트

- [x] GoogleAdBanner 컴포넌트 생성
- [x] 알림 페이지 상단 배너 광고
- [x] 알림 페이지 피드 내 광고
- [ ] Google AdSense 계정 승인 신청
- [ ] 광고 슬롯 ID 발급
- [ ] 환경 변수 설정 (프로덕션)
- [ ] layout.tsx에 AdSense 스크립트 추가
- [ ] 커뮤니티 페이지 광고 추가
- [ ] 소모임 페이지 광고 추가
- [ ] A/B 테스트 설정
- [ ] 성과 대시보드 구축

---

## 📞 다음 단계

1. **Google AdSense 신청**
   - https://www.google.com/adsense/start/
   - 도메인 소유 확인
   - 콘텐츠 정책 준수 확인

2. **광고 슬롯 생성**
   - AdSense 대시보드에서 각 위치별로 광고 단위 생성
   - 슬롯 ID를 위 코드의 `adSlot` prop에 입력

3. **성과 추적 설정**
   - Google Analytics 연동
   - 주간 리포트 자동화

---

**작성**: Claude Code Agent
**일시**: 2026-04-02
**버전**: v1.0
