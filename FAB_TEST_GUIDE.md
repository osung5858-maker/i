# FAB 버튼 테스트 가이드 - /preparing 페이지
**테스트 URL**: http://localhost:3000/preparing
**날짜**: 2026-04-01

---

## 🧪 테스트 절차

### 1단계: 브라우저 개발자 도구 열기
```
Chrome/Edge: F12 또는 Cmd+Option+I (Mac)
Safari: Cmd+Option+C
```

### 2단계: 콘솔 탭 선택
Console 탭을 클릭하여 로그 확인

### 3단계: 페이지 로드 확인
http://localhost:3000/preparing 접속 시 다음 로그가 나와야 함:

```javascript
BottomNav DEBUG: {
  pathname: "/preparing",
  mode: "preparing",
  categoriesCount: 4,
  categories: ["기분", "건강", "영양제", "기다림"],
  fabOpen: false
}
```

**✅ 정상**: 위 로그가 나오고 `mode: "preparing"`, `categoriesCount: 4`
**❌ 비정상**: 로그가 안 나오거나 mode가 다름

---

### 4단계: FAB 버튼 클릭
화면 하단 중앙의 물방울 아이콘 클릭

**예상 로그**:
```javascript
FAB clicked {
  memoItem: null,
  tempSlider: null,
  selectedItem: null,
  selectedCategory: null,
  fabOpen: false
}

BottomNav DEBUG: {
  pathname: "/preparing",
  mode: "preparing",
  categoriesCount: 4,
  categories: ["기분", "건강", "영양제", "기다림"],
  fabOpen: true  // ← true로 변경됨!
}
```

**✅ 정상**: 두 로그 모두 출력되고 `fabOpen: true`로 변경
**❌ 비정상**: 로그가 안 나오거나 fabOpen이 false 유지

---

### 5단계: FAB 메뉴 확인
FAB 클릭 후 반원형 메뉴가 펼쳐져야 함

**예상 메뉴 아이템**:
```
😊 기분     (분홍색)
💪 건강     (주황색)
💊 영양제   (녹색)
📖 기다림   (보라색)
```

**✅ 정상**: 4개 카테고리가 반원형으로 표시
**❌ 비정상**: 메뉴가 안 나타나거나 다른 카테고리 표시

---

## 🐛 문제별 해결 방법

### 문제 1: "BottomNav DEBUG" 로그가 안 나옴
**원인**: BottomNav 컴포넌트가 렌더링되지 않음

**확인**:
1. Elements 탭에서 `<nav>` 요소 검색
2. 있으면 → 로그 문제, 없으면 → 렌더링 문제

**해결**:
```bash
# 개발 서버 재시작
kill $(lsof -ti:3000)
npm run dev
```

---

### 문제 2: "FAB clicked" 로그가 안 나옴
**원인**: FAB 버튼 클릭 이벤트가 작동하지 않음

**확인**:
1. Elements 탭에서 FAB 버튼 찾기:
   ```
   [aria-label="빠른 기록 버튼"]
   ```

2. Computed 스타일 확인:
   - `z-index`: 80이어야 함
   - `pointer-events`: auto여야 함
   - `cursor`: pointer여야 함

3. 버튼 위에 다른 요소가 있는지 확인:
   ```javascript
   // Console에서 실행
   document.elementFromPoint(
     window.innerWidth / 2,  // FAB는 화면 중앙
     window.innerHeight - 100  // 하단 100px 위치
   )
   ```
   → `<button>` 태그가 나와야 함

**해결**:
- z-index가 80이 아니면 → 빌드 문제, 재빌드 필요
- pointer-events가 none이면 → CSS 충돌, 부모 요소 확인
- 다른 요소가 위에 있으면 → z-index 충돌

---

### 문제 3: 로그는 나오는데 메뉴가 안 열림
**원인**: `fabOpen` 상태는 변경되지만 UI가 업데이트 안 됨

**확인**:
```javascript
// Console에서 실행
document.querySelector('[data-guide="fab"]')
```
→ FAB 컨테이너가 있어야 함

**해결**:
React DevTools로 컴포넌트 상태 확인:
1. React DevTools 설치
2. BottomNavComponent 선택
3. State 확인: `fabOpen: true`인지 확인

---

### 문제 4: mode가 "preparing"이 아님
**원인**: pathname 감지 실패

**확인**:
```javascript
// Console에서 실행
window.location.pathname
```
→ "/preparing"이어야 함

