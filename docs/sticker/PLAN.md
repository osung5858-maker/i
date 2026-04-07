# PLAN: 도담 발자국 — v3.5 (12종)

> v3.5: v4의 간결한 구조 + 12종 발자국 (영역당 2~3개)

## 개요

도담 앱 활동을 기반으로 **퀘스트를 달성하면 발자국이 찍히는** 시스템.
"도담 N걸음" 으로 프로필에 활동도 표시. 단순한 구조, 적당한 볼륨.

### 핵심
- 발자국 **12종** (쉬운 7종 + 도전 5종 → 초반 달성감 + 장기 동기부여)
- 등급 없음
- DB 테이블 1개 + RPC 함수 2개
- 1 Phase, 6 Task

---

## Template Foundation
- **frontend_template**: none (기존 dodam 코드베이스에 기능 추가)
- **strategy**: incremental

---

## 발자국 목록 (12종)

### 쉬운 발자국 (7종 — 대부분 사용자가 빠르게 달성)
| # | ID | 이모지 | 라벨 | 조건 | 영역 |
|---|-----|--------|------|------|------|
| 1 | `first_listing` | 📦 | 첫 출품 | 장터 아이템 등록 1회 | 장터 |
| 2 | `first_trade` | 🏪 | 첫 거래 | 거래 완료 1회 | 장터 |
| 3 | `first_share` | 🎁 | 첫 나눔 | 무료 나눔 1회 | 장터 |
| 4 | `first_post` | 📝 | 첫 게시글 | 소모임 게시글 1개 | 커뮤니티 |
| 5 | `first_review` | 📍 | 첫 리뷰 | 장소 리뷰 1개 | 리뷰 |
| 6 | `first_record` | 📋 | 첫 기록 | 육아 이벤트 1건 | 육아 |
| 7 | `profile_done` | 🌟 | 프로필 완성 | 닉네임+동네+모드 설정 | 생활 |

### 도전 발자국 (5종 — 꾸준한 활동 필요)
| # | ID | 이모지 | 라벨 | 조건 | 영역 |
|---|-----|--------|------|------|------|
| 8 | `trade_10` | 👑 | 장터의 왕 | 거래 완료 10회 | 장터 |
| 9 | `comment_10` | 💬 | 수다왕 | 댓글 10개 작성 | 커뮤니티 |
| 10 | `review_photo` | 📸 | 포토 리뷰어 | 사진 포함 리뷰 3개 | 리뷰 |
| 11 | `record_100` | 📊 | 꼼꼼한 부모 | 육아 이벤트 100건 | 육아 |
| 12 | `all_rounder` | 🎯 | 올라운더 | 장터+커뮤+리뷰+육아 각 1회 이상 | 생활 |

> **왜 12종?** 쉬운 7종으로 초반 달성감 + 도전 5종으로 장기 동기부여. 카테고리 탭 없이 2줄 그리드로 깔끔.

---

## 데이터 모델

### 신규 테이블: `user_footprints`
```sql
CREATE TABLE user_footprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  footprint_id TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, footprint_id)
);

ALTER TABLE user_footprints ENABLE ROW LEVEL SECURITY;

-- 누구나 조회 가능 (프로필 표시용)
CREATE POLICY "user_footprints_select" ON user_footprints
  FOR SELECT USING (true);

-- INSERT는 achieve_footprint RPC 통해서만
```

### `user_profiles` 확장
```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS footprint_ids TEXT[] DEFAULT '{}';
-- "도담 N걸음" = array_length(footprint_ids, 1)
```

