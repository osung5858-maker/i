# FAB 유축 기록 시스템 면밀 검증 리포트

## 📋 검증 일시
2026-04-02

## 🎯 검증 범위
1. 유축 왼쪽/오른쪽 duration 기록 처리
2. 토스트 메시지 개선
3. UI 표시 정확성
4. FAB UX/UI 세밀 점검

---

## ✅ 수정 완료 항목

### 1. BottomNav.tsx - Duration 세션 종료 시 DB 저장 타입 변환
**위치**: `src/components/bnb/BottomNav.tsx:613-616`

**문제**:
- `pump_left`/`pump_right` 타입을 그대로 DB에 저장하려고 시도
- DB 스키마에는 `pump` 타입만 존재

**수정**:
```typescript
const dbType = recordType === 'pump_left' || recordType === 'pump_right' ? 'pump'
  : recordType === 'breast_left' || recordType === 'breast_right' ? 'feed'
  : recordType
```

**결과**:
- ✅ `pump_left` → `type: 'pump', tags: { side: 'left' }`
- ✅ `pump_right` → `type: 'pump', tags: { side: 'right' }`

---

### 2. BottomNav.tsx - 분유 입력 UI 개선
**위치**: `src/components/bnb/BottomNav.tsx:59-62`

**문제**:
- 분유가 step3 프리셋 선택 UI로 구현되어 있음
- 사용자는 체온처럼 슬라이더 모달 요청

**수정**:
```typescript
// Before
{ type: 'feed', label: '분유', step3: [...] }

// After
{ type: 'feed', label: '분유', isSlider: true }
```

**결과**:
- ✅ 분유 버튼 클릭 시 슬라이더 UI 열림 (10~300ml 범위)
- ✅ 프리셋 버튼: 60, 90, 120, 150, 180, 240ml

---

### 3. page.tsx - 유축 이벤트 표시 로직 개선
**위치**: `src/app/page.tsx:613-621`

**문제**:
- `pump` 타입의 side 태그를 확인하지 않음
- duration 정보(몇 분)를 표시하지 않음
- 동일 시간대 유축 구분 불가

**수정**:
```typescript
if (e.type === 'pump') {
  const side = e.tags?.side as string
  const mins = e.end_ts ? Math.round((new Date(e.end_ts).getTime() - new Date(e.start_ts).getTime()) / 60000) : 0
  if (side === 'left') return { cat: '유축', label: mins ? `왼쪽 ${mins}분` : '왼쪽' }
  if (side === 'right') return { cat: '유축', label: mins ? `오른쪽 ${mins}분` : '오른쪽' }
  if (e.amount_ml) return { cat: '유축', label: `${e.amount_ml}ml` }
  return { cat: '유축', label: mins ? `${mins}분` : '' }
}
```

**결과**:
- ✅ "유축" → "유축 왼쪽 15분"
- ✅ "유축" → "유축 오른쪽 20분"
- ✅ 방향과 시간을 명확히 구분

---

### 4. page.tsx - Duration 토스트 메시지 개선
**위치**: `src/app/page.tsx:403-417`

**문제**:
- 토스트에서 side 정보 누락
- "유축 15분 기록 완료!" (어느 쪽인지 알 수 없음)

**수정**:
```typescript
let durationLabel = labelMap[rawType] || labelMap[eventType] || eventType
// pump/feed의 경우 side 태그 반영
if ((eventType === 'pump' || eventType === 'feed') && extra.tags) {
  const tags = extra.tags as Record<string, unknown>
  if (tags.side === 'left') durationLabel = eventType === 'pump' ? '유축 왼쪽' : '모유 왼쪽'
  else if (tags.side === 'right') durationLabel = eventType === 'pump' ? '유축 오른쪽' : '모유 오른쪽'
}
```

**결과**:
- ✅ "유축 왼쪽 15분 기록 완료!"
- ✅ "유축 오른쪽 20분 기록 완료!"
- ✅ 명확한 피드백 제공

---

## 🔍 FAB UX/UI 세밀 점검 결과

