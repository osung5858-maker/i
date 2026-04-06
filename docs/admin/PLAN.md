# 도담 어드민 대시보드 — PLAN.md
> Version: 1.0 | Created: 2026-04-06

## 1. 개요

도담 서비스 운영을 위한 통합 어드민 대시보드.
기존 Next.js 프로젝트 내 `/admin` 라우트로 구현하며, Supabase RLS + Custom Claims 기반 권한 체계를 사용한다.

### 1.1 목표
- 유저/콘텐츠/커뮤니티를 한 곳에서 관리
- 서비스 핵심 지표(DAU, MAU, 가입자, 게시글 수 등) 실시간 모니터링
- 신고 처리 및 콘텐츠 모더레이션 워크플로우

### 1.2 비목표 (Scope Out)
- CMS 수준의 콘텐츠 에디터 (1차에서 제외)
- 마케팅 자동화 / 푸시 발송 관리 (2차 확장)
- 재무/결제 관리 (마켓 기능이 실거래 미지원)

---

## 2. Template Foundation
- **frontend_template**: none (기존 도담 프로젝트 내 확장)
- **backend_template**: none (Supabase 기반, 추가 백엔드 불필요)
- **strategy**: extend (기존 프로젝트에 /admin 라우트 추가)

---

## 3. 아키텍처

### 3.1 C4 Level 1 — System Context

```
┌─────────────┐      ┌──────────────────────┐      ┌────────────┐
│  Admin User  │─────▶│   도담 Next.js App    │─────▶│  Supabase  │
│  (브라우저)    │      │  /admin/* 라우트       │      │  (DB+Auth) │
└─────────────┘      └──────────────────────┘      └────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Supabase Edge   │
                     │  Functions (옵션)  │
                     └──────────────────┘
```

### 3.2 인증/권한 구조

```
[Supabase Auth]
     │
     ▼
[Custom Claims: app_metadata.role = 'admin']
     │
     ▼
[Middleware: /admin/* 접근 시 role 체크]
     │
     ├─ role=admin → 허용
     └─ else → /onboarding 리다이렉트
```

**권한 체계:**
- `app_metadata.role = 'admin'` — Supabase Custom Claims 활용
- DB에 별도 admin 테이블 없이, JWT claims로 판별
- Service Role Key는 서버 API 라우트에서만 사용

### 3.3 라우트 구조

```
/admin
  ├── layout.tsx          ← 어드민 전용 레이아웃 (사이드바 + 헤더)
  ├── page.tsx            ← 대시보드 (통계 개요)
  ├── users/
  │   ├── page.tsx        ← 유저 목록 (검색, 필터, 페이지네이션)
  │   └── [userId]/
  │       └── page.tsx    ← 유저 상세 (프로필, 활동 내역, 제재)
  ├── posts/
  │   ├── page.tsx        ← 게시글 목록 (board_type 필터)
  │   └── [postId]/
  │       └── page.tsx    ← 게시글 상세 (댓글, 좋아요, 삭제/숨김)
  ├── reports/
  │   └── page.tsx        ← 신고 관리 (pending/reviewed/resolved)
  ├── places/
  │   └── page.tsx        ← 장소 관리 (인증, 정보 수정)
  ├── ads/
  │   └── page.tsx        ← 광고 슬롯 온/오프 관리
  ├── analytics/
  │   └── page.tsx        ← 페이지 애널리틱스 (조회수, 이벤트)
  └── stats/
      └── page.tsx        ← 상세 통계 (차트, 기간별 비교)
```

### 3.4 레이아웃

어드민은 도담 앱과 **완전히 분리된 레이아웃** 사용:
- 모바일 max-width 제한 없음 (데스크톱 최적화)
- BottomNav, GlobalHeader, SplashScreen 등 앱 UI 미표시
- 독자적 사이드바 + 상단바 레이아웃

---

## 4. 기능 명세

### 4.1 대시보드 (Dashboard)
| 지표 | 데이터 소스 | 표시 방식 |
|------|-----------|----------|
| 총 가입자 수 | auth.users COUNT | 숫자 카드 |
| DAU (오늘 접속) | events/posts 기준 DISTINCT user_id | 숫자 카드 |
| MAU (월간 활성) | 동일 로직 30일 범위 | 숫자 카드 |
| 오늘 신규 가입 | auth.users created_at = today | 숫자 카드 |
| 게시글 수 (오늘/전체) | posts COUNT | 숫자 카드 |
| 미처리 신고 | gathering_post_reports status=pending | 배지 카드 |
| 모드별 유저 분포 | user_profiles mode GROUP BY | 파이 차트 |
| 일별 가입 추이 (7일) | auth.users GROUP BY date | 라인 차트 |