### 퀘스트 진행 조회 함수
```sql
CREATE OR REPLACE FUNCTION get_quest_progress(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'items_listed', (SELECT COUNT(*) FROM market_items WHERE user_id = p_user_id),
    'trades_done', (SELECT COUNT(*) FROM market_items WHERE user_id = p_user_id AND status = 'done'),
    'shares_done', (SELECT COUNT(*) FROM market_items WHERE user_id = p_user_id AND status = 'done' AND (transaction_type = 'give' OR price = 0)),
    'posts', (SELECT COUNT(*) FROM gathering_posts WHERE user_id = p_user_id),
    'comments', (SELECT COUNT(*) FROM gathering_post_comments WHERE user_id = p_user_id),
    'reviews', (SELECT COUNT(*) FROM reviews WHERE user_id = p_user_id),
    'reviews_with_photo', (
      SELECT COUNT(DISTINCT r.id) FROM reviews r
      JOIN review_photos rp ON rp.review_id = r.id
      WHERE r.user_id = p_user_id
    ),
    'events', (
      SELECT COUNT(*) FROM events e
      JOIN children c ON c.id = e.child_id
      WHERE c.user_id = p_user_id
    ),
    'profile_complete', (
      SELECT (chosen_nickname IS NOT NULL AND region IS NOT NULL AND mode IS NOT NULL)::BOOLEAN
      FROM user_profiles WHERE user_id = p_user_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 발자국 달성 함수
```sql
CREATE OR REPLACE FUNCTION achieve_footprint(p_user_id UUID, p_footprint_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_footprints (user_id, footprint_id)
  VALUES (p_user_id, p_footprint_id)
  ON CONFLICT (user_id, footprint_id) DO NOTHING;

  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE user_profiles
  SET footprint_ids = array_append(footprint_ids, p_footprint_id)
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 코드 상수

```typescript
// src/lib/constants/footprints.ts

export interface FootprintDef {
  emoji: string
  label: string
  condition: { field: string; target: number } | { type: 'profile_complete' } | { type: 'all_rounder' }
  description: string
}

export const FOOTPRINTS: Record<string, FootprintDef> = {
  // 쉬운 발자국 (7종)
  first_listing: { emoji: '📦', label: '첫 출품',     condition: { field: 'items_listed', target: 1 },  description: '장터에 첫 아이템을 등록하세요' },
  first_trade:   { emoji: '🏪', label: '첫 거래',     condition: { field: 'trades_done', target: 1 },   description: '장터에서 첫 거래를 완료하세요' },
  first_share:   { emoji: '🎁', label: '첫 나눔',     condition: { field: 'shares_done', target: 1 },   description: '무료 나눔을 처음 해보세요' },
  first_post:    { emoji: '📝', label: '첫 게시글',    condition: { field: 'posts', target: 1 },         description: '소모임에 첫 글을 작성하세요' },
  first_review:  { emoji: '📍', label: '첫 리뷰',     condition: { field: 'reviews', target: 1 },       description: '장소 리뷰를 처음 작성하세요' },
  first_record:  { emoji: '📋', label: '첫 기록',     condition: { field: 'events', target: 1 },        description: '육아 이벤트를 처음 기록하세요' },
  profile_done:  { emoji: '🌟', label: '프로필 완성',  condition: { type: 'profile_complete' },           description: '닉네임, 동네, 모드를 모두 설정하세요' },

  // 도전 발자국 (5종)
  trade_10:      { emoji: '👑', label: '장터의 왕',    condition: { field: 'trades_done', target: 10 },  description: '거래를 10회 완료하세요' },
  comment_10:    { emoji: '💬', label: '수다왕',       condition: { field: 'comments', target: 10 },     description: '댓글을 10개 작성하세요' },
  review_photo:  { emoji: '📸', label: '포토 리뷰어',  condition: { field: 'reviews_with_photo', target: 3 }, description: '사진 포함 리뷰를 3개 작성하세요' },
  record_100:    { emoji: '📊', label: '꼼꼼한 부모',  condition: { field: 'events', target: 100 },      description: '육아 기록 100건을 달성하세요' },
  all_rounder:   { emoji: '🎯', label: '올라운더',    condition: { type: 'all_rounder' },                description: '장터, 커뮤니티, 리뷰, 육아를 모두 경험하세요' },
} as const
```

---

## UI 설계

### 발자국 페이지 (`/footprints`)
```
┌─────────────────────────────┐
│ ← 내 발자국                  │
│                             │
│        👣                    │
│     도담 7걸음               │
│ ████████████████░░░ 7/12   │
│                             │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐│
│ │ 📦 │ │ 🏪 │ │ 🎁 │ │ 📝 ││
│ │첫출품│ │첫거래│ │첫나눔│ │첫글 ││
│ │ 👣  │ │ 👣  │ │ 👣  │ │ 👣  ││
│ └────┘ └────┘ └────┘ └────┘│
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐│
│ │ 📍 │ │ 📋 │ │ 🌟 │ │🔒👑││
│ │첫리뷰│ │첫기록│ │완성 │ │ ?? ││
│ │ 👣  │ │ 👣  │ │ 👣  │ │3/10││
│ └────┘ └────┘ └────┘ └────┘│
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐│
│ │🔒💬│ │🔒📸│ │🔒📊│ │🔒🎯││
│ │ ?? │ │ ?? │ │ ?? │ │ ?? ││
│ │5/10│ │1/3 │ │42/ │ │3/4 ││
│ └────┘ └────┘ │100 │ └────┘│
│               └────┘       │
└─────────────────────────────┘
```

### 달성 토스트 (기존 toast 재사용)
```
👣 새 발자국을 남겼어요! 🏪 첫 거래
```

---

## 구현 순서 (1 Phase)

| # | Task | 파일 | 설명 |
|---|------|------|------|
| 1 | DB migration | `supabase/migrations/20260408_footprints.sql` (신규) | user_footprints + user_profiles 확장 + 2 RPC 함수 |
| 2 | 발자국 상수 | `src/lib/constants/footprints.ts` (신규) | 12종 정의 |
| 3 | Supabase 래퍼 | `src/lib/supabase/footprint.ts` (신규) | getQuestProgress, achieveFootprint, getMyFootprints |
| 4 | 발자국 페이지 | `src/app/footprints/page.tsx` (신규) | 컬렉션 + 진행률 + 상세 |
| 5 | 설정 메뉴 추가 | 설정 페이지 (수정) | "내 발자국" 메뉴 항목 |
| 6 | 거래완료 시 체크 | `src/app/chat/[chatId]/page.tsx` (수정) | updateItemStatus('done') 후 퀘스트 체크 |

---

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `supabase/migrations/20260408_footprints.sql` | 신규 |
| `src/lib/constants/footprints.ts` | 신규 |
| `src/lib/supabase/footprint.ts` | 신규 |
| `src/app/footprints/page.tsx` | 신규 |
| `src/app/chat/[chatId]/page.tsx` | 수정 (거래완료 후 체크 추가) |
| 설정 페이지 | 수정 (메뉴 추가) |

---

## 퀘스트 달성 흐름

```
(1) 사용자: 거래완료 / 글작성 / 리뷰작성 / 기록 등
       ↓
(2) 해당 페이지: 액션 성공 후
       ↓  (MVP: 거래완료만 액티브, 나머지는 컬렉션 진입 시 패시브)
(3) RPC: get_quest_progress(user_id)
       ↓
(4) 클라이언트: FOOTPRINTS 상수와 비교
       ↓ 조건 충족한 미달성 발자국 발견
(5) RPC: achieve_footprint(user_id, footprint_id)
       ↓
(6) toast("👣 새 발자국을 남겼어요! [이모지 라벨]")
```

**MVP 간소화:**
- **거래완료**만 액티브 체크 (채팅 페이지에서)
- **나머지 11종**은 컬렉션 페이지 진입 시 패시브 체크 (페이지 로드 시 자동 판정)
- Phase 2에서 각 액션별 액티브 체크 추가 가능

---

## 향후 확장 (Phase 2 — 나중에)

| 항목 | 설명 |
|------|------|
| 발자국 추가 | FOOTPRINTS 상수에 항목 추가 + get_quest_progress에 필드 추가 |
| 액티브 체크 확대 | 글작성, 리뷰작성, 육아기록 후에도 즉시 체크 |
| 프로필 배지 | 장터 아이템 상세에 "도담 N걸음" 표시 |
| 토스트 탭 이동 | 토스트 탭 시 컬렉션 페이지로 이동 |

---

## Complexity Pre-Classification

```yaml
phases: 1
total_tasks: 6
new_files: 4  # migration, footprints.ts, footprint.ts, footprints/page.tsx
modified_files: 2  # chat/[chatId], settings
db_migration: 1 (with 2 RPC functions)
classification: MODERATE
rationale: |
  - 1 Phase, 6 Task
  - 4개 신규 파일 → MODERATE (Greenfield Guard)
  - DB migration + 2 RPC 함수
  - 기존 페이지 수정 2곳 (소규모)
  - UI는 컬렉션 페이지 1개만
notes:
  - 발자국 12종 (쉬운 7종 + 도전 5종)
  - 카테고리 탭 없음, 등급 없음
  - 거래완료만 액티브 체크, 나머지는 패시브 (컬렉션 진입 시)
  - v4와 구조 동일, 상수+SQL에 4개 항목 추가한 수준
```
