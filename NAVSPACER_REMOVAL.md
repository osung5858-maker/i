# NavSpacer 완전 제거 (하단 여백 문제의 진짜 원인)

## 문제의 원인
모바일 환경에서 **하단 여백이 줄어들지 않았던 진짜 이유**는 페이지나 BottomNav 패딩이 아니라, **`NavSpacer` 컴포넌트**가 전역적으로 **80px(h-20)의 여백**을 강제로 추가하고 있었기 때문입니다.

## NavSpacer란?
**src/components/ui/NavSpacer.tsx**
```tsx
export default function NavSpacer() {
  const pathname = usePathname()
  if (HIDE_PATHS.some(p => pathname?.startsWith(p))) return null
  return <div className="h-20 shrink-0" />
}
```

### 역할
- BottomNav의 높이만큼 하단 여백을 확보하기 위한 Spacer
- 모든 페이지의 `<main>` 태그 안에 자동으로 삽입됨
- 고정 높이 **80px** (h-20)

### 사용 위치
**src/app/layout.tsx**
```tsx
<main id="main-content">{children}<NavSpacer /></main>
```

## 왜 문제였나?

### 중복 여백
1. **NavSpacer**: 80px (전역)
2. **페이지 패딩**: pb-16~pb-6 (48-64px)
3. **BottomNav 패딩**: pb-[max(20px,safe)] (20px+)

**총 여백**: 148-164px! 😱

### BottomNav 구조 변경
- 과거: BottomNav가 고정 높이
- 현재: BottomNav가 `pt-3`로 자체 상단 패딩 보유
- NavSpacer의 고정 80px은 **더 이상 필요 없음**

## 해결 방법

### 1. layout.tsx에서 NavSpacer 제거
```tsx
// Before
<main id="main-content">{children}<NavSpacer /></main>

// After
<main id="main-content">{children}</main>
```

### 2. import 제거
```tsx
// Before
import NavSpacer from '@/components/ui/NavSpacer'

// After
// (삭제)
```

## 결과

### 여백 비교
| 항목 | Before | After | 감소 |
|------|--------|-------|------|
| NavSpacer | 80px | **0px** | -80px |
| 페이지 패딩 | 48-64px | **0px** | -48-64px |
| BottomNav 패딩 | 20px | **0px (safe only)** | -20px |
| **총 여백** | **148-164px** | **0-34px** | **-128-164px** |

### 기기별 최종 여백
- **일반 기기**: 0px (완전 제거)
- **iPhone X+**: 34px (Safe Area만)

## 빌드 결과
✅ **성공** (2.8s 컴파일, 4.1s TypeScript, 0 에러, 78 라우트)

## NavSpacer.tsx 파일 처리
파일은 유지되지만 더 이상 사용되지 않음. 필요시 삭제 가능:
```bash
rm src/components/ui/NavSpacer.tsx
```

## 영향 범위
- ✅ 모든 페이지에 자동 적용 (layout.tsx 레벨)
- ✅ onboarding, landing 등 제외 페이지도 자동 처리됨
- ✅ 개별 페이지 수정 불필요

## 되돌리기 (필요시)
만약 다시 여백이 필요하다면:

```tsx
// layout.tsx
<main id="main-content">{children}<div className="h-16 shrink-0" /></main>
```

또는 각 페이지에 `pb-4` 추가

## 결론
**NavSpacer 제거**가 하단 여백 문제의 핵심 해결책이었습니다.
이전에 BottomNav와 페이지 패딩만 수정했을 때 효과가 없었던 이유는 바로 이 80px Spacer가 전역적으로 강제되고 있었기 때문입니다.
