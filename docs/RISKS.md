# RISKS: 임신 중 검진 관리 시스템

| ID | 리스크 | 확률 | 영향 | 대응 |
|----|--------|------|------|------|
| R1 | Supabase Storage 용량 초과 | 중 | 중 | 영상 30MB 제한, 클라이언트 압축, 무료 1GB 내 운영 |
| R2 | 파트너 미가입 시 알림 불가 | 높 | 중 | 카카오톡 공유 fallback, 초대 링크 유도 |
| R3 | 대용량 파일 업로드 실패 | 중 | 중 | 재시도 로직, 진행률 UI, chunk upload 고려 |
| R4 | 의료 데이터 보안 | 낮 | 높 | RLS 정책, signed URL 1시간 만료, HTTPS 전용 |
| R5 | 검진 일정 수동 관리 피로 | 중 | 중 | DEFAULT_CHECKUPS 자동 프리셋, 날짜만 입력하면 되도록 간소화 |
| R6 | PWA 파일 선택 제한 | 낮 | 낮 | input[type=file] accept 속성 + capture 옵션 |
