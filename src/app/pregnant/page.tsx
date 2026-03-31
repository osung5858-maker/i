'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRemoteContent } from '@/lib/useRemoteContent'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { shareFetalSize, shareDday } from '@/lib/kakao/share-pregnant'
import BabyIllust from '@/components/pregnant/BabyIllust'
import { SparkleIcon, PenIcon, StethoscopeIcon, ClipboardIcon, ActivityIcon, HeartFilledIcon, ExternalLinkIcon, WalkIcon, VitaminIcon, MoodHappyIcon, MoodCalmIcon, MoodAnxiousIcon, MoodSickIcon, MoodTiredIcon, ChartIcon, DropletIcon, CompassIcon } from '@/components/ui/Icons'
import TodayRecordSection from '@/components/ui/TodayRecordSection'
import IllustVideo from '@/components/ui/IllustVideo'
import AIMealCard from '@/components/ai-cards/AIMealCard'
import PushPrompt from '@/components/push/PushPrompt'
import SpotlightGuide from '@/components/onboarding/SpotlightGuide'
import { setSecure, getSecure } from '@/lib/secureStorage'

const HospitalGuide = dynamic(() => import('@/components/pregnant/HospitalGuide'), {
  loading: () => <div className="h-32 bg-[#F0EDE8] rounded-xl animate-pulse" />,
})

// ===== 태아 데이터 =====
const FETAL_DATA = [
  { week: 4, fruit: '/images/illustrations/f1.webm', name: '참깨', length: '0.1cm', weight: '-', desc: '수정란이 자궁에 착상했어요', tip: '엽산 복용을 시작하세요' },
  { week: 8, fruit: '/images/illustrations/f2.webm', name: '블루베리', length: '1.6cm', weight: '1g', desc: '심장이 뛰기 시작했어요!', tip: '첫 초음파 검사를 받아보세요' },
  { week: 12, fruit: '/images/illustrations/f3.webm', name: '자두', length: '5.4cm', weight: '14g', desc: '손가락 발가락이 생겼어요', tip: '입덧이 줄어들기 시작해요' },
  { week: 16, fruit: '/images/illustrations/f4.webm', name: '오렌지', length: '11.6cm', weight: '100g', desc: '태동을 느낄 수 있어요!', tip: '안정기 진입! 가벼운 산책을 시작하세요' },
  { week: 20, fruit: '/images/illustrations/f5.webm', name: '바나나', length: '25cm', weight: '300g', desc: '성별을 확인할 수 있어요', tip: '정밀 초음파 검사 시기예요' },
  { week: 24, fruit: '/images/illustrations/f6.webm', name: '옥수수', length: '30cm', weight: '600g', desc: '소리를 들을 수 있어요', tip: '태교 음악을 들려주세요' },
  { week: 28, fruit: '/images/illustrations/f7.webm', name: '코코넛', length: '37cm', weight: '1kg', desc: '눈을 뜨기 시작해요', tip: '임신성 당뇨 검사를 받으세요' },
  { week: 32, fruit: '/images/illustrations/f8.webm', name: '멜론', length: '42cm', weight: '1.7kg', desc: '폐가 성숙해지고 있어요', tip: '출산 가방을 준비하세요' },
  { week: 36, fruit: '/images/illustrations/f9.webm', name: '수박', length: '47cm', weight: '2.6kg', desc: '출산 자세로 내려오고 있어요', tip: '2주마다 검진을 받으세요' },
  { week: 40, fruit: '/images/illustrations/f9.webm', name: '호박', length: '51cm', weight: '3.4kg', desc: '만삭! 언제든 만날 수 있어요', tip: '진통 신호를 확인해두세요' },
]

// ===== 무료 축하박스 · 샘플 =====
const DEFAULT_FREE_BOXES = [
  // 임신 축하박스
  { id: 'bebeform_p', category: 'pregnancy', name: '베베폼 임신축하박스', desc: '임신 선물 꾸러미 (SNS 공유 필요)', link: 'https://bebeform.co.kr/giftbox/', tip: '매월 추첨' },
  { id: 'bebeking_p', category: 'pregnancy', name: '베베킹 임신축하박스', desc: '매월 200명 선물 증정', link: 'https://bebeking.co.kr/theme/bbk2026/contents/bebebox.php', tip: '매월 추첨' },
  { id: 'momq_hug', category: 'pregnancy', name: '맘큐 하기스 허그박스', desc: '하기스 기저귀 · 물티슈 · 산모용품', link: 'https://www.momq.co.kr/event/202004180005#hugboxEventTop', tip: '배송비 3,500원 · 부부 각각 신청 가능' },
  { id: 'doubleheart', category: 'pregnancy', name: '더블하트 더블박스', desc: '약 20만원 상당 육아 필수템', link: 'https://m.doubleheart.co.kr/board/event/read.html?no=43417&board_no=8', tip: '회원가입 후 신청' },
  { id: 'momsdiary', category: 'pregnancy', name: '맘스다이어리 맘스팩', desc: '임산부 맞춤 샘플 박스', link: 'https://event.momsdiary.co.kr/com_event/momspack/2026/3m/index.html?', tip: '신청 후 배송' },
  { id: 'bebesup', category: 'pregnancy', name: '베베숲 마음박스', desc: '임신 · 출산 축하 선물 꾸러미', link: 'https://www.bebesup.co.kr/proc/heartbox', tip: '신청 후 배송' },
  { id: 'namyang_p', category: 'pregnancy', name: '남양유업 임신축하 샘플', desc: '임산부 맞춤 샘플 증정', link: 'https://shopping.namyangi.com/', tip: '남양아이 가입' },
  // 출산 축하박스 / 분유 샘플
  { id: 'bebeform_b', category: 'birth', name: '베베폼 출산축하박스', desc: '출산 선물 꾸러미', link: 'https://bebeform.co.kr/giftbox/', tip: '출산 후 신청' },
  { id: 'bebeking_b', category: 'birth', name: '베베킹 출산축하박스', desc: '기저귀 · 물티슈 · 샘플 모음', link: 'https://bebeking.co.kr/theme/bbk2026/contents/bebebox.php', tip: '출산 후 신청' },
  { id: 'penelope', category: 'birth', name: '페넬로페 더 퍼스트 박스', desc: '신생아 첫 선물 박스', link: 'https://pf.kakao.com/_dxfaRxd/103498627', tip: '카카오 채널 신청' },
]