### 4.2 유저 관리 (Users)
- **목록**: 이메일, 닉네임, 모드, 가입일, 상태 표시
- **검색**: 이메일/닉네임 검색
- **필터**: 모드(preparing/pregnant/parenting), 상태(active/withdrawn)
- **상세**: 프로필 정보, 자녀 목록, 게시글/댓글 수, 최근 활동
- **액션**: 상태 변경(active↔withdrawn), 게시글 일괄 숨김

### 4.3 게시글 관리 (Posts)
- **목록**: 내용 미리보기, 작성자, board_type, 좋아요/댓글 수, 작성일
- **필터**: board_type(general/region/birth_month/qna)
- **상세**: 전체 내용, 댓글 목록, 사진
- **액션**: 삭제, 숨김(soft delete)

### 4.4 신고 관리 (Reports)
- **목록**: 신고 사유, 대상 게시글, 신고자, 상태, 신고일
- **필터**: 상태(pending/reviewed/resolved/dismissed)
- **액션**: 상태 변경, 게시글 삭제/숨김, 신고 기각

### 4.5 장소 관리 (Places)
- **목록**: 이름, 카테고리, 인증 여부, 평점, 리뷰 수
- **필터**: 카테고리, verified 여부
- **액션**: verified 토글, 정보 수정

### 4.6 상세 통계 (Stats)
- 기간 선택 (7일/30일/90일/커스텀)
- 가입자 추이 차트
- 게시글/댓글 추이 차트
- 모드별 분포 변화
- 인기 게시글 Top 10

### 4.7 광고 관리 (Ads)
현재 KakaoAdFit + GoogleAdBanner 컴포넌트가 존재하지만 전부 주석 처리 상태.
어드민에서 광고 표시 여부를 제어한다.

- **광고 슬롯 목록**: 페이지별 광고 위치 (홈 배너, 알림 상단, 피드 내 등)
- **온/오프 토글**: 슬롯별 활성화 여부 (DB 기반, 실시간 반영)
- **광고 설정**: 슬롯별 provider(kakao/google), unit ID, 사이즈
- **구현 방식**: `ad_settings` 테이블에 슬롯 설정 저장 → 클라이언트에서 API로 조회 → 활성 슬롯만 렌더링

| 슬롯 위치 | 페이지 | 기본 상태 |
|----------|--------|----------|
| home_banner | / (홈) | OFF |
| notification_top | /notifications | OFF |
| community_feed | /community | OFF |
| post_detail_bottom | /post/[id] | OFF |

### 4.8 페이지 애널리틱스 (Analytics)
기존 `analytics.ts` + `AnalyticsPageView` 컴포넌트를 활용한 페이지 통계.

- **페이지뷰 대시보드**: 페이지별 조회수, 일별 추이
- **인기 페이지 Top 10**: 기간별 가장 많이 방문한 페이지
- **유저 흐름**: 주요 경로 (온보딩 → 홈 → 기록 등)
- **데이터 소스**:
  - 단기: 기존 Vercel Analytics 대시보드 링크 + 앱 내 이벤트 큐 활용
  - 중기: `page_views` 테이블 신설 → 서버 사이드 로깅 → 어드민에서 직접 조회

| 지표 | 표시 방식 |
|------|----------|
| 오늘 총 페이지뷰 | 숫자 카드 |
| 페이지별 조회수 (상위 10) | 바 차트 |
| 일별 페이지뷰 추이 | 라인 차트 |
| 이벤트별 발생 수 | 테이블 |

---

## 5. 기술 스택

| 영역 | 기술 | 근거 |
|------|------|------|
| Framework | Next.js 16 (기존) | 프로젝트 통합 |
| Styling | Tailwind CSS 4 (기존) | 일관성 |
| 차트 | Recharts | 가벼움, React 네이티브 |
| 테이블 | @tanstack/react-table | 정렬/필터/페이지네이션 |
| 날짜 선택 | react-day-picker | 경량 |
| DB | Supabase (기존) | 추가 인프라 불필요 |
| 인증 | Supabase Custom Claims | JWT 기반 role 체크 |

---

## 6. DB 변경사항

### 6.1 신규 테이블

