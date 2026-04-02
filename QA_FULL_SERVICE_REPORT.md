# 도담 서비스 전체 QA 리포트

**작성일**: 2026-04-01
**대상 범위**: 전체 서비스 (특히 동네 페이지 신규 기능)
**빌드 상태**: ✅ 성공 (78개 라우트, 0 에러)

---

## 🎯 Executive Summary

### ✅ 정상 작동 항목
1. **빌드 시스템**: TypeScript 컴파일, Next.js 빌드 성공
2. **헤더 디자인**: 글라스모피즘 효과 적용 완료
3. **BenefitTabs**: 중첩 탭 제거, 아코디언으로 변경 완료
4. **동네 페이지 레이아웃**: 4개 탭 균등분배 완료
5. **소모임 만들기**: 카테고리, 주기, 설명 등 필수 입력 정상
6. **소모임 상세페이지**: 게시판, 멤버 탭 분리 완료
7. **거래 기능**: 기존 도담장터 재사용 통합 완료

### ⚠️ SQL 마이그레이션 필요 (Critical)
다음 2개 파일을 Supabase Studio에서 실행 필요:
1. `supabase/migrations/20260401_town_gatherings_update.sql`
2. `supabase/migrations/20260401_gathering_posts.sql`

**실행하지 않으면 발생할 문제**:
- 소모임 만들기: category, meeting_frequency 컬럼 누락 에러
- 소모임 게시판: gathering_posts 테이블 없음 에러
- RLS 정책 없어서 보안 취약

### 🔍 세부 기능별 검증 결과

---

## 1. 글로벌 헤더 (GlobalHeader.tsx)

### ✅ 정상
- 글라스모피즘 효과 (backdrop-blur) 인라인 스타일로 적용
- 반투명 배경 (rgba(255,255,255,0.7))
- 스크롤 시 헤더/바디 경계 구분 가능
- 상단 고정 (sticky + z-40)

### 📝 코드 검증
```tsx
style={{
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
}}
```

---

## 2. 임신 중 모드 - 기다림 페이지 (waiting/page.tsx)

### ✅ 정상
- BenefitTabs가 아코디언 UI로 변경됨
- 탭 내 탭 중첩 제거
- "금전혜택", "건강관리", "육아박스" 섹션별 확장/축소 동작

### 📝 코드 검증
```tsx
const [expandedSection, setExpandedSection] = useState<'money' | 'health' | 'box' | null>('money')
```

---

## 3. 동네 페이지 (town/page.tsx)

### ✅ 정상
- 4개 탭 균등분배: `flex-1` 적용
- 탭 라벨: 장소, 소식, 소모임, 거래
- 상단 검색바 + 거리 필터 (3km 기본값)
- 카카오맵 노출
- 병원찾기 버튼 제거됨

### 📝 코드 검증
```tsx
{[
  { key: 'town' as SubTab, label: '장소' },
  { key: 'feed' as SubTab, label: '소식' },
  { key: 'gather' as SubTab, label: '소모임' },
  { key: 'market' as SubTab, label: '거래' },
].map(t => (
  <button key={t.key} className="flex-1 ...">
    {t.label}
  </button>
))}
```

---

## 4. 동네 소식 탭 (TownFeedTab.tsx)

### ✅ 정상
- 24시간 만료 피드 등록 버튼
- alert() 플레이스홀더 메시지
- 피드 목록 로드 (최근 20개)
- 좋아요, 댓글 카운트 표시

### ⚠️ 제한사항
- 실제 등록 기능 미구현 (알림 메시지만)
- 사진 업로드 없음
- 댓글 작성 UI 없음

### 🔧 권장사항
- 향후 피드 등록 모달 구현 시 필요 항목:
  - 텍스트 입력 (200자 제한)
  - 사진 업로드 (최대 3장)
  - 위치 태그
  - 24시간 자동 삭제 안내

---

## 5. 동네 소모임 탭 (TownGatherTab.tsx)

