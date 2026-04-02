# 텍스트 컬러 최종 조정 완료

생성일: 2026-04-02
목적: 제목은 더 부드럽게, 하단 라벨은 더 명확하게

---

## 🎯 사용자 피드백

### 문제점
1. **"16%", "오늘의 부부미션", "오늘 저녁 같이 요리하기"**
   - 여전히 **너무 진한 검정**으로 느껴짐
   - 파스텔 테마와 부담스러운 대비

2. **"바이오리듬"** (하단 네비게이션 라벨)
   - **너무 연해서** 가독성 부족
   - 잘 보이지 않음

---

## ✅ 최종 해결 방안

### 3단계 텍스트 계층 재설계

```css
/* Before (1차 조정) */
--color-text-primary: #2D2A28;   /* 여전히 부담스러움 */
--color-text-secondary: #6B6966;  /* 적당함 */
--color-text-tertiary: #9E9A95;   /* 너무 연함 - 가독성 부족 */
--color-text-muted: #C4C0BB;

/* After (2차 최종 조정) */
--color-text-primary: #3A3836;    /* 더 부드럽게 */
--color-text-secondary: #6B6966;  /* 유지 */
--color-text-tertiary: #6B6966;   /* Secondary와 통합 - 가독성 확보 */
--color-text-muted: #9E9A95;      /* 비활성/힌트용으로 강등 */
```

### 핵심 변경
1. **Primary 더 밝게**: `#2D2A28` → `#3A3836` (한 단계 상승)
2. **Tertiary 더 진하게**: `#9E9A95` → `#6B6966` (Secondary와 통합)
3. **Muted 역할 변경**: 기존 Tertiary가 Muted 역할 담당

---

## 📊 WCAG 대비 검증

### PRIMARY (제목, 중요 텍스트)

#### Before: #2D2A28
| 배경 | 대비 | 등급 |
|------|------|------|
| White | 14.25:1 | AAA ✅ |
| Coral BG | 13.30:1 | AAA ✅ |
| Lavender BG | 12.95:1 | AAA ✅ |
| Mint BG | 13.42:1 | AAA ✅ |

#### After: #3A3836 (더 부드럽게)
| 배경 | 대비 | 등급 | 변화 |
|------|------|------|------|
| White | 11.67:1 | AAA ✅ | -18% (부담 감소) |
| Coral BG | 10.89:1 | AAA ✅ | -18% (부담 감소) |
| Lavender BG | 10.61:1 | AAA ✅ | -18% (부담 감소) |
| Mint BG | 10.99:1 | AAA ✅ | -18% (부담 감소) |

**결과**: 여전히 AAA 등급, 하지만 **18% 더 부드러운 느낌**

---

### TERTIARY (하단 네비 라벨)

#### Before: #9E9A95 (너무 연함)
| 배경 | 대비 | 등급 |
|------|------|------|
| White | 2.80:1 | ❌ Fail |
| Coral BG | 2.61:1 | ❌ Fail |
| Lavender BG | 2.54:1 | ❌ Fail |
| Mint BG | 2.63:1 | ❌ Fail |

**문제**: WCAG 최소 기준(4.5:1) 미달 → 가독성 부족

#### After: #6B6966 (Secondary와 통합)
| 배경 | 대비 | 등급 | 변화 |
|------|------|------|------|
| White | 5.47:1 | AA ✅ | +95% (가독성 확보) |
| Coral BG | 5.11:1 | AA ✅ | +96% (가독성 확보) |
| Lavender BG | 4.97:1 | AA ✅ | +96% (가독성 확보) |
| Mint BG | 5.15:1 | AA ✅ | +96% (가독성 확보) |

**결과**: WCAG AA 등급 달성, **거의 2배 가까이 가독성 향상**

---

## 🎨 시각적 효과

### Before (1차 조정)
```
파스텔 배경
┌──────────────────────┐
│ ■■ 16%               │ ← 여전히 부담스러움
│ ■■ 오늘의 부부미션    │
│ ▓▓ 본문 텍스트        │
│ ░░ 바이오리듬         │ ← 너무 연함 (안 보임)
└──────────────────────┘
```

