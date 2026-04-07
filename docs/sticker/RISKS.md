# RISKS: 도담 발자국 — v3.5 (12종)

## 리스크 매트릭스

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|------|------|------|
| R1 | `get_quest_progress` 성능 — 9개 서브쿼리 | 낮음 | 중간 | 모두 user_id 인덱스 활용. 컬렉션 진입 시 1회만 호출. |
| R2 | user_profiles ALTER 충돌 | 낮음 | 높음 | `ADD COLUMN IF NOT EXISTS`. footprint_ids만 추가. |
| R3 | 12종이 빠르게 끝남 | 중간 | 낮음 | 쉬운 7종은 빠른 달성감 의도. 도전 5종(거래10, 댓글10, 포토리뷰3, 기록100, 올라운더)은 장기 동기부여. |

## 핵심 의사결정

### D1: v3.5 — 12종 (쉬운 7 + 도전 5)
- **근거**: v4(8종)는 너무 빨리 끝남. v3(20종)는 과다. 12종이 초반 달성감 + 장기 목표의 균형점.

### D2: 패시브 체크 중심
- **근거**: 컬렉션 페이지 진입 시 일괄 체크. 기존 코드 수정 최소화 (거래완료만 액티브).

### D3: 나눔 카운트에 transaction_type 사용
- **근거**: `price = 0`만으로는 교환(exchange) 건도 포함될 수 있음. `transaction_type = 'give' OR price = 0` 조합 사용.

### D4: 등급 없음
- **근거**: "도담 N걸음"으로 활동도 표현. 등급(브론즈/실버/골드)은 사용자에게 와닿지 않음.

### D5: review_photos JOIN
- **근거**: `reviews` 테이블에 `photos` 컬럼 없음. `review_photos` 테이블과 JOIN으로 사진 포함 리뷰 카운트.

### D6: user_footprints에 public SELECT RLS
- **근거**: `user_profiles` RLS는 본인만 조회 가능. 프로필에 "도담 N걸음" 표시 시 타인 발자국 조회 필요 → `user_footprints`는 누구나 SELECT 가능.