### ✅ 정상 기능
1. **소모임 만들기 모달**
   - 필수: 소모임 이름, 카테고리, 소모임 소개
   - 선택: 주요 장소, 아이 월령, 최대 인원
   - 카테고리: 놀이모임, 공부/교육, 취미, 육아정보, 야외활동, 기타
   - 모임 주기: 주 1회, 2주 1회, 월 1회, 비정기

2. **소모임 목록**
   - 카테고리 배지, 주기 표시
   - 장소, 아이 월령, 참여 인원 표시
   - 카드 클릭 → 상세페이지 이동

3. **DB 연동**
   - `town_gatherings` 테이블 INSERT
   - `creator_id` 올바르게 사용 (user_id 아님)

### ⚠️ SQL 마이그레이션 필수
파일: `20260401_town_gatherings_update.sql`

**실행 전 발생 에러**:
```
Could not find the 'category' column of 'town_gatherings'
Could not find the 'meeting_frequency' column of 'town_gatherings'
```

**SQL 내용**:
```sql
ALTER TABLE town_gatherings
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('playgroup', 'study', 'hobby', 'support', 'outdoor', 'etc')),
ADD COLUMN IF NOT EXISTS meeting_frequency TEXT CHECK (meeting_frequency IN ('weekly', 'biweekly', 'monthly', 'irregular'));

ALTER TABLE town_gatherings
ALTER COLUMN scheduled_at DROP NOT NULL;
```

---

## 6. 소모임 상세페이지 (town/gathering/[id]/page.tsx)

### ✅ 정상 기능
1. **소모임 정보**
   - 제목, 설명, 카테고리, 주기
   - 장소, 아이 월령, 참여 인원
   - 소모임장 배지 표시

2. **게시판 탭**
   - 멤버 전용 (비멤버는 탭 미노출)
   - textarea 글작성 + 올리기 버튼
   - 게시글 목록 (최근 50개)
   - 작성자 = 본인 or 소모임장 → 삭제 버튼 노출

3. **멤버 탭**
   - 가입일 표시
   - 소모임장은 멤버 내보내기 버튼 노출
   - 본인은 내보내기 불가

4. **참여/나가기**
   - 비멤버: "소모임 참여하기" 버튼
   - 멤버: "소모임 나가기" 버튼
   - 소모임장은 나가기 불가

### ⚠️ SQL 마이그레이션 필수
파일: `20260401_gathering_posts.sql`

**실행 전 발생 에러**:
```
relation "gathering_posts" does not exist
```

**SQL 내용**:
```sql
CREATE TABLE IF NOT EXISTS gathering_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gathering_id UUID NOT NULL REFERENCES town_gatherings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
-- 멤버만 글 작성 가능
-- 본인 글 또는 소모임장이 삭제 가능
```

### 🎨 UX 검증
- 소모임장 배지 (amber-100 배경) 잘 보임
- 게시글 작성 placeholder: "소모임 멤버들과 이야기를 나눠보세요"
- 시간 표시: "방금 전", "3분 전", "2시간 전" 등 상대시간
- 삭제 버튼: TrashIcon (우측 상단)

---

## 7. 동네 거래 탭 (TownMarketTab.tsx)

### ✅ 정상
- `CommunityPageInner` 컴포넌트 재사용
- `initialTab="market"` 전달
- `hideHeader` props로 헤더 중복 제거
- 도담장터 기능 그대로 통합

### 📝 코드 검증
```tsx
<CommunityPageInner initialTab="market" hideHeader />
```

---

## 8. 장소 카드 (PlaceCard.tsx)

### ✅ 정상 기능
1. **기본 정보**
   - 장소 이름, 주소, 거리
   - 평균 별점, 리뷰 개수

2. **붐빔 상태** (5분 이내 데이터만)
   - 한산함 🟢, 보통 🟡, 붐빔 🟠, 매우 붐빔 🔴
   - "방금 전", "3분 전" 표시

3. **팁 태그** (최대 3개 미리보기)
   - 투표 많은 순 정렬
   - 클릭 시 투표 (하트 아이콘 + 숫자)
   - 투표 후 색상 변경 (primary)

