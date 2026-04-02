# 소모임 추가 기능 SQL 마이그레이션 가이드

## 📊 개요

소모임 기능 강화를 위한 3개 테이블 추가:
1. **user_gathering_bookmarks** - 소모임 북마크
2. **gathering_post_likes** - 게시글 좋아요
3. **gathering_post_reports** - 게시글 신고

---

## 🚀 실행 방법

### 1. Supabase Studio 접속
1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택
3. 좌측 메뉴 **SQL Editor** 클릭

### 2. SQL 실행
1. **New Query** 버튼 클릭
2. 아래 파일 내용 복사 붙여넣기:
   ```
   supabase/migrations/20260402_gathering_features.sql
   ```
3. **Run** 버튼 클릭 (또는 Cmd/Ctrl + Enter)

### 3. 실행 확인
성공 시 다음 메시지가 표시됩니다:
```
✅ 소모임 추가 기능 테이블 생성 완료
- user_gathering_bookmarks: 북마크 관리
- gathering_post_likes: 게시글 좋아요
- gathering_post_reports: 게시글 신고
- 집계 함수 3개 생성 완료
```

### 4. 테이블 확인
좌측 메뉴 **Table Editor**에서 다음 테이블 생성 확인:
- ✅ user_gathering_bookmarks
- ✅ gathering_post_likes
- ✅ gathering_post_reports

---

## 📋 생성되는 것들

### 테이블 3개

#### 1. user_gathering_bookmarks
```sql
컬럼:
- user_id (UUID, FK) - 사용자
- gathering_id (UUID, FK) - 소모임
- created_at (TIMESTAMPTZ) - 북마크 시각

PRIMARY KEY: (user_id, gathering_id)
RLS: 본인만 관리 가능
```

#### 2. gathering_post_likes
```sql
컬럼:
- post_id (UUID, FK) - 게시글
- user_id (UUID, FK) - 사용자
- created_at (TIMESTAMPTZ) - 좋아요 시각

PRIMARY KEY: (post_id, user_id)
RLS: 모두 읽기, 본인만 추가/삭제
```

#### 3. gathering_post_reports
```sql
컬럼:
- id (UUID, PK) - 신고 ID
- post_id (UUID, FK) - 게시글
- reporter_id (UUID, FK) - 신고자
- reason (TEXT) - 신고 사유
- status (TEXT) - 처리 상태 (pending/reviewed/resolved/dismissed)
- created_at (TIMESTAMPTZ) - 신고 시각

UNIQUE: (post_id, reporter_id) - 중복 신고 방지
RLS: 본인만 생성/조회
```

### 함수 3개

#### 1. get_post_like_count(post_uuid UUID)
```sql
기능: 게시글의 좋아요 수 반환
반환: INTEGER
사용: SELECT get_post_like_count('게시글UUID');
```

#### 2. user_liked_post(post_uuid UUID, user_uuid UUID)
```sql
기능: 특정 사용자가 게시글에 좋아요 했는지 확인
반환: BOOLEAN
사용: SELECT user_liked_post('게시글UUID', '사용자UUID');
```

#### 3. get_post_report_count(post_uuid UUID)
```sql
기능: 게시글의 미처리 신고 수 반환
반환: INTEGER
사용: SELECT get_post_report_count('게시글UUID');
```

---

## 🔍 클라이언트 코드 연동 예시

### 1. 북마크 추가/제거

```typescript
// 북마크 추가
const { error } = await supabase
  .from('user_gathering_bookmarks')
  .insert({ gathering_id: gatheringId })

// 북마크 제거
await supabase
  .from('user_gathering_bookmarks')
  .delete()
  .eq('gathering_id', gatheringId)

// 북마크 여부 확인
const { data } = await supabase
  .from('user_gathering_bookmarks')
  .select('*')
  .eq('gathering_id', gatheringId)
  .single()

const isBookmarked = !!data
```

### 2. 좋아요 추가/제거

```typescript
// 좋아요 추가
await supabase
  .from('gathering_post_likes')
  .insert({ post_id: postId })

// 좋아요 제거
await supabase
  .from('gathering_post_likes')
  .delete()
  .eq('post_id', postId)

// 게시글과 함께 좋아요 정보 조회
const { data: posts } = await supabase
  .from('gathering_posts')
  .select(`
    *,
    like_count:gathering_post_likes(count),
    user_liked:gathering_post_likes!inner(user_id)
  `)
```

### 3. 신고 추가

```typescript
// 게시글 신고
const { error } = await supabase
  .from('gathering_post_reports')
  .insert({
    post_id: postId,
    reason: '부적절한 내용'
  })

if (error?.code === '23505') {
  // UNIQUE 제약 위반 - 이미 신고함
  alert('이미 신고한 게시글입니다')
} else {
  alert('신고가 접수되었습니다')
}
```

---

## 🛠 클라이언트 코드 수정 필요

### src/app/town/gathering/[id]/page.tsx

