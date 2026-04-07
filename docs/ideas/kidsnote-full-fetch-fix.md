# 키즈노트 전체 가져오기 + Google Drive 업로드 버그 수정

> 작성일: 2026-04-07

---

## 문제 요약

1. **앨범/알림장 가져오기가 20개에서 끊김** — 전체 루프가 조기 종료됨
2. **Google Drive 업로드 "0장 업로드 완료"** — 한 장도 업로드 안 됨

---

## 버그 1: 가져오기 20개 끊김

### 근본 원인

`src/app/api/kidsnote/route.ts` — `buildPageUrl()` 함수

```
baseUrl = `${KN_BASE}/v1_2/children/${childId}/albums?page_size=20`
// 커서가 토큰일 때:
return `${base}?cursor=${cursor}&page_size=20`
// 결과: ...albums?page_size=20?cursor=xxx&page_size=20  ← URL 깨짐!
```

- `base`에 이미 `?page_size=20`이 포함 → 커서 추가 시 `?`가 두 번 → 잘못된 URL
- 키즈노트 API가 400/404 반환 → `results: []` → `items.length > 0` 조건 실패 → 루프 종료

### 추가 원인

- 키즈노트 세션 만료가 빨라 2~3번째 요청에서 401 가능
- 프론트의 `catch { /* */ }` 가 에러를 삼켜서 원인 파악 불가

### 수정 방향

1. `buildPageUrl` 수정: base URL에 `?`가 있으면 `&`로 파라미터 추가
2. 또는 `page_size`를 base에서 제거하고 항상 buildPageUrl에서 붙이기
3. 에러 시 retry 로직 (401이면 재로그인 시도, 그 외 1회 재시도)
4. `catch`에서 에러 로깅 추가

---

## 버그 2: Google Drive 0장 업로드

### 근본 원인

`src/app/kidsnote/page.tsx` — `downloadAll('gdrive')` (line 403-442)

1. `albums`/`reports` state의 이미지 URL이 `/api/kidsnote/image?url=...` (프록시 경로)
2. `/api/google-drive/upload`에 이 프록시 URL을 `imageUrl`로 전달
3. 서버사이드에서 `localhost`의 프록시 URL을 fetch → 실패 (self-referencing)
4. 모든 업로드 실패 → `ok = 0` → "0장 업로드 완료"

### 수정 방향

1. Google Drive 업로드 시 **원본 키즈노트 URL**을 사용해야 함
2. `normalizeItem()`에서 프록시 URL과 원본 URL 모두 저장:
   ```
   images: [{ original: proxyImg(...), thumbnail: proxyImg(...), rawOriginal: img.original }]
   ```
3. 또는 프론트에서 프록시 URL을 역변환하여 원본 URL 추출
4. `/api/google-drive/upload`가 키즈노트 원본 URL을 직접 fetch → Drive에 업로드

---

## 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-01 | 앨범/알림장 전체 가져오기가 끊기지 않고 완료되어야 함 | Critical |
| FR-02 | Google Drive 전체 업로드가 실제로 동작해야 함 | Critical |
| FR-03 | 가져오기 중 에러 발생 시 사용자에게 명확한 메시지 표시 | High |
| FR-04 | 가져오기 진행률이 정확하게 표시되어야 함 | Medium |
| FR-05 | page_size를 늘려서 요청 횟수 줄이기 (20 → 50~100) | Low |

---

## 수정 대상 파일

1. `src/app/api/kidsnote/route.ts` — `buildPageUrl` URL 구성 수정, rawUrl 필드 추가
2. `src/app/kidsnote/page.tsx` — Google Drive 업로드 시 원본 URL 사용, 에러 핸들링 개선

---

## Clarity Breakdown

| Dimension | Score | Status |
|-----------|-------|--------|
| Goal | 0.95 | Clear |
| Constraints | 0.90 | Clear |
| Criteria | 0.90 | Clear |
| Context | 0.95 | Clear (코드 확인 완료) |
| **Ambiguity** | **0.06** | **Ready** |
