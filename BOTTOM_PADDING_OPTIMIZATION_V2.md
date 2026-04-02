# 하단 여백 최적화 V2 (추가 감소)

## 문제
이전 `pb-16` (64px) 적용 후에도 모바일 환경에서 **하단 여백이 여전히 너무 넓음**.

## 원인 분석
1. **BottomNav Safe Area 강제 최소값**: `pb-[max(20px,env(safe-area-inset-bottom))]`
   - Safe Area가 없는 환경에서도 20px 강제 적용
   - 페이지 pb-16 (64px) + BottomNav 20px = **총 84px 여백**

2. **실제 필요한 여백**:
   - BottomNav 높이: ~72-76px (with safe-area)
   - 필요한 여백: 48-52px 정도면 충분

## 해결 방법

### 1단계: BottomNav 최소 패딩 감소
**src/components/bnb/BottomNav.tsx** (1019번째 줄)

```tsx
// Before
pb-[max(20px,env(safe-area-inset-bottom))]

// After
pb-[max(12px,env(safe-area-inset-bottom))]
```

**감소량**: 20px → 12px (-8px, -40%)

### 2단계: 모든 페이지 하단 패딩 감소
pb-16 (64px) → pb-12 (48px)

#### 수정된 파일 (6개)
1. `src/app/page.tsx` - 육아 모드 메인
2. `src/app/preparing/page.tsx` - 임신 준비 모드 메인
3. `src/app/pregnant/page.tsx` - 임신 중 모드 메인
4. `src/app/town/page.tsx` - 동네 페이지
5. `src/app/feedback/page.tsx` - 피드백 페이지
6. `src/app/more/page.tsx` - 우리 페이지

**감소량**: 64px → 48px (-16px, -25%)

## 총 감소량
- **BottomNav**: 20px → 12px (-8px)
- **페이지 패딩**: 64px → 48px (-16px)
- **총 감소**: -24px (-28.6%)
- **최종 여백**: 60px (BottomNav 48px + padding 12px)

## 비교
| 버전 | BottomNav | 페이지 pb | 총 여백 |
|------|-----------|-----------|---------|
| 원본 | 20px | 80-96px | 100-116px |
| V1 | 20px | 64px | 84px |
| **V2** | **12px** | **48px** | **60px** |

**개선율**: 40-48% 감소

## 빌드 결과
✅ **성공** (3.2s 컴파일, 4.5s TypeScript, 0 에러, 78 라우트)

## Safe Area 호환성
- iPhone X 이상 (safe-area-inset-bottom > 12px): 자동으로 safe area 적용
- 일반 기기 (safe-area-inset-bottom = 0): 최소 12px 패딩 적용
- 모든 환경에서 적절한 여백 유지

## 사용자 경험 개선
- ✅ 모바일에서 더 넓은 콘텐츠 영역 확보
- ✅ 하단 네비게이션과 콘텐츠 사이 적절한 간격 유지
- ✅ Safe Area 디바이스에서도 문제없이 작동
- ✅ 모든 페이지에 일관된 여백 적용