#### 1. 북마크 상태 로드 (loadData 함수)
```typescript
// TODO 제거하고 실제 쿼리로 변경
const { data: bookmarkData } = await supabase
  .from('user_gathering_bookmarks')
  .select('*')
  .eq('gathering_id', resolvedParams.id)
  .eq('user_id', user.id)
  .single()

setBookmarked(!!bookmarkData)
```

#### 2. 북마크 토글 (헤더 버튼)
```typescript
const handleBookmark = async () => {
  if (bookmarked) {
    await supabase
      .from('user_gathering_bookmarks')
      .delete()
      .eq('gathering_id', resolvedParams.id)
  } else {
    await supabase
      .from('user_gathering_bookmarks')
      .insert({ gathering_id: resolvedParams.id })
  }
  setBookmarked(!bookmarked)
}
```

#### 3. 좋아요 데이터 로드 (line 118-124)
```typescript
// TODO 제거하고 실제 쿼리로 변경
const { data: postsWithLikes } = await supabase
  .from('gathering_posts')
  .select(`
    *,
    likes:gathering_post_likes(count),
    user_like:gathering_post_likes(user_id)
  `)
  .eq('gathering_id', resolvedParams.id)

setPosts(postsWithLikes.map(p => ({
  ...p,
  likeCount: p.likes[0]?.count || 0,
  liked: p.user_like.some((u: any) => u.user_id === user.id)
})))
```

#### 4. 좋아요 토글 (line 212-225)
```typescript
const handleLikePost = async (postId: string) => {
  const post = posts.find(p => p.id === postId)
  if (!post) return

  if (post.liked) {
    await supabase
      .from('gathering_post_likes')
      .delete()
      .eq('post_id', postId)
  } else {
    await supabase
      .from('gathering_post_likes')
      .insert({ post_id: postId })
  }

  // 클라이언트 상태 업데이트 (기존 코드 유지)
  setPosts(posts.map(p => {
    if (p.id === postId) {
      const newLiked = !p.liked
      return {
        ...p,
        liked: newLiked,
        likeCount: (p.likeCount || 0) + (newLiked ? 1 : -1)
      }
    }
    return p
  }))
}
```

#### 5. 신고 제출 (line 227-231)
```typescript
const handleReportPost = async (postId: string) => {
  if (!confirm('이 게시글을 신고하시겠어요?')) return

  const { error } = await supabase
    .from('gathering_post_reports')
    .insert({
      post_id: postId,
      reason: '부적절한 내용' // 추후 신고 사유 선택 UI 추가 가능
    })

  if (error?.code === '23505') {
    alert('이미 신고한 게시글입니다')
  } else if (error) {
    alert('신고 접수에 실패했습니다')
  } else {
    alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.')
  }
}
```

---

## ⚠️ 주의사항

### 1. 중복 실행 방지
- `CREATE TABLE IF NOT EXISTS` 사용으로 중복 실행 시 에러 없음
- `DROP POLICY IF EXISTS` 사용으로 정책 재생성 안전

### 2. 외래키 제약
- 게시글 삭제 시 관련 좋아요/신고 자동 삭제 (`ON DELETE CASCADE`)
- 사용자 삭제 시 관련 북마크/좋아요/신고 자동 삭제

### 3. RLS 정책
- 북마크: 본인만 관리
- 좋아요: 모두 읽기, 본인만 추가/삭제
- 신고: 본인만 생성/조회 (관리자는 service_role로 전체 조회)

### 4. 성능 고려
- 모든 JOIN 컬럼에 인덱스 생성됨
- 집계 함수는 STABLE로 최적화

---

## 📊 예상 효과

### 사용자 경험
- ✅ 소모임 북마크로 빠른 재방문
- ✅ 게시글 좋아요로 소통 활성화
- ✅ 신고 시스템으로 커뮤니티 자정

### 관리자 대시보드 (향후)
```sql
-- 신고 많은 게시글 조회
SELECT p.*, COUNT(r.id) as report_count
FROM gathering_posts p
JOIN gathering_post_reports r ON p.id = r.post_id
WHERE r.status = 'pending'
GROUP BY p.id
HAVING COUNT(r.id) >= 3
ORDER BY report_count DESC;

-- 인기 게시글 조회
SELECT p.*, COUNT(l.user_id) as like_count
FROM gathering_posts p
JOIN gathering_post_likes l ON p.id = l.post_id
GROUP BY p.id
ORDER BY like_count DESC
LIMIT 10;
```

---

## ✅ 실행 완료 체크리스트

- [ ] SQL 파일 실행 완료
- [ ] 3개 테이블 생성 확인
- [ ] 3개 함수 생성 확인
- [ ] 클라이언트 코드 TODO 제거 및 실제 쿼리로 교체
- [ ] 북마크 기능 테스트
- [ ] 좋아요 기능 테스트
- [ ] 신고 기능 테스트
- [ ] 중복 신고 방지 확인

---

**작성일**: 2026-04-02
**SQL 파일**: `supabase/migrations/20260402_gathering_features.sql`
**다음 단계**: SQL 실행 → 클라이언트 코드 수정 → 기능 테스트
