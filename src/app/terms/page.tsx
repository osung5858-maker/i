'use client'

import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()

  return (
    <div className="min-h-[100dvh] bg-white">
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECECEC]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-[13px] text-[#868B94]">닫기</button>
          <h1 className="text-[15px] font-bold text-[#212124]">서비스 이용약관</h1>
          <div className="w-8" />
        </div>
      </header>
      <div className="max-w-lg mx-auto w-full px-5 py-6 text-[13px] text-[#212124] leading-relaxed">
        <h2 className="text-[15px] font-bold mb-4">도담 서비스 이용약관</h2>
        <p className="text-[12px] text-[#868B94] mb-6">시행일: 2026년 3월 20일</p>

        <Section title="제1조 (목적)">
          이 약관은 도담(이하 &quot;서비스&quot;)이 제공하는 육아 기록 및 정보 서비스의 이용 조건과 절차, 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (서비스의 내용)">
          ① 서비스는 다음의 기능을 제공합니다.{'\n'}
          1. 아이의 수유, 수면, 배변, 체온 등 육아 기록 관리{'\n'}
          2. AI 기반 루틴 예보 및 이상 감지{'\n'}
          3. 영유아 건강검진 결과 분석{'\n'}
          4. 동네 육아 장소 정보 및 리뷰{'\n'}
          5. 공동양육자 연결 및 실시간 기록 공유{'\n'}
          6. 응급 모드 (가까운 소아과 찾기){'\n'}
          ② 서비스의 구체적인 내용은 서비스 화면에서 안내합니다.
        </Section>

        <Section title="제3조 (의료 면책)">
          ① 서비스는 의료 행위가 아니며, 서비스를 통해 제공되는 정보는 참고용입니다.{'\n'}
          ② AI 분석, 루틴 예보, 이상 감지, 성장 비교 등 모든 정보는 진단·처방·치료를 대체하지 않습니다.{'\n'}
          ③ 건강에 관한 의사결정은 반드시 소아과 전문의와 상담 후 진행하시기 바랍니다.{'\n'}
          ④ 응급 모드의 영업시간 정보는 정확하지 않을 수 있으며, 방문 전 전화 확인을 권장합니다.
        </Section>

        <Section title="제4조 (회원가입 및 탈퇴)">
          ① 회원가입은 카카오 계정을 통한 OAuth 인증으로 진행됩니다.{'\n'}
          ② 회원 탈퇴를 요청하면 30일의 유예 기간 후 모든 데이터가 삭제됩니다.{'\n'}
          ③ 유예 기간 중 재로그인 시 탈퇴를 취소할 수 있습니다.
        </Section>

        <Section title="제5조 (공동양육자)">
          ① 공동양육자는 초대 링크를 통해 연결되며, 초대 링크는 72시간 동안 유효합니다.{'\n'}
          ② 공동양육자는 아이의 기록을 조회하고 새 기록을 추가할 수 있습니다.{'\n'}
          ③ 아기 프로필의 삭제 및 공동양육자 해제는 프로필 등록자만 가능합니다.
        </Section>

        <Section title="제6조 (콘텐츠 정책)">
          ① 장소 리뷰에 비속어, 개인정보, 광고성 내용을 포함할 수 없습니다.{'\n'}
          ② 부적절한 리뷰는 경고 없이 숨김 처리될 수 있습니다.{'\n'}
          ③ 경고 3회 누적 시 리뷰 작성이 30일간 제한됩니다.
        </Section>

        <Section title="제7조 (면책사항)">
          ① 서비스는 천재지변, 전쟁, 기타 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.{'\n'}
          ② 이용자의 귀책사유로 인한 손해에 대해 서비스는 책임지지 않습니다.{'\n'}
          ③ 서비스는 무료로 제공되며, 유료 전환 시 사전 안내합니다.
        </Section>

        <p className="text-[11px] text-[#AEB1B9] mt-8">본 약관은 2026년 3월 20일부터 시행됩니다.</p>
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