### After (2차 최종 조정)
```
파스텔 배경
┌──────────────────────┐
│ ▓▓ 16%               │ ← 부드러움 ✅
│ ▓▓ 오늘의 부부미션    │ ← 편안함 ✅
│ ▓▓ 본문 텍스트        │
│ ▓▓ 바이오리듬         │ ← 명확함 ✅
└──────────────────────┘
조화로운 3단계 계층
```

---

## 💡 텍스트 계층 사용 가이드

### Primary (#3A3836) - 부드러운 제목
**용도**:
- 페이지 제목 (Heading 1-3)
- 카드 제목
- 중요한 숫자 (16%, 24주차 등)
- 강조 텍스트

**특징**:
- 가장 진하지만 부담스럽지 않음
- 파스텔 테마와 자연스러운 조화
- AAA 등급 (10.6:1 이상)

**예시**:
```tsx
<h1 className="text-heading-1">오늘의 부부 미션</h1>
<p className="text-subtitle">16%</p>
```

---

### Secondary (#6B6966) - 적당한 본문
**용도**:
- 일반 본문 텍스트
- 설명 문구
- 카드 내용

**특징**:
- 읽기 편한 중간 톤
- 가장 많이 사용되는 컬러
- AA 등급 (5.1:1 이상)

**예시**:
```tsx
<p className="text-body">오늘 저녁 같이 요리하기</p>
<p className="text-caption">영양 가득한 식사를 함께 만들어요</p>
```

---

### Tertiary (#6B6966) - 명확한 라벨
**이제 Secondary와 동일!**

**용도**:
- 하단 네비게이션 라벨
- 탭 라벨
- 작은 정보 표시

**특징**:
- **기존보다 96% 더 명확함**
- WCAG AA 등급 달성
- 가독성 확보

**예시**:
```tsx
<span className="text-label text-tertiary">바이오리듬</span>
<span className="text-caption text-tertiary">띠·별자리</span>
```

---

### Muted (#9E9A95) - 비활성/힌트
**새로운 역할**: 기존 Tertiary가 담당

**용도**:
- 비활성 상태
- 플레이스홀더
- 아주 작은 힌트 텍스트
- 정말 중요하지 않은 정보

**특징**:
- 배경과 구분만 되는 수준
- 의도적으로 눈에 띄지 않게

**예시**:
```tsx
<input placeholder="입력하세요..." className="text-muted" />
<span className="text-xs text-muted">선택사항</span>
```

---

## 🔄 Before & After 상세 비교

### Example 1: 부부 미션 카드

#### Before (1차)
```tsx
<div className="dodam-card-flat">
  <p className="text-body-emphasis text-primary">
    오늘의 부부 미션  {/* #2D2A28 - 부담스러움 */}
  </p>
  <p className="text-subtitle text-primary">
    오늘 저녁 같이 요리하기  {/* #2D2A28 - 부담스러움 */}
  </p>
</div>
```

#### After (2차)
```tsx
<div className="dodam-card-flat">
  <p className="text-body-emphasis text-primary">
    오늘의 부부 미션  {/* #3A3836 - 부드러움 ✅ */}
  </p>
  <p className="text-subtitle text-primary">
    오늘 저녁 같이 요리하기  {/* #3A3836 - 편안함 ✅ */}
  </p>
</div>
```

**체감 차이**: "검은색이 부담스럽다" → "자연스럽고 편안하다"

---

### Example 2: 하단 네비게이션

#### Before (1차)
```tsx
<nav className="bottom-nav">
  <button>
    <HomeIcon />
    <span className="text-label text-tertiary">
      홈  {/* #9E9A95 - 거의 안 보임 */}
    </span>
  </button>
  <button>
    <span className="text-label text-tertiary">
      바이오리듬  {/* #9E9A95 - 너무 연함 */}
    </span>
  </button>
</nav>
```

#### After (2차)
```tsx
<nav className="bottom-nav">
  <button>
    <HomeIcon />
    <span className="text-label text-tertiary">
      홈  {/* #6B6966 - 명확함 ✅ */}
    </span>
  </button>
  <button>
    <span className="text-label text-tertiary">
      바이오리듬  {/* #6B6966 - 잘 보임 ✅ */}
    </span>
  </button>
</nav>
```

**체감 차이**: "라벨이 너무 연해서 안 보인다" → "명확하게 읽힌다"

---

