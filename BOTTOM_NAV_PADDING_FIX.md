# GNB(Global Navigation Bar) 하단 여백 수정

## 문제점
GNB(BottomNav)가 최하단에 딱 붙어서 페이지 하단 콘텐츠와 겹치는 문제 발생.

## 원인
많은 페이지들이 하단 패딩을 `pb-4` (1rem, 16px) 또는 `pb-12` (3rem, 48px)만 사용하고 있어서, GNB 높이(약 80px + safe-area-inset)를 고려하지 못함.

## 해결 방법
모든 메인 페이지 컨테이너의 하단 패딩을 `pb-28` (7rem, 112px)로 통일.

## 수정된 파일들

### 1. 메인 모드 페이지 (이미 적용됨)
- ✅ `/src/app/page.tsx` - 육아 중 모드 (pb-28)
- ✅ `/src/app/pregnant/page.tsx` - 임신 중 모드 (pb-28)
- ✅ `/src/app/preparing/page.tsx` - 임신 준비 모드 (pb-28)
- ✅ `/src/app/more/page.tsx` - 더보기 (pb-28)

### 2. 커뮤니티 & 동네 관련 페이지
- `/src/app/community/page.tsx` - pb-4 → **pb-28**
- `/src/app/town/page.tsx` (MapTab) - pb-4 → **pb-28**
- `/src/components/town/TownFeedTab.tsx` - pb-4 → **pb-28**
- `/src/components/town/TownGatherTab.tsx` - pb-4 → **pb-28**

### 3. 기능 페이지
- `/src/app/allergy/page.tsx` - pb-4 → **pb-28**
- `/src/app/notifications/page.tsx` - pb-12 → **pb-28**
- `/src/app/feedback/page.tsx` - pb-0 → **pb-28**
- `/src/app/guide/page.tsx` - pb-4 → **pb-28**
- `/src/app/gov-support/page.tsx` - pb-4 → **pb-28**
- `/src/app/kidsnote/page.tsx` - pb-4 → **pb-28**
- `/src/app/babyfood/page.tsx` - pb-4 → **pb-28**

### 4. 설정 페이지
- `/src/app/settings/page.tsx` - pb-6 → **pb-28**
- `/src/app/settings/caregivers/page.tsx` - pb-4 → **pb-28**
- `/src/app/settings/children/[childId]/page.tsx` - pb-4 → **pb-28**

## 기술 세부사항

### BottomNav 구조
```tsx
<nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[65] pt-3 pr-5 pb-[env(safe-area-inset-bottom)] pl-5">
```

- `fixed bottom-0`: 화면 하단 고정
- `pb-[env(safe-area-inset-bottom)]`: iOS Safe Area 대응
- 실제 높이: 약 80px + safe-area-inset (iPhone 하단 notch 영역)

### 권장 하단 패딩
```
pb-28 = 7rem = 112px
```

이 값은:
- GNB 높이 (~80px)
- Safe area inset (~34px on iPhone)
- 추가 여백 (~10-20px)

을 고려한 충분한 공간을 확보합니다.

## 예외 케이스

다음 페이지들은 수정하지 않았습니다:
- `/src/app/prep-diary/page.tsx` - 전체 화면 스크롤 구조로 별도 처리됨
- `/src/app/prep-records/[date]/page.tsx` - 전체 화면 스크롤 구조
- `/src/app/landing/page.tsx` - 랜딩 페이지는 GNB 없음
- `TownMarketTab` - CommunityPageInner를 사용하므로 community/page.tsx 수정으로 해결

## 테스트 체크리스트
- [x] 빌드 성공
- [ ] 육아 중 모드: 오늘 페이지 하단 여백 확인
- [ ] 임신 중 모드: 오늘 페이지 하단 여백 확인
- [ ] 임신 준비 모드: 오늘 페이지 하단 여백 확인
- [ ] 동네 탭: 지도/이야기/소모임/장터 모두 확인
- [ ] 커뮤니티: 이야기/장터 탭 확인
- [ ] 알림, 알레르기, 가이드 등 모든 기능 페이지 확인
- [ ] 설정 페이지들 확인
- [ ] iOS Safari에서 Safe Area 정상 작동 확인

## 기대 효과
1. **콘텐츠 가독성 향상**: 하단 콘텐츠가 GNB에 가려지지 않음
2. **일관된 UX**: 모든 페이지에서 동일한 하단 여백 제공
3. **모바일 최적화**: iOS Safe Area를 고려한 적절한 공간 확보
