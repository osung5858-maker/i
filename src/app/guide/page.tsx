'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// ===== 임신 준비 콘텐츠 =====
const PREPARING_GUIDES = {
  'infertility-faq': {
    title: '난임 Q&A 30선',
    icon: '',
    items: [
      { q: '난임이란 정확히 무엇인가요?', a: '피임 없이 정상적인 부부관계를 1년 이상 했는데도 임신이 되지 않는 상태를 말합니다. 35세 이상은 6개월 기준입니다.' },
      { q: '난임 검사는 언제 받아야 하나요?', a: '1년간 자연 임신이 안 되면 검사를 권합니다. 35세 이상이면 6개월 후, 40세 이상이면 바로 검사하세요.' },
      { q: '남성도 검사가 필요한가요?', a: '네, 난임의 약 40%가 남성 요인입니다. 정액검사는 간단하고 빠르니 부부가 함께 검사하세요.' },
      { q: 'AMH 수치가 낮으면 임신이 불가능한가요?', a: 'AMH는 난소 예비력 지표이지 임신 가능성 자체를 결정하지 않습니다. 낮더라도 자연 임신이 가능합니다.' },
      { q: '인공수정과 시험관의 차이는?', a: '인공수정(IUI)은 정자를 자궁에 넣는 방법, 시험관(IVF)은 체외에서 수정 후 배아를 이식하는 방법입니다.' },
      { q: '시험관 성공률은 얼마나 되나요?', a: '35세 미만 약 40~50%, 35~37세 약 30~40%, 38~40세 약 20~30%입니다. 병원과 개인차가 큽니다.' },
      { q: '배란일에만 관계를 가져야 하나요?', a: '배란 2~3일 전부터 배란일까지가 가장 좋습니다. 배란 전 관계가 더 효과적일 수 있어요.' },
      { q: '스트레스가 임신에 영향을 미치나요?', a: '과도한 스트레스는 호르몬 균형을 깨트려 배란에 영향을 줄 수 있습니다. 이완 활동을 권합니다.' },
      { q: '엽산은 언제부터 먹어야 하나요?', a: '임신 3개월 전부터 복용하는 것이 권장됩니다. 태아의 신경관 결손 예방에 중요합니다.' },
      { q: '나이가 많으면 무조건 시험관인가요?', a: '아닙니다. 검사 결과에 따라 자연 임신, 배란 유도, 인공수정 등 단계별로 접근합니다.' },
      { q: '기초체온은 어떻게 측정하나요?', a: '매일 아침 일어나자마자 움직이기 전에 혀 아래에서 측정합니다. 0.3~0.5도 상승하면 배란 후입니다.' },
      { q: '배란 테스트기는 정확한가요?', a: 'LH 호르몬 급증을 감지해 약 97% 정확도입니다. 양성 후 24~36시간 내 배란됩니다.' },
      { q: '착상혈과 생리의 차이는?', a: '착상혈은 소량의 분홍~갈색 출혈로 1~2일, 생리는 점점 양이 늘고 3~7일 지속됩니다.' },
      { q: '임신 테스트기는 언제 쓰나요?', a: '생리 예정일 또는 그 이후에 아침 첫 소변으로 검사하면 가장 정확합니다.' },
      { q: '한의원 치료가 도움이 되나요?', a: '체질 개선과 자궁 환경 조성에 도움이 될 수 있습니다. 양방 치료와 병행하는 분도 많습니다.' },
      { q: '운동은 어떻게 해야 하나요?', a: '과도한 운동은 피하고 주 3~5회 30분 걷기, 요가, 수영 등 중강도 운동을 권합니다.' },
      { q: '커피를 끊어야 하나요?', a: '하루 1~2잔(카페인 200mg 이하)은 괜찮습니다. 과다 섭취는 임신 확률을 낮출 수 있어요.' },
      { q: '음주는 언제부터 끊어야 하나요?', a: '임신 시도 시작 시점부터 끊는 것이 좋습니다. 남성도 3개월 전부터 금주를 권합니다.' },
      { q: '유산 경험이 있으면 다시 어려운가요?', a: '초기 유산은 매우 흔하며(임신의 15~20%) 대부분 다음 임신은 정상입니다. 반복 유산 시 검사가 필요합니다.' },
      { q: '비타민D가 임신에 중요한가요?', a: '비타민D 결핍은 난임과 관련이 있습니다. 혈중 농도 검사 후 보충을 권합니다.' },
    ],
  },
  'couple-health': {
    title: '부부 건강 체크리스트',
    icon: '',
    items: [
      { cat: '여성 기본', checks: ['혈액검사 (빈혈/혈액형)', '소변검사', '풍진 항체 검사', '자궁경부암 검사', 'B형간염 항체', '갑상선 기능 검사'] },
      { cat: '여성 심화', checks: ['AMH (난소예비력)', '자궁난관조영술', '초음파 (자궁/난소)', '성병 검사 (클라미디아 등)', '비타민D 수치'] },
      { cat: '남성 기본', checks: ['정액검사 (양/운동성/형태)', '혈액검사', '소변검사', '성병 검사'] },
      { cat: '남성 심화', checks: ['정계정맥류 검사', '호르몬 검사 (FSH/LH/테스토스테론)', '유전자 검사 (필요 시)'] },
      { cat: '부부 공통', checks: ['금연 3개월+', '금주 3개월+', '적정 체중 유지 (BMI 18.5~24.9)', '엽산 복용 시작', '카페인 제한 (하루 200mg 이하)', '규칙적 운동 주 3회+', '충분한 수면 7~8시간'] },
    ],
  },
  'lifestyle': {
    title: '임신 확률 높이는 생활 습관',
    icon: '',
    items: [
      { title: '타이밍', tips: ['배란 2~3일 전부터 격일 관계', '배란 테스트기 활용 (LH 급증 감지)', '기초체온 매일 기록', '관계 후 10~15분 누워있기'] },
      { title: '영양', tips: ['엽산 400~800mcg 매일', '비타민D 1000~2000IU', '오메가3 (DHA/EPA)', '철분 (빈혈 시)', '아연 (남성 정자 건강)', '항산화 식품 (베리류, 견과류)'] },
      { title: '생활', tips: ['스트레스 관리 (명상/요가)', '적정 체중 유지', '충분한 수면 (7~8시간)', '과도한 운동 피하기', '사우나/열탕 피하기 (남성)', '노트북 무릎 위 사용 금지 (남성)'] },
      { title: '피할 것', tips: ['흡연 (남녀 모두)', '과음', '카페인 과다 (하루 2잔+)', '환경호르몬 (플라스틱 전자레인지)', '살충제/농약 접촉', '장시간 앉아있기'] },
    ],
  },
  'hospital-first': {
    title: '산부인과 첫 방문 가이드',
    icon: '',
    items: [
      { title: '언제 가나요?', desc: '임신 테스트 양성 후 1~2주 내, 또는 생리 예정일 1주 후에 방문하면 초음파로 확인 가능합니다.' },
      { title: '뭘 가져가나요?', desc: '신분증, 건강보험증, 최근 생리 시작일, 복용 중인 약 목록, 기존 건강검진 결과.' },
      { title: '어떤 검사를 하나요?', desc: '소변검사(임신 확인), 초음파(태낭/심박 확인), 혈액검사(빈혈/혈액형/풍진항체).' },
      { title: '병원 선택 기준', desc: '거리(응급 시 30분 이내), 분만 가능 여부, 야간/주말 진료, 주치의 시스템, 입원실 환경.' },
      { title: '질문 리스트', desc: '분만 방법 옵션, 검진 스케줄, 응급 연락처, 입원 예상 비용, 산후조리원 연계 여부.' },
      { title: '비용 참고', desc: '초진 약 3~5만원, 초음파 약 3~5만원. 임신 확인 후 국민행복카드(100만원) 신청 가능.' },
    ],
  },
}

