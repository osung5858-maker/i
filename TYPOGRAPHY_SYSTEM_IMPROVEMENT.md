# 타이포그래피 시스템 개선 계획

## 현재 문제점

### 폰트 크기 혼재
- **20가지 이상**의 폰트 크기가 제각각 사용됨
- 가장 많이 사용: `text-[13px]` (724회), `text-[14px]` (479회)
- 일관성 없는 크기: 9px ~ 48px까지 산발적 사용

### 가독성 문제
- 너무 작은 폰트: 9px, 10px, 11px (모바일에서 읽기 어려움)
- 계층 구조 불명확: 제목/본문/캡션 구분 모호
- line-height 일관성 부족

## 개선된 타이포그래피 시스템

### 타입 스케일 (8단계)

| 클래스 | 크기 | 용도 | 기존 변환 |
|--------|------|------|----------|
| `text-display` | 32px | 히어로, 랜딩 | text-[32px], text-[36px] |
| `text-heading-1` | 24px | 페이지 제목 | text-[24px], text-[22px] |
| `text-heading-2` | 20px | 섹션 제목 | text-[20px], text-[18px] |
| `text-heading-3` | 18px | 카드 제목 | text-[18px], text-[17px] |
| `text-subtitle` | 15px | 소제목, 강조 | text-[15px], text-[16px] |
| `text-body-emphasis` | 14px | 본문 강조 | text-[14px] |
| `text-body` | 13px | 기본 본문 | text-[13px] |
| `text-caption` | 12px | 캡션, 메타 | text-[12px], text-[11px] |
| `text-label` | 11px | 라벨, 작은 텍스트 | text-[11px], text-[10px] |

### 컬러 매핑

| 클래스 | 색상 | 용도 |
|--------|------|------|
| `text-primary` | #1A1918 | 제목, 중요 텍스트 |
| `text-secondary` | #6B6966 | 본문 |
| `text-tertiary` | #9E9A95 | 캡션, 보조 |
| `text-muted` | #C4C0BB | 비활성, 힌트 |

### Font Weight

| 클래스 | Weight | 용도 |
|--------|--------|------|
| `font-bold` | 700 | 헤딩, 강조 |
| `font-semibold` | 600 | 서브타이틀, 버튼 |
| `font-medium` | 500 | 라벨, 탭 |
| `font-normal` | 400 | 본문 |

### Line Height

| 클래스 | 값 | 용도 |
|--------|-----|------|
| `leading-tight` | 1.25 | 헤딩 |
| `leading-snug` | 1.375 | 서브타이틀 |
| `leading-normal` | 1.5 | 본문 |
| `leading-relaxed` | 1.625 | 긴 본문 |

## 적용 우선순위

### Phase 1: 핵심 컴포넌트 (즉시)
- ✅ GlobalHeader
- ✅ BottomNav
- ✅ TodayRecordSection
- ✅ AIMealCard
- ✅ Toast

### Phase 2: 메인 페이지 (1-2시간)
- page.tsx (육아 모드)
- preparing/page.tsx
- pregnant/page.tsx

### Phase 3: 서브 페이지 (2-3시간)
- town/page.tsx
- community/page.tsx
- notifications/page.tsx
- 기타 페이지들

## 변환 가이드

### Before → After

#### 헤딩
```tsx
// Before
<h1 className="text-[24px] font-bold text-[#1A1918]">

// After
<h1 className="text-heading-1">
```

#### 본문
```tsx
// Before
<p className="text-[13px] text-[#6B6966]">

// After
<p className="text-body">
```

#### 강조 본문
```tsx
// Before
<p className="text-[14px] font-semibold text-[#1A1918]">

// After
<p className="text-body-emphasis">
```

#### 캡션
```tsx
// Before
<p className="text-[12px] text-[#9E9A95]">

// After
<p className="text-caption">
```

#### 라벨
```tsx
// Before
<span className="text-[11px] text-[#9E9A95]">

// After
<span className="text-label text-tertiary">
```

## 자동 변환 스크립트

### 1단계: 가장 많이 사용되는 패턴 변환
```bash
# text-[13px] → text-body (724건)
find src -name "*.tsx" -exec sed -i '' 's/text-\[13px\]/text-body/g' {} \;

# text-[14px] font-semibold → text-body-emphasis (추정 200건)
find src -name "*.tsx" -exec sed -i '' 's/text-\[14px\] font-semibold/text-body-emphasis/g' {} \;

# text-[12px] → text-caption (241건)
find src -name "*.tsx" -exec sed -i '' 's/text-\[12px\]/text-caption/g' {} \;
```

### 2단계: 색상 분리
```bash
# text-[#1A1918] → text-primary
find src -name "*.tsx" -exec sed -i '' 's/text-\[#1A1918\]/text-primary/g' {} \;

# text-[#6B6966] → text-secondary
find src -name "*.tsx" -exec sed -i '' 's/text-\[#6B6966\]/text-secondary/g' {} \;

# text-[#9E9A95] → text-tertiary
find src -name "*.tsx" -exec sed -i '' 's/text-\[#9E9A95\]/text-tertiary/g' {} \;
```

## 예상 효과

### 가독성 향상
- ✅ 모바일에서 읽기 편한 최소 12px 보장
- ✅ 명확한 시각적 계층 구조
- ✅ 일관된 line-height로 텍스트 밀도 최적화

### 개발 생산성
- ✅ 클래스 이름으로 용도 명확 파악
- ✅ 폰트 크기 선택 고민 불필요
- ✅ 유지보수 용이

### 번들 크기
- ✅ 반복되는 인라인 스타일 제거
- ✅ CSS 변수 활용으로 크기 감소

## 예외 케이스

### 특수 UI 요소 (유지 가능)
- 큰 숫자 표시 (통계, 카운터): `text-[40px]`, `text-[48px]` 등
- 아이콘 크기 매칭: 특정 px 값 필요 시
- 애니메이션 크기: 동적 크기 변화 필요 시

### 커스텀 크기 필요 시
```tsx
// 시맨틱 클래스 + 사이즈 오버라이드
<p className="text-body" style={{ fontSize: '13.5px' }}>
```

## 다음 단계

1. ✅ 타이포그래피 CSS 검증
2. ⏳ Phase 1 컴포넌트 수동 변환 (품질 확인)
3. ⏳ Phase 2/3 자동 스크립트 실행
4. ⏳ 빌드 & 시각적 QA
5. ⏳ 미세 조정 (필요시)
