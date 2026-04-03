# ADR-001: preg_records 테이블 재사용 vs 신규 checkups 테이블

## Status
**Accepted** — 2026-04-03

## Context

검진 데이터를 저장하기 위한 데이터 모델 설계가 필요합니다. 두 가지 주요 선택지를 고려했습니다:

### Option 1: 기존 `preg_records` 테이블 확장
- `type` 컬럼에 `checkup_schedule`, `checkup_result` 추가
- `value` (JSONB) 필드에 검진 관련 스키마 저장
- 기존 인프라(RLS, indexing, API) 재사용

### Option 2: 신규 `checkups` 테이블 생성
- 전용 테이블: `id`, `user_id`, `checkup_id`, `scheduled_date`, `status`, ...
- 검진 전용 스키마 설계 (정규화)
- 별도 RLS 정책 및 API 구축

## Decision

**Option 1: 기존 `preg_records` 테이블을 확장**하여 검진 데이터를 저장합니다.

## Rationale

### 장점
1. **기존 인프라 활용**
   - RLS 정책이 이미 존재 (본인만 접근)
   - 인덱스 (`idx_preg_records_user_date`)가 검진 조회에도 효율적
   - 기존 `pregRecord.ts` 서비스 함수 재사용 가능

2. **개념적 통합성**
   - 검진 기록도 "임신 중 기록"의 일부
   - 건강 기록(`health`), 일기(`diary`), 체중(`weight`)과 동일 레벨
   - 사용자 입장에서 "모든 임신 기록"을 한 곳에서 관리

3. **마이그레이션 간소화**
   - `type` CHECK 제약만 확장하면 끝 (ALTER TABLE 1줄)
   - 기존 데이터 영향 없음 (backward compatible)

4. **유저 레코드 통합 조회 용이**
   - 향후 "날짜별 전체 기록" 조회 시 JOIN 불필요
   - 예: "2026-05-15"의 체중, 검진, 일기를 한 번에 조회

### 단점
1. **검진 전용 제약 조건 부족**
   - JSONB 스키마 검증을 DB 레벨에서 강제하기 어려움
   - 클라이언트/서버에서 스키마 검증 필요 (TypeScript 타입으로 보완)

2. **테이블 비대화 가능성**
   - 모든 임신 기록이 한 테이블에 → 향후 성능 이슈 가능
   - 완화: 파티셔닝 또는 아카이빙 전략 필요 (현재는 무시 가능)

3. **JSONB 쿼리 성능**
   - 검진 ID별 조회 시 `value->>'checkup_id'` 사용 → 인덱스 효율 낮음
   - 완화: GIN 인덱스 추가 가능 (향후)

## Consequences

### 즉시 효과
- ✅ 빠른 구현 (기존 API 재사용)
- ✅ 마이그레이션 파일 1개 (`20260405_checkup_schedule.sql`)
- ✅ RLS 정책 통합 관리

### 장기 영향
- ⚠️ 검진 데이터 증가 시 `preg_records` 테이블 모니터링 필요
- ⚠️ JSONB 스키마 변경 시 클라이언트 버전 관리 주의
- ⚠️ 향후 검진 고급 기능 추가 시 별도 테이블 분리 검토 필요

### 마이그레이션 전략
현재 Option 1 채택. 향후 아래 조건 충족 시 별도 테이블 분리 검토:
- 검진 데이터가 전체 `preg_records`의 30% 초과
- 검진 전용 복잡한 쿼리(JOIN, aggregation) 빈번 발생
- 성능 병목 발생 (P95 latency > 1s)

## Alternatives Considered

### Option 2를 선택하지 않은 이유
- 초기 개발 속도 우선 (MVP 빠른 출시)
- 현재 검진 데이터 구조가 단순 (복잡한 relation 없음)
- Over-engineering 리스크 (아직 필요 없는 정규화)

## References
- [PLAN.md](/docs/PLAN.md) — 검진 관리 기획
- [preg_records 스키마](/supabase/migrations/20260404_user_records.sql)
- Supabase RLS Best Practices: https://supabase.com/docs/guides/auth/row-level-security

## Review & Approval
- Architect: da:system (2026-04-03)
- Status: Accepted
