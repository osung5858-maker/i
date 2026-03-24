'use client'

import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="min-h-[100dvh] bg-white">
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECECEC]">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-[13px] text-[#868B94]">닫기</button>
          <h1 className="text-[15px] font-bold text-[#212124]">개인정보처리방침</h1>
          <div className="w-8" />
        </div>
      </header>
      <div className="max-w-lg mx-auto w-full px-5 py-6 text-[13px] text-[#212124] leading-relaxed">
        <h2 className="text-[15px] font-bold mb-4">도담 개인정보처리방침</h2>
        <p className="text-[12px] text-[#868B94] mb-6">시행일: 2026년 3월 20일</p>

        <Section title="제1조 (수집하는 개인정보)">
          <b>1. 부모(회원) 정보</b>{'\n'}
          · 이메일, 닉네임: 계정 식별 및 서비스 내 표시 (카카오 OAuth 자동 수집){'\n'}
          · 지역(시·구): 동네 기반 장소 추천 (선택 입력){'\n'}
          · 푸시 토큰: 알림 발송 (선택){'\n\n'}
          <b>2. 아이(도담이) 정보</b>{'\n'}
          · 이름, 생년월일: 프로필 표시, 개월 수 계산, 검진 일정 (필수){'\n'}
          · 성별: 성장 곡선 비교 — 남/녀 표준치 상이 (선택){'\n'}
          · 키(cm), 몸무게(kg), 머리둘레(cm): 성장 비교, 타임랩스 (선택){'\n'}
          · 체온(°C): 이상 감지, 응급 모드 연계 (선택){'\n'}
          · 수유/수면/배변 기록: 루틴 분석, AI 예보 (선택){'\n'}
          · 특이사항(알레르기 등): 맞춤 제안 (선택){'\n\n'}
          <b>3. 위치 정보</b>{'\n'}
          · GPS 좌표: 장소 지도, 응급 모드에서 사용 시점에만 수집하며 서버에 저장하지 않습니다.
        </Section>

        <Section title="제2조 (아동 개인정보 특별 규정)">
          ① 도담은 만 14세 미만 아동의 개인정보를 수집합니다 (개인정보보호법 제22조의2).{'\n'}
          ② 부모(법정대리인)가 직접 가입하고, 본인 자녀의 데이터를 직접 입력하는 구조로 법정대리인 동의를 충족합니다.{'\n'}
          ③ 가입 시 서비스 이용약관, 개인정보처리방침, 아동 개인정보 수집·이용 동의 3종에 동의해야 합니다.
        </Section>

        <Section title="제3조 (개인정보의 이용 목적)">
          · 육아 기록 관리 및 분석 (루틴 예보, 이상 감지){'\n'}
          · 성장 비교 (WHO 표준 곡선 대비){'\n'}
          · 위치 기반 육아 장소 안내 및 응급 모드{'\n'}
          · 공동양육자 간 기록 공유{'\n'}
          · 검진 결과 AI 분석{'\n'}
          · 서비스 개선 (익명 통계)
        </Section>

        <Section title="제4조 (제3자 제공)">
          · <b>Gemini AI (Google)</b>: 검진 결과 분석 및 AI 카드 텍스트 생성 시 익명화된 통계 수치만 전달합니다. 아이 이름, 부모 식별정보, 고유 ID는 전송하지 않습니다.{'\n'}
          · 그 외 제3자에게 개인정보를 제공하지 않습니다.
        </Section>

        <Section title="제5조 (보존 및 삭제)">
          · 회원 정보: 탈퇴 후 30일 유예 → 물리 삭제{'\n'}
          · 아이 프로필: 프로필 삭제 즉시 관련 기록 일괄 삭제{'\n'}
          · 이벤트 기록: 아이 프로필 삭제 시 일괄 삭제{'\n'}
          · 익명 통계: 영구 보존 (개인 식별 불가){'\n'}
          · 장소 리뷰: 탈퇴 시 작성자명 &quot;탈퇴한 사용자&quot;로 치환, 내용 보존{'\n'}
          · 위치 데이터: 서버에 저장하지 않음
        </Section>

        <Section title="제6조 (암호화)">
          · 저장 시: Supabase 기본 암호화 (AES-256){'\n'}
          · 전송 시: TLS 1.3{'\n'}
          · 비교 통계: 완전 익명 집계 (개별 식별 불가)
        </Section>

        <Section title="제7조 (이용자의 권리)">
          ① 이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다.{'\n'}
          ② 아이 프로필 삭제 시 관련 모든 데이터가 즉시 삭제됩니다.{'\n'}
          ③ 회원 탈퇴는 설정 &gt; 계정에서 요청할 수 있습니다.
        </Section>

        <Section title="제8조 (개인정보 보호책임자)">
          · 서비스명: 도담 (Dodam){'\n'}
          · 문의: 설정 &gt; 의견 보내기
        </Section>

        <p className="text-[11px] text-[#AEB1B9] mt-8">본 방침은 2026년 3월 20일부터 시행됩니다.</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[13px] font-bold text-[#212124] mb-2">{title}</h3>
      <p className="text-[12px] text-[#555] leading-relaxed whitespace-pre-line">{children}</p>
    </div>
  )
}
