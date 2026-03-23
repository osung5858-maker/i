'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type SubTab = 'map' | 'chat' | 'market'

// 모드별 지도 카테고리
const MAP_CATEGORIES: Record<string, { icon: string; label: string; query: string }[]> = {
  preparing: [
    { icon: '🏥', label: '산부인과', query: '산부인과' },
    { icon: '🧪', label: '난임클리닉', query: '난임클리닉' },
    { icon: '💊', label: '약국', query: '약국' },
    { icon: '🧘', label: '요가·필라테스', query: '임산부요가' },
  ],
  pregnant: [
    { icon: '🏥', label: '산부인과', query: '산부인과' },
    { icon: '🤱', label: '산후조리원', query: '산후조리원' },
    { icon: '👶', label: '베이비용품', query: '유아용품점' },
    { icon: '💊', label: '약국', query: '약국' },
  ],
  parenting: [
    { icon: '🏥', label: '소아과', query: '소아과' },
    { icon: '🚨', label: '응급소아과', query: '응급소아과' },
    { icon: '🎪', label: '키즈카페', query: '키즈카페' },
    { icon: '📚', label: '문화센터', query: '문화센터' },
    { icon: '🌳', label: '놀이터', query: '어린이놀이터' },
    { icon: '💊', label: '약국', query: '약국' },
  ],
}

