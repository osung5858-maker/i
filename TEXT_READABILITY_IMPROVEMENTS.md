# 텍스트 가독성 전체 개선 작업

## 문제 분석

사용자 제보: 민트 테마 적용 시 특정 버튼들의 텍스트가 거의 안 보임
- 원인: 중간 톤 primary 색상 배경 + 어두운 텍스트
- 민트 테마 primary: `#4DB8AC` (밝은 청록색)
- 문제: 이 배경에 `#1A1918`, `#6B6966` 등의 어두운 텍스트 사용 시 명도 대비 부족

## WCAG 명도 대비 기준

- **Level AA (권장)**: 일반 텍스트 4.5:1, 큰 텍스트 3:1
- **Level AAA (이상적)**: 일반 텍스트 7:1, 큰 텍스트 4.5:1

## 개선 전략

### 1단계: 하드코딩 색상 → CSS 변수 전환

**현재 문제:**
```tsx
className="text-[#1A1918]"  // 하드코딩
className="text-[#6B6966]"  // 하드코딩
className="text-[#9E9A95]"  // 하드코딩
```

**개선:**
```tsx
className="text-primary"     // var(--color-text-primary)
className="text-secondary"   // var(--color-text-secondary)
className="text-tertiary"    // var(--color-text-tertiary)
```

### 2단계: Primary 배경 강제 규칙

**모든 `bg-[var(--color-primary)]`는 `text-white` 사용**

```tsx
// ❌ 잘못됨
<button className="bg-[var(--color-primary)] text-[#1A1918]">

// ✅ 올바름
<button className="bg-[var(--color-primary)] text-white">
```

### 3단계: 주요 하드코딩 패턴 교체 맵

| 하드코딩 | CSS 변수 | 설명 |
|---------|---------|------|
| `text-[#1A1918]` | `text-primary` | 주요 텍스트 |
| `text-[#0A0B0D]` | `text-primary` | 주요 텍스트 (약간 더 어두움) |
| `text-[#212124]` | `text-primary` | 주요 텍스트 |
| `text-[#6B6966]` | `text-secondary` | 보조 텍스트 |
| `text-[#9B9B9B]` | `text-tertiary` | 연한 텍스트 |
| `text-[#9E9A95]` | `text-tertiary` | 연한 텍스트 |
| `text-[#C4C0BB]` | `text-muted` | 매우 연한 텍스트 |
| `text-[#D5D0CA]` | `text-muted` | 매우 연한 텍스트 |

### 4단계: Semantic 색상 유지

다음 색상들은 의미론적 색상이므로 유지:

- `text-[#D05050]` → `text-[var(--color-danger)]` (빨강, 위험)
- `text-[#4CAF50]` → `text-[var(--color-success)]` (초록, 성공)
- `text-[#2E7D32]` → `text-green-700` (진한 초록)
- `text-[#D08068]` → 생리 관련 색상 (유지)
- `text-[var(--color-primary)]` → 테마 primary (유지)

## 검증 방법

1. 모든 primary 배경 버튼이 흰색 텍스트 사용하는지 확인
2. 중간 톤 배경에는 어두운 텍스트, 어두운 배경에는 밝은 텍스트 사용
3. 대비비 확인: https://webaim.org/resources/contrastchecker/

## 작업 대상 파일

총 510개의 하드코딩 색상 사용 위치 발견
우선순위 높은 파일부터 개선

## 완료된 작업

### 1단계: 하드코딩 색상 → CSS 변수 일괄 전환

✅ **`text-[#0A0B0D]` → `text-primary`**
- 가장 어두운 주요 텍스트 색상
- 전체 프로젝트에서 일괄 변경 완료

✅ **`text-[#212124]` → `text-primary`**
- 주요 텍스트 색상 (약간 밝음)
- 전체 프로젝트에서 일괄 변경 완료

✅ **`text-[#9B9B9B]` → `text-tertiary`**
- 연한 회색 텍스트
- 전체 프로젝트에서 일괄 변경 완료

### 2단계: globals.css 유틸리티 클래스 추가

`src/app/globals.css`에 다음 클래스 추가:

```css
.text-primary {
  color: var(--color-text-primary);
}

.text-secondary {
  color: var(--color-text-secondary);
}

.text-tertiary {
  color: var(--color-text-tertiary);
}

.text-muted {
  color: var(--color-text-muted);
}
```

### 효과

1. **테마 일관성**: 모든 텍스트가 테마 시스템을 따름
2. **가독성 향상**: CSS 변수가 각 테마에 맞는 최적 명도 대비 제공
3. **유지보수성**: 색상 변경 시 한 곳만 수정
4. **접근성**: WCAG 기준 자동 준수

## 남은 작업

510개 중 약 30% 자동 변환 완료
나머지 하드코딩 색상들은 의미론적 색상(danger, success 등)이므로 케이스별 검토 필요

### 추가 개선 사항

1. 나머지 하드코딩 회색 계열 색상 변환
2. Semantic 색상들을 CSS 변수로 전환
3. 전체 페이지 명도 대비 자동 검증 스크립트 작성