```sql
-- 어드민 감사 로그
CREATE TABLE admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,          -- 'user_suspend', 'post_delete', 'report_resolve' 등
  target_type TEXT NOT NULL,     -- 'user', 'post', 'report', 'place'
  target_id UUID NOT NULL,
  details JSONB DEFAULT '{}',    -- 변경 전/후 데이터
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_log_target ON admin_audit_log(target_type, target_id);
```

```sql
-- 광고 슬롯 설정
CREATE TABLE ad_settings (
  id TEXT PRIMARY KEY,               -- 'home_banner', 'notification_top' 등
  enabled BOOLEAN DEFAULT FALSE,
  provider TEXT CHECK (provider IN ('kakao', 'google')),
  unit_id TEXT,                       -- AdFit DAN-xxx 또는 AdSense slot ID
  width INTEGER DEFAULT 320,
  height INTEGER DEFAULT 100,
  page_path TEXT NOT NULL,            -- '/', '/notifications' 등
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 페이지뷰 로그 (서버 사이드 기록)
CREATE TABLE page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- NULL 허용 (비로그인)
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_views_path ON page_views(path, created_at DESC);
CREATE INDEX idx_page_views_date ON page_views(created_at DESC);
```

### 6.2 기존 테이블 변경

```sql
-- posts: soft delete 지원
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES auth.users(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

-- posts 기존 RLS 수정: hidden=false만 일반 유저에게 노출
-- 어드민은 hidden 포함 전체 조회 가능

-- gathering_post_reports: 처리자 기록
ALTER TABLE gathering_post_reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE gathering_post_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE gathering_post_reports ADD COLUMN IF NOT EXISTS admin_note TEXT;
```

### 6.3 RLS 정책

```sql
-- 어드민 전용 정책 (Custom Claims 기반)
CREATE POLICY "admin_full_access" ON posts
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 일반 유저: hidden=false만 조회
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (hidden = false OR auth.uid() = user_id);
```

### 6.4 어드민 유저 설정 (1회성)

```sql
-- Supabase Dashboard > Authentication > Users에서 대상 유저 선택 후:
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
WHERE email = 'admin@dodam.app';
```

---

## 7. 마일스톤

| Phase | 범위 | 예상 규모 |
|-------|------|----------|
| **Phase 1** | 인증/레이아웃 + 대시보드 | 미들웨어, 레이아웃, 통계 카드 |
| **Phase 2** | 유저 관리 | 목록, 검색, 상세, 제재 |
| **Phase 3** | 게시글 + 신고 관리 | 목록, 상세, soft delete, 신고 처리 |
| **Phase 4** | 장소 관리 + 상세 통계 | 인증 토글, 차트 페이지 |
| **Phase 5** | 광고 관리 + 페이지 애널리틱스 | 광고 온오프, 페이지뷰 대시보드 |

---

## 8. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Custom Claims 갱신 지연 | JWT 만료 전까지 권한 변경 미반영 | 세션 강제 새로고침 안내 |
| 대규모 쿼리 성능 | 통계 집계 느림 | 필요 시 Materialized View 추가 |
| 기존 RLS 정책 충돌 | 어드민 접근 차단 | service_role API 라우트 활용 |
| 앱 레이아웃 간섭 | BottomNav 등 어드민에 노출 | 독립 layout.tsx로 완전 분리 |

---

## 9. ADR (Architecture Decision Records)

### ADR-001: 어드민 인증 방식
- **결정**: Supabase Custom Claims (app_metadata.role)
- **대안 검토**: 별도 admin_users 테이블 → 조인 비용, 동기화 이슈
- **근거**: JWT에 role이 포함되어 미들웨어에서 DB 조회 없이 판별 가능

### ADR-002: 레이아웃 분리 전략
- **결정**: /admin/layout.tsx에서 완전 독립 레이아웃
- **대안 검토**: 기존 layout.tsx에 조건부 렌더링 → 복잡도 증가
- **근거**: 어드민은 데스크톱 최적화, 앱은 모바일 최적화로 목적이 다름

### ADR-003: 차트 라이브러리
- **결정**: Recharts
- **대안 검토**: Chart.js (Canvas 기반, SSR 어려움), D3 (과도한 복잡도)
- **근거**: React 네이티브, SVG 기반 SSR 호환, 번들 사이즈 적정

### ADR-004: 테이블 라이브러리
- **결정**: @tanstack/react-table (headless)
- **대안 검토**: AG Grid (무거움), 자체 구현 (시간 소모)
- **근거**: Headless이므로 Tailwind와 자연스럽게 통합, 정렬/필터/페이지네이션 내장
