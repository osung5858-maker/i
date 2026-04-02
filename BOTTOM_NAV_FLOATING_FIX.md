# BottomNav 플로팅 스타일 적용

## 문제점
이미지에서 보이는 것처럼 하단 내비게이션 바(GNB)가 화면 **최하단에 완전히 딱 붙어있어서** 콘텐츠와 간격이 없고 답답한 느낌을 줌.

## 해결 방법
BottomNav를 화면 하단에서 **16px(1rem) 띄워서** 플로팅 느낌 제공

## 수정 내용

### Before
```tsx
<nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[65] pt-3 pr-5 pb-[env(safe-area-inset-bottom)] pl-5">
```

### After
```tsx
<nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[65] px-5 pb-[env(safe-area-inset-bottom)]">
```

## 주요 변경사항

1. **`bottom-0` → `bottom-4`**
   - 화면 하단에서 16px 띄움
   - 플로팅 디자인 효과

2. **`pt-3 pr-5 pl-5` → `px-5`**
   - 상단 패딩 제거 (불필요)
   - 좌우 패딩만 유지

3. **`pb-[env(safe-area-inset-bottom)]` 유지**
   - iOS Safe Area 대응 유지

## 시각적 효과

### Before (문제)
```
┌─────────────────┐
│ 콘텐츠 영역      │
│ "기다림 페이지에서│ ← 콘텐츠
│  확인하세요"     │
├─────────────────┤ ← 간격 없음 (딱 붙음)
│ [오늘][기록][우리]│ ← GNB
└─────────────────┘
```

### After (해결)
```
┌─────────────────┐
│ 콘텐츠 영역      │
│ "기다림 페이지에서│ ← 콘텐츠
│  확인하세요"     │
│                 │ ← 16px 간격
│ ┌─────────────┐ │
│ │[오늘][기록][우]││ ← GNB (플로팅)
│ └─────────────┘ │
└─────────────────┘
```

## 추가 고려사항

### 페이지 하단 패딩과의 관계
- 페이지 콘텐츠: `pb-28` (112px)
- BottomNav 위치: `bottom-4` (16px)
- BottomNav 높이: ~62px (pill) + safe-area

**총 여백**: 16px (bottom) + 62px (nav) + 34px (safe-area) ≈ 112px
→ `pb-28`과 정확히 매칭됨 ✅

### 중앙 FAB 버튼
```tsx
className="absolute -top-14"
```
- BottomNav 위로 56px 돌출
- `bottom-4`와 함께 작동하여 적절한 위치 유지

## 기대 효과

1. **플로팅 디자인**: 모던하고 세련된 UI
2. **콘텐츠 가독성**: 하단 콘텐츠와 명확한 구분
3. **시각적 여유**: 답답하지 않은 레이아웃
4. **일관된 간격**: 좌우 여백(20px)과 조화로운 하단 여백(16px)

## 테스트 체크리스트
- [x] 빌드 성공
- [ ] BottomNav가 하단에서 16px 띄워져 있는지 확인
- [ ] 콘텐츠와 BottomNav 사이 적절한 간격 확인
- [ ] 중앙 FAB 버튼 위치 정상 확인
- [ ] iOS Safe Area 정상 작동 확인
- [ ] 모든 탭에서 레이아웃 정상 확인
