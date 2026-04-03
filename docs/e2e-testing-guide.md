# E2E Testing Guide

이 문서는 도담 플랫폼의 End-to-End 테스트 전략과 실행 방법을 설명합니다.

## 📋 개요

Playwright 기반 E2E 테스트로 다음을 검증합니다:

- ✅ 사용자 인증 플로우 (OAuth, 모드 선택)
- ✅ 육아 모드 핵심 기능 (기록, AI 케어, 오프라인 모드)
- ✅ 임신/준비 모드 기능 (주차 계산, 태동 기록, 영양제 추적)
- ✅ WCAG 2.1 AA 접근성 준수
- ✅ 키보드 내비게이션 및 스크린 리더 호환성

## 🏗️ 테스트 구조

```
tests/
├── page-objects/          # Page Object Model
│   ├── BasePage.ts       # 공통 메서드
│   ├── OnboardingPage.ts # 로그인 & 모드 선택
│   ├── HomePage.ts       # 육아 모드 홈
│   ├── PregnantPage.ts   # 임신 모드 홈
│   └── SettingsPage.ts   # 설정
├── fixtures/
│   └── auth.fixture.ts   # 인증 픽스처
├── auth.spec.ts          # 인증 플로우 테스트
├── parenting.spec.ts     # 육아 모드 테스트
├── pregnancy.spec.ts     # 임신/준비 모드 테스트
├── accessibility.spec.ts # 접근성 테스트
└── global.setup.ts       # 전역 설정 (인증 세션 생성)
```

## 🚀 테스트 실행

### 로컬 실행

```bash
# 모든 테스트 실행
npm run test:e2e

# 특정 브라우저에서 실행
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project="Mobile Chrome"

# 특정 테스트 파일 실행
npx playwright test parenting.spec.ts

# UI 모드 (디버깅)
npx playwright test --ui

# 디버그 모드
npx playwright test --debug
```

### CI/CD 실행

GitHub Actions가 자동으로 실행합니다:
- Push/PR 시 자동 실행
- Chrome, Firefox, Mobile Chrome 병렬 테스트
- 접근성 테스트 별도 실행
- 테스트 리포트 아티팩트 업로드

## 🔐 인증 설정

### 환경 변수

테스트 실행 전 다음 환경 변수를 설정하세요:

```bash
# .env.test.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # CI only
TEST_USER_EMAIL=test@dodam.local
TEST_USER_PASSWORD=TestPassword123!
```

### CI Secrets

GitHub Repository Settings → Secrets에 다음을 추가:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

## 📝 테스트 작성 가이드

### Page Object 사용

```typescript
import { test, expect } from './fixtures/auth.fixture'

test('should record feeding event', async ({ homePage, page }) => {
  await homePage.goto()

  // Page Object 메서드 사용
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('dodam-record', {
      detail: { type: 'feed', amount_ml: 120 }
    }))
  })

  await expect(page.getByRole('alert')).toContainText(/분유.*120ml/)
})
```

### DOM 기반 검증 (중요!)

```typescript
// ✅ GOOD - DOM 기반 검증
await expect(page.getByRole('button', { name: '확인' })).toBeVisible()
await expect(page.getByText(/AI 케어/)).toBeVisible()

// ❌ BAD - 스크린샷 사용 금지
await expect(page).toHaveScreenshot()
```

### 선택자 우선순위

```typescript
// 1. 의미론적 role (최우선)
page.getByRole('button', { name: '저장' })
page.getByRole('link', { name: '예방접종' })

// 2. Label (form inputs)
page.getByLabel('이름')
page.getByLabel('생년월일')

// 3. Test ID (비의미론적 요소)
page.getByTestId('user-avatar')

// 4. Text (정적 콘텐츠)
page.getByText('오늘 기록')

// 5. CSS selector (최후의 수단)
page.locator('[data-testid="fab"]')
```

### 접근성 테스트

```typescript
import AxeBuilder from '@axe-core/playwright'

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/home')

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})
```

## 🎯 테스트 커버리지

### 핵심 사용자 플로우

#### 육아 모드
- [x] 수유/수면/배변 기록
- [x] 체온 기록 및 발열 알림
- [x] AI 케어 분석 요청
- [x] 카카오톡 공유
- [x] 오프라인 모드 및 동기화
- [x] 예방접종 일정
- [x] 성장 기록

#### 임신 모드
- [x] 주차 및 D-day 계산
- [x] 태아 발달 정보
- [x] 태동/기분/영양제 기록
- [x] 검진 일정

#### 임신 준비 모드
- [x] 배란일 추적
- [x] 건강 기록 (영양제, 운동)

### 접근성
- [x] WCAG 2.1 AA 준수 (axe-core)
- [x] 키보드 내비게이션
- [x] 포커스 트랩 (모달)
- [x] ARIA 레이블
- [x] 색상 대비

## 🐛 디버깅

### Trace Viewer

테스트 실패 시 자동으로 trace 저장:

```bash
npx playwright show-trace test-results/path-to-trace.zip
```

### 스크린샷

실패 시 자동 스크린샷 저장:
```
test-results/
  parenting-should-record-feeding-chromium/
    test-failed-1.png
```

### Video

실패 시 자동 비디오 저장:
```
test-results/
  parenting-should-record-feeding-chromium/
    video.webm
```

## 📊 리포트

### HTML Report

```bash
npx playwright show-report
```

### GitHub Actions

Actions 탭에서 아티팩트 다운로드:
- `playwright-report-chromium`
- `playwright-report-firefox`
- `playwright-report-mobile`
- `accessibility-report`
- `merged-playwright-report` (통합 리포트)

## 🔧 설정

### playwright.config.ts

주요 설정:
- **baseURL**: http://localhost:3000
- **retries**: CI에서 2회 재시도
- **workers**: 로컬에서는 병렬, CI에서는 순차
- **storageState**: 인증 상태 재사용 (tests/.auth/user.json)

### Browser Matrix

- Desktop Chrome
- Desktop Firefox
- Mobile Chrome (Pixel 5)

## 🚨 안티패턴

### ❌ 피해야 할 패턴

```typescript
// 1. waitForTimeout 사용
await page.waitForTimeout(1000)  // ❌
await expect(locator).toBeVisible()  // ✅

// 2. CSS class selector
page.locator('.btn-primary')  // ❌
page.getByRole('button', { name: '확인' })  // ✅

// 3. 스크린샷 검증
await expect(page).toHaveScreenshot()  // ❌
await expect(element).toBeVisible()  // ✅

// 4. XPath
page.locator('//div[@class="card"]')  // ❌
page.getByTestId('card')  // ✅
```

## 📚 참고 자료

- [Playwright 공식 문서](https://playwright.dev)
- [axe-core Accessibility Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## ✅ Checklist

새 기능 추가 시:

- [ ] Page Object에 새 locator/method 추가
- [ ] 핵심 플로우 테스트 작성
- [ ] 접근성 테스트 추가 (새 페이지인 경우)
- [ ] 키보드 내비게이션 테스트
- [ ] 에러 상태 테스트
- [ ] 모바일 반응형 테스트

---

**Note**: 실제 OAuth 플로우는 테스트 환경에서 mock 처리됩니다. 프로덕션 환경에서는 실제 Kakao/Google OAuth를 사용합니다.
