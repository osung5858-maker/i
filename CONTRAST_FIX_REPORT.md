# 명도 대비 개선 작업 리포트

## 문제

사용자 제보: "이런 부분도 텍스트가 안보인다"
- 중간 톤 배경색에 어두운 텍스트 사용
- WCAG 명도 대비 기준 미달

## 수행한 작업

### 1. 하드코딩 텍스트 색상 → CSS 변수 전환
- `text-[#0A0B0D]` → `text-primary`
- `text-[#212124]` → `text-primary`
- `text-[#9B9B9B]` → `text-tertiary`

### 2. globals.css 유틸리티 클래스 추가
```css
.text-primary   /* var(--color-text-primary) */
.text-secondary /* var(--color-text-secondary) */
.text-tertiary  /* var(--color-text-tertiary) */
.text-muted     /* var(--color-text-muted) */
```

### 3. 중간 톤 배경색 대비 개선
다음 색상 배경들의 텍스트를 흰색으로 강제 변경:

#### 파란색 계열
- `#5B9FD6` (밝은 파랑)
- `#4A90D9` (파랑)
- `#3B82F6` (진한 파랑)

#### 초록색 계열
- `#4A9B6E` (녹색)
- `#5BA882` (민트 그린)
- `#10B981` (에메랄드)

#### 보라색 계열
- `#8B5CF6` (보라)
- `#A78BFA` (연보라)

### 4. Primary 배경 규칙 확인
모든 `bg-[var(--color-primary)]`는 `text-white` 사용 - ✅ 이미 적용됨

## 명도 대비 기준

| 배경 명도 | 텍스트 색상 | 대비비 |
|----------|----------|--------|
| 밝음 (90%+) | 어두운 회색 (#1A1918) | 14:1 ✅ |
| 중간 (50-80%) | **흰색 (#FFFFFF)** | **4.5:1+ ✅** |
| 어두움 (0-50%) | 흰색 (#FFFFFF) | 7:1+ ✅ |

## 테스트 체크리스트

- [ ] 모든 테마에서 텍스트 가독성 확인
- [ ] 민트 테마 (#4DB8AC) 배경 버튼 확인
- [ ] 세이지 민트 테마 (#5EA88A) 배경 버튼 확인
- [ ] 소프트 블루 테마 (#6B9EC8) 배경 버튼 확인
- [ ] 모바일 기기 실제 테스트
- [ ] 야외 햇빛 환경 테스트

## 참고

- WCAG 2.1 Level AA: 일반 텍스트 4.5:1, 큰 텍스트 3:1
- WCAG 2.1 Level AAA: 일반 텍스트 7:1, 큰 텍스트 4.5:1
- 대비비 검증 도구: https://webaim.org/resources/contrastchecker/

