-- ============================================================
-- app_content 테이블 생성 + RLS
-- Supabase SQL Editor에서 한 번만 실행하세요
-- ============================================================

CREATE TABLE IF NOT EXISTS app_content (
  key        TEXT PRIMARY KEY,
  data       JSONB        NOT NULL,
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE app_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read app_content" ON app_content;
CREATE POLICY "Public read app_content"
  ON app_content FOR SELECT USING (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_app_content_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS app_content_updated_at ON app_content;
CREATE TRIGGER app_content_updated_at
  BEFORE UPDATE ON app_content
  FOR EACH ROW EXECUTE FUNCTION update_app_content_updated_at();


-- ============================================================
-- 시드 데이터 (UPSERT — 재실행해도 안전)
-- ============================================================

-- 1. 출산박스 / 샘플 (pregnant + waiting 공용)
INSERT INTO app_content (key, data) VALUES ('free_boxes', '[
  {"id":"bebeform_p","category":"pregnancy","name":"베베폼 임신축하박스","desc":"임신 선물 꾸러미 (SNS 공유 필요)","link":"https://bebeform.co.kr/giftbox/","tip":"매월 추첨"},
  {"id":"bebeking_p","category":"pregnancy","name":"베베킹 임신축하박스","desc":"매월 200명 선물 증정","link":"https://bebeking.co.kr/theme/bbk2026/contents/bebebox.php","tip":"매월 추첨"},
  {"id":"momq_hug","category":"pregnancy","name":"맘큐 하기스 허그박스","desc":"하기스 기저귀 · 물티슈 · 산모용품","link":"https://www.momq.co.kr/event/202004180005#hugboxEventTop","tip":"배송비 3,500원 · 부부 각각 신청 가능"},
  {"id":"doubleheart","category":"pregnancy","name":"더블하트 더블박스","desc":"약 20만원 상당 육아 필수템","link":"https://m.doubleheart.co.kr/board/event/read.html?no=43417&board_no=8","tip":"회원가입 후 신청"},
  {"id":"momsdiary","category":"pregnancy","name":"맘스다이어리 맘스팩","desc":"임산부 맞춤 샘플 박스","link":"https://event.momsdiary.co.kr/com_event/momspack/2026/3m/index.html?","tip":"신청 후 배송"},
  {"id":"bebesup","category":"pregnancy","name":"베베숲 마음박스","desc":"임신 · 출산 축하 선물 꾸러미","link":"https://www.bebesup.co.kr/proc/heartbox","tip":"신청 후 배송"},
  {"id":"namyang_p","category":"pregnancy","name":"남양유업 임신축하 샘플","desc":"임산부 맞춤 샘플 증정","link":"https://shopping.namyangi.com/","tip":"남양아이 가입"},
  {"id":"bebeform_b","category":"birth","name":"베베폼 출산축하박스","desc":"출산 선물 꾸러미","link":"https://bebeform.co.kr/giftbox/","tip":"출산 후 신청"},
  {"id":"bebeking_b","category":"birth","name":"베베킹 출산축하박스","desc":"기저귀 · 물티슈 · 샘플 모음","link":"https://bebeking.co.kr/theme/bbk2026/contents/bebebox.php","tip":"출산 후 신청"},
  {"id":"penelope","category":"birth","name":"페넬로페 더 퍼스트 박스","desc":"신생아 첫 선물 박스","link":"https://pf.kakao.com/_dxfaRxd/103498627","tip":"카카오 채널 신청"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 2. 정부 지원 타임라인 (임신 중)
INSERT INTO app_content (key, data) VALUES ('benefits_timeline', '[
  {"week":0,"id":"happy_card","title":"국민행복카드 신청","desc":"임신 1회당 100만원 (다태아 140만원) 바우처","when":"임신 확인 즉시","link":"https://www.gov.kr/portal/onestopSvc/fertility","priority":"high"},
  {"week":0,"id":"health_center","title":"보건소 등록","desc":"엽산제 · 철분제 무료 + 산전검사","when":"임신 확인 즉시","link":"https://www.gov.kr/portal/onestopSvc/fertility","priority":"high"},
  {"week":0,"id":"mother_book","title":"모자보건수첩 발급","desc":"산부인과 또는 보건소에서 발급","when":"임신 확인 즉시","priority":"high"},
  {"week":8,"id":"workplace","title":"직장 보고 (선택)","desc":"근로기준법상 임산부 보호 적용","when":"8주 이후","priority":"medium"},
  {"week":12,"id":"high_risk","title":"고위험 임산부 확인","desc":"해당 시 의료비 90% 지원 (소득 무관)","when":"12주 전후","link":"https://www.gov.kr/portal/service/serviceInfo/135200000114","priority":"medium"},
  {"week":16,"id":"postpartum_reserve","title":"산후조리원 예약","desc":"인기 조리원은 초기에 예약 필수!","when":"16주 전후","priority":"high"},
  {"week":20,"id":"insurance","title":"태아 보험 가입","desc":"출산 전 가입 시 선천이상 보장","when":"22주 전 권장","priority":"high"},
  {"week":20,"id":"transport","title":"임산부 교통비 확인","desc":"서울 월 7만원 등 지자체별 상이","when":"20주~","priority":"low"},
  {"week":30,"id":"birth_plan","title":"출산 병원 확정","desc":"분만실 예약 · 입원 절차 확인","when":"30주 전후","priority":"high"},
  {"week":32,"id":"postnatal_helper","title":"산후도우미 신청","desc":"정부 바우처 산후도우미 서비스","when":"32주~","link":"https://www.gov.kr/portal/onestopSvc/happyBirth","priority":"medium"},
  {"week":36,"id":"birth_docs","title":"출생신고 서류 준비","desc":"신분증 · 혼인관계증명서 · 인감","when":"36주~","priority":"medium"},
  {"week":41,"id":"birth_report","title":"출생신고 (행복출산 원스톱)","desc":"14일 이내 — 6종 서비스 한번에 신청","when":"출산 후 즉시","link":"https://www.gov.kr/portal/onestopSvc/happyBirth","priority":"high"},
  {"week":41,"id":"first_meet","title":"첫만남이용권","desc":"첫째 200만원 · 둘째 이상 300만원","when":"출생신고 시 자동","link":"https://www.gov.kr/portal/service/serviceInfo/135200005015","priority":"high"},
  {"week":41,"id":"parent_pay","title":"부모급여 신청","desc":"0세 월 100만원 · 1세 월 50만원","when":"출산 후 60일 내","link":"https://www.gov.kr/portal/service/serviceInfo/135200000143","priority":"high"},
  {"week":41,"id":"child_allow","title":"아동수당 신청","desc":"만 8세 미만 월 10만원","when":"출산 후","link":"https://www.gov.kr/portal/service/serviceInfo/135200000120","priority":"high"},
  {"week":41,"id":"baby_insurance_add","title":"건강보험 피부양자 등록","desc":"출생 후 14일 내 등록","when":"출산 후","priority":"high"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 3. 임신 검진 일정
INSERT INTO app_content (key, data) VALUES ('checkups', '[
  {"week":8,"id":"first_us","title":"첫 초음파","desc":"심장 박동 확인"},
  {"week":11,"id":"nt","title":"NT 검사","desc":"목덜미 투명대 측정"},
  {"week":16,"id":"quad","title":"쿼드 검사","desc":"기형아 선별 검사"},
  {"week":20,"id":"precise_us","title":"정밀 초음파","desc":"태아 정밀 구조 확인"},
  {"week":24,"id":"gtt","title":"임신성 당뇨 검사","desc":"포도당 부하 검사"},
  {"week":28,"id":"antibody","title":"항체 검사","desc":"Rh 음성 시 필수"},
  {"week":32,"id":"nst1","title":"NST 검사 (1차)","desc":"태아 심박수 모니터링"},
  {"week":36,"id":"gbs","title":"GBS 검사","desc":"B군 연쇄상구균"},
  {"week":37,"id":"nst2","title":"NST (매주)","desc":"주 1회 태아 안녕 평가"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 4. 출산 가방
INSERT INTO app_content (key, data) VALUES ('hospital_bag', '{
  "mom": ["산모 수첩 · 보험증","수유 브라 2개","산모 패드","산모복 · 속옷","세면도구 · 수건","슬리퍼","보온 양말","간식 · 음료","충전기","산후 복대"],
  "baby": ["배냇저고리 2벌","속싸개 · 겉싸개","기저귀 (신생아)","물티슈","카시트 (퇴원용)","모자 · 양말","젖병 1개","분유 소량 (비상용)"],
  "partner": ["간식 · 음료","충전기 · 보조배터리","카메라","갈아입을 옷","출생신고 서류","주차 동전"],
  "seasonal": {
    "summer": {"season":"여름","items":["휴대용 선풍기","쿨매트 · 쿨패드","얇은 속싸개","모기 기피제 (아기용)"]},
    "winter": {"season":"겨울","items":["두꺼운 겉싸개 · 방한용","핫팩 (산모용)","보온 텀블러","아기 방한우주복"]}
  }
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 5. 정부 지원 전체 페이지 (gov-support)
INSERT INTO app_content (key, data) VALUES ('gov_support_sections', '[
  {"label":"현금 지원","color":"#E8F5EE","items":[
    {"title":"부모급여","amount":"0세 월 100만원 · 1세 월 50만원","link":"https://www.gov.kr/portal/service/serviceInfo/135200000143"},
    {"title":"아동수당","amount":"만 8세 미만 월 10만원","link":"https://www.gov.kr/portal/service/serviceInfo/135200000120"},
    {"title":"첫만남이용권","amount":"첫째 200만원 · 둘째 이상 300만원 (바우처)","link":"https://www.gov.kr/portal/service/serviceInfo/135200005015"},
    {"title":"영아수당","amount":"0~1세 월 30만원 (어린이집 미이용 시)","link":"https://www.gov.kr/portal/service/serviceInfo/135200000143"},
    {"title":"양육수당","amount":"어린이집 미이용 시 월 10~20만원","link":"https://www.gov.kr/portal/service/serviceInfo/135200000036"}
  ]},
  {"label":"의료·건강","color":"#F0F0FF","items":[
    {"title":"영유아 건강검진 무료","amount":"생후 14일~72개월, 총 12회 무료","link":"https://www.nhis.or.kr/nhis/healthin/wbhcb300.do"},
    {"title":"국민행복카드 (임신)","amount":"임신 1회당 100만원 바우처 (다태아 140만원)","link":"https://www.gov.kr/portal/onestopSvc/fertility"},
    {"title":"미숙아·선천성이상아 의료비","amount":"입원 진료비 지원","link":"https://www.gov.kr/portal/service/serviceInfo/135200000114"},
    {"title":"선천성 대사이상 검사","amount":"무료 (출생 후 신생아 선별검사)","link":"https://www.gov.kr/portal/service/serviceInfo/135200000036"}
  ]},
  {"label":"보육·교육","color":"#FFF8F3","items":[
    {"title":"어린이집 보육료","amount":"0~5세 전액 지원 (어린이집 이용 시)","link":"https://www.childcare.go.kr/"},
    {"title":"유아학비","amount":"유치원 이용 시 월 최대 28만원","link":"https://e-childschoolinfo.moe.go.kr/"},
    {"title":"아이돌봄 서비스","amount":"시간당 정부 지원 (소득에 따라 차등)","link":"https://idolbom.go.kr/"},
    {"title":"시간제 보육","amount":"어린이집 미이용 아동, 월 80시간 이용","link":"https://www.childcare.go.kr/"}
  ]}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 6. 임신 준비 중 정부지원 (waiting)
INSERT INTO app_content (key, data) VALUES ('waiting_gov_supports', '[
  {"title":"난임부부 시술비 지원","desc":"체외수정 최대 110만원 · 인공수정 최대 30만원","link":"https://www.gov.kr/portal/service/serviceInfo/SME000000100"},
  {"title":"임신 사전건강관리","desc":"보건소 무료 산전검사 · 풍진/빈혈 검사","link":"https://www.mohw.go.kr/menu.es?mid=a10711020200"},
  {"title":"엽산제·철분제 무료","desc":"보건소 등록 시 무료 제공","link":"https://www.gov.kr/portal/service/serviceInfo/SD0000016094"},
  {"title":"난임 원스톱 서비스","desc":"시술비·심리상담 통합 지원","link":"https://www.gov.kr/portal/onestopSvc/Infertility"},
  {"title":"맘편한임신 통합신청","desc":"임신 후 각종 지원 한번에 신청","link":"https://www.gov.kr/portal/onestopSvc/fertility"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 7. 임신 준비 체크리스트 (waiting)
INSERT INTO app_content (key, data) VALUES ('waiting_checklist', '[
  {"id":"folic","title":"엽산 복용","desc":"임신 3개월 전부터"},
  {"id":"checkup","title":"산전 건강검진","desc":"혈액·소변·풍진항체"},
  {"id":"dental","title":"치과 검진","desc":"임신 중 치료 어려우니 미리"},
  {"id":"vaccine","title":"예방접종 확인","desc":"풍진·수두·A형간염"},
  {"id":"weight","title":"적정 체중","desc":"BMI 18.5~24.9"},
  {"id":"nosmoking","title":"금연·금주","desc":"3개월 전부터"},
  {"id":"exercise","title":"규칙적 운동","desc":"주 3회"},
  {"id":"stress","title":"스트레스 관리","desc":"충분한 수면·명상"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 8. 커뮤니티 주간 투표 (community)
INSERT INTO app_content (key, data) VALUES ('community_polls', '[
  {"q":"이유식 첫 메뉴는?","options":["쌀미음","감자","고구마"]},
  {"q":"수면 교육 방법은?","options":["퍼버법","쉬닥법","안 함"]},
  {"q":"기저귀 브랜드는?","options":["하기스","팸퍼스","기타"]},
  {"q":"분유 vs 모유?","options":["완모","혼합","완분"]},
  {"q":"육아 가장 힘든 시간?","options":["새벽","저녁","온종일"]},
  {"q":"첫 외출은 언제?","options":["2주 후","1개월 후","2개월 후"]},
  {"q":"육아 필수 앱은?","options":["도담","베이비타임","삐요로그"]}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 9. 커뮤니티 오늘의 질문
INSERT INTO app_content (key, data) VALUES ('community_questions', '[
  "우리 아기 첫 이유식 뭐였어요?",
  "통잠 성공 비결이 있다면?",
  "가장 유용했던 육아템은?",
  "요즘 아기가 좋아하는 놀이는?",
  "육아하면서 가장 감동적이었던 순간은?",
  "오늘 아기와 뭐 했어요?",
  "추천하고 싶은 소아과가 있나요?"
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 10. 예방접종 일정
INSERT INTO app_content (key, data) VALUES ('vaccination_schedule', '[
  {"month":0,"id":"bcg","name":"BCG (결핵)","desc":"생후 4주 이내","required":true,"detail":"부작용: 접종 부위 궤양·딱지 (정상 반응, 2~3개월 소요) | 지연: 생후 4주 이내 권장, 이후에도 접종 가능"},
  {"month":0,"id":"hepb_1","name":"B형간염 1차","desc":"출생 시","required":true,"detail":"부작용: 접종 부위 통증, 미열 | 지연: 출생 후 가능한 빨리 (24시간 이내 권장)"},
  {"month":1,"id":"hepb_2","name":"B형간염 2차","desc":"생후 1개월","required":true,"detail":"부작용: 접종 부위 통증, 미열 | 지연: 1차 접종 후 최소 4주 간격"},
  {"month":2,"id":"dtap_1","name":"DTaP 1차","desc":"디프테리아·파상풍·백일해","required":true,"detail":"부작용: 발열, 접종 부위 붓기·발적, 보챔 | 지연: 최소 생후 6주부터 접종 가능"},
  {"month":2,"id":"ipv_1","name":"IPV 1차","desc":"폴리오","required":true,"detail":"부작용: 접종 부위 통증·발적 (경미) | 지연: 최소 생후 6주부터 접종 가능"},
  {"month":2,"id":"hib_1","name":"Hib 1차","desc":"b형 헤모필루스 인플루엔자","required":true,"detail":"부작용: 접종 부위 발적·부종, 미열 | 지연: 최소 생후 6주부터 접종 가능"},
  {"month":2,"id":"pcv_1","name":"PCV 1차","desc":"폐렴구균","required":true,"detail":"부작용: 발열, 접종 부위 통증, 보챔, 식욕 감소 | 지연: 최소 생후 6주부터 접종 가능"},
  {"month":2,"id":"rv_1","name":"로타바이러스 1차","desc":"경구 투여","required":false,"detail":"부작용: 보챔, 구토, 설사 (경미) | 지연: 생후 15주 이전 1차 접종 권장, 이후 시작 불가"},
  {"month":4,"id":"dtap_2","name":"DTaP 2차","desc":"생후 4개월","required":true,"detail":"부작용: 발열, 접종 부위 붓기 (1차보다 반응 클 수 있음) | 지연: 1차 후 최소 4주 간격"},
  {"month":4,"id":"ipv_2","name":"IPV 2차","desc":"생후 4개월","required":true,"detail":"부작용: 접종 부위 통증·발적 | 지연: 1차 후 최소 4주 간격"},
  {"month":4,"id":"hib_2","name":"Hib 2차","desc":"생후 4개월","required":true,"detail":"부작용: 접종 부위 발적 | 지연: 1차 후 최소 4주 간격"},
  {"month":4,"id":"pcv_2","name":"PCV 2차","desc":"생후 4개월","required":true,"detail":"부작용: 발열, 접종 부위 통증 | 지연: 1차 후 최소 4주 간격"},
  {"month":4,"id":"rv_2","name":"로타바이러스 2차","desc":"경구 투여","required":false,"detail":"부작용: 보챔, 경미한 설사 | 지연: 1차 후 최소 4주 간격, 생후 8개월 이전 완료"},
  {"month":6,"id":"dtap_3","name":"DTaP 3차","desc":"생후 6개월","required":true,"detail":"부작용: 발열, 접종 부위 붓기·경결 | 지연: 2차 후 최소 4주 간격"},
  {"month":6,"id":"ipv_3","name":"IPV 3차","desc":"생후 6개월","required":true,"detail":"부작용: 접종 부위 통증 (경미) | 지연: 2차 후 최소 4주 간격, 6~18개월 사이 권장"},
  {"month":6,"id":"hepb_3","name":"B형간염 3차","desc":"생후 6개월","required":true,"detail":"부작용: 접종 부위 통증, 미열 | 지연: 1차 후 최소 16주, 2차 후 최소 8주 간격"},
  {"month":6,"id":"hib_3","name":"Hib 3차","desc":"생후 6개월 (제품에 따라)","required":true,"detail":"부작용: 접종 부위 발적 (경미) | 지연: 제품에 따라 3차 불필요할 수 있음"},
  {"month":6,"id":"pcv_3","name":"PCV 3차","desc":"생후 6개월 (제품에 따라)","required":true,"detail":"부작용: 발열, 보챔 | 지연: 제품에 따라 3차 불필요할 수 있음"},
  {"month":6,"id":"flu","name":"인플루엔자","desc":"매년 접종 (6개월~)","required":true,"detail":"부작용: 접종 부위 통증, 미열, 근육통 | 지연: 매년 유행 전(9~10월) 접종 권장"},
  {"month":12,"id":"mmr_1","name":"MMR 1차","desc":"홍역·유행성이하선염·풍진","required":true,"detail":"부작용: 접종 후 7~10일 발열·발진 가능 | 지연: 생후 12개월 이후 가능한 빨리"},
  {"month":12,"id":"var_1","name":"수두 1차","desc":"생후 12~15개월","required":true,"detail":"부작용: 접종 부위 발적, 미열, 드물게 수두 유사 발진 | 지연: 12개월 이후 가능한 빨리"},
  {"month":12,"id":"hepa_1","name":"A형간염 1차","desc":"생후 12~23개월","required":true,"detail":"부작용: 접종 부위 통증, 두통, 피로감 | 지연: 12개월 이후 언제든 시작 가능"},
  {"month":12,"id":"hib_4","name":"Hib 추가","desc":"생후 12~15개월","required":true,"detail":"부작용: 접종 부위 발적 (경미) | 지연: 3차 후 최소 2개월 간격"},
  {"month":12,"id":"pcv_4","name":"PCV 추가","desc":"생후 12~15개월","required":true,"detail":"부작용: 발열, 접종 부위 통증 | 지연: 3차 후 최소 2개월 간격"},
  {"month":15,"id":"dtap_4","name":"DTaP 4차","desc":"생후 15~18개월","required":true,"detail":"부작용: 발열, 접종 부위 붓기·통증 (이전 차수보다 클 수 있음) | 지연: 3차 후 최소 6개월 간격"},
  {"month":18,"id":"hepa_2","name":"A형간염 2차","desc":"1차 접종 후 6개월 이상","required":true,"detail":"부작용: 접종 부위 통증 (경미) | 지연: 1차 후 6~18개월 간격 권장"},
  {"month":24,"id":"je_1","name":"일본뇌염 1차","desc":"사백신 기준","required":true,"detail":"부작용: 접종 부위 통증, 발열, 두통 | 지연: 만 12개월 이후 시작 가능"},
  {"month":24,"id":"je_2","name":"일본뇌염 2차","desc":"1차 후 7~30일","required":true,"detail":"부작용: 접종 부위 통증 | 지연: 1차 후 7~30일 간격 권장"},
  {"month":36,"id":"je_3","name":"일본뇌염 3차","desc":"2차 접종 후 12개월","required":true,"detail":"부작용: 접종 부위 통증 (경미) | 지연: 2차 후 12개월 간격 권장"},
  {"month":48,"id":"dtap_5","name":"DTaP 5차","desc":"만 4~6세","required":true,"detail":"부작용: 접종 부위 붓기·통증, 발열 | 지연: 만 4세 이후 취학 전까지"},
  {"month":48,"id":"ipv_4","name":"IPV 4차","desc":"만 4~6세","required":true,"detail":"부작용: 접종 부위 통증 (경미) | 지연: 만 4세 이후 취학 전까지"},
  {"month":48,"id":"mmr_2","name":"MMR 2차","desc":"만 4~6세","required":true,"detail":"부작용: 접종 후 발열·발진 가능 (1차보다 경미) | 지연: 만 4세 이후 취학 전까지"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 11. 임신 준비 — 검진 항목
INSERT INTO app_content (key, data) VALUES ('preparing_appointments', '[
  {"id":"basic","title":"기본 혈액검사","priority":"high","desc":"빈혈 · 갑상선 · 간기능 · 혈당 · 혈액형","where":"산부인과 또는 보건소 (무료)","why":"임신 전 몸 상태 확인. 빈혈이 있으면 임신이 어려울 수 있어요"},
  {"id":"rubella","title":"풍진 항체검사","priority":"high","desc":"풍진 면역 여부 확인","where":"산부인과 또는 보건소 (무료)","why":"임신 중 풍진 감염 시 태아 기형 위험. 항체 없으면 접종 후 1개월 피임 필요"},
  {"id":"amh","title":"AMH 검사","priority":"high","desc":"난소 기능 · 잔여 난자 수 예측","where":"산부인과 (유료 5~10만원)","why":"35세 이상 필수. 난소 나이를 확인해 임신 계획에 도움"},
  {"id":"dental","title":"치과 검진","priority":"medium","desc":"충치 · 잇몸 치료","where":"치과","why":"임신 중 치과 치료 제한됨. 미리 치료해야 해요"},
  {"id":"pap","title":"자궁경부암 검사","priority":"medium","desc":"자궁경부 세포 검사","where":"산부인과 또는 보건소 (만 20세+ 무료)","why":"2년 이내 미실시 시 필수"},
  {"id":"std","title":"성병 검사","priority":"medium","desc":"클라미디아 · 매독 · HIV","where":"산부인과 또는 보건소","why":"무증상 감염도 있어 임신 전 확인 필요"},
  {"id":"genetic","title":"유전 상담","priority":"low","desc":"유전 질환 가족력 확인","where":"대학병원 유전 상담 센터","why":"가족 중 유전 질환이 있을 경우 상담 권장"},
  {"id":"sperm","title":"정액 검사","priority":"low","desc":"정자 수 · 운동성 · 형태","where":"비뇨기과 또는 난임 클리닉","why":"6개월 이상 임신 안 될 때. 남성 요인이 40%"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 12. 임신 준비 — 음식
INSERT INTO app_content (key, data) VALUES ('preparing_foods', '{
  "good": [
    {"name":"엽산 식품","items":"시금치 · 브로콜리 · 아보카도"},
    {"name":"오메가3","items":"연어 · 고등어 · 호두"},
    {"name":"철분","items":"소고기 · 두부 · 렌틸콩"},
    {"name":"항산화","items":"블루베리 · 토마토 · 석류"}
  ],
  "bad": [
    {"name":"카페인","desc":"하루 1잔 이하"},
    {"name":"알코올","desc":"완전 금주"},
    {"name":"고수은 생선","desc":"참치(큰것) · 황새치"}
  ]
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

-- 13. 임신 준비 — 스트레스 팁
INSERT INTO app_content (key, data) VALUES ('preparing_stress_tips', '[
  {"title":"4-7-8 호흡법","desc":"4초 들숨 → 7초 멈춤 → 8초 날숨"},
  {"title":"산책 명상","desc":"15분 걷기 + 자연 소리"},
  {"title":"감사 일기","desc":"매일 3가지 감사한 것"},
  {"title":"음악 테라피","desc":"편안한 음악 20분"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