// ===== 임신 중 콘텐츠 =====
const PREGNANT_GUIDES = {
  'birth-prep': {
    title: '출산 준비물 체크리스트',
    icon: '',
    items: [
      { cat: '병원 가방 (필수)', checks: ['산모 수첩 + 신분증', '속옷 3~5벌 (산모용)', '산모패드 (대형)', '세면도구', '슬리퍼', '수유브라 2벌', '긴 카디건', '충전기', '간식/음료'] },
      { cat: '아기 용품 (퇴원용)', checks: ['배냇저고리 2벌', '속싸개/겉싸개', '기저귀 (신생아용)', '물티슈', '카시트 (퇴원 시 필수)'] },
      { cat: '출산 후 집', checks: ['수유쿠션', '젖병 + 소독기', '분유 (혼합수유 시)', '기저귀 (신생아 300+장)', '아기 욕조', '체온계', '배꼽 소독 세트', '아기 로션/오일'] },
      { cat: '구매 시기', checks: ['28주: 카시트, 유모차 주문', '32주: 병원 가방 준비 완료', '34주: 산후조리원 최종 확인', '36주: 모든 준비물 세탁 완료'] },
    ],
  },
  'postpartum-center': {
    title: '산후조리원 체크리스트',
    icon: '',
    items: [
      { cat: '필수 확인', checks: ['신생아실 CCTV', '간호사 대 아기 비율 (1:4 이하)', '24시간 의료진 상주', '모유수유 지원 (유축기/수유 상담)', '산모 식단 (3식 + 간식)', '세탁 서비스'] },
      { cat: '편의 시설', checks: ['1인실/2인실 옵션', '좌욕 시설', '산모 교실 (신생아 목욕/수유)', '면회 규칙', '주차장', 'Wi-Fi'] },
      { cat: '비용 체크', checks: ['기본 2주 비용', '연장 시 추가 비용', '1인실/2인실 차액', '퇴소 시 선물 (있는 곳도 있음)', '국민행복카드 사용 가능 여부'] },
      { cat: '예약 시기', checks: ['임신 12~16주에 투어 시작', '임신 20주 전후에 계약', '인기 조리원은 임신 확인 즉시 예약'] },
    ],
  },
  'labor-guide': {
    title: '진통 대응 가이드',
    icon: '',
    items: [
      { title: '이슬이 비쳤어요', desc: '출산이 가까워진 신호입니다. 보통 1~3일 내 진통이 시작됩니다. 아직 병원에 갈 단계는 아닙니다.' },
      { title: '가진통 vs 진진통', desc: '가진통: 불규칙, 걸으면 줄어듦, 아랫배만 아픔.\n진진통: 규칙적(점점 짧아짐), 걸어도 안 줄어듦, 허리까지 아픔.' },
      { title: '병원 가야 할 때', desc: '진통 간격 5분 이하 + 1시간 이상 지속될 때.\n양수가 터졌을 때 (맑은 물이 줄줄).\n출혈이 생리 양보다 많을 때.' },
      { title: '진통 대처법', desc: '호흡법: 히-히-후 (라마즈)\n자세: 앞으로 기대기, 사이드라잉\n온찜질: 허리에 핫팩\n마사지: 엉덩이 양쪽 꼬리뼈 지압' },
      { title: '준비물 재확인', desc: '산모수첩, 신분증, 충전기, 병원 가방.\n보호자 연락처 확인.\n병원까지 이동 경로 (야간/주말 고려).' },
      { title: '무통분만', desc: '자궁경부 4~5cm 열렸을 때 시행.\n경막외 마취로 하반신 통증 완화.\n비용: 약 30~50만원 (병원마다 다름).' },
    ],
  },
  'prenatal-recommend': {
    title: '태교 추천',
    icon: '',
    items: [
      { cat: '음악', list: ['모차르트 - 아이네 클라이네 나흐트무지크', '비발디 - 사계 중 봄', '드뷔시 - 달빛', '바흐 - G선상의 아리아', '슈베르트 - 세레나데', '자연의 소리 (빗소리, 파도, 새소리)'] },
      { cat: '그림책/태교 동화', list: ['기다릴게 — 사노 요코', '엄마가 되는 날 — 이혜리', '아기가 태어나는 날 — 가와카미 미에코', '넌 나의 전부야 — 로라 크라우스 멜메드', '작은 아씨들 (태교 낭독용)'] },
      { cat: '태교 활동', list: ['태교 일기 쓰기 (매일 5분)', '태명 부르며 대화하기', '클래식 음악 하루 30분', '산책 (하루 20~30분)', '태교 요가 (유튜브 "임산부 요가")', '뜨개질/손바느질', '아기 용품 직접 만들기'] },
      { cat: '아빠 태교', list: ['매일 배에 대고 인사하기', '태교 동화 읽어주기', '함께 산책하기', '아기 용품 함께 고르기', '출산 교실 함께 참여', '산모 발/다리 마사지'] },
    ],
  },
}