### ① 시각적 요소 (Visuals) ✅
- **대비**: FAB 물방울 이미지 + 반짝임 효과로 명확한 시인성
- **아이콘**: 물방울 디자인 + 호흡 애니메이션으로 직관적
- **상태 변화**:
  - 닫힘: 물방울 아이콘 + 호흡 효과
  - 열림: X 아이콘 (검은 배경)
  - 세션 중: 타이머 + 펄스 애니메이션 (카테고리 색상)

### ② 인터랙션 (Interaction) ✅
- **확장 동작**: `fabItemPop` 애니메이션 (0.25s cubic-bezier)
- **터치 영역**: 72x72px + shadow로 충분한 터치 영역
- **스크롤 반응**: 고정 위치 유지 (하단 내비게이션 중앙)
- **진동 피드백**:
  - 버튼 클릭: 30ms
  - 세션 종료: [30, 50, 30]ms 패턴

### ③ 배치 및 간섭 (Layout) ✅
- **내용 가림**: 리스트 하단에 적절한 여백 (pb-12)
- **한 손 조작**: 중앙 하단 배치로 양손 모두 접근 용이
- **z-index**: z-[80]으로 다른 요소와 간섭 없음

### ④ 애니메이션 품질 ✅
- **fabBreathe**: 3s 호흡 효과 (scale + translateY)
- **fabGlow**: 3s 글로우 링 확산
- **fabSparkle**: 2.5s 반짝임 점
- **fabSessionPulse**: 2s 세션 중 펄스 효과
- **fabItemPop**: 0.25s 메뉴 확장 (stagger delay: 0.04s)

---

## 📊 전체 플로우 검증

### 유축 왼쪽 기록 플로우:
1. **FAB 클릭** → 카테고리 메뉴 열림 (반원형 배치)
2. **"먹기" 선택** → 세부 메뉴 열림
3. **"유축 왼쪽" 선택** → duration 세션 시작
   - FAB가 타이머로 변경
   - 레이블: "유축 왼쪽"
   - 타이머: 00:00부터 카운트
4. **FAB 클릭** → 세션 종료
   - DB 저장: `type: 'pump', tags: { side: 'left' }, start_ts, end_ts`
   - 토스트: "유축 왼쪽 15분 기록 완료!"
   - 리스트 표시: "유축 왼쪽 15분"

### 분유 기록 플로우:
1. **FAB 클릭** → 카테고리 메뉴 열림
2. **"먹기" 선택** → 세부 메뉴 열림
3. **"분유" 선택** → 슬라이더 UI 열림
   - 범위: 10~300ml
   - 프리셋: 60, 90, 120, 150, 180, 240ml
4. **값 선택 후 "기록"** → 즉시 기록
   - DB 저장: `type: 'feed', amount_ml: 120`
   - 토스트: "분유 120ml 기록!"

---

## 🎨 UI 개선 제안 (추가 고려사항)

### 1. 동일 시간대 기록 그룹화
현재 14:46에 3개 기록이 중복 표시되는 경우:
```
14:46  유축 왼쪽 15분
14:46  유축 오른쪽 20분
14:46  분유 120ml
```

**제안**: 시간대별 그룹화
```
14:46
  • 유축 왼쪽 15분
  • 유축 오른쪽 20분
  • 분유 120ml
```

### 2. 토스트 지속 시간 조정
- 현재: 1초 (너무 짧음)
- 제안: 2.5~3초 (텍스트 길이 고려)

### 3. 유축 아이콘 옆에 L/R 표시
리스트 아이콘에 작은 뱃지 추가:
```
[유축 아이콘 + L] 유축 왼쪽 15분
[유축 아이콘 + R] 유축 오른쪽 20분
```

---

## ✅ 최종 체크리스트

- [x] 유축 왼쪽/오른쪽 duration 기록 정상 작동
- [x] DB에 올바른 타입과 태그로 저장
- [x] 토스트 메시지에 방향 정보 포함
- [x] 리스트에 방향과 시간 정보 표시
- [x] 분유 슬라이더 UI 구현
- [x] FAB 애니메이션 품질 우수
- [x] 터치 영역 충분
- [x] 진동 피드백 적절

---

## 🚀 배포 준비 완료

모든 핵심 기능이 정상 작동하며, UX/UI 품질이 우수합니다.
추가 개선사항은 사용자 피드백을 받은 후 점진적으로 적용할 수 있습니다.