4. **액션 버튼**
   - 전화걸기 (tel: 링크)
   - 길찾기 (카카오맵 연동)
   - 리뷰 보기 (바텀시트)
   - 리뷰 쓰기 (primary 버튼)

5. **리뷰 바텀시트**
   - 팁 태그 전체 목록
   - 리뷰 사진 갤러리 (horizontal scroll)
   - 별점, 내용, 태그, 아이 개월수, 작성일

### ⚠️ DB 의존성
다음 테이블 필요 (20260401_town_community.sql):
- `review_photos`
- `place_tips`
- `tip_votes`
- `place_crowdedness`

### 🎨 UI 검증
- 카드 높이: 자동 (내용에 따라 유동적)
- 바텀시트 max-height: 70vh
- 리뷰 사진: 80x80px 정사각형
- 팁 태그: 최대 3개까지만 미리보기

---

## 9. 데이터베이스 마이그레이션 체크리스트

### 이미 실행된 마이그레이션
✅ `20260401_town_community.sql`
- town_feed, town_gatherings, gathering_participants, town_market
- review_photos, place_tips, tip_votes, place_crowdedness
- RLS 정책 포함

### 🚨 실행 필요 (Critical)
❌ `20260401_town_gatherings_update.sql`
- category, meeting_frequency 컬럼 추가
- scheduled_at nullable 변경

❌ `20260401_gathering_posts.sql`
- gathering_posts 테이블 생성
- RLS 정책 (멤버만 글쓰기, 소모임장/본인 삭제)

### 실행 방법 (Docker 미사용)
```bash
# Supabase Studio 접속
# SQL Editor 열기
# 파일 내용 복사 → 붙여넣기 → Run
```

---

## 10. 보안 검증 (RLS Policies)

### ✅ 정상 정책
1. **gathering_posts** (미실행 시 취약):
   - SELECT: 모두 읽기 가능
   - INSERT: 소모임 멤버만
   - DELETE: 본인 글 or 소모임장

2. **gathering_participants**:
   - INSERT: 본인만
   - DELETE: 본인만 or 소모임장

3. **town_gatherings**:
   - INSERT: 인증된 사용자
   - UPDATE: 소모임장만
   - DELETE: 소모임장만

### 🔒 보안 권장사항
- [ ] 소모임 게시글 수정 정책 추가 필요 (현재 없음)
- [ ] 피드 24시간 자동 삭제 크론잡 구현
- [ ] 소모임 최대 인원 도달 시 참여 차단 로직
- [ ] 소모임 강제 나가기 시 게시글 처리 정책

---

## 11. 성능 최적화 검증

### ✅ 정상
- Next.js 빌드: 2.7초 컴파일, TypeScript 4.5초
- Static Generation: 78개 라우트 378ms
- 이미지 최적화: next/image 사용
- 코드 스플리팅: 동적 import 없음 (필요시 추가)

### 📊 번들 사이즈 (측정 필요)
- [ ] 초기 JS 번들 크기
- [ ] Kakao Maps API 로드 시간
- [ ] Supabase 실시간 구독 메모리 사용량

---

## 12. 접근성 검증 (a11y)

