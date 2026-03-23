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
          <div className="pb-28">
            {/* 지도 프리뷰 (탭하면 전체 지도로) */}
            <Link href="/map" className="block relative bg-[#E8F0E8] h-40 flex items-center justify-center active:opacity-90">
              <div className="text-center">
                <span className="text-3xl">🗺️</span>
                <p className="text-[13px] font-semibold text-[#1A1918] mt-1">지도 열기</p>
                <p className="text-[10px] text-[#868B94]">내 주변 시설 검색</p>
              </div>
            </Link>

            <div className="px-5 pt-3 space-y-3">
              {/* 카테고리 바로가기 */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5">
                {categories.map(cat => (
                  <Link key={cat.query} href={`/map?q=${encodeURIComponent(cat.query)}`}
                    className="shrink-0 bg-white rounded-xl border border-[#f0f0f0] px-4 py-2.5 flex items-center gap-2 active:bg-[#F5F4F1]">
                    <span className="text-lg">{cat.icon}</span>
                    <p className="text-[12px] font-semibold text-[#1A1918]">{cat.label}</p>
                  </Link>
                ))}
              </div>

              {/* 정부 지원 */}
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
                <p className="text-[13px] font-bold text-[#1A1918] mb-3">🏛️ 지원 정보</p>
                <GovSupports mode={mode} />
              </div>
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
    { title: '임신 사전건강관리', desc: '보건소 무료 산전검사 · 풍진/빈혈 검사', link: 'https://www.mohw.go.kr/menu.es?mid=a10711020200' },
    { title: '엽산제·철분제 무료 지원', desc: '보건소 등록 시 무료 제공', link: 'https://www.gov.kr/portal/service/serviceInfo/SD0000016094' },
    { title: '난임 원스톱 서비스', desc: '난임 시술비·심리상담 통합 지원', link: 'https://www.gov.kr/portal/onestopSvc/Infertility' },
    { title: '행복출산 원스톱', desc: '출산 관련 서비스 한번에 신청', link: 'https://www.gov.kr/portal/onestopSvc/happyBirth' },
  ],
  pregnant: [
    { title: '국민행복카드 (임신출산 진료비)', desc: '임신 1회당 100만원 (다태아 140만원)', link: 'https://www.gov.kr/portal/service/serviceInfo/SD0000007672' },
    { title: '고위험 임산부 의료비', desc: '입원치료비 90% 지원 (소득 무관)', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000114' },
    { title: '임산부 영양플러스', desc: '저소득 임산부 보충식품 지원', link: 'https://www.mohw.go.kr/menu.es?mid=a10711020200' },
    { title: '엽산제·철분제 무료', desc: '보건소 등록 임산부 대상', link: 'https://www.gov.kr/portal/service/serviceInfo/SD0000016094' },
    { title: '임신출산 지원 종합', desc: '출산정책 전체 안내 (복지부)', link: 'https://www.mohw.go.kr/menu.es?mid=a10711020100' },
  ],
  parenting: [
    { title: '부모급여 (0~1세)', desc: '0세 월 100만원 · 1세 월 50만원', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000143' },
    { title: '아동수당', desc: '만 8세 미만 월 10만원', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000120' },
    { title: '첫만남이용권', desc: '출생 시 200만원 바우처', link: 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004656' },
    { title: '영유아 건강검진', desc: '생후 14일~72개월 무료 검진', link: 'https://www.mohw.go.kr/menu.es?mid=a10711020200' },
    { title: '행복출산 원스톱', desc: '출산 후 서비스 한번에 신청', link: 'https://www.gov.kr/portal/onestopSvc/happyBirth' },
    { title: '임신출산 양육 종합', desc: '정부 지원 정책 전체 안내', link: 'https://www.mohw.go.kr/menu.es?mid=a10711020100' },
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

// ===== 수다 — Supabase에서 직접 목록 로드 =====
function CommunityFeed() {
  const [posts, setPosts] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(10)
      setPosts(data || [])
      setLoadingPosts(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-2">
      {/* 글쓰기 바로가기 */}
      <Link href="/community" className="block bg-[#F0F9F4] rounded-xl p-3 text-center active:opacity-80">
        <p className="text-[12px] text-[#3D8A5A] font-semibold">✏️ 수다 떨러가기</p>
      </Link>

      {loadingPosts ? (
        <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" /></div>
      ) : posts.length === 0 ? (
        <p className="text-[13px] text-[#AEB1B9] text-center py-6">아직 글이 없어요</p>
      ) : (
        posts.map(post => (
          <Link key={post.id} href="/community" className="block bg-white rounded-xl border border-[#f0f0f0] p-3 active:bg-[#F5F4F1]">
            <p className="text-[13px] text-[#1A1918] line-clamp-2">{post.content}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-[#868B94]">❤️ {post.like_count || 0}</span>
              <span className="text-[10px] text-[#868B94]">💬 {post.comment_count || 0}</span>
              <span className="text-[10px] text-[#AEB1B9]">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}

// ===== 장터 — Supabase에서 직접 목록 로드 =====
function MarketFeed() {
  const [items, setItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(true)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('market_items').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(10)
      setItems(data || [])
      setLoadingItems(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-2">
      {loadingItems ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-[#AEB1B9]">아직 장터 글이 없어요</p>
          <Link href="/community?tab=market" className="text-[12px] text-[#3D8A5A] font-semibold mt-2 inline-block">첫 글 쓰러가기 →</Link>
        </div>
      ) : (
        <>
          {items.map(item => (
            <Link key={item.id} href="/community?tab=market" className="block bg-white rounded-xl border border-[#f0f0f0] p-3 active:bg-[#F5F4F1]">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-[#1A1918] line-clamp-1">{item.title}</p>
                <p className="text-[12px] font-bold text-[#3D8A5A]">{item.price > 0 ? `${item.price.toLocaleString()}원` : '나눔'}</p>
              </div>
              <p className="text-[10px] text-[#868B94] mt-0.5 line-clamp-1">{item.description}</p>
            </Link>
          ))}
        </>
      )}
    </div>
  )
}