// ===== 검진 리마인더 =====
const DEFAULT_CHECKUPS = [
  { week: 8, id: 'first_us', title: '첫 초음파', desc: '심장 박동 확인', icon: '' },
  { week: 11, id: 'nt', title: 'NT 검사', desc: '목덜미 투명대 측정', icon: '' },
  { week: 16, id: 'quad', title: '쿼드 검사', desc: '기형아 선별 검사', icon: '' },
  { week: 20, id: 'precise_us', title: '정밀 초음파', desc: '태아 정밀 구조 확인', icon: '' },
  { week: 24, id: 'gtt', title: '임신성 당뇨 검사', desc: '포도당 부하 검사', icon: '' },
  { week: 28, id: 'antibody', title: '항체 검사', desc: 'Rh 음성 시 필수', icon: '' },
  { week: 32, id: 'nst1', title: 'NST 검사 (1차)', desc: '태아 심박수 모니터링', icon: '' },
  { week: 36, id: 'gbs', title: 'GBS 검사', desc: 'B군 연쇄상구균', icon: '' },
  { week: 37, id: 'nst2', title: 'NST (매주)', desc: '주 1회 태아 안녕 평가', icon: '' },
]

// ===== 혜택 · 제도 타임라인 =====
const DEFAULT_BENEFITS_TIMELINE = [
  // 임신 확인 즉시
  { week: 0, id: 'happy_card', title: '국민행복카드 신청', desc: '임신 1회당 100만원 (다태아 140만원) 바우처', when: '임신 확인 즉시', icon: '', link: 'https://www.gov.kr/portal/onestopSvc/fertility', priority: 'high' },
  { week: 0, id: 'health_center', title: '보건소 등록', desc: '엽산제 · 철분제 무료 + 산전검사', when: '임신 확인 즉시', icon: '', link: 'https://www.gov.kr/portal/onestopSvc/fertility', priority: 'high' },
  { week: 0, id: 'mother_book', title: '모자보건수첩 발급', desc: '산부인과 또는 보건소에서 발급', when: '임신 확인 즉시', icon: '', priority: 'high' },
  // 초기
  { week: 8, id: 'workplace', title: '직장 보고 (선택)', desc: '근로기준법상 임산부 보호 적용', when: '8주 이후', icon: '', priority: 'medium' },
  { week: 12, id: 'high_risk', title: '고위험 임산부 확인', desc: '해당 시 의료비 90% 지원 (소득 무관)', when: '12주 전후', icon: '', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000114', priority: 'medium' },
  // 중기
  { week: 16, id: 'postpartum_reserve', title: '산후조리원 예약', desc: '인기 조리원은 초기에 예약 필수!', when: '16주 전후', icon: '', priority: 'high' },
  { week: 20, id: 'insurance', title: '태아 보험 가입', desc: '출산 전 가입 시 선천이상 보장', when: '22주 전 권장', icon: '', priority: 'high' },
  { week: 20, id: 'transport', title: '임산부 교통비 확인', desc: '서울 월 7만원 등 지자체별 상이', when: '20주~', icon: '', priority: 'low' },
  // 후기
  { week: 30, id: 'birth_plan', title: '출산 병원 확정', desc: '분만실 예약 · 입원 절차 확인', when: '30주 전후', icon: '', priority: 'high' },
  { week: 32, id: 'postnatal_helper', title: '산후도우미 신청', desc: '정부 바우처 산후도우미 서비스', when: '32주~', icon: '', link: 'https://www.gov.kr/portal/onestopSvc/happyBirth', priority: 'medium' },
  { week: 36, id: 'birth_docs', title: '출생신고 서류 준비', desc: '신분증 · 혼인관계증명서 · 인감', when: '36주~', icon: '', priority: 'medium' },
  // 출산 후
  { week: 41, id: 'birth_report', title: '출생신고 (행복출산 원스톱)', desc: '14일 이내 — 6종 서비스 한번에 신청', when: '출산 후 즉시', icon: '', link: 'https://www.gov.kr/portal/onestopSvc/happyBirth', priority: 'high' },
  { week: 41, id: 'first_meet', title: '첫만남이용권', desc: '첫째 200만원 · 둘째 이상 300만원', when: '출생신고 시 자동', icon: '', link: 'https://www.gov.kr/portal/service/serviceInfo/135200005015', priority: 'high' },
  { week: 41, id: 'parent_pay', title: '부모급여 신청', desc: '0세 월 100만원 · 1세 월 50만원', when: '출산 후 60일 내', icon: '', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000143', priority: 'high' },
  { week: 41, id: 'child_allow', title: '아동수당 신청', desc: '만 8세 미만 월 10만원', when: '출산 후', icon: '', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000120', priority: 'high' },
  { week: 41, id: 'baby_insurance_add', title: '건강보험 피부양자 등록', desc: '출생 후 14일 내 등록', when: '출산 후', icon: '', priority: 'high' },
]

// ===== 출산 가방 =====
const DEFAULT_HOSPITAL_BAG = {
  mom: [
    '산모 수첩 · 보험증', '수유 브라 2개', '산모 패드', '산모복 · 속옷',
    '세면도구 · 수건', '슬리퍼', '보온 양말', '간식 · 음료', '충전기', '산후 복대',
  ],
  baby: [
    '배냇저고리 2벌', '속싸개 · 겉싸개', '기저귀 (신생아)', '물티슈',
    '카시트 (퇴원용)', '모자 · 양말', '젖병 1개', '분유 소량 (비상용)',
  ],
  partner: [
    '간식 · 음료', '충전기 · 보조배터리', '카메라', '갈아입을 옷',
    '출생신고 서류', '주차 동전',
  ],
}

// ===== 계절별 출산 가방 추가 아이템 =====
const SEASONAL_BAG: Record<string, { season: string; items: string[] }> = {
  summer: { season: '여름', items: ['휴대용 선풍기', '쿨매트 · 쿨패드', '얇은 속싸개', '모기 기피제 (아기용)'] },
  winter: { season: '겨울', items: ['두꺼운 겉싸개 · 방한용', '핫팩 (산모용)', '보온 텀블러', '아기 방한우주복'] },
}

function getSeasonalBag(): { season: string; items: string[] } | null {
  const month = new Date().getMonth() + 1
  if (month >= 6 && month <= 8) return SEASONAL_BAG.summer
  if (month >= 11 || month <= 2) return SEASONAL_BAG.winter
  return null
}

// ===== 혜택 3탭 (정부지원 / 축하박스 / 출산 후) =====
function BenefitTabs({ currentWeek, benefitDone, toggleBenefit }: { currentWeek: number; benefitDone: Record<string, boolean>; toggleBenefit: (id: string) => void }) {
  const [tab, setTab] = useState<'gov' | 'box' | 'after'>('gov')
  const freeBoxes = useRemoteContent('free_boxes', DEFAULT_FREE_BOXES)
  const benefitsTimeline = useRemoteContent('benefits_timeline', DEFAULT_BENEFITS_TIMELINE)

  const govBenefits = benefitsTimeline.filter(b => b.week <= 40)
  const afterBenefits = benefitsTimeline.filter(b => b.week > 40)
  const pregBoxes = freeBoxes.filter(b => b.category === 'pregnancy')
  const birthBoxes = freeBoxes.filter(b => b.category === 'birth')

  const urgentCount = govBenefits.filter(b => b.week <= currentWeek && !benefitDone[b.id] && b.priority === 'high').length
    + afterBenefits.filter(b => currentWeek >= 38 && !benefitDone[b.id]).length

  const TABS = [
    { key: 'gov' as const, label: '정부 지원', badge: urgentCount > 0 ? urgentCount : undefined },
    { key: 'box' as const, label: '축하박스' },
    { key: 'after' as const, label: '출산 후 혜택' },
  ]

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
      {/* 탭 헤더 */}
      <div className="flex border-b border-[#E8E4DF]">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-[12px] font-semibold text-center relative transition-colors ${
              tab === t.key ? 'text-[var(--color-primary)] bg-[var(--color-accent-bg)]/30' : 'text-[#9E9A95]'
            }`}
          >
            {t.label}
            {t.badge && (
              <span className="absolute -top-0.5 right-2 w-4 h-4 rounded-full bg-[#D05050] text-white text-[9px] font-bold flex items-center justify-center">
                {t.badge}
              </span>
            )}
            {tab === t.key && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--color-primary)] rounded-full" />}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="p-3 max-h-[320px] overflow-y-auto">
        {tab === 'gov' && (
          <div className="space-y-2">
            {govBenefits.map(b => {
              const isPast = b.week <= currentWeek
              const done = benefitDone[b.id]
              const isUrgent = isPast && !done && b.priority === 'high'
              return (
                <div key={b.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${isUrgent ? 'bg-[#FFF8F3] border border-[#FFDDC8]' : done ? 'bg-[#F0F9F4]' : 'bg-[var(--color-page-bg)]'}`}>
                  <button onClick={() => toggleBenefit(b.id)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${done ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[#D1D5DB] bg-white'}`}>
                    {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] font-semibold ${done ? 'text-[#9E9A95] line-through' : 'text-[#1A1918]'}`}>{b.title}</p>
                      {isUrgent && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#D05050] text-white font-bold">긴급</span>}
                    </div>
                    <p className="text-[11px] text-[#6B6966]">{b.desc}</p>
                    <p className="text-[11px] text-[#9E9A95]">{b.when}</p>
                  </div>
                  {b.link && (
                    <a href={b.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-[var(--color-primary)] font-semibold shrink-0 mt-0.5">
                      신청 <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'box' && (
          <div className="space-y-2">
            <p className="text-[12px] text-[#9E9A95] font-medium mb-1">임신 축하박스</p>
            {pregBoxes.map(b => (
              <a key={b.id} href={b.link} target="_blank" rel="noopener noreferrer" className="block p-2.5 rounded-xl bg-[var(--color-page-bg)] active:bg-[#E8E4DF]">
                <p className="text-[13px] font-semibold text-[#1A1918]">{b.name}</p>
                <p className="text-[11px] text-[#6B6966]">{b.desc}</p>
                <p className="text-[11px] text-[var(--color-primary)] inline-flex items-center gap-0.5">{b.tip} <ExternalLinkIcon className="w-2.5 h-2.5" /></p>
              </a>
            ))}
            <p className="text-[12px] text-[#9E9A95] font-medium mt-3 mb-1">출산 축하박스 / 분유 샘플</p>
            {birthBoxes.map(b => (
              <a key={b.id} href={b.link} target="_blank" rel="noopener noreferrer" className="block p-2.5 rounded-xl bg-[var(--color-page-bg)] active:bg-[#E8E4DF]">
                <p className="text-[13px] font-semibold text-[#1A1918]">{b.name}</p>
                <p className="text-[11px] text-[#6B6966]">{b.desc}</p>
                <p className="text-[11px] text-[var(--color-primary)] inline-flex items-center gap-0.5">{b.tip} <ExternalLinkIcon className="w-2.5 h-2.5" /></p>
              </a>
            ))}
          </div>
        )}

        {tab === 'after' && (
          <div className="space-y-2">
            <p className="text-[12px] text-[#6B6966] mb-2">출산 후 즉시 신청해야 할 혜택들이에요. 미리 확인해두세요!</p>
            {afterBenefits.map(b => {
              const done = benefitDone[b.id]
              return (
                <div key={b.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${done ? 'bg-[#F0F9F4]' : 'bg-[var(--color-page-bg)]'}`}>
                  <button onClick={() => toggleBenefit(b.id)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${done ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[#D1D5DB] bg-white'}`}>
                    {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold ${done ? 'text-[#9E9A95] line-through' : 'text-[#1A1918]'}`}>{b.title}</p>
                    <p className="text-[11px] text-[#6B6966]">{b.desc}</p>
                    <p className="text-[11px] text-[#9E9A95]">{b.when}</p>
                  </div>
                  {b.link && (
                    <a href={b.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-[var(--color-primary)] font-semibold shrink-0 mt-0.5">
                      신청 <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== AI 디스플레이 — 요약 + 펼치기 =====
function PregnantAIDisplay({ briefing, onRefresh, week, daysLeft, fruit, fruitName }: { briefing: any; onRefresh: () => void; week: number; daysLeft: number; fruit: string; fruitName: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[13px] text-white font-bold">AI</span>
        </div>
        <div className="flex-1">
          {/* 요약: 첫 문장 볼드 + 나머지 일반 */}
          {(() => {
            const text = briefing.greeting || briefing.mainAdvice?.slice(0, 80) || ''
            const firstDot = text.search(/[.!?]\s|[.!?]$/)
            const headline = firstDot > 0 ? text.slice(0, firstDot + 1) : text.slice(0, 50)
            const rest = firstDot > 0 ? text.slice(firstDot + 1).trim() : text.slice(50).trim()
            return (
              <div>
                <span className="text-[15px] font-bold text-[#1A1918] leading-snug">{headline}</span>
                {rest && <span className="text-[14px] text-[#4A4744] leading-relaxed"> {rest}</span>}
              </div>
            )
          })()}

          {/* 아기 메시지 (항상) */}
          {briefing.babyMessage && (
            <div className="bg-[#FFF8F3] rounded-lg p-2 mt-1.5">
              <p className="text-[13px] text-[#1A1918]">{briefing.babyMessage}</p>
            </div>
          )}

          {/* 상세 (펼치기) */}
          {expanded && (
            <div className="mt-2 space-y-1.5 bg-white/60 rounded-lg p-2.5">
              {briefing.mainAdvice && <p className="text-[13px] text-[#4A4744] leading-relaxed">{briefing.mainAdvice}</p>}
              {briefing.weekHighlight && <p className="text-[13px] text-[#4A4744] leading-relaxed">{briefing.weekHighlight}</p>}
              {briefing.bodyTip && <p className="text-[13px] text-[#4A4744] leading-relaxed">{briefing.bodyTip}</p>}
              {briefing.emotionalCare && <p className="text-[13px] text-[#4A4744] leading-relaxed">{briefing.emotionalCare}</p>}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setExpanded(!expanded)} className="text-[13px] text-[var(--color-primary)] font-medium">
              {expanded ? '접기 ▲' : '자세히 ▼'}
            </button>
            <button onClick={onRefresh} className="text-[13px] text-[#9E9A95]">다시 받기</button>
            <button onClick={() => shareDday(week, daysLeft, fruitName)} className="text-[13px] text-[var(--color-primary)]">공유</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function haptic() { if (navigator.vibrate) navigator.vibrate(20) }

export default function PregnantPage() {
  const checkups = useRemoteContent('checkups', DEFAULT_CHECKUPS)
  const hospitalBag = useRemoteContent('hospital_bag', DEFAULT_HOSPITAL_BAG)
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); haptic(); setTimeout(() => setToast(null), 2000) }
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('dodam_guide_pregnant')) {
      const t = setTimeout(() => setShowGuide(true), 1000)
      return () => clearTimeout(t)
    }
  }, [])

  const [dueDate, setDueDate] = useState<string>('')
  const [editingDate, setEditingDate] = useState(true)
  useEffect(() => {
    getSecure('dodam_due_date').then(v => { if (v) { setDueDate(v); setEditingDate(false) } })
  }, [])

  // 건강 기록 (parse once instead of 4x)
  const today = new Date().toISOString().split('T')[0]
  const _initHealth = (() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')[today] || {} } catch { return {} } }
    return {}
  })()
  const [weight, setWeight] = useState<number>(_initHealth.weight || 0)
  const [bp] = useState<string>(_initHealth.bp || '')
  const [fetalMove, setFetalMove] = useState<number>(_initHealth.fetalMove || 0)
  const [edema, setEdema] = useState<string>(_initHealth.edema || '')
  const [mood, setMood] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(`dodam_preg_mood_${today}`) || ''
    return ''
  })

  // 태교 일기
  const [diaryText, setDiaryText] = useState('')
const [diarySaving, setDiarySaving] = useState(false)
  const [pregTodayEvents, setPregTodayEvents] = useState<{ id: number; type: string; data: Record<string, any>; timeStr: string }[]>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem(`dodam_preg_events_${new Date().toISOString().split('T')[0]}`) || '[]') } catch { return [] }
    }
    return []
  })
  const [diarySheetOpen, setDiarySheetOpen] = useState(false)
  const [diaries, setDiaries] = useState<{ text: string; date: string; mood: string; comment: string }[]>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_diary') || '[]') } catch { return [] } }
    return []
  })

  // 체크
  const [checkupDone, setCheckupDone] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_checkups') || '{}') } catch { return {} } }
    return {}
  })
  const [bagChecked, setBagChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_hospital_bag') || '{}') } catch { return {} } }
    return {}
  })

  // 혜택 체크
  const [benefitDone, setBenefitDone] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_benefits') || '{}') } catch { return {} } }
    return {}
  })

  // 진통 타이머
  const [contractions, setContractions] = useState<{ start: number; end?: number }[]>([])
  const [contractionActive, setContractionActive] = useState(false)

  // AI
  const [aiBriefing, setAiBriefing] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  // 더보기
  const [moreOpen, setMoreOpen] = useState(false)

  const currentWeek = useMemo(() => {
    if (!dueDate) return 0
    const ms = new Date(dueDate).getTime()
    if (isNaN(ms)) return 0
    const diff = Math.floor((ms - Date.now()) / 86400000)
    return Math.max(1, Math.min(42, 40 - Math.floor(diff / 7)))
  }, [dueDate])

  const daysLeft = useMemo(() => {
    if (!dueDate) return 0
    const ms = new Date(dueDate).getTime()
    if (isNaN(ms)) return 0
    return Math.max(0, Math.floor((ms - Date.now()) / 86400000))
  }, [dueDate])

  const currentFetal = useMemo(() => {
    return [...FETAL_DATA].reverse().find(f => currentWeek >= f.week) || FETAL_DATA[0]
  }, [currentWeek])

  const trimester = currentWeek <= 13 ? '초기' : currentWeek <= 27 ? '중기' : '후기'
  const upcomingCheckups = checkups.filter(c => c.week >= currentWeek && !checkupDone[c.id]).slice(0, 3)

  const saveEdema = (level: string) => {
    setEdema(level)
    const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
    all[today] = { ...all[today], edema: level }
    localStorage.setItem('dodam_preg_health', JSON.stringify(all))
    showToast(level === 'none' ? '부종 없음 기록' : level === 'mild' ? '약간 부종 기록' : '심한 부종 기록')
  }
  const saveMood = (m: string) => {
    setMood(m); localStorage.setItem(`dodam_preg_mood_${today}`, m)
    showToast('오늘 기분이 기록됐어요')
  }
  const toggleCheckup = (id: string) => {
    const next = { ...checkupDone, [id]: !checkupDone[id] }
    setCheckupDone(next); localStorage.setItem('dodam_preg_checkups', JSON.stringify(next))
    showToast(next[id] ? '검진 완료!' : '검진 취소')
  }
  const toggleBag = (item: string) => {
    const next = { ...bagChecked, [item]: !bagChecked[item] }
    setBagChecked(next); localStorage.setItem('dodam_hospital_bag', JSON.stringify(next))
    showToast(next[item] ? '챙김 완료!' : '취소')
  }
  const toggleBenefit = (id: string) => {
    const next = { ...benefitDone, [id]: !benefitDone[id] }
    setBenefitDone(next); localStorage.setItem('dodam_benefits', JSON.stringify(next))
    showToast(next[id] ? '신청 완료 체크!' : '취소')
  }

  // 태교 일기 저장
  const saveDiary = async () => {
    if (!diaryText.trim()) return
    setDiarySaving(true)
    let comment = '오늘도 도담하게 잘 지내고 있어요'
    try {
      const res = await fetch('/api/ai-pregnant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'diary', text: diaryText, week: currentWeek, mood }),
      })
      const data = await res.json()
      if (data.comment) comment = data.comment
    } catch { /* fallback */ }
    const entry = { text: diaryText.trim(), date: new Date().toISOString(), mood, comment }
    const next = [entry, ...diaries]
    setDiaries(next); localStorage.setItem('dodam_preg_diary', JSON.stringify(next))
    setDiaryText(''); setDiarySaving(false)
  }

  // 진통 타이머
  const startContraction = () => {
    setContractionActive(true)
    setContractions(prev => [...prev, { start: Date.now() }])
  }
  const endContraction = () => {
    setContractionActive(false)
    setContractions(prev => {
      const copy = [...prev]
      if (copy.length > 0) copy[copy.length - 1].end = Date.now()
      return copy
    })
  }
  const lastInterval = contractions.length >= 2
    ? Math.round((contractions[contractions.length - 1].start - contractions[contractions.length - 2].start) / 60000)
    : null

  // AI 브리핑
  const fetchAI = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem('dodam_preg_ai')
      if (cached) { try { const { date, data } = JSON.parse(cached); if (date === today && data.greeting) { setAiBriefing(data); return } } catch { /* */ } }
    }
    setAiLoading(true)
    try {
      const healthRaw = localStorage.getItem('dodam_health_records')
      const health = healthRaw ? JSON.parse(healthRaw) : {}
      const res = await fetch('/api/ai-pregnant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'daily', week: currentWeek, trimester, daysLeft, weight, bloodPressure: bp, fetalMovement: fetalMove, mood, sleep: health[today]?.sleep }),
      })
      const data = await res.json()
      if (!data.error) { setAiBriefing(data); localStorage.setItem('dodam_preg_ai', JSON.stringify({ date: today, data })) }
    } catch { /* */ }
    setAiLoading(false)
  }

  // AI 자동 호출 제거 — 캐시만 복원
  useEffect(() => {
    if (dueDate && !aiBriefing) {
      const cached = localStorage.getItem(`dodam_ai_preg_${new Date().toISOString().split('T')[0]}`)
      if (cached) try { setAiBriefing(JSON.parse(cached)) } catch { /* */ }
    }
  }, [!!dueDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // FAB 기록 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any
      detail._handled = true

      if (detail.type === 'preg_diary') {
        setDiarySheetOpen(true)
        return
      }

      const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
      const newEvent = { id: Date.now(), type: detail.type, data: detail, timeStr }

      setPregTodayEvents(prev => {
        const updated = [newEvent, ...prev]
        try { localStorage.setItem(`dodam_preg_events_${today}`, JSON.stringify(updated)) } catch { /* */ }
        return updated
      })

      if (detail.type === 'preg_mood' && detail.tags?.mood) {
        saveMood(detail.tags.mood)
      } else if (detail.type === 'preg_fetal_move') {
        setFetalMove(prev => {
          const next = prev + 1
          const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
          all[today] = { ...all[today], fetalMove: next }
          localStorage.setItem('dodam_preg_health', JSON.stringify(all))
          showToast('태동 기록!')
          return next
        })
      } else if (detail.type === 'preg_weight' && detail.tags?.kg) {
        const kg = detail.tags.kg
        setWeight(kg)
        const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
        all[today] = { ...all[today], weight: kg }
        localStorage.setItem('dodam_preg_health', JSON.stringify(all))
        showToast(`체중 ${kg}kg 기록!`)
      } else if (detail.type === 'preg_edema' && detail.tags?.level) {
        saveEdema(detail.tags.level)
      } else if (detail.type === 'preg_water') {
        const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
        const prev = all[today]?.water || 0
        all[today] = { ...all[today], water: prev + 1 }
        localStorage.setItem('dodam_preg_health', JSON.stringify(all))
        showToast(`물 마시기 ${prev + 1}잔 기록!`)
      } else if (detail.type === 'preg_walk') {
        if (detail.end_ts) {
          const mins = Math.round((new Date(detail.end_ts).getTime() - new Date(detail.start_ts).getTime()) / 60000)
          showToast(`걷기 ${mins}분 기록!`)
        } else {
          showToast('걷기 시작!')
        }
      } else if (detail.type === 'preg_suppl' && detail.tags?.subtype) {
        const suppleNames: Record<string, string> = { folic: '엽산', iron: '철분', dha: 'DHA', calcium: '칼슘', multi: '종합비타민', etc: '영양제' }
        showToast(`${suppleNames[detail.tags.subtype] || '영양제'} 복용 기록!`)
      } else if (detail.type === 'preg_stretch') {
        if (detail.end_ts) {
          const mins = Math.round((new Date(detail.end_ts).getTime() - new Date(detail.start_ts).getTime()) / 60000)
          showToast(`스트레칭 ${mins}분 기록!`)
        } else {
          showToast('스트레칭 시작!')
        }
      }
    }
    window.addEventListener('dodam-record', handler)
    return () => window.removeEventListener('dodam-record', handler)
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps

  // 출산 예정일 입력
  const [tempDueDate, setTempDueDate] = useState(dueDate)
  if (editingDate) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
        <h1 className="text-[22px] font-bold text-[#1A1918] mb-2">출산 예정일이 언제인가요?</h1>
        <p className="text-[13px] text-[#6B6966] mb-8">주차별 성장 정보를 알려드릴게요</p>
        <input type="date" value={tempDueDate} onChange={(e) => setTempDueDate(e.target.value)}
          className="w-full max-w-xs h-[52px] rounded-xl border border-[#E8E4DF] px-4 text-[15px] text-center" />
        <button
          onClick={async () => { if (tempDueDate) { setDueDate(tempDueDate); await setSecure('dodam_due_date', tempDueDate); setEditingDate(false) } }}
          disabled={!tempDueDate}
          className={`mt-6 w-full max-w-xs py-3 rounded-xl text-[14px] font-semibold ${tempDueDate ? 'bg-[var(--color-primary)] text-white active:opacity-80' : 'bg-[#E8E4DF] text-[#9E9A95]'}`}
        >
          완료
        </button>
        {dueDate && <button onClick={() => setEditingDate(false)} className="mt-3 text-[13px] text-[#6B6966]">돌아가기</button>}
      </div>
    )
  }

  const seasonalBag = getSeasonalBag()
  const allBagItems = [...(hospitalBag.mom ?? []), ...(hospitalBag.baby ?? []), ...(hospitalBag.partner ?? []), ...(seasonalBag?.items || [])]
  const bagTotal = allBagItems.length
  const bagDone = Object.values(bagChecked).filter(Boolean).length

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      {/* 헤더는 GlobalHeader (layout.tsx)에서 처리 */}

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">

        {/* ━━━ 출산 확인 (D-day 지남) ━━━ */}
        {daysLeft <= 0 && (
          <Link href="/birth" className="block bg-gradient-to-r from-[#FFF0E6] to-[#FFF8F3] rounded-xl border border-[#FFDDC8] p-5 text-center active:opacity-80 animate-[fadeIn_0.5s]">
            <IllustVideo src="/images/illustrations/h1.webm" variant="circle" className="w-24 h-24 mx-auto mb-2" />
            <p className="text-[16px] font-bold text-[#1A1918]">우리 아이, 만났나요?</p>
            <p className="text-[14px] text-[#6B6966] mt-1">출산 예정일이 지났어요!</p>
            <p className="text-[13px] font-semibold text-[var(--color-primary)] mt-3">네, 만났어요! →</p>
          </Link>
        )}

        {/* ━━━ 출산 임박 (D-14 이내) ━━━ */}
        {daysLeft > 0 && daysLeft <= 14 && (
          <div className="bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-4">
            <div className="flex items-center gap-3">
              <HeartFilledIcon className="w-6 h-6 text-[var(--color-primary)]" />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-[#1A1918]">곧 만나요! D-{daysLeft}</p>
                <p className="text-[13px] text-[#6B6966]">출산 가방은 준비됐나요? 진통 타이머도 확인해보세요</p>
              </div>
              <Link href="/birth" className="text-[14px] text-[var(--color-primary)] font-semibold shrink-0">출산했어요 →</Link>
            </div>
          </div>
        )}

        {/* ━━━ 태명 유도 (미설정 시) ━━━ */}
        {!localStorage.getItem('dodam_baby_nickname') && (
          <Link href="/name" className="block bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] rounded-xl border border-[#FFDDC8]/50 p-4 active:opacity-80">
            <div className="flex items-center gap-3">
              <SparkleIcon className="w-6 h-6 text-[#C4913E]" />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-[#1A1918]">우리 아이 태명을 지어볼까요?</p>
                <p className="text-[13px] text-[#6B6966]">AI가 예쁜 태명을 추천해드려요</p>
              </div>
              <span className="text-[#9E9A95]">→</span>
            </div>
          </Link>
        )}

        {/* ━━━ 1. AI 히어로 + 태아 ━━━ */}
        <div data-guide="fetal-card" className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-4">
          {/* 태아 비주얼 — 감성 */}
          <div className="text-center mb-3">
            <div className="mx-auto mb-1">
              <BabyIllust week={currentWeek} />
            </div>
            <p className="text-[14px] font-bold text-[#1A1918]">{currentWeek}주차 — <span className="text-[var(--color-primary)]">{currentFetal.name}</span>만해요</p>
            <div className="flex justify-center gap-4 mt-1">
              <span className="text-[13px] text-[#6B6966]">{currentFetal.length}</span>
              <span className="text-[13px] text-[#6B6966]">{currentFetal.weight}</span>
              <button onClick={() => shareFetalSize(currentWeek, currentFetal.fruit, currentFetal.name, currentFetal.length, currentFetal.weight, daysLeft)} className="text-[14px] text-[var(--color-primary)]">공유</button>
            </div>
            {/* 아기 한마디 */}
            <div className="bg-[#FFF8F3] rounded-xl p-2.5 mt-2 inline-block">
              <p className="text-[13px] text-[#1A1918] italic">
                {currentWeek <= 12 ? '"엄마, 나 여기 있어요! 아직 작지만 열심히 자라고 있어요"' :
                 currentWeek <= 20 ? '"엄마, 내가 움직이는 거 느꼈어요? 안에서 춤추고 있어요"' :
                 currentWeek <= 30 ? '"엄마 목소리가 들려요. 계속 이야기해줘요"' :
                 currentWeek <= 36 ? '"엄마, 나 이제 거의 다 준비됐어요. 곧 만나요!"' :
                 '"엄마, 언제든 나갈 준비 완료! 빨리 안아줘요"'}
              </p>
            </div>
          </div>

          {/* AI 브리핑 — 요약 + 펼치기 */}
          {aiLoading ? (
            <div className="py-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center"><span className="text-[13px] text-white">AI</span></div>
                <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} /><span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} /></div>
              </div>
            </div>
          ) : aiBriefing ? (
            <PregnantAIDisplay briefing={aiBriefing} onRefresh={() => fetchAI(true)} week={currentWeek} daysLeft={daysLeft} fruit={currentFetal.fruit} fruitName={currentFetal.name} />
          ) : (
            <div className="text-center py-2">
              <button onClick={() => fetchAI()} className="px-6 py-2 bg-[var(--color-primary)] text-white text-[14px] font-semibold rounded-xl active:opacity-80">AI 조언 받기</button>
            </div>
          )}

          {/* 프로그레스 + 감성 */}
          <div className="mt-3 pt-3 border-t border-[var(--color-accent-bg)]/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[14px] text-[#6B6966]">
                {daysLeft <= 14 ? '곧 만나요!' : daysLeft <= 60 ? '조금만 더!' : '함께 자라는 중'}
              </p>
              <p className="text-[14px] text-[var(--color-primary)]">{currentWeek}주 · D-{daysLeft}</p>
            </div>
            <div className="w-full h-2 bg-white/50 rounded-full">
              <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${Math.min(100, (currentWeek / 40) * 100)}%` }} />
            </div>
            <p className="text-[13px] text-[#9E9A95] mt-1 text-center">
              {Math.min(100, Math.round((currentWeek / 40) * 100))}% 완료 · 아이를 만나는 날까지 {daysLeft}일
            </p>
          </div>
        </div>

        {/* ━━━ 병원 가이드 ━━━ */}
        {currentWeek > 0 && <HospitalGuide week={currentWeek} />}

        {/* ━━━ 임산부 식단 추천 ━━━ */}
        <div data-guide="meal-card">
        <AIMealCard mode="pregnant" value={currentWeek} />
        </div>

        {/* 음식 물어보기 */}
        <a href="/food-check" className="flex items-center gap-3 bg-white rounded-xl border border-[#E8E4DF] p-3.5 active:bg-[#F5F3F0]">
          <div className="w-9 h-9 rounded-full bg-[#FFF8F3] flex items-center justify-center shrink-0">
            <span className="text-[18px]">🍽️</span>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-[#1A1918]">이 음식 먹어도 되나요?</p>
            <p className="text-[12px] text-[#9E9A95] mt-0.5">임신 중 음식 안전 AI 확인</p>
          </div>
          <span className="text-[#9E9A95] text-[16px]">→</span>
        </a>

        {/* 푸시 알림 동의 */}
        <PushPrompt message="검진일과 주차 변경을 알려드릴까요?" />

        {/* ━━━ 2. 오늘 기록 ━━━ */}
        {(() => {
          const MOOD_CONFIG: Record<string, { label: string; Icon: React.FC<any>; color: string }> = {
            happy:   { label: '행복', Icon: MoodHappyIcon,   color: '#FF8FAB' },
            calm:    { label: '평온', Icon: MoodCalmIcon,    color: '#90C8A8' },
            anxious: { label: '불안', Icon: MoodAnxiousIcon, color: '#FFC078' },
            sick:    { label: '입덧', Icon: MoodSickIcon,    color: '#B8A0D4' },
            tired:   { label: '피곤', Icon: MoodTiredIcon,   color: '#8EB4D4' },
          }
          const getEventChip = (type: string, data: any): { label: string; Icon: React.FC<any>; color: string; bg: string } => {
            if (type === 'preg_mood') { const m = MOOD_CONFIG[data.tags?.mood]; return m ? { ...m, bg: '#FFE8F4' } : { label: '기분', Icon: HeartFilledIcon, color: '#FF8FAB', bg: '#FFE8F4' } }
            if (type === 'preg_fetal_move') return { label: '태동', Icon: ActivityIcon, color: '#5BA882', bg: '#E8F5EF' }
            if (type === 'preg_weight') return { label: `${data.tags?.kg}kg`, Icon: ChartIcon, color: '#D08068', bg: '#FCE4DC' }
            if (type === 'preg_edema') {
              const lvl = data.tags?.level
              return { label: lvl === 'none' ? '부종 없음' : lvl === 'mild' ? '부종 약함' : '부종 심함', Icon: DropletIcon, color: '#4A90D9', bg: '#E6F0FA' }
            }
            if (type === 'preg_water') return { label: '수분', Icon: DropletIcon, color: '#3B82F6', bg: '#E6EFFF' }
            if (type === 'preg_walk') return { label: '걷기', Icon: WalkIcon, color: '#10B981', bg: '#E8F5EF' }
            if (type === 'preg_suppl') {
              const names: Record<string, string> = { folic: '엽산', iron: '철분', dha: 'DHA', calcium: '칼슘', multi: '종합비타민', etc: '영양제' }
              return { label: names[data.tags?.subtype] || '영양제', Icon: VitaminIcon, color: '#F59E0B', bg: '#FEF3E0' }
            }
            if (type === 'preg_stretch') return { label: '스트레칭', Icon: ActivityIcon, color: '#8B5CF6', bg: '#EDE9FF' }
            return { label: type, Icon: PenIcon, color: '#9E9A95', bg: '#F0EDE8' }
          }
          const eventList = pregTodayEvents.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto hide-scrollbar">
              {pregTodayEvents.map((ev) => {
                const cfg = getEventChip(ev.type, ev.data)
                return (
                  <div key={ev.id} className="flex items-center gap-2.5 py-2 border-b border-[#F0EDE8] last:border-0">
                    <span className="text-[12px] text-[#9E9A95] w-10 shrink-0 text-right font-mono">{ev.timeStr}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                      <cfg.Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[13px] font-semibold text-[#1A1918]">{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          ) : null
          const footer = (
            <>
              {eventList}
              <button onClick={() => setDiarySheetOpen(true)} className={`w-full flex items-center gap-3 bg-[var(--color-page-bg)] rounded-xl p-3 active:bg-[#F0EDE8] ${eventList ? 'mt-3' : ''}`}>
                <PenIcon className="w-5 h-5 text-[#6B6966]" />
                <div className="flex-1 text-left">
                  <p className="text-[13px] font-bold text-[#1A1918]">태교일기 쓰기</p>
                  <p className="text-[12px] text-[#9E9A95]">{diaries.length > 0 ? `최근: ${new Date(diaries[0].date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}` : '오늘의 첫 일기를 남겨보세요'}</p>
                </div>
                <span className="text-[#9E9A95]">→</span>
              </button>
              {diaries.length > 0 && (
                <div className="mt-2 p-2.5 bg-[var(--color-page-bg)] rounded-lg border border-[#E8E4DF]">
                  <p className="text-[13px] text-[#1A1918] line-clamp-2">{diaries[0].text}</p>
                  {diaries[0].comment && <p className="text-[12px] text-[var(--color-primary)] mt-1 italic">{diaries[0].comment}</p>}
                </div>
              )}
            </>
          )
          const headerRight = (
            <Link href="/record">
              <span className="text-[13px] text-[var(--color-primary)] font-medium">전체보기 →</span>
            </Link>
          )
          return (
            <TodayRecordSection
              count={pregTodayEvents.length}
              emptyMessage="아래 버튼으로 오늘의 첫 기록을 남겨보세요"
              headerRight={headerRight}
              footer={footer}
            />
          )
        })()}

        {/* ━━━ 3. 상태 카드 — 주차별 동적 ━━━ */}
        {(() => {
          // 초기(~13주): 검진 중심
          if (currentWeek <= 13) return (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-[14px] text-[#6B6966]">다음 검진</p>
                {upcomingCheckups.length > 0 ? (
                  <><p className="text-[14px] font-bold text-[#1A1918] mt-0.5 line-clamp-1">{upcomingCheckups[0].title}</p><p className="text-[13px] text-[var(--color-primary)]">{upcomingCheckups[0].week}주</p></>
                ) : <p className="text-[13px] text-[#9E9A95] mt-1">완료!</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-[14px] text-[#6B6966]">주차</p>
                <p className="text-[20px] font-bold text-[var(--color-primary)] mt-0.5">{currentWeek}<span className="text-[14px] text-[#9E9A95]">주</span></p>
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-[14px] text-[#6B6966]">D-day</p>
                <p className="text-[20px] font-bold text-[#1A1918] mt-0.5">{daysLeft}<span className="text-[14px] text-[#9E9A95]">일</span></p>
              </div>
            </div>
          )
          // 중기(14~27주): 검진 + 태동 시작
          if (currentWeek <= 27) return (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-[14px] text-[#6B6966]">다음 검진</p>
                {upcomingCheckups.length > 0 ? (
                  <><p className="text-[14px] font-bold text-[#1A1918] mt-0.5 line-clamp-1">{upcomingCheckups[0].title}</p><p className="text-[13px] text-[var(--color-primary)]">{upcomingCheckups[0].week}주</p></>
                ) : <p className="text-[13px] text-[#9E9A95] mt-1">완료!</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-[14px] text-[#6B6966]">오늘 태동</p>
                <p className="text-[20px] font-bold text-[var(--color-primary)] mt-0.5">{fetalMove}<span className="text-[14px] text-[#9E9A95]">회</span></p>
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-[14px] text-[#6B6966]">D-day</p>
                <p className="text-[20px] font-bold text-[#1A1918] mt-0.5">{daysLeft}<span className="text-[14px] text-[#9E9A95]">일</span></p>
              </div>
            </div>
          )
          // 후기(28주+): 출산 가방 + 태동 + 검진
          return (
            <div className="grid grid-cols-3 gap-2">
              <div className={`bg-white rounded-xl border p-2.5 text-center ${bagDone < bagTotal ? 'border-[var(--color-accent-bg)]' : 'border-[#E8E4DF]'}`}>
                <p className="text-[14px] text-[#6B6966]">출산 가방</p>
                <p className="text-[20px] font-bold text-[#1A1918] mt-0.5">{bagDone}<span className="text-[14px] text-[#9E9A95]">/{bagTotal}</span></p>
                {bagDone < bagTotal && <p className="text-[13px] text-[var(--color-primary)]">준비하세요!</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-[14px] text-[#6B6966]">오늘 태동</p>
                <p className="text-[20px] font-bold text-[var(--color-primary)] mt-0.5">{fetalMove}<span className="text-[14px] text-[#9E9A95]">회</span></p>
                {fetalMove > 0 && fetalMove < 10 && <p className="text-[13px] text-[#D08068]">10회 이상 확인</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-2.5 text-center">
                <p className="text-[14px] text-[#6B6966]">D-day</p>
                <p className={`text-[20px] font-bold mt-0.5 ${daysLeft <= 14 ? 'text-[#D08068]' : 'text-[#1A1918]'}`}>{daysLeft}<span className="text-[14px] text-[#9E9A95]">일</span></p>
                {daysLeft <= 14 && <p className="text-[13px] text-[#D08068]">곧 만나요!</p>}
              </div>
            </div>
          )
        })()}

        {/* ━━━ 계절별 출산 가방 추가 아이템 ━━━ */}
        {seasonalBag && currentWeek >= 28 && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-[14px] font-bold text-[#1A1918] mb-2">{seasonalBag.season} 출산 가방 추가 아이템</p>
            <div className="flex flex-wrap gap-1.5">
              {seasonalBag.items.map(item => (
                <button
                  key={item}
                  onClick={() => toggleBag(item)}
                  className={`px-2.5 py-1.5 rounded-lg text-[13px] border transition-colors ${bagChecked[item] ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] line-through' : 'bg-[var(--color-page-bg)] border-[#E8E4DF] text-[#1A1918]'}`}
                >
                  {bagChecked[item] ? '\u2713 ' : ''}{item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ━━━ 검진 기록 CTA ━━━ */}
        {Object.keys(checkupDone).length === 0 && (
          <div data-guide="checkup-record" className="bg-gradient-to-r from-[#FFF8F0] to-[#F0FAF4] rounded-xl border border-[#E8E4DF] p-4 flex items-center gap-3">
            <StethoscopeIcon className="w-6 h-6 text-[var(--color-primary)] shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-[#1A1918]">첫 검진 기록을 남겨보세요</p>
              <p className="text-[13px] text-[#6B6966]">검진 완료 시 체크하면 일정을 관리할 수 있어요</p>
            </div>
            {upcomingCheckups.length > 0 && (
              <button onClick={() => toggleCheckup(upcomingCheckups[0].id)} className="shrink-0 px-3 py-1.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-lg active:opacity-80">체크</button>
            )}
          </div>
        )}

        {/* ━━━ 4. 진통 타이머 (후기만) ━━━ */}
        {currentWeek >= 36 && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-[14px] font-bold text-[#1A1918] mb-2">진통 타이머</p>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={contractionActive ? endContraction : startContraction}
                className={`flex-1 py-3 rounded-xl text-[14px] font-semibold ${contractionActive ? 'bg-[#D08068] text-white animate-pulse' : 'bg-[var(--color-primary)] text-white'}`}
              >
                {contractionActive ? '진통 끝' : '진통 시작'}
              </button>
              {contractions.length > 0 && (
                <button onClick={() => setContractions([])} className="text-[13px] text-[#9E9A95]">초기화</button>
              )}
            </div>
            {lastInterval !== null && (
              <div className="bg-[var(--color-page-bg)] rounded-lg p-2 text-center">
                <p className="text-[14px] text-[#6B6966]">마지막 간격</p>
                <p className="text-[20px] font-bold text-[#1A1918]">{lastInterval}분</p>
                {lastInterval <= 5 && <p className="text-[13px] text-[#D08068] font-semibold mt-1">간격이 5분 이하! 병원에 연락하세요</p>}
              </div>
            )}
            <p className="text-[13px] text-[#9E9A95] mt-2">기록: {contractions.length}회{contractions.length >= 3 ? ` · 평균 ${Math.round(contractions.slice(1).reduce((sum, c, i) => sum + (c.start - contractions[i].start), 0) / ((contractions.length - 1) * 60000))}분 간격` : ''}</p>
          </div>
        )}

        {/* ━━━ 혜택 · 축하박스 — 접기 가능 ━━━ */}
        {moreOpen ? (
          <>
            <BenefitTabs
              currentWeek={currentWeek}
              benefitDone={benefitDone}
              toggleBenefit={toggleBenefit}
        />
            <button onClick={() => setMoreOpen(false)} className="w-full py-2 text-[12px] text-[#9E9A95] text-center">접기</button>
          </>
        ) : (
          <button onClick={() => setMoreOpen(true)} className="w-full bg-white rounded-xl border border-[#E8E4DF] p-3 text-center active:bg-[#F5F1EC]">
            <p className="text-[13px] font-semibold text-[#1A1918]">혜택 · 축하박스 · 출산 가방 더보기</p>
          </button>
        )}

        {/* 재미 콘텐츠 */}
        <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
          <div className="grid grid-cols-3 gap-2">
            <Link href="/fortune" className="block bg-[var(--color-page-bg)] rounded-lg p-3 text-center active:opacity-80">
              <ActivityIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
              <p className="text-[12px] font-semibold text-[#1A1918]">바이오리듬</p>
            </Link>
            <Link href="/fortune?tab=zodiac" className="block bg-[var(--color-page-bg)] rounded-lg p-3 text-center active:opacity-80">
              <CompassIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
              <p className="text-[12px] font-semibold text-[#1A1918]">띠 · 별자리</p>
            </Link>
            <Link href="/fortune?tab=fortune" className="block bg-[var(--color-page-bg)] rounded-lg p-3 text-center active:opacity-80">
              <SparkleIcon className="w-5 h-5 mx-auto mb-1 text-[#6B6966]" />
              <p className="text-[12px] font-semibold text-[#1A1918]">오늘의 운세</p>
            </Link>
          </div>
        </div>

      </div>

      {/* 태교일기 바텀시트 */}
      {diarySheetOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setDiarySheetOpen(false)}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#E0E0E0] rounded-full" /></div>
            <div className="px-5 pb-5">
              <p className="text-[15px] font-bold text-[#1A1918] mb-3 flex items-center gap-1.5"><PenIcon className="w-4 h-4" /> 태교일기</p>
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mb-3">
                {[
                  '아이에게 한마디',
                  '태동 느낌',
                  '들려준 음악',
                  '맛있는 음식',
                  '산책/외출',
                ].map(text => (
                  <button key={text} onClick={() => setDiaryText(prev => prev ? prev : text + ' ')}
                    className="shrink-0 px-2.5 py-1.5 rounded-full bg-[var(--color-page-bg)] text-[12px] text-[#6B6966]">
                    {text}
                  </button>
                ))}
              </div>
              <textarea value={diaryText} onChange={e => setDiaryText(e.target.value.slice(0, 500))}
                placeholder={`${currentWeek}주차, 오늘 아이에게 하고 싶은 말이 있나요?`}
                className="w-full h-28 text-[14px] p-3 bg-[#F5F1EC] rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" autoFocus />
              <p className="text-right text-[12px] text-[#9E9A95] mt-1">{diaryText.length}/500</p>
              <button onClick={() => { saveDiary(); setDiarySheetOpen(false) }} disabled={!diaryText.trim() || diarySaving}
                className={`w-full py-3.5 rounded-xl text-[15px] font-bold mt-2 ${diaryText.trim() && !diarySaving ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-[#9E9A95]'}`}>
                {diarySaving ? 'AI 코멘트 생성 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-[#1A1918]/80 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-lg animate-[fadeIn_0.15s_ease-out]">
          {toast}
        </div>
      )}

      {showGuide && <SpotlightGuide mode="pregnant" onComplete={() => { localStorage.setItem('dodam_guide_pregnant', '1'); setShowGuide(false) }} />}
    </div>
  )
}