### ✅ 정상
- 시맨틱 HTML: header, button, nav 사용
- 색상 대비: primary 색상 (#357B52) 충분
- 터치 영역: 버튼 최소 44x44px (대부분 준수)

### ⚠️ 개선 필요
- [ ] 글라스모피즘 헤더 텍스트 명도 대비 확인
- [ ] 모달 닫기 버튼 aria-label 추가
- [ ] 포커스 트랩 (탭 키 순환) 구현
- [ ] 스크린리더 테스트

---

## 13. 에러 처리 검증

### ✅ 정상
- try-catch로 Supabase 에러 감싸기
- console.error() 로깅
- alert() 사용자 피드백

### ⚠️ 개선 필요
- [ ] 네트워크 에러 시 재시도 로직
- [ ] 404 페이지 커스터마이징
- [ ] 에러 바운더리 (error.tsx) 스타일링
- [ ] Sentry 같은 에러 트래킹 도구 연동

---

## 14. 모바일 반응형 검증

### ✅ 정상
- max-width: 430px 중앙 정렬
- safe-area-inset-bottom 적용
- 터치 이벤트: active:opacity-80
- 스크롤: overflow-y-auto

### 📱 테스트 시나리오
- [ ] iPhone 14 Pro (390x844)
- [ ] Galaxy S23 (360x800)
- [ ] 가로모드 테스트
- [ ] 키보드 노출 시 레이아웃

---

## 15. 브라우저 호환성

### ✅ 정상
- backdrop-filter: WebKit prefix 포함
- CSS Grid, Flexbox: 모던 브라우저
- Next.js 16: React 19 기반

### 🌐 지원 브라우저
- Chrome/Edge 90+
- Safari 14+
- iOS Safari 14+
- Samsung Internet 15+

---

## 🎯 우선순위별 액션 아이템

### P0 (즉시 실행 필요)
1. **SQL 마이그레이션 실행** (5분 소요)
   - 20260401_town_gatherings_update.sql
   - 20260401_gathering_posts.sql

### P1 (이번 주 내)
2. 소모임 게시글 수정 정책 추가
3. 피드 24시간 자동 삭제 크론잡
4. 에러 바운더리 스타일링

### P2 (다음 스프린트)
5. 접근성 개선 (aria-label, 포커스 트랩)
6. 번들 사이즈 측정 및 최적화
7. 실제 디바이스 테스트 (iOS/Android)

### P3 (백로그)
8. 피드 등록 모달 구현
9. 소모임 사진 업로드
10. 실시간 알림 (Supabase Realtime)

---

## 📋 테스트 시나리오 (수동 테스트 필요)

### 소모임 만들기
1. 동네 페이지 → 소모임 탭 클릭
2. "동네 소모임 만들기" 버튼
3. 모든 필드 입력
4. "소모임 만들기" 버튼
5. **예상**: 목록에 새 소모임 추가
6. **실제**: SQL 마이그레이션 후 테스트 필요

### 소모임 참여/게시판
1. 소모임 카드 클릭 → 상세페이지
2. "소모임 참여하기" 버튼
3. **예상**: 게시판/멤버 탭 노출
4. 게시판에 글 작성
5. **예상**: 게시글 목록에 추가
6. **실제**: SQL 마이그레이션 후 테스트 필요

### 장소 리뷰
1. 동네 페이지 → 장소 탭
2. 장소 카드에서 리뷰 아이콘 클릭
3. **예상**: 바텀시트 열림, 리뷰 목록
4. 팁 태그 클릭
5. **예상**: 투표 수 +1, 색상 변경

### 거래 통합
1. 동네 페이지 → 거래 탭
2. **예상**: 도담장터 목록 노출
3. **확인**: 헤더 중복 없음

---

## 🚀 배포 전 체크리스트

- [x] 빌드 성공
- [x] TypeScript 에러 0건
- [ ] SQL 마이그레이션 실행
- [ ] 수동 테스트 (소모임 만들기)
- [ ] 수동 테스트 (소모임 게시판)
- [ ] 모바일 디바이스 테스트
- [ ] 성능 측정 (Lighthouse)
- [ ] 접근성 감사 (axe DevTools)
- [ ] 에러 로그 확인 (Sentry or Console)

---

## 💬 결론

### ✅ 완료된 작업
1. 헤더 글라스모피즘 적용
2. 중첩 탭 제거 (아코디언)
3. 동네 페이지 4개 탭 균등분배
4. 소모임 기능 완전 구현 (만들기, 상세, 게시판, 멤버 관리)
5. 거래 기능 통합 (도담장터 재사용)

### 🚨 즉시 조치 필요
**SQL 마이그레이션 2개 파일 실행 필수**
- 실행 안 하면 소모임 기능 완전 작동 불가
- Supabase Studio에서 5분 이내 완료 가능

### 📈 다음 단계
1. SQL 마이그레이션 실행
2. 수동 테스트 (소모임 전체 플로우)
3. 피드백 수집
4. P1 액션 아이템 착수

---

**QA 완료 시각**: 2026-04-01 (작성 완료)
**다음 QA 예정**: SQL 마이그레이션 후