// ===== 육아 콘텐츠 =====
const PARENTING_GUIDES = {
  'babyfood': {
    title: '월령별 이유식 레시피',
    icon: '',
    items: [
      { month: '초기 (5~6개월)', desc: '미음/퓨레 형태, 하루 1회, 1~2숟갈부터', recipes: [
        { name: '쌀미음', ingredients: '쌀가루 1큰술 + 물 80ml', method: '냄비에 쌀가루와 물을 넣고 약불로 저어가며 끓인다. 덩어리 없이 매끄럽게.' },
        { name: '감자 퓨레', ingredients: '감자 1/4개 + 모유/분유 약간', method: '감자를 삶아 곱게 으깬 후 모유나 분유로 농도 조절.' },
        { name: '고구마 퓨레', ingredients: '고구마 1/4개 + 물 약간', method: '고구마를 쪄서 곱게 으깬 후 물로 농도 조절.' },
        { name: '브로콜리 퓨레', ingredients: '브로콜리 꽃 2~3개 + 물', method: '브로콜리를 부드럽게 삶아 블렌더로 갈아 체에 거른다.' },
      ]},
      { month: '중기 (7~8개월)', desc: '죽 형태, 하루 2회, 알갱이 크기 점점 키우기', recipes: [
        { name: '소고기 야채죽', ingredients: '쌀 2큰술 + 소고기 다진 것 1큰술 + 당근/애호박 약간', method: '쌀을 불려 끓인 후 다진 소고기와 야채를 넣고 푹 끓인다.' },
        { name: '닭고기 감자죽', ingredients: '쌀 2큰술 + 닭가슴살 1큰술 + 감자 1/4개', method: '닭가슴살을 삶아 잘게 찢고, 감자를 으깨 쌀죽에 넣어 끓인다.' },
        { name: '시금치 달걀죽', ingredients: '쌀 2큰술 + 시금치 잎 3~4장 + 달걀 노른자 1/2', method: '쌀죽에 데친 시금치 다진 것과 익힌 노른자를 넣어 섞는다.' },
      ]},
      { month: '후기 (9~11개월)', desc: '무른밥 형태, 하루 3회, 다양한 식재료', recipes: [
        { name: '연어 야채 무른밥', ingredients: '밥 1/3공기 + 연어 1큰술 + 양파/당근', method: '연어를 구워 으깬 후 야채와 밥에 섞어 육수로 끓인다.' },
        { name: '두부 미역 무른밥', ingredients: '밥 1/3공기 + 두부 1/4모 + 미역 약간', method: '두부를 으깨고 불린 미역을 잘게 썰어 밥과 함께 끓인다.' },
      ]},
      { month: '완료기 (12개월+)', desc: '진밥~일반밥, 하루 3회 + 간식 2회', recipes: [
        { name: '야채 달걀말이', ingredients: '달걀 1개 + 당근/파프리카 다진 것', method: '달걀에 야채를 섞어 약불에 말아 익힌다. 한입 크기로 썬다.' },
        { name: '감자 치즈볼', ingredients: '감자 1개 + 치즈 1장 + 당근 약간', method: '삶은 감자를 으깨 치즈와 당근을 넣어 동그랗게 빚는다.' },
      ]},
    ],
  },
  'emergency-first-aid': {
    title: '아기 응급처치 가이드',
    icon: '',
    items: [
      { title: '열경련 (열성 경련)', symptoms: '38.5°C 이상 고열 + 온몸 떨림 + 의식 흐림', action: '1. 단단한 바닥에 옆으로 눕히기\n2. 입에 아무것도 넣지 않기\n3. 주변 위험물 치우기\n4. 5분 이상 지속 시 119\n5. 경련 후에도 반드시 소아과 방문' },
      { title: '이물질 삼킴/기도 폐쇄', symptoms: '갑자기 기침/구역질 + 얼굴 빨개짐 + 숨 못 쉼', action: '1세 미만: 얼굴을 아래로 하고 등을 5회 두드림\n1세 이상: 하임리히법 (뒤에서 배를 위로 밀어올림)\n의식 없으면 즉시 119 + 심폐소생술' },
      { title: '구토/탈수', symptoms: '반복 구토 + 설사 + 기저귀 4시간+ 젖지 않음', action: '1. 30분 금식 후 소량씩 수분 보충\n2. 전해질 용액 (이온음료 X)\n3. 8시간+ 소변 없으면 응급실\n4. 혈변/담즙색 구토 → 즉시 응급실' },
      { title: '낙상/머리 부딪힘', symptoms: '울다가 그침 + 구토 + 의식 변화 + 경련', action: '1. 의식 확인 (이름 부르기)\n2. 부은 곳 냉찜질\n3. 2시간 내 구토/보챔 → 응급실\n4. 잠들었다면 1시간마다 깨워서 확인\n5. 의식 흐리면 즉시 119' },
      { title: '화상', symptoms: '피부 빨개짐/물집', action: '1. 흐르는 찬물에 10분+ 식히기\n2. 연고/된장/치약 절대 바르지 않기\n3. 물집 터뜨리지 않기\n4. 깨끗한 거즈로 덮기\n5. 화상 범위가 손바닥 이상 → 응급실' },
      { title: '코피', symptoms: '코에서 출혈', action: '1. 고개를 약간 숙이기 (뒤로 젖히면 X)\n2. 코 양쪽을 5~10분 눌러주기\n3. 30분 이상 안 멈추면 응급실\n4. 자주 반복되면 소아과 상담' },
    ],
  },
  'sleep-training': {
    title: '수면 교육 가이드',
    icon: '',
    items: [
      { title: '수면 교육이란?', desc: '아기가 스스로 잠들 수 있도록 돕는 과정입니다. 보통 4~6개월부터 시작하며, 부모의 일관성이 핵심입니다.' },
      { title: '시작 시기', desc: '4개월 수면 퇴행 이후, 체중 6kg 이상, 밤수유 1~2회로 줄었을 때가 적기입니다. 아기가 아프거나 이유식 시작 직후는 피하세요.' },
      { title: '퍼버법 (점진적 소거)', desc: '아기를 눕히고 방을 나간 후, 3분→5분→10분 간격으로 돌아가 달래줍니다. 들어가도 안지 않고 토닥/목소리만. 보통 3~7일이면 효과.' },
      { title: '쉬닥법 (안아서 재우기→눕히기)', desc: '아기가 울면 안아서 달래고, 울음이 그치면 바로 눕힙니다. 다시 울면 반복. 안고 잠들면 안 되고 "눕혀서 자는 것"이 목표.' },
      { title: '체어법 (의자 점진적 이동)', desc: '침대 옆 의자에 앉아있다가 매일 의자를 조금씩 문쪽으로 옮깁니다. 2주 정도면 방 밖까지. 가장 부드러운 방법.' },
      { title: '수면 루틴 만들기', desc: '목욕 → 로션 → 옷 갈아입기 → 수유 → 자장가/책 → 불 끄기.\n매일 같은 시간, 같은 순서가 중요합니다. 30분 이내로.' },
      { title: '수면 환경', desc: '온도 22~24°C, 습도 50~60%.\n암막 커튼 (어두울수록 좋음).\n백색소음 (빗소리, 자궁소리).\n수면 조끼 (이불 대신).' },
    ],
  },
  'play-by-age': {
    title: '월령별 놀이/장난감 추천',
    icon: '',
    items: [
      { month: '0~3개월', toys: ['흑백 모빌', '딸랑이', '아기 체육관(짐)'], plays: ['터미타임 (엎드려 놀기)', '얼굴 가까이 표정 짓기', '손가락 잡게 하기', '노래 불러주기'] },
      { month: '4~6개월', toys: ['컬러 모빌', '이앓이 장난감', '소리나는 헝겊 책'], plays: ['거울 놀이', '까꿍 놀이', '물건 쥐여주기', '다양한 질감 탐색'] },
      { month: '7~9개월', toys: ['쌓기 블록', '공', '빠지지 않는 퍼즐'], plays: ['컵 숨기기 찾기', '박수 따라하기', '그림책 함께 보기', '숟가락 쥐여주기'] },
      { month: '10~12개월', toys: ['걷기 보조 장난감', '모양 맞추기', '전화기 장난감'], plays: ['손가락으로 가리키기 놀이', '까꿍 변형 (물건 숨기기)', '춤추기', '간단한 지시 따르기 게임'] },
      { month: '13~18개월', toys: ['크레용 + 큰 종이', '끼우기 블록', '인형'], plays: ['블록 쌓기', '공 던지고 받기', '동물 소리 흉내', '숨바꼭질', '모래놀이'] },
      { month: '19~24개월', toys: ['퍼즐 (3~5조각)', '점토/클레이', '세발자전거'], plays: ['역할놀이 (소꿉놀이)', '색칠하기', '계단 오르기', '노래에 맞춰 율동', '물놀이'] },
      { month: '25~36개월', toys: ['가위 (안전가위)', '레고 듀플로', '자석 블록'], plays: ['규칙 있는 게임', '숫자 세기', '색깔 맞추기', '스티커 놀이', '요리 도와주기 (반죽 등)'] },
    ],
  },
}

