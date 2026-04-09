# 도담 데이터 브릿지 — 외부 데이터 연동 마이크로서비스 시리즈

> 아이디어 브리프 | 2026-04-08

---

## Executive Summary

육아 부모가 실생활에서 흩어져 있는 외부 데이터(키즈노트, 건강검진, 예방접종 등)를 한 곳으로 자동 수집하는 **마이크로 웹 서비스 시리즈**. 각 서비스는 `xxx.dodam.life` 서브도메인으로 독립 운영되며, 검증 후 도담 앱에 통합 가능. "되는 방법은 다 쓴다"는 실용주의 철학(공식 API > 마이데이터 > 스크래핑 > 수동입력).

---

## 1. 핵심 컨셉

- **서비스 형태**: 독립 마이크로 웹 서비스 (xxx.dodam.life)
- **접근 철학**: "찔러서 가져온다" — 외부 서비스의 데이터를 끌어와서 정리/활용
- **운영 전략**: 개별 가볍게 만들기 → 검증 → 도담 생태계에 점진적 통합
- **인증 방식**: 공식 API > CODEF/마이데이터 > 스크래핑 > 수동입력 (가능한 것부터)

---

## 2. 리서치 결과: 연동 가능한 외부 데이터 소스 전체 목록

### Tier A: 기술적으로 실현 가능성 높음 (공식 API 또는 검증된 방법 존재)

