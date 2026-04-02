'use client'

import { useState } from 'react'
import { useRemoteContent } from '@/lib/useRemoteContent'
import { ExternalLinkIcon } from '@/components/ui/Icons'

type FreeBox = { id: string; category: string; name: string; desc: string; link: string; tip: string }

const DEFAULT_FREE_BOXES: FreeBox[] = [
  { id: 'bebeform_p', category: 'pregnancy', name: '베베폼 축하박스', desc: '임신/출산 선물 꾸러미', link: 'https://bebeform.co.kr/giftbox/', tip: '' },
  { id: 'momq_hug', category: 'pregnancy', name: '맘큐 하기스 허그박스', desc: '기저귀 · 물티슈 · 산모용품', link: 'https://www.momq.co.kr/event/202004180005#hugboxEventTop', tip: '' },
  { id: 'bebeking_p', category: 'pregnancy', name: '베베킹 축하박스', desc: '매월 200명 선물 증정', link: 'https://bebeking.co.kr/theme/bbk2026/contents/bebebox.php', tip: '' },
  { id: 'doubleheart', category: 'pregnancy', name: '더블하트 더블박스', desc: '약 20만원 상당 육아 필수템', link: 'https://m.doubleheart.co.kr/board/event/read.html?no=43417&board_no=8', tip: '' },
  { id: 'momsdiary', category: 'pregnancy', name: '맘스다이어리 맘스팩', desc: '임산부 맞춤 샘플 박스', link: 'https://event.momsdiary.co.kr/com_event/momspack/2026/3m/index.html?', tip: '' },
  { id: 'bebesup', category: 'pregnancy', name: '베베숲 마음박스', desc: '임신 · 출산 축하 선물 꾸러미', link: 'https://www.bebesup.co.kr/proc/heartbox', tip: '' },
  { id: 'penelope', category: 'birth', name: '페넬로페 더 퍼스트 박스', desc: '신생아 첫 선물 박스', link: 'https://pf.kakao.com/_dxfaRxd/103498627', tip: '' },
  { id: 'momspack', category: 'pregnancy', name: '맘스팩', desc: '매월 임산부 박스 발송', link: 'https://www.momspack.co.kr/', tip: '' },
]

const moneyItems = [
  { t: '국민행복카드', d: '임신 1회당 100만원 바우처 (다태아 140만원)', u: 'https://www.gov.kr/portal/onestopSvc/fertility' },
  { t: '첫만남이용권', d: '첫째 200만원 · 둘째 이상 300만원', u: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050455' },
  { t: '부모급여', d: '0세 월 100만원 · 1세 월 50만원', u: 'https://www.gov.kr/portal/service/serviceInfo/SD0000054655' },
  { t: '아동수당', d: '만 8세 미만 월 10만원', u: 'https://www.gov.kr/portal/service/serviceInfo/135200000120' },
  { t: '난임 시술비 지원', d: '체외수정 최대 110만원 · 인공수정 30만원', u: 'https://www.gov.kr/portal/service/serviceInfo/SME000000100' },
  { t: '난임 원스톱 서비스', d: '시술비 · 심리상담 통합 지원', u: 'https://www.gov.kr/portal/onestopSvc/Infertility' },
  { t: '다자녀 전기요금 할인', d: '3자녀 이상 30% 감면', u: 'https://www.gov.kr/portal/service/serviceInfo/SD0000022936' },
  { t: '맘편한임신 통합신청', d: '임신 후 각종 지원 한번에 신청', u: 'https://www.gov.kr/portal/onestopSvc/fertility' },
]

const healthItems = [
  { t: '임신 사전건강관리', d: '보건소 무료 산전검사 · 풍진/빈혈 검사', u: 'https://www.mohw.go.kr/menu.es?mid=a10711020200' },
  { t: '엽산·철분제 무료', d: '보건소 등록 시 무료 제공', u: 'https://www.gov.kr/portal/service/serviceInfo/SD0000016094' },
  { t: '임산부 건강관리', d: '보건소 무료 산전검사 · 풍진/빈혈', u: 'https://www.mohw.go.kr/menu.es?mid=a10711020200' },
  { t: '영유아 건강검진', d: '생후 14일~72개월 무료 검진', u: 'https://www.nhis.or.kr/nhis/healthin/wbhace04200m01.do' },
  { t: '고위험 임산부 의료비', d: '의료비 90% 지원 (소득 무관)', u: 'https://www.gov.kr/portal/service/serviceInfo/135200000114' },
  { t: '산후도우미 서비스', d: '정부 바우처 산후도우미', u: 'https://www.gov.kr/portal/onestopSvc/happyBirth' },
]

export default function BenefitTabs() {
  const [expandedSection, setExpandedSection] = useState<'money' | 'health' | 'box' | null>('money')

  const remoteFreeBoxes = useRemoteContent<FreeBox[]>('free_boxes', DEFAULT_FREE_BOXES)
  const boxItems = remoteFreeBoxes.filter(b => b.category !== 'birth').map(b => ({ t: b.name, d: b.desc, u: b.link }))

  const SECTIONS = [
    { key: 'money' as const, label: '지원금·정책', items: moneyItems },
    { key: 'health' as const, label: '의료·건강', items: healthItems },
    { key: 'box' as const, label: '축하박스·기타', items: boxItems },
  ]

  return (
    <div className="space-y-2">
      {SECTIONS.map(section => {
        const isExpanded = expandedSection === section.key
        return (
          <div key={section.key} className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
            <button
              onClick={() => setExpandedSection(isExpanded ? null : section.key)}
              className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-[var(--color-page-bg)]"
            >
              <span className="text-body-emphasis text-primary">{section.label}</span>
              <span className="text-tertiary transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
            </button>
            {isExpanded && (
              <div className="px-3 pb-3 max-h-[280px] overflow-y-auto space-y-1.5">
                {section.items.map(it => (
                  <a key={it.t} href={it.u} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 bg-[var(--color-page-bg)] rounded-xl active:bg-[#E8E4DF]">
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-primary">{it.t}</p>
                      <p className="text-label text-secondary">{it.d}</p>
                    </div>
                    <ExternalLinkIcon className="w-3.5 h-3.5 text-tertiary shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
