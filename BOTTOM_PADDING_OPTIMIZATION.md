# 하단 여백 최적화 (pb-36 → pb-24)

## 문제점
1. **오늘 페이지들**: 하단 여백이 너무 넓음 (`pb-36` = 144px)
2. **기다림 페이지**: 여백이 없어서 GNB에 가려짐 (`pb-4` = 16px)
3. **일관성 부족**: 페이지마다 다른 패딩 값 사용

## 해결 방법
모든 메인 페이지의 하단 여백을 **`pb-24` (96px)**로 통일

## 최적 패딩 계산

### BottomNav 구조
```
┌─────────────────┐
│     콘텐츠       │
│                 │ ← pb-24 (96px)
├─────────────────┤ ← bottom-4 (16px)
│  [오늘][기록]   │ ← 62px (pill)
│                 │ ← safe-area (~34px)
└─────────────────┘
```

### 필요한 공간
- BottomNav 띄움: 16px (`bottom-4`)
- BottomNav 높이: 62px (pill)
- 여유 공간: 18px
- **총합**: 96px = `pb-24`

## 수정된 파일 및 변경 사항

### 1. 오늘 페이지들 (pb-36 → pb-24)
- `/src/app/page.tsx` (육아 중)
  - Before: `pb-36` (144px) - 너무 넓음 ❌
  - After: `pb-24` (96px) - 적절함 ✅

- `/src/app/pregnant/page.tsx` (임신 중)
  - Before: `pb-36` (144px) - 너무 넓음 ❌
  - After: `pb-24` (96px) - 적절함 ✅

- `/src/app/preparing/page.tsx` (임신 준비)
  - Before: `pb-36` (144px) - 너무 넓음 ❌
  - After: `pb-24` (96px) - 적절함 ✅

### 2. 기다림 페이지 (pb-4 → pb-24)
- `/src/app/waiting/page.tsx` (전체 모드)
  - Before: `pb-4` (16px) - GNB에 가려짐 ❌
  - After: `pb-24` (96px) - 적절함 ✅
  - **2곳 모두 수정** (replace_all: true)

### 3. 우리 페이지 (pb-36 → pb-24)
- `/src/app/more/page.tsx`
  - Before: `pb-36` (144px) - 너무 넓음 ❌
  - After: `pb-24` (96px) - 적절함 ✅

### 4. 동네 페이지 (pb-28 → pb-24)
- `/src/app/town/page.tsx` (MapTab)
  - Before: `pb-28` (112px) - 약간 넓음 ⚠️
  - After: `pb-24` (96px) - 적절함 ✅

- `/src/components/town/TownFeedTab.tsx`
  - Before: `pb-28` (112px) - 약간 넓음 ⚠️
  - After: `pb-24` (96px) - 적절함 ✅

- `/src/components/town/TownGatherTab.tsx`
  - Before: `pb-28` (112px) - 약간 넓음 ⚠️
  - After: `pb-24` (96px) - 적절함 ✅

### 5. 커뮤니티 페이지 (pb-28 → pb-24)
- `/src/app/community/page.tsx`
  - Before: `pb-28` (112px) - 약간 넓음 ⚠️
  - After: `pb-24` (96px) - 적절함 ✅

## 패딩 기준표

| 패딩 클래스 | 픽셀 값 | 용도 | 평가 |
|------------|--------|------|------|
| `pb-4` | 16px | ❌ 너무 좁음 | GNB에 가려짐 |
| `pb-20` | 80px | ⚠️ 약간 좁음 | 여유 부족 |
| **`pb-24`** | **96px** | ✅ **최적** | **권장 값** |
| `pb-28` | 112px | ⚠️ 약간 넓음 | 불필요한 공간 |
| `pb-32` | 128px | ❌ 넓음 | 낭비 |
| `pb-36` | 144px | ❌ 너무 넓음 | 심각한 낭비 |

## 예외 페이지 (pb-28 유지)

다음 페이지들은 서브 페이지이므로 `pb-28` 유지:
- `/src/app/guide/page.tsx`
- `/src/app/gov-support/page.tsx`
- `/src/app/kidsnote/page.tsx`
- `/src/app/settings/**/*.tsx`
- `/src/app/babyfood/page.tsx`
- `/src/app/allergy/page.tsx`
- `/src/app/notifications/page.tsx`
- `/src/app/feedback/page.tsx`

이유: 서브 페이지는 약간 넓은 여백이 답답하지 않음

## 시각적 비교

### Before (문제)
```
┌─────────────────┐
│ 콘텐츠          │
│                 │
│                 │ ← pb-36 (144px)
│                 │ ← 너무 넓음!
│                 │
│                 │
├─────────────────┤
│  [오늘][기록]   │
└─────────────────┘
```

### After (해결)
```
┌─────────────────┐
│ 콘텐츠          │
│                 │
│                 │ ← pb-24 (96px)
│                 │ ← 적절함!
├─────────────────┤
│  [오늘][기록]   │
└─────────────────┘
```

## 기대 효과

1. **공간 효율성**: 불필요한 여백 48px 감소
2. **일관성**: 모든 메인 페이지 동일한 패딩
3. **가독성**: 콘텐츠가 GNB에 가려지지 않음
4. **사용성**: 스크롤 범위 최적화

## 테스트 체크리스트
- [x] 빌드 성공
- [ ] 오늘 페이지 (육아/임신/준비) 하단 여백 적절한지 확인
- [ ] 기다림 페이지 콘텐츠가 GNB에 안 가려지는지 확인
- [ ] 우리 페이지 하단 여백 확인
- [ ] 동네 페이지 (지도/이야기/소모임) 하단 여백 확인
- [ ] 커뮤니티 페이지 하단 여백 확인
- [ ] 모든 페이지에서 BottomNav와 적절한 간격 유지 확인
