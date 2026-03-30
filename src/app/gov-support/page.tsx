'use client'

import { PageHeader } from '@/components/layout/PageLayout'
import { ExternalLinkIcon } from '@/components/ui/Icons'
import { useRemoteContent } from '@/lib/useRemoteContent'

interface Benefit {
  title: string
  amount: string
  link?: string
}

const DEFAULT_SECTIONS: { label: string; color: string; items: Benefit[] }[] = [
  {
    label: '현금 지원',
    color: '#E8F5EE',
    items: [
      { title: '부모급여', amount: '0세 월 100만원 · 1세 월 50만원', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000143' },
      { title: '아동수당', amount: '만 8세 미만 월 10만원', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000120' },
      { title: '첫만남이용권', amount: '첫째 200만원 · 둘째 이상 300만원 (바우처)', link: 'https://www.gov.kr/portal/service/serviceInfo/135200005015' },
      { title: '영아수당', amount: '0~1세 월 30만원 (어린이집 미이용 시)', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000143' },
      { title: '양육수당', amount: '어린이집 미이용 시 월 10~20만원', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000036' },
    ],
  },
  {
    label: '의료·건강',
    color: '#F0F0FF',
    items: [
      { title: '영유아 건강검진 무료', amount: '생후 14일~72개월, 총 12회 무료', link: 'https://www.nhis.or.kr/nhis/healthin/wbhcb300.do' },
      { title: '국민행복카드 (임신)', amount: '임신 1회당 100만원 바우처 (다태아 140만원)', link: 'https://www.gov.kr/portal/onestopSvc/fertility' },
      { title: '미숙아·선천성이상아 의료비', amount: '입원 진료비 지원', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000114' },
      { title: '선천성 대사이상 검사', amount: '무료 (출생 후 신생아 선별검사)', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000036' },
    ],
  },
  {
    label: '보육·교육',
    color: '#FFF8F3',
    items: [
      { title: '어린이집 보육료', amount: '0~5세 전액 지원 (어린이집 이용 시)', link: 'https://www.childcare.go.kr/' },
      { title: '유아학비', amount: '유치원 이용 시 월 최대 28만원', link: 'https://e-childschoolinfo.moe.go.kr/' },
      { title: '아이돌봄 서비스', amount: '시간당 정부 지원 (소득에 따라 차등)', link: 'https://idolbom.go.kr/' },
      { title: '시간제 보육', amount: '어린이집 미이용 아동, 월 80시간 이용', link: 'https://www.childcare.go.kr/' },
    ],
  },
]

export default function GovSupportPage() {
  const sections = useRemoteContent('gov_support_sections', DEFAULT_SECTIONS)
  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="정부 지원 혜택" showBack />
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-4">
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-3">
          <p className="text-[13px] text-[#6B6966] leading-relaxed">
            육아 가정을 위한 주요 정부 지원 혜택을 모았어요. 자세한 내용은 각 항목의 신청 링크를 확인하세요.
          </p>
        </div>

        {sections.map(section => (
          <div key={section.label}>
            <p className="text-[12px] font-semibold text-[#9E9A95] mb-2 uppercase tracking-wider">{section.label}</p>
            <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
              {section.items.map((item, i) => (
                <div
                  key={item.title}
                  className={`p-3.5 ${i > 0 ? 'border-t border-[#E8E4DF]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1A1918]">{item.title}</p>
                      <p className="text-[13px] text-[#6B6966] mt-0.5">{item.amount}</p>
                    </div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-[12px] text-[var(--color-primary)] font-semibold px-2.5 py-1.5 rounded-lg bg-[#E8F5EE] active:opacity-70"
                      >
                        신청 <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-[#F0F9F4] rounded-xl p-3 text-center">
          <p className="text-[13px] text-[var(--color-primary)] font-semibold mb-1">정부24 한번에 신청</p>
          <a
            href="https://www.gov.kr/portal/onestopSvc/happyBirth"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-[#6B6966] inline-flex items-center gap-1"
          >
            행복출산 원스톱 서비스 → <ExternalLinkIcon className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
