'use client'

import { useState } from 'react'
import Link from 'next/link'

type BoardType = 'birth_month' | 'region' | 'general'

interface Post {
  id: string
  author: string
  authorAge: string
  content: string
  timeAgo: string
  likes: number
  comments: number
}

const SAMPLE_POSTS: Record<BoardType, Post[]> = {
  birth_month: [
    { id: '1', author: '하은맘', authorAge: '5개월', content: '이유식 시작했는데 쌀미음부터 하면 되나요? 어떤 브랜드가 좋을까요', timeAgo: '10분 전', likes: 12, comments: 8 },
    { id: '2', author: '서준아빠', authorAge: '5개월', content: '통잠 성공했어요! 우리 서준이 8시간 내리 잤네요. 비결은 취침 루틴이었어요', timeAgo: '1시간 전', likes: 45, comments: 23 },
    { id: '3', author: '지아맘', authorAge: '4개월', content: '뒤집기 성공! 갑자기 오늘 혼자 뒤집었어요', timeAgo: '2시간 전', likes: 67, comments: 15 },
    { id: '4', author: '도윤맘', authorAge: '5개월', content: '체온이 37.8도인데 병원 가야할까요? 다른 증상은 없어요', timeAgo: '3시간 전', likes: 5, comments: 31 },
  ],
  region: [
    { id: '5', author: '역삼맘', authorAge: '7개월', content: '강남구 소아과 추천해주세요! 최근에 이사왔어요', timeAgo: '30분 전', likes: 8, comments: 14 },
    { id: '6', author: '분당맘', authorAge: '3개월', content: '판교 키즈카페 어디가 좋아요? 6개월 아기랑 가려고요', timeAgo: '1시간 전', likes: 15, comments: 9 },
  ],
  general: [
    { id: '7', author: '첫째맘', authorAge: '12개월', content: '돌잔치 간소하게 하신 분 계세요? 집에서 하려는데 팁 부탁드려요', timeAgo: '20분 전', likes: 34, comments: 42 },
    { id: '8', author: '쌍둥이맘', authorAge: '2개월', content: '분유 갈아타신 분들 어떤 걸로 바꾸셨어요? 배앓이가 심해서요', timeAgo: '1시간 전', likes: 21, comments: 38 },
  ],
}

const BOARD_TABS = [
  { key: 'birth_month' as BoardType, label: '같은 달 맘' },
  { key: 'region' as BoardType, label: '우리 동네' },
  { key: 'general' as BoardType, label: '자유' },
]

export default function CommunityPage() {
  const [board, setBoard] = useState<BoardType>('birth_month')
  const posts = SAMPLE_POSTS[board]

  const groupInfo: Record<BoardType, { label: string; sub: string } | null> = {
    birth_month: { label: '2025년 10월 맘 그룹', sub: '같은 월령 아이를 키우는 부모 127명' },
    region: { label: '강남구 육아', sub: '우리 동네 부모 89명' },
    general: null,
  }
  const info = groupInfo[board]

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Link href="/us" className="text-[#868B94] text-sm">←</Link>
            <h1 className="text-[17px] font-bold text-[#1A1918]">커뮤니티</h1>
          </div>
          <button className="text-[12px] font-semibold text-[#3D8A5A]">
            글쓰기
          </button>
        </div>

        <div className="flex px-5 pb-2 max-w-lg mx-auto gap-2">
          {BOARD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setBoard(tab.key)}
              className={`flex-1 py-2 text-[12px] font-semibold text-center rounded-xl transition-colors ${
                board === tab.key ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#AEB1B9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pb-28">
        {info && (
          <div className="mt-3 p-3 bg-white rounded-xl border border-[#f0f0f0]">
            <p className="text-[13px] font-semibold text-[#1A1918]">{info.label}</p>
            <p className="text-[11px] text-[#868B94]">{info.sub}</p>
          </div>
        )}

        <div className="mt-3 space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#F5F4F1] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#3D8A5A]">{post.author.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#1A1918]">{post.author}</p>
                  <p className="text-[10px] text-[#AEB1B9]">{post.authorAge} · {post.timeAgo}</p>
                </div>
              </div>

              <p className="text-[13px] text-[#1A1918] leading-relaxed mb-3">{post.content}</p>

              <div className="flex items-center gap-4 pt-2 border-t border-[#f0f0f0]">
                <button className="flex items-center gap-1 text-[11px] text-[#868B94]">
                  ♥ {post.likes}
                </button>
                <button className="flex items-center gap-1 text-[11px] text-[#868B94]">
                  댓글 {post.comments}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