| # | 서비스명 | 데이터 | 연동 방식 | 난이도 | 비고 |
|---|---------|--------|----------|--------|------|
| A1 | **키즈노트 사진/알림장** | 알림장, 사진, 영상, 식단, 출결 | 비공식 API (`kidsnote.com/api/v1_2/`) | ★★☆ | GitHub 오픈소스 다수 ([KidsNoteForEveryone](https://github.com/KuddLim/KidsNoteForEveryone), [kidsnote-downloader](https://github.com/jwkcp/kidsnote-downloader)). 이미 도담에 키즈노트 연동 기능 있음 |
| A2 | **영유아 건강검진 결과** | 검진결과, 성장발달 평가 | 공공 마이데이터 API / [CODEF API](https://developer.codef.io/products/public/each/pp/nhis-health-check) | ★★☆ | [국민건강보험공단 마이데이터](https://www.kdata.or.kr/mydata/www/api_01/boardView.do?apiIdx=1318) 연동 가능 |
| A3 | **예방접종 이력** | 접종 이력, 다음 접종 일정 | [질병관리청 API](https://www.data.go.kr/data/15009302/openapi.do) + [마이헬스웨이](https://www.myhealthway.go.kr/portal/) | ★★☆ | 예방접종도우미 데이터 + FHIR 표준 API |
| A4 | **어린이집/유치원 정보** | 시설정보, 보육교사수, CCTV, 평가 | [어린이집정보공개포털 API](https://info.childcare.go.kr/info/oais/introduction/Intro.jsp) | ★☆☆ | 공식 오픈 API 제공. 가장 쉬움 |
| A5 | **유치원 알리미** | 유치원 현황, 급식, 교육과정 | [유치원 알리미](https://e-childschoolinfo.moe.go.kr/) 공공데이터 | ★☆☆ | 교육부 공공데이터 |
| A6 | **학교 급식 식단** | 급식 메뉴, 영양정보, 알레르기 | [NEIS 오픈API](https://open.neis.go.kr/portal/data/service/selectServicePage.do?infId=OPEN17320190722180924242823) | ★☆☆ | 초중고 식단. npm 라이브러리 다수 존재 |

### Tier B: 실현 가능하지만 인증 복잡 (마이데이터/본인인증 필요)

| # | 서비스명 | 데이터 | 연동 방식 | 난이도 | 비고 |
|---|---------|--------|----------|--------|------|
| B1 | **진료 내역 조회** | 진료기록, 처방전, 투약이력 | [마이헬스웨이 FHIR API](https://www.myhealthway.go.kr/portal/) / CODEF | ★★★ | 전국 1,004개 의료기관 연계 (2025년 기준) |
| B2 | **성인 건강검진 결과** | 일반/암검진 결과 | [NHIS 마이데이터](https://nhiss.nhis.or.kr/) / CODEF | ★★★ | 부모 본인 건강관리 |
| B3 | **국민행복카드 사용내역** | 보육료 바우처 사용/잔액 | [국민행복카드](http://www.voucher.go.kr/) 스크래핑 | ★★★ | 공식 API 없음. 스크래핑 필요 |
| B4 | **정부24 육아 서류** | 출생증명, 가족관계, 주민등록 | [공공 마이데이터](https://www.gov.kr/portal/mydata/myDataIntroduction) | ★★★ | 행안부 마이데이터 167종 서비스 활용 |
| B5 | **서울 몽땅정보** | 육아 지원정책, 혜택 신청 현황 | [몽땅정보 만능키](https://umppa.seoul.go.kr/) + [서울 열린데이터](https://data.seoul.go.kr/dataList/OA-22188/S/1/datasetView.do) | ★★☆ | 서울시 거주자 한정 |

### Tier C: 탐색 단계 (참신하지만 기술적 검증 필요)

| # | 서비스명 | 데이터 | 연동 방식 | 난이도 | 비고 |
|---|---------|--------|----------|--------|------|
| C1 | **병원 진료 예약 현황** | 소아과/산부인과 대기시간 | 각 병원 앱/웹 스크래핑 | ★★★★ | 표준화 안 됨. 병원별 개별 대응 |
| C2 | **아이돌봄서비스 이력** | 아이돌봄 이용내역 | [여성가족부 데이터](https://www.data.go.kr/data/15039038/fileData.do) | ★★★ | 파일 데이터만 공개, API 없음 |
| C3 | **산모수첩/모자보건수첩** | 산전검사, 출산기록 | 전자 모자보건수첩 앱 | ★★★★ | 공식 연동 방법 불명확 |
| C4 | **어린이 보험 정보** | 자녀 보험 가입/보장내역 | CODEF 보험 API | ★★★ | 보험사별 연동 필요 |
| C5 | **도서관 대출 이력** | 아이 도서 대출/반납 | 각 지역 도서관 API | ★★☆ | 국립중앙도서관 API 존재하나 지역별 상이 |
| C6 | **학원/교습소 정보** | 학원비, 교습과목, 위치 | [교육부 학원정보](https://www.data.go.kr/) | ★★☆ | 공공데이터 있으나 업데이트 빈도 낮음 |

---

## 3. 추천 서비스명 후보

"찔러찔러"는 아니라고 하셨으므로, 컨셉에 맞는 서비스명 후보:

| 후보 | 의미 | 도메인 예시 | 느낌 |
|------|------|------------|------|
| **모아줌** | "모아줌" = 모아 + 줌(zoom/줌) | moazoom.dodam.life | 친근, 직관적 |
| **끌어담기** | 데이터를 끌어와서 담는다 | pull.dodam.life | 기술적 느낌 |
| **한바구니** | 여기저기 흩어진 걸 한 바구니에 | basket.dodam.life | 따뜻한 느낌 |
| **쏙쏙** | 쏙쏙 가져온다 | ssokssok.dodam.life | 귀여움, 육아앱 어울림 |
| **데려오기** | "내 데이터 데려오기" | bring.dodam.life | 의인화, 직관적 |
| **다담** | 다 담는다 + 도담과 라임 | dadam.dodam.life | 도담 브랜드 연결 |
| **(도담) 브릿지** | 외부 서비스와의 다리 | bridge.dodam.life | 기술적/세련된 느낌 |

---

## 4. 기술 스택 방향 (참고용)

```
운영 방식: xxx.dodam.life 서브도메인별 독립 웹 서비스
인증 레이어:
  - 1순위: 공식 API (data.go.kr, NEIS, 어린이집정보포털)
  - 2순위: CODEF API / 마이헬스웨이 (건강검진, 진료, 예방접종)
  - 3순위: 스크래핑 (키즈노트, 국민행복카드)
  - 4순위: 사용자 수동 입력/사진 OCR

주요 중개 플랫폼:
  - CODEF (https://codef.io): 건강보험, 진료내역, 보험 등 금융/공공 스크래핑 API
  - 마이헬스웨이 (https://myhealthway.go.kr): 의료 마이데이터 FHIR 표준 API
  - 공공 마이데이터 (https://mydata.go.kr): 정부 167종 본인정보 API
  - 공공데이터포털 (https://data.go.kr): 어린이집, 급식, 예방접종 등 공공 API
```

---

## 5. 실현 가능성 순위 (추천 구현 순서)

### Phase 1: 바로 만들 수 있는 것 (공식 API, 1~2주)
1. **어린이집/유치원 정보 조회** (A4, A5) — 공식 API, 인증 불필요
2. **학교 급식 식단 조회** (A6) — NEIS 공식 API, npm 라이브러리 있음

### Phase 2: 스크래핑 기반 (2~4주)
3. **키즈노트 사진/알림장 수집** (A1) — 비공식 API, 오픈소스 참고 (이미 도담에 일부 구현)
4. **국민행복카드 보육료 내역** (B3) — 스크래핑 기반

### Phase 3: 마이데이터/CODEF 연동 (1~2달)
5. **영유아 건강검진 결과** (A2) — CODEF API 또는 마이데이터
6. **예방접종 이력 관리** (A3) — 질병관리청 API + 마이헬스웨이
7. **진료 내역 조회** (B1) — 마이헬스웨이 FHIR API

### Phase 4: 확장 (3달+)
8. **정부24 육아 서류 자동 수집** (B4)
9. **서울 몽땅정보 연동** (B5)
10. **아이 보험 정보** (C4)

---

## 6. 경쟁 서비스 현황

| 서비스 | 설명 | 외부데이터 연동 수준 |
|--------|------|---------------------|
| [서울 몽땅정보 만능키](https://umppa.seoul.go.kr/) | 서울시 출산~육아 종합 플랫폼, 25개 정책 통합 | 공공 마이데이터 도입, 서울시 한정 |
| [마미톡](https://mmtalk.kr/) | 임신/출산/육아 국민앱, 60만 사용자 | 산부인과 초음파 영상 연동 (제한적) |
| [베이비빌리](https://apps.apple.com/kr/app/베이비빌리) | 애플 투데이앱 선정 육아앱 | 자체 기록 위주, 외부 연동 약함 |
| [나의건강기록](https://www.myhealthway.go.kr/portal/appdl/listpage) | 마이헬스웨이 공식 앱 | 진료/투약/검진 연동. 의료 특화 |

**차별점**: 기존 앱들은 각각 특정 영역만 커버. **도담 데이터 브릿지는 육아에 필요한 모든 외부 데이터를 한 생태계에서 마이크로서비스로 제공**하는 접근.

---

## 7. 리스크 & 고려사항

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| 키즈노트 비공식 API 차단 | 높음 | API 변경 시 크롤러 업데이트 체계 구축. 사용자에게 "비공식" 고지 |
| 개인정보보호법 이슈 | 높음 | 반드시 사용자 동의 기반. 데이터 서버 저장 최소화. 클라이언트사이드 처리 검토 |
| CODEF/마이데이터 연동 비용 | 중간 | CODEF는 건당 과금. 무료 공공 API 우선 활용 |
| 외부 서비스 인증 보안 | 높음 | 사용자 ID/PW 서버 저장 지양. 세션 토큰 방식 또는 브라우저 확장 방식 검토 |
| 서비스별 유지보수 부담 | 중간 | 마이크로서비스 아키텍처로 격리. 장애 전파 방지 |

---

## 8. 미결정 사항

- [ ] 서비스 브랜드명 (후보 제안 완료, 선택 필요)
- [ ] 수익 모델 (만들고 반응 보면서 결정)
- [ ] 첫 번째 구현 서비스 선택
- [ ] 도담 앱 통합 시점 및 방식
- [ ] CODEF API 비용 구조 확인 필요

---

## Clarity Breakdown

| Dimension | Score | Status |
|-----------|-------|--------|
| Goal Clarity | 0.85 | Clear |
| Constraint Clarity | 0.80 | Clear |
| Success Criteria | 0.65 | 수익모델 미정이나 충분 |
| **Ambiguity Score** | **0.18** | **Ready (< 0.20)** |

## Confidence Level: Medium-High
> 기술적 실현 가능성은 확인됨. 법적(개인정보) 검토와 CODEF 비용 구조 확인 필요.

---

## Sources

- [KidsNoteForEveryone (GitHub)](https://github.com/KuddLim/KidsNoteForEveryone)
- [kidsnote-downloader (GitHub)](https://github.com/jwkcp/kidsnote-downloader)
- [CODEF API 건강검진](https://developer.codef.io/products/public/each/pp/nhis-health-check)
- [국민건강보험공단 마이데이터](https://www.kdata.or.kr/mydata/www/api_01/boardView.do?apiIdx=1318)
- [마이헬스웨이 포털](https://www.myhealthway.go.kr/portal/)
- [질병관리청 예방접종 API](https://www.data.go.kr/data/15009302/openapi.do)
- [어린이집정보공개포털 API](https://info.childcare.go.kr/info/oais/introduction/Intro.jsp)
- [NEIS 급식식단 API](https://open.neis.go.kr/portal/data/service/selectServicePage.do?infId=OPEN17320190722180924242823)
- [공공 마이데이터 포털](https://www.gov.kr/portal/mydata/myDataIntroduction)
- [서울 몽땅정보 만능키](https://umppa.seoul.go.kr/)
- [공공데이터포털](https://www.data.go.kr/)
