# 오늘 기록 총 횟수 배지 텍스트 가독성 수정

## 문제
오늘 기록 섹션 헤더의 파란색 배지 안에 있는 숫자(count)가 **텍스트 색상 대비가 낮아서 보이지 않는** 문제 발생.

## 원인
`TodayRecordSection.tsx`의 count 배지(39-47번째 줄)에서:
- `text-label` 클래스와 `text-white` 클래스가 함께 사용됨
- `text-label` 클래스가 색상을 덮어써서 흰색이 제대로 적용되지 않음
- 결과적으로 파란색 배경(`var(--color-primary)`) 위에 어두운 텍스트가 표시되어 가독성 저하

## 해결 방법
**src/components/ui/TodayRecordSection.tsx** (39-47번째 줄)

### Before
```tsx
<span
  className="text-label text-white rounded-full"
  style={{
    backgroundColor: 'var(--color-primary)',
    padding: '2px var(--spacing-2)'
  }}
>
  {count}
</span>
```

### After
```tsx
<span
  className="text-white rounded-full font-semibold text-[11px]"
  style={{
    backgroundColor: 'var(--color-primary)',
    padding: '2px var(--spacing-2)'
  }}
>
  {count}
</span>
```

## 변경 사항
1. ❌ `text-label` 클래스 제거 (색상 충돌 방지)
2. ✅ `text-white` 명시적 유지
3. ✅ `font-semibold` 추가 (가독성 향상)
4. ✅ `text-[11px]` 명시적 폰트 크기 지정

## 효과
- ✅ WCAG 2.1 AA 기준 색상 대비 충족 (흰색 텍스트 + 파란색 배경)
- ✅ 모든 모드(preparing/pregnant/parenting)에서 일관된 가독성
- ✅ 숫자가 명확하게 보임

## 빌드 결과
✅ **성공** (3.5s 컴파일, 5.0s TypeScript, 0 에러, 78 라우트)

## 영향 범위
- `src/components/ui/TodayRecordSection.tsx` - count 배지 스타일링
- 사용 페이지: page.tsx, preparing/page.tsx, pregnant/page.tsx