export default function TownPage() {
  const [subTab, setSubTab] = useState<SubTab>('map')
  const [mode, setMode] = useState('parenting')
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
  }, [])

  const categories = MAP_CATEGORIES[mode] || MAP_CATEGORIES.parenting

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center h-14 px-5">
            <h1 className="text-[17px] font-bold text-[#1A1918]">동네</h1>
          </div>
          {/* 서브탭 */}
          <div className="flex px-5 gap-1 pb-2">
            {[
              { key: 'map' as SubTab, label: '지도' },
              { key: 'chat' as SubTab, label: '수다' },
              { key: 'market' as SubTab, label: '장터' },
            ].map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-semibold ${subTab === t.key ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* ===== 지도 탭 ===== */}
        {subTab === 'map' && (
          <div className="px-5 pt-4 pb-28 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <Link key={cat.query} href={`/map?q=${encodeURIComponent(cat.query)}`}
                  className="bg-white rounded-xl border border-[#f0f0f0] p-3 text-center active:bg-[#F5F4F1]">
                  <span className="text-2xl">{cat.icon}</span>
                  <p className="text-[12px] font-semibold text-[#1A1918] mt-1">{cat.label}</p>
                </Link>
              ))}
            </div>

            {/* 지도 바로가기 */}
            <Link href="/map" className="block bg-white rounded-xl border border-[#f0f0f0] p-4 active:bg-[#F5F4F1]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0F9F4] flex items-center justify-center">
                  <span className="text-lg">🗺️</span>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[#1A1918]">지도에서 찾기</p>
                  <p className="text-[11px] text-[#868B94]">내 주변 시설 검색</p>
                </div>
                <span className="text-[#AEB1B9]">→</span>
              </div>
            </Link>

            {/* 정부 지원 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[14px] font-bold text-[#1A1918] mb-3">🏛️ 동네 지원 정보</p>
              <GovSupports mode={mode} />
            </div>
          </div>
        )}

        {/* ===== 수다 탭 ===== */}
        {subTab === 'chat' && (
          <div className="px-5 pt-4 pb-28">
            <CommunityFeed />
          </div>
        )}

        {/* ===== 장터 탭 ===== */}
        {subTab === 'market' && (
          <div className="px-5 pt-4 pb-28">
            <MarketFeed />
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 정부 지원 정보 (모드별) =====
const GOV_DATA: Record<string, { title: string; desc: string; link: string }[]> = {
  preparing: [
    { title: '난임부부 시술비 지원', desc: '체외수정 최대 110만원 · 인공수정 최대 30만원', link: 'https://www.gov.kr/portal/service/serviceInfo/SME000000100' },
    { title: '임신 사전건강관리', desc: '보건소 무료 산전검사 · 풍진/빈혈 검사', link: 'https://www.e-health.go.kr/gh/caSrvcGud/selectMdclSupGudInfo.do?heBiz=PG00003&menuId=200097' },
    { title: '엽산제·철분제 무료 지원', desc: '보건소 등록 시 무료 제공', link: 'https://www.gov.kr/portal/service/serviceInfo/SD0000016094' },
    { title: '한방 난임 치료 지원', desc: '한의원 난임 치료비 지원 (지자체별)', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050470' },
    { title: '예비부부 건강검진', desc: '결혼 예정 커플 무료 검진 (보건소)', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050025' },
  ],
  pregnant: [
    { title: '임산부 의료비 지원 (국민행복카드)', desc: '임신 1회당 100만원 바우처', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050226' },
    { title: '고위험 임산부 의료비', desc: '조기진통·전치태반 등 의료비 지원', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050469' },
    { title: '임산부 영양플러스', desc: '저소득 임산부 보충식품 지원', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050027' },
    { title: '엽산제·철분제 무료', desc: '보건소 등록 임산부 대상', link: 'https://www.gov.kr/portal/service/serviceInfo/SD0000016094' },
    { title: '임산부 교통비 지원', desc: '대중교통 이용 시 월 7만원 (서울)', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050471' },
    { title: '임산부 친환경 농산물', desc: '친환경 농산물 꾸러미 지원 (지자체별)', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050472' },
  ],
  parenting: [
    { title: '부모급여 (0~1세)', desc: '0세 월 100만원 · 1세 월 50만원', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050473' },
    { title: '아동수당', desc: '만 8세 미만 월 10만원', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050228' },
    { title: '영아수당', desc: '0~1세 월 30만원', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050474' },
    { title: '어린이집 보육료', desc: '0~5세 보육료 전액 지원', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050475' },
    { title: '육아휴직 급여', desc: '통상임금 80% (상한 150만원)', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050229' },
    { title: '산후조리 바우처', desc: '출산 후 산후도우미 지원', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050476' },
    { title: '첫만남이용권', desc: '출생 시 200만원 바우처', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050477' },
    { title: '영유아 건강검진', desc: '생후 14일~72개월 무료 검진', link: 'https://www.gov.kr/portal/service/serviceInfo/PTR000050028' },
  ],
}

function GovSupports({ mode }: { mode: string }) {
  const items = GOV_DATA[mode] || GOV_DATA.parenting
  return (
    <div className="space-y-2">
      {items.map(item => (
        <a key={item.title} href={item.link} target="_blank" rel="noopener noreferrer"
          className="block p-3 bg-[#F5F4F1] rounded-xl active:bg-[#ECECEC]">
          <p className="text-[13px] font-semibold text-[#1A1918]">{item.title}</p>
          <p className="text-[11px] text-[#868B94]">{item.desc}</p>
          <p className="text-[10px] text-[#3D8A5A] mt-0.5">자세히 보기 →</p>
        </a>
      ))}
    </div>
  )
}

// ===== 수다 (커뮤니티) — 기존 community 페이지 임베드 =====
function CommunityFeed() {
  // 기존 /community로 리다이렉트하는 대신 간단한 링크
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[#868B94] text-center py-2">동네 엄마들과 수다 떨어요</p>
      <Link href="/community" className="block bg-white rounded-xl border border-[#f0f0f0] p-4 text-center active:bg-[#F5F4F1]">
        <span className="text-2xl">💬</span>
        <p className="text-[13px] font-semibold text-[#1A1918] mt-2">수다방 들어가기</p>
        <p className="text-[11px] text-[#868B94]">이야기 · 질문 · 고민 나누기</p>
      </Link>
    </div>
  )
}

// ===== 장터 =====
function MarketFeed() {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[#868B94] text-center py-2">동네 육아용품 나눔 · 거래</p>
      <Link href="/community?tab=market" className="block bg-white rounded-xl border border-[#f0f0f0] p-4 text-center active:bg-[#F5F4F1]">
        <span className="text-2xl">🛍️</span>
        <p className="text-[13px] font-semibold text-[#1A1918] mt-2">장터 들어가기</p>
        <p className="text-[11px] text-[#868B94]">도담장터 · 나눔 · 중고거래</p>
      </Link>
    </div>
  )
}
