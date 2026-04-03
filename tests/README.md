# Playwright E2E Tests

이 디렉토리는 도담 플랫폼의 End-to-End 테스트를 포함합니다.

## 📁 구조

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
├── .auth/                # 인증 상태 저장 (gitignore)
├── auth.spec.ts          # 인증 플로우 테스트
├── parenting.spec.ts     # 육아 모드 테스트
├── pregnancy.spec.ts     # 임신/준비 모드 테스트
├── accessibility.spec.ts # 접근성 테스트
└── global.setup.ts       # 전역 설정
```

## 🚀 빠른 시작

```bash
# Playwright 브라우저 설치 (최초 1회)
npx playwright install --with-deps

# 모든 테스트 실행
npm run test:e2e

# UI 모드로 실행 (권장 - 디버깅 쉬움)
npm run test:e2e:ui

# 특정 테스트만 실행
npx playwright test auth.spec.ts

# 특정 브라우저에서만 실행
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project="Mobile Chrome"
```

## 📝 테스트 작성

### 기본 템플릿

```typescript
import { test, expect } from './fixtures/auth.fixture'

test.describe('Feature Name', () => {
  test('should do something', async ({ homePage, page }) => {
    await homePage.goto()

    // DOM 기반 검증 (스크린샷 금지!)
    await expect(homePage.aiCareCard).toBeVisible()

    // 이벤트 트리거
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dodam-record', {
        detail: { type: 'feed', amount_ml: 120 }
      }))
    })

    // Toast 확인
    await expect(page.getByRole('alert')).toContainText(/분유/)
  })
})
```

### 선택자 우선순위

```typescript
// 1. Role (최우선 - 접근성)
page.getByRole('button', { name: '저장' })

// 2. Label (Form inputs)
page.getByLabel('이름')

// 3. Test ID (비의미론적 요소)
page.getByTestId('user-avatar')

// 4. Text (정적 콘텐츠)
page.getByText('오늘 기록')

// 5. CSS selector (최후의 수단)
page.locator('[data-testid="fab"]')
```

### Page Object 사용

```typescript
// 새 locator 추가
export class HomePage extends BasePage {
  readonly myNewButton: Locator

  constructor(page: Page) {
    super(page)
    this.myNewButton = page.getByRole('button', { name: /새 버튼/ })
  }

  async clickMyNewButton() {
    await this.myNewButton.click()
    await this.waitForToast()
  }
}
```

## 🔐 인증 설정

### 로컬 개발

`.env.test.local` 파일 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
TEST_USER_EMAIL=test@dodam.local
TEST_USER_PASSWORD=TestPassword123!
```

### CI/CD

GitHub Secrets에 추가:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

## 🐛 디버깅

### Trace Viewer

실패한 테스트의 trace 보기:

```bash
npx playwright show-trace test-results/path-to-trace.zip
```

### 스크린샷 & 비디오

실패 시 자동 저장됨:
- `test-results/**/*.png`
- `test-results/**/*.webm`

### UI 모드 (추천!)

```bash
npm run test:e2e:ui
```

브라우저에서 테스트를 실행하고 각 단계를 시각적으로 확인 가능.

### 디버그 모드

```bash
npm run test:e2e:debug
```

브레이크포인트 설정하고 단계별 실행 가능.

## ✅ 체크리스트

새 기능 추가 시:

- [ ] Page Object에 locator/method 추가
- [ ] 핵심 플로우 테스트 작성
- [ ] 접근성 테스트 (새 페이지인 경우)
- [ ] 키보드 내비게이션 테스트
- [ ] 에러 상태 테스트
- [ ] 모바일 반응형 확인

## 🚨 안티패턴

### ❌ 피해야 할 것들

```typescript
// 1. waitForTimeout
await page.waitForTimeout(1000)  // ❌
await expect(locator).toBeVisible()  // ✅

// 2. CSS class selector
page.locator('.btn-primary')  // ❌
page.getByRole('button')  // ✅

// 3. 스크린샷 검증
await expect(page).toHaveScreenshot()  // ❌
await expect(element).toBeVisible()  // ✅

// 4. XPath
page.locator('//div[@class="card"]')  // ❌
page.getByTestId('card')  // ✅
```

## 📊 리포트

### HTML Report

```bash
npm run test:e2e:report
```

### GitHub Actions

Actions 탭에서 아티팩트 다운로드:
- `playwright-report-*`
- `merged-playwright-report` (통합)

## 📚 더 알아보기

- [E2E Testing Guide](../docs/e2e-testing-guide.md)
- [E2E Test Report](../docs/e2e-report.md)
- [Playwright Docs](https://playwright.dev)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)

---

**문의**: 테스트 관련 질문은 GitHub Issues에 남겨주세요.