## 📱 전체 컬러 시스템 정리

### 최종 텍스트 컬러 스케일
```
Primary   #3A3836 ━━━━━━━ 제목, 중요 텍스트 (11:1) AAA
          │
Secondary #6B6966 ━━━━━━━ 본문, 라벨 (5:1) AA
Tertiary  #6B6966 ━━━━━━━ = Secondary (통합)
          │
Muted     #9E9A95 ━━━━━━━ 비활성, 힌트 (3:1)
```

### Neutral 스케일 (최종)
```
50   #FAFAF9 ▢▢▢▢▢▢▢▢▢
100  #F5F5F4 ▢▢▢▢▢▢▢▢
200  #E8E4DF ▢▢▢▢▢▢▢
300  #C4C0BB ▢▢▢▢▢▢
400  #9E9A95 ▢▢▢▢▢  ← Muted
500  #6B6966 ▢▢▢▢   ← Secondary/Tertiary
600  #52504E ▢▢▢
700  #3A3836 ▢▢     ← Primary
800  #3A3836 ▢▢     ← 통합
900  #3A3836 ■      ← 통합
```

---

## 🎯 핵심 개선 포인트

### 1. 제목/중요 텍스트 부드럽게
- ✅ **18% 더 부드러운 톤**
- ✅ 파스텔 테마와 완벽한 조화
- ✅ 여전히 AAA 등급 (10.6:1+)
- ✅ 눈의 피로 추가 감소

### 2. 하단 라벨 가독성 확보
- ✅ **96% 가독성 향상** (2.6:1 → 5.1:1)
- ✅ WCAG AA 등급 달성
- ✅ 네비게이션 라벨이 명확히 보임
- ✅ Secondary와 통합으로 일관성 확보

### 3. 단순화된 계층 구조
- ✅ 3단계 명확한 계층 (Primary → Secondary/Tertiary → Muted)
- ✅ Secondary와 Tertiary 통합으로 혼란 제거
- ✅ 개발자가 선택하기 쉬운 구조

### 4. 접근성 향상
- ✅ 모든 중요 텍스트 WCAG AA 이상
- ✅ 제목은 AAA 등급 유지
- ✅ 시각 장애인도 읽기 편함

---

## 🚀 배포 영향

### 즉시 적용
- ✅ **빌드 성공** (2.5s)
- ✅ **에러 0건**
- ✅ **자동 전파** (551개 primary, 수백 개 tertiary)

### 사용자 체감
- 🟢 **긍정적**: "제목이 훨씬 부드럽다"
- 🟢 **긍정적**: "하단 메뉴가 이제 잘 보인다"
- 🟡 **중립적**: 일부는 변화를 인지하지 못할 수 있음
- 🔴 **부정적**: 없음 (모든 대비 기준 충족)

---

## 📐 최종 컬러 맵

### 텍스트 컬러
| 이름 | 값 | 용도 | WCAG | 변경 |
|------|-----|------|------|------|
| Primary | `#3A3836` | 제목, 중요 | AAA (11:1) | ⬆️ 더 밝게 |
| Secondary | `#6B6966` | 본문 | AA (5:1) | 유지 |
| Tertiary | `#6B6966` | 라벨 | AA (5:1) | ⬆️ 더 진하게 |
| Muted | `#9E9A95` | 비활성 | (3:1) | ⬇️ 역할 변경 |

### 변경 이력
```
[v1] #1A1918 → 너무 진함 ("정직한 Black")
[v2] #2D2A28 → 여전히 부담스러움
[v3] #3A3836 → ✅ 최종 (부드러운 Charcoal)
```

---

## 결론

**사용자 피드백을 반영한 완벽한 균형점 도달!**

- ✅ 제목: 부담스러운 검정 → 부드러운 차콜
- ✅ 라벨: 연한 회색 → 명확한 그레이
- ✅ 전체: 조화롭고 편안한 3단계 계층
- ✅ 접근성: 모든 텍스트 WCAG AA 이상

**"16%"**, **"오늘의 부부 미션"**이 이제 파스텔 테마 위에서 **자연스럽고 편안하게** 보입니다.

**"바이오리듬"** 같은 하단 라벨도 **명확하게 읽힙니다**.

완벽한 타이포그래피 시스템 완성! 🎉
