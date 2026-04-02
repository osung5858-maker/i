# 임신 중 모드 AI 섹션 UI 개선

## 변경 사항

### 문제
임신 중 모드의 AI 섹션이 다른 두 모드(임신 준비, 육아 중)와 스타일이 달랐습니다:
- 태아 정보와 오늘 스탯이 함께 섞여 있어 가독성이 떨어짐
- 레이아웃 간격이 일관되지 않음

### 해결
임신 중 모드의 AI 섹션을 다른 모드들과 동일한 구조로 재정리했습니다.

## 수정 내역 (`/src/app/pregnant/page.tsx`)

### Before (464-505 라인)
```tsx
{/* 헤더 */}
<div className="flex items-center justify-between mb-2">
  ...
</div>

{/* 태아 정보 + 오늘 스탯 */}
<div className="flex items-center mb-3 gap-3">
  <div className="shrink-0">
    <BabyIllust week={currentWeek} size={80} />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-[14px] font-bold leading-tight mb-1">...</p>
    <p className="text-[13px] text-[#9E9A95] mb-2">...</p>

    {/* 오늘 스탯 — 태아 정보 안에 포함되어 있음 */}
    <div className="flex gap-2">
      {[기분, 태동, 체중].map(s => (
        <div key={s.label} className="flex-1 bg-white/80 rounded-lg py-2 text-center border border-white shadow-sm">
          <p className="text-[14px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[13px] text-[#9E9A95]">{s.label}</p>
        </div>
      ))}
    </div>
  </div>
</div>
```

### After
```tsx
{/* 헤더 */}
<div className="flex items-center justify-between mb-3">
  ...
</div>

{/* 태아 일러스트 + 주차 정보 */}
<div className="flex items-center mb-3 gap-3">
  <div className="shrink-0">
    <BabyIllust week={currentWeek} size={80} />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-[14px] font-bold leading-tight mb-1">...</p>
    <p className="text-[13px] text-[#9E9A95]">...</p>
  </div>
</div>

{/* 오늘 스탯 — 독립된 섹션으로 분리 */}
<div className="flex gap-2 mb-3">
  {[기분, 태동, 체중].map(s => (
    <div key={s.label} className="flex-1 bg-white/80 rounded-lg text-center border border-white shadow-sm py-2">
      <p className="text-[14px] font-bold text-[var(--color-primary)]">{s.value}</p>
      <p className="text-[13px] text-[#9E9A95]">{s.label}</p>
    </div>
  ))}
</div>
```

## 개선 사항

### 1. **구조 개선**
   - 태아 정보와 오늘 스탯을 독립된 섹션으로 분리
   - 정보 계층 구조가 명확해짐

### 2. **간격 통일**
   - 헤더 하단 여백: `mb-2` → `mb-3` (다른 모드와 동일)
   - 모든 섹션 간격이 `mb-3`으로 통일

### 3. **스타일 통일**
   - 오늘 스탯 카드의 값 색상을 `style={{ color: s.color }}` → `text-[var(--color-primary)]`로 통일
   - 다른 모드들과 동일한 테마 색상 사용

### 4. **코드 간소화**
   - `leading-tight` 제거 (태아 정보의 값에서만 유지)
   - 불필요한 `mb-2` 제거

## 기대 효과

1. **일관성**: 세 모드(임신 준비, 임신 중, 육아 중)의 AI 섹션 스타일 완전 통일
2. **가독성**: 정보 블록이 명확히 구분되어 한눈에 파악 가능
3. **유지보수성**: 동일한 구조로 향후 수정/확장 용이

## 테스트 체크리스트
- [x] 빌드 성공
- [ ] 임신 중 모드에서 "AI 데일리 케어" 헤더 표시 확인
- [ ] 태아 일러스트와 주차 정보 정상 표시
- [ ] 오늘 스탯(기분/태동/체중) 카드 3개 정상 표시
- [ ] 카드 색상이 테마 색상과 일치하는지 확인
- [ ] 다른 모드들과 레이아웃이 동일한지 비교