**해결**:
- URL이 `/preparing`이 아니면 → 올바른 URL로 이동
- pathname이 `/preparing`인데 mode가 다르면 → useEffect 문제

---

## 📱 모바일 테스트 (Capacitor)

### iOS Simulator
```bash
npx cap open ios
```

### Android Emulator
```bash
npx cap open android
```

### Safari Developer Tools (iOS)
1. Settings → Safari → Advanced → Web Inspector 켜기
2. Mac Safari → Develop → Simulator 선택
3. Console 탭에서 로그 확인

### Chrome DevTools (Android)
1. chrome://inspect 접속
2. 디바이스 선택
3. inspect 클릭

---

## ✅ 성공 기준

### 필수 (MUST)
- [ ] BottomNav DEBUG 로그 출력
- [ ] mode: "preparing" 확인
- [ ] categoriesCount: 4 확인
- [ ] FAB 클릭 시 "FAB clicked" 로그 출력
- [ ] fabOpen: true로 변경 확인
- [ ] 4개 카테고리 메뉴 표시

### 권장 (SHOULD)
- [ ] 진동 피드백 (모바일)
- [ ] X 아이콘으로 변경
- [ ] 백드롭 어두워짐
- [ ] 카테고리 클릭 → 아이템 리스트 표시

### 선택 (COULD)
- [ ] 애니메이션 부드러움
- [ ] 반원형 레이아웃 정확함
- [ ] 색상 일관성

---

## 🔍 디버깅 체크리스트

```javascript
// Console에서 실행할 디버깅 스크립트

// 1. BottomNav 렌더링 확인
console.log('BottomNav:', !!document.querySelector('nav'))

// 2. FAB 버튼 확인
const fab = document.querySelector('[aria-label="빠른 기록 버튼"]')
console.log('FAB button:', !!fab)

// 3. FAB 스타일 확인
if (fab) {
  const styles = window.getComputedStyle(fab)
  console.log('FAB styles:', {
    zIndex: styles.zIndex,
    pointerEvents: styles.pointerEvents,
    cursor: styles.cursor,
    position: styles.position,
    bottom: styles.bottom
  })
}

// 4. 클릭 가능 여부 확인
if (fab) {
  const rect = fab.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const elementAtPoint = document.elementFromPoint(centerX, centerY)
  console.log('Element at FAB center:', elementAtPoint.tagName, elementAtPoint.getAttribute('aria-label'))
}

// 5. 모드 확인
console.log('Current mode:', localStorage.getItem('dodam_mode'))

// 6. pathname 확인
console.log('Current pathname:', window.location.pathname)
```

---

## 📊 예상 결과

### 정상 작동 시 콘솔 출력 순서:

1. **페이지 로드**
```
BottomNav DEBUG: { pathname: "/preparing", mode: "preparing", ... }
```

2. **FAB 클릭**
```
FAB clicked { fabOpen: false, ... }
BottomNav DEBUG: { fabOpen: true, ... }
```

3. **카테고리 선택** (예: 기분)
```
BottomNav DEBUG: { selectedCategory: "prep_mood", ... }
```

4. **X 버튼 클릭**
```
FAB clicked { fabOpen: true, selectedCategory: "prep_mood", ... }
BottomNav DEBUG: { fabOpen: false, selectedCategory: null, ... }
```

---

## 🚨 긴급 대응

### FAB가 전혀 작동하지 않을 때:

1. **캐시 삭제**
```bash
rm -rf .next
npm run build
npm run dev
```

2. **localStorage 초기화**
```javascript
// Console에서 실행
localStorage.clear()
location.reload()
```

3. **하드 리프레시**
```
Chrome: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
Safari: Cmd+Option+R
```

4. **시크릿 모드 테스트**
캐시/쿠키 영향 제거

---

## 📞 문제 보고 템플릿

```markdown
### FAB 작동 오류 보고

**URL**: http://localhost:3000/preparing
**브라우저**: Chrome 130.0 (예시)
**환경**: macOS 14.0 (예시)

**콘솔 로그**:
```
(여기에 BottomNav DEBUG 로그 복사)
```

**문제 증상**:
- [ ] FAB 버튼이 보이지 않음
- [ ] FAB 클릭이 안 됨
- [ ] 메뉴가 안 열림
- [ ] 기타: ___________

**스크린샷**:
(첨부)
```

---

**작성자**: Claude Code
**업데이트**: 2026-04-01
**빌드**: ✅ 성공
