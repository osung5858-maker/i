# SQL 마이그레이션 실행 가이드

## 🚨 즉시 실행 필요 (Critical P0)

소모임 기능이 작동하려면 **반드시** 아래 SQL을 Supabase Studio에서 실행해야 합니다.

---

## 실행 방법

### 1단계: Supabase Studio 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (dodam)
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2단계: SQL 복사 및 실행
1. `EXECUTE_THIS_IN_SUPABASE.sql` 파일 열기
2. 전체 내용 복사 (Cmd+A → Cmd+C)
3. SQL Editor에 붙여넣기 (Cmd+V)
4. 우측 하단 **Run** 버튼 클릭 ▶️

### 3단계: 실행 결과 확인
성공 시 다음과 같은 메시지 표시:
```
Success. No rows returned
```

---

## 변경 사항 요약

### [1] town_gatherings 테이블 업데이트
- ✅ `category` 컬럼 추가 (놀이모임, 공부/교육, 취미 등)
- ✅ `meeting_frequency` 컬럼 추가 (주 1회, 2주 1회 등)
- ✅ `scheduled_at` nullable 변경 (정기 모임이므로 특정 날짜 불필요)
- ✅ 인덱스 추가 (성능 최적화)

### [2] gathering_posts 테이블 생성
- ✅ 소모임 게시판 테이블 신규 생성
- ✅ RLS 정책 3개:
  - 모두 읽기 가능
  - 소모임 멤버만 글쓰기 가능
  - 본인 글 또는 소모임장이 삭제 가능

---

## 실행 전 vs 실행 후

| 기능 | 실행 전 | 실행 후 |
|------|---------|---------|
| 소모임 만들기 | ❌ 에러 (컬럼 없음) | ✅ 정상 작동 |
| 카테고리 선택 | ❌ 저장 불가 | ✅ 6가지 선택 가능 |
| 모임 주기 설정 | ❌ 저장 불가 | ✅ 4가지 선택 가능 |
| 소모임 게시판 | ❌ 테이블 없음 에러 | ✅ 글쓰기/삭제 정상 |
| 멤버 전용 글쓰기 | ❌ 보안 취약 | ✅ RLS 정책 적용 |

---

## 에러 해결

### 에러 1: "relation does not exist"
```sql
ERROR: relation "gathering_posts" does not exist
```
→ **해결**: SQL 전체를 다시 실행하세요. `CREATE TABLE` 구문이 누락되었습니다.

### 에러 2: "column already exists"
```sql
ERROR: column "category" of relation "town_gatherings" already exists
```
→ **해결**: 무시하고 진행하세요. `IF NOT EXISTS` 덕분에 중복 실행해도 안전합니다.

### 에러 3: "policy already exists"
```sql
ERROR: policy "Anyone can read gathering_posts" for table "gathering_posts" already exists
```
→ **해결**: 무시하고 진행하세요. 정책이 이미 적용되어 있습니다.

---

## 실행 후 테스트 시나리오

### 1. 소모임 만들기 테스트
1. 앱에서 **동네 → 소모임** 탭 이동
2. "동네 소모임 만들기" 버튼 클릭
3. 필수 정보 입력:
   - 소모임 이름: "강남 놀이터 친구들"
   - 카테고리: "놀이모임" 선택
   - 소모임 소개: "강남역 근처 놀이터에서 정기 모임"
   - 모임 주기: "주 1회" 선택
4. "소모임 만들기" 버튼 클릭
5. **예상 결과**: 목록에 새 소모임 추가됨 ✅

### 2. 소모임 게시판 테스트
1. 생성한 소모임 카드 클릭 → 상세페이지
2. "소모임 참여하기" 버튼 클릭
3. **게시판** 탭 선택
4. 텍스트 입력: "안녕하세요! 반갑습니다"
5. "올리기" 버튼 클릭
6. **예상 결과**: 게시글 목록에 추가됨 ✅

### 3. 멤버 관리 테스트
1. **멤버** 탭 선택
2. 소모임장인 경우: 다른 멤버 "내보내기" 버튼 표시됨
3. **예상 결과**: 소모임장만 내보내기 가능 ✅

---

## 롤백 방법 (만약 문제 발생 시)

```sql
-- gathering_posts 테이블 삭제
DROP TABLE IF EXISTS gathering_posts CASCADE;

-- town_gatherings 컬럼 삭제
ALTER TABLE town_gatherings
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS meeting_frequency;

-- scheduled_at NOT NULL 복원
ALTER TABLE town_gatherings
ALTER COLUMN scheduled_at SET NOT NULL;
```

**주의**: 롤백 시 이미 생성된 소모임 데이터의 category/meeting_frequency 정보가 손실됩니다.

---

## 문의 및 지원

- SQL 실행 에러 발생 시 → 에러 메시지 전체를 공유해주세요
- 기능 작동 이상 시 → 브라우저 콘솔 에러 확인 후 공유해주세요
- Supabase 접속 문제 시 → 프로젝트 URL/API Key 확인해주세요

---

**실행 시간**: 약 3-5분 소요
**다운타임**: 없음 (안전한 마이그레이션)
**롤백 가능**: 예 (위 롤백 SQL 참고)
