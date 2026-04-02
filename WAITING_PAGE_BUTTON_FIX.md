# "검진 · 혜택 · 준비물 보기" 버튼 레이아웃 수정

## 문제점
임신 중 모드 페이지에서 "검진 · 혜택 · 준비물 보기" 버튼의 레이아웃이 깨짐.
- 좌측에 흰색 물체가 겹침
- 버튼 영역이 제대로 구분되지 않음

## 원인 분석
1. `Link` 컴포넌트에 직접 `dodam-card` 클래스 적용
2. `overflow` 처리 부재로 위 컴포넌트(MissionCard)의 요소가 침범
3. 명확한 블록 레벨 컨테이너 부재

## 해결 방법
Link를 블록으로 감싸고, 내부에 명확한 overflow 처리가 된 카드 컨테이너 추가

## 수정 내용

### Before
```tsx
<Link href="/waiting" className="dodam-card text-center hover-lift press-feedback">
  <p className="text-caption-bold">검진 · 혜택 · 준비물 보기 →</p>
  <p className="text-caption text-tertiary mt-0.5">기다림 페이지에서 확인하세요</p>
</Link>
```

### After
```tsx
<Link href="/waiting" className="block w-full">
  <div className="dodam-card text-center hover-lift press-feedback relative overflow-hidden">
    <p className="text-[14px] font-bold text-[#1A1918]">검진 · 혜택 · 준비물 보기 →</p>
    <p className="text-[13px] text-[#9E9A95] mt-0.5">기다림 페이지에서 확인하세요</p>
  </div>
</Link>
```

## 주요 개선사항

### 1. **구조 개선**
   - `Link`: `block w-full` - 블록 레벨 전체 너비
   - `div`: 실제 카드 컨테이너 - `dodam-card` 스타일 적용

### 2. **Overflow 처리**
   - `relative overflow-hidden` 추가
   - 다른 요소가 침범하는 것 방지
   - 내부 요소가 튀어나가는 것 방지

### 3. **폰트 크기 명시**
   - `text-caption-bold` → `text-[14px] font-bold text-[#1A1918]`
   - `text-caption text-tertiary` → `text-[13px] text-[#9E9A95]`
   - CSS 변수 대신 명시적 값으로 일관성 확보

### 4. **레이어링 명확화**
   - `relative` 포지셔닝으로 z-index 제어 가능
   - `overflow-hidden`으로 경계 명확

## 기술 세부사항

### Link vs div 구조 분리
```tsx
<Link>           ← 클릭 영역 (block w-full)
  <div>          ← 시각적 카드 (dodam-card)
    <content/>
  </div>
</Link>
```

- **Link**: 클릭 가능 영역 정의 (전체 너비)
- **div**: 시각적 스타일 적용 (카드 디자인)

### Overflow Hidden
```css
overflow-hidden
```
- 카드 영역을 벗어나는 요소 차단
- 위아래 컴포넌트의 침범 방지
- 깔끔한 경계선 유지

### Relative Positioning
```css
relative
```
- z-index 스택 컨텍스트 생성
- 필요시 z-index로 레이어 조정 가능
- 내부 absolute 요소의 기준점

## 시각적 개선

### Before (문제)
```
┌─────────────────┐
│ MissionCard     │
│  [흰색물체]      │ ← overflow
├─────────────────┤
│ 검진·혜택·준비물 │ ← 겹침 발생
└─────────────────┘
```

### After (해결)
```
┌─────────────────┐
│ MissionCard     │
└─────────────────┘
┌─────────────────┐
│ 검진·혜택·준비물 │ ← 명확한 분리
│ 기다림 페이지... │
└─────────────────┘
```

## 파일 수정
- `/src/app/pregnant/page.tsx` - 722-724 라인

## 테스트 체크리스트
- [x] 빌드 성공
- [ ] 버튼 레이아웃 정상 표시 확인
- [ ] 위 컴포넌트(MissionCard)와 겹침 없음 확인
- [ ] 버튼 클릭 정상 작동 (→ /waiting 이동)
- [ ] hover 효과 정상 작동
- [ ] press 피드백 정상 작동
- [ ] 모바일에서도 정상 표시 확인

## 예방 조치
이와 유사한 버튼들도 동일한 구조로 수정 권장:
1. Link를 `block w-full`로 감싸기
2. 내부에 `overflow-hidden` 처리된 div 사용
3. 명시적인 폰트 크기 지정