function GuideContent({ guideKey }: { guideKey: string }) {
  const router = useRouter()
  const guide = { ...PREPARING_GUIDES, ...PREGNANT_GUIDES, ...PARENTING_GUIDES }[guideKey] as any
  if (!guide) return <div className="p-8 text-center text-tertiary">콘텐츠를 찾을 수 없어요</div>

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[#FFF9F5]">
      <div className="sticky top-[72px] z-30 bg-[#FFF9F5] border-b border-[#E8E4DF] px-5 max-w-lg mx-auto w-full flex items-center h-12">
        <button onClick={() => router.back()} className="text-body text-secondary mr-3">← 뒤로</button>
        <h1 className="text-subtitle text-primary truncate">{guide.icon} {guide.title}</h1>
      </div>

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">
        {/* Q&A 타입 (난임 FAQ) */}
        {guide.items?.[0]?.q && guide.items.map((item: any, i: number) => (
          <FAQItem key={i} q={item.q} a={item.a} idx={i + 1} />
        ))}

        {/* 체크리스트 타입 (부부 건강, 출산 준비물, 산후조리원) */}
        {guide.items?.[0]?.cat && guide.items?.[0]?.checks && guide.items.map((section: any, i: number) => (
          <ChecklistSection key={i} cat={section.cat} checks={section.checks} />
        ))}

        {/* 팁 리스트 타입 (생활습관) */}
        {guide.items?.[0]?.tips && guide.items.map((section: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-2">{section.title}</p>
            <div className="space-y-1">
              {section.tips.map((tip: string, j: number) => (
                <p key={j} className="text-body text-[#4A4744] leading-relaxed">• {tip}</p>
              ))}
            </div>
          </div>
        ))}

        {/* 설명 카드 타입 (병원 가이드, 진통 대응) */}
        {guide.items?.[0]?.desc && !guide.items?.[0]?.recipes && !guide.items?.[0]?.symptoms && !guide.items?.[0]?.month && guide.items.map((item: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-1">{item.title}</p>
            <p className="text-body text-[#4A4744] leading-relaxed whitespace-pre-line">{item.desc}</p>
          </div>
        ))}

        {/* 응급처치 타입 */}
        {guide.items?.[0]?.symptoms && guide.items.map((item: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-subtitle text-[#D08068] mb-1">{item.title}</p>
            <div className="bg-red-50 rounded-lg p-2 mb-2">
              <p className="text-caption font-semibold text-red-600 mb-0.5">증상</p>
              <p className="text-body text-primary">{item.symptoms}</p>
            </div>
            <p className="text-caption font-semibold text-[#3D8A5A] mb-0.5">대처법</p>
            <p className="text-body text-[#4A4744] leading-relaxed whitespace-pre-line">{item.action}</p>
          </div>
        ))}

        {/* 이유식 레시피 타입 */}
        {guide.items?.[0]?.recipes && guide.items.map((section: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-0.5">{section.month}</p>
            <p className="text-caption text-secondary mb-3">{section.desc}</p>
            {section.recipes.map((r: any, j: number) => (
              <div key={j} className="bg-[#FFF9F5] rounded-lg p-3 mb-2 last:mb-0">
                <p className="text-body font-bold text-primary">{r.name}</p>
                <p className="text-caption text-[var(--color-primary)]">{r.ingredients}</p>
                <p className="text-caption text-[#4A4744] mt-1">{r.method}</p>
              </div>
            ))}
          </div>
        ))}

        {/* 월령별 놀이 타입 */}
        {guide.items?.[0]?.toys && guide.items.map((section: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-2">{section.month}</p>
            <div className="mb-2">
              <p className="text-caption font-semibold text-secondary mb-1">장난감</p>
              {section.toys.map((t: string, j: number) => <p key={j} className="text-body text-[#4A4744]">• {t}</p>)}
            </div>
            <div>
              <p className="text-caption font-semibold text-secondary mb-1">놀이</p>
              {section.plays.map((p: string, j: number) => <p key={j} className="text-body text-[#4A4744]">• {p}</p>)}
            </div>
          </div>
        ))}

        {/* 추천 리스트 타입 (태교) */}
        {guide.items?.[0]?.cat && guide.items?.[0]?.list && guide.items.map((section: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-2">{section.cat}</p>
            {section.list.map((item: string, j: number) => <p key={j} className="text-body text-[#4A4744]">• {item}</p>)}
          </div>
        ))}

        {/* 수면 교육 (desc만 있고 다른 필드 없는 경우) */}
        {guide.items?.[0]?.desc && guide.items?.[0]?.title && !guide.items?.[0]?.symptoms && !guide.items?.[0]?.recipes && guide.items.map((item: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-1">{item.title}</p>
            <p className="text-body text-[#4A4744] leading-relaxed whitespace-pre-line">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function FAQItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left active:bg-[#FFF9F5]">
        <span className="text-caption font-bold text-[var(--color-primary)] bg-[#E8F5EE] w-6 h-6 rounded-full flex items-center justify-center shrink-0">{idx}</span>
        <p className="text-body font-semibold text-primary flex-1">{q}</p>
        <span className="text-tertiary text-caption">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-body text-[#4A4744] leading-relaxed pl-9">{a}</p>
        </div>
      )}
    </div>
  )
}

function ChecklistSection({ cat, checks }: { cat: string; checks: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const toggle = (i: number) => setChecked(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })
  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-body-emphasis font-bold text-primary">{cat}</p>
        <span className="text-caption text-tertiary">{checked.size}/{checks.length}</span>
      </div>
      {checks.map((c, i) => (
        <button key={i} onClick={() => toggle(i)} className="w-full flex items-center gap-2.5 py-1.5 active:opacity-70">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${checked.has(i) ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[#D1D5DB]'}`}>
            {checked.has(i) && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <span className={`text-body ${checked.has(i) ? 'text-tertiary line-through' : 'text-primary'}`}>{c}</span>
        </button>
      ))}
    </div>
  )
}

function GuidePageInner() {
  const searchParams = useSearchParams()
  const guideKey = searchParams.get('id') || ''
  return <GuideContent guideKey={guideKey} />
}

export default function GuidePage() {
  return <Suspense><GuidePageInner /></Suspense>
}
