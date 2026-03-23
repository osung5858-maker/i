'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type MainTab = 'feed' | 'market'

interface Post {
  id: string
  user_id: string
  content: string
  like_count: number
  comment_count: number
  created_at: string
}

interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

interface MarketItem {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  category: string
  baby_age_months: string
  region: string
  status: string
  chat_count: number
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  clothes: '👕 의류',
  feeding: '🍼 수유/이유식',
  toys: '🧸 장난감',
  furniture: '🪑 가구/침대',
  stroller: '🚗 유모차/카시트',
  etc: '📦 기타',
}

const DAILY_QUESTIONS = [
  '우리 아기 첫 이유식 뭐였어요?',
  '통잠 성공 비결이 있다면?',
  '가장 유용했던 육아템은?',
  '요즘 아기가 좋아하는 놀이는?',
  '육아하면서 가장 감동적이었던 순간은?',
  '오늘 아기와 뭐 했어요?',
  '추천하고 싶은 소아과가 있나요?',
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}

export default function CommunityPage() {
  const [tab, setTab] = useState<MainTab>('feed')
  const [posts, setPosts] = useState<Post[]>([])
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set())

  // 글쓰기
  const [writeOpen, setWriteOpen] = useState(false)
  const [writeText, setWriteText] = useState('')
  const [posting, setPosting] = useState(false)

  // 댓글
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  // 나눔 등록
  const [marketOpen, setMarketOpen] = useState(false)
  const [mTitle, setMTitle] = useState('')
  const [mDesc, setMDesc] = useState('')
  const [mPrice, setMPrice] = useState(0)
  const [mCategory, setMCategory] = useState('clothes')
  const [mAge, setMAge] = useState('0~6')
  const [mRegion, setMRegion] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_region') || '내 동네'
    return '내 동네'
  })

  const router = useRouter()
  const supabase = createClient()
  const dailyQuestion = DAILY_QUESTIONS[new Date().getDay() % DAILY_QUESTIONS.length]

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      setUserId(user.id)

      const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id)
      if (likes) setUserLikes(new Set(likes.map((l: { post_id: string }) => l.post_id)))

      const [postsRes, itemsRes] = await Promise.all([
        supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('market_items').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(30),
      ])
      setPosts((postsRes.data as Post[]) || [])
      setItems((itemsRes.data as MarketItem[]) || [])
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePost = useCallback(async () => {
    if (!writeText.trim() || !userId || posting) return
    setPosting(true)
    const { data } = await supabase.from('posts').insert({ user_id: userId, board_type: 'general', content: writeText.trim() }).select().single()
    if (data) setPosts((prev) => [data as Post, ...prev])
    setWriteText(''); setWriteOpen(false); setPosting(false)
  }, [writeText, userId, posting, supabase])

  const handleMarketPost = useCallback(async () => {
    if (!mTitle.trim() || !userId || posting) return
    setPosting(true)
    const { data } = await supabase.from('market_items').insert({
      user_id: userId, title: mTitle.trim(), description: mDesc.trim(),
      price: mPrice, category: mCategory, baby_age_months: mAge, region: mRegion || '미설정',
    }).select().single()
    if (data) setItems((prev) => [data as MarketItem, ...prev])
    setMTitle(''); setMDesc(''); setMPrice(0); setMarketOpen(false); setPosting(false)
  }, [mTitle, mDesc, mPrice, mCategory, mAge, mRegion, userId, posting, supabase])

  const toggleLike = useCallback(async (postId: string) => {
    if (!userId) return
    if (userLikes.has(postId)) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
      setUserLikes((prev) => { const n = new Set(prev); n.delete(postId); return n })
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, like_count: Math.max(0, p.like_count - 1) } : p))
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
      setUserLikes((prev) => new Set(prev).add(postId))
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, like_count: p.like_count + 1 } : p))
    }
  }, [userId, userLikes, supabase])

  const handleDelete = useCallback(async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }, [supabase])

  // 댓글 로드
  const loadComments = useCallback(async (postId: string) => {
    const { data } = await supabase
      .from('comments').select('*').eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setComments((prev) => ({ ...prev, [postId]: data as Comment[] }))
  }, [supabase])

  // 댓글 토글
  const toggleComments = useCallback(async (postId: string) => {
    if (openComments === postId) {
      setOpenComments(null)
    } else {
      setOpenComments(postId)
      if (!comments[postId]) await loadComments(postId)
    }
    setCommentText('')
  }, [openComments, comments, loadComments])

  // 댓글 작성
  const submitComment = useCallback(async (postId: string) => {
    if (!commentText.trim() || !userId || commentLoading) return
    setCommentLoading(true)
    const { data } = await supabase
      .from('comments').insert({ post_id: postId, user_id: userId, content: commentText.trim() })
      .select().single()
    if (data) {
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), data as Comment] }))
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
    }
    setCommentText('')
    setCommentLoading(false)
  }, [commentText, userId, commentLoading, supabase])

  // 댓글 삭제
  const deleteComment = useCallback(async (commentId: string, postId: string) => {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments((prev) => ({ ...prev, [postId]: (prev[postId] || []).filter((c) => c.id !== commentId) }))
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p))
  }, [supabase])

  const handleDeleteItem = useCallback(async (itemId: string) => {
    await supabase.from('market_items').delete().eq('id', itemId)
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="w-8 h-8 border-3 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">소통</h1>
          <button
            onClick={() => tab === 'feed' ? setWriteOpen(true) : setMarketOpen(true)}
            className="text-[12px] font-semibold text-white bg-[#3D8A5A] px-3 py-1.5 rounded-lg active:opacity-80"
          >
            {tab === 'feed' ? '글쓰기' : '나눔 등록'}
          </button>
        </div>

        <div className="flex px-5 pb-2 max-w-lg mx-auto gap-2">
          {[
            { key: 'feed' as MainTab, label: '이야기' },
            { key: 'market' as MainTab, label: '나눔' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-[13px] font-semibold text-center rounded-xl transition-colors ${
                tab === t.key ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#AEB1B9]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pb-28">
        {/* ===== 이야기 탭 ===== */}
        {tab === 'feed' && (
          <>
            <div className="mt-3 p-4 bg-white rounded-xl border border-[#f0f0f0]">
              <p className="text-[10px] font-semibold text-[#3D8A5A] mb-1">오늘의 질문</p>
              <p className="text-[14px] font-bold text-[#1A1918] mb-2">{dailyQuestion}</p>
              <button
                onClick={() => { setWriteText(`${dailyQuestion}\n\n`); setWriteOpen(true) }}
                className="text-[11px] font-semibold text-[#3D8A5A]"
              >
                답변하기 →
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {posts.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-[#f0f0f0] text-center">
                  <p className="text-2xl mb-2">💬</p>
                  <p className="text-[13px] text-[#868B94]">아직 글이 없어요</p>
                </div>
              ) : posts.map((post) => (
                <div key={post.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#F5F4F1] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#3D8A5A]">도</span>
                      </div>
                      <p className="text-[10px] text-[#AEB1B9]">{timeAgo(post.created_at)}</p>
                    </div>
                    {post.user_id === userId && (
                      <button onClick={() => { if (confirm('정말 삭제할까요?')) handleDelete(post.id) }} className="text-[10px] text-[#AEB1B9]">삭제</button>
                    )}
                  </div>
                  <p className="text-[13px] text-[#1A1918] leading-relaxed mb-3 whitespace-pre-line">{post.content}</p>
                  <div className="flex items-center gap-4 pt-2 border-t border-[#f0f0f0]">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1 text-[11px] ${userLikes.has(post.id) ? 'text-[#3D8A5A] font-semibold' : 'text-[#868B94]'}`}
                    >
                      {userLikes.has(post.id) ? '♥' : '♡'} {post.like_count}
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center gap-1 text-[11px] ${openComments === post.id ? 'text-[#3D8A5A] font-semibold' : 'text-[#868B94]'}`}
                    >
                      💬 {post.comment_count}
                    </button>
                  </div>

                  {/* 댓글 섹션 */}
                  {openComments === post.id && (
                    <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
                      {/* 댓글 목록 */}
                      {(comments[post.id] || []).length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {(comments[post.id] || []).map((c) => (
                            <div key={c.id} className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#F5F4F1] flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[8px] font-bold text-[#3D8A5A]">도</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-[12px] text-[#1A1918] leading-relaxed">{c.content}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] text-[#AEB1B9]">{timeAgo(c.created_at)}</span>
                                  {c.user_id === userId && (
                                    <button onClick={() => { if (confirm('댓글을 삭제할까요?')) deleteComment(c.id, post.id) }} className="text-[9px] text-[#AEB1B9]">삭제</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#AEB1B9] text-center mb-3">아직 댓글이 없어요</p>
                      )}

                      {/* 댓글 입력 */}
                      <div className="flex gap-2">
                        <input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
                          placeholder="댓글을 입력하세요..."
                          className="flex-1 h-9 px-3 rounded-xl bg-[#F5F4F1] text-[12px] focus:outline-none"
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(post.id) } }}
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          disabled={!commentText.trim() || commentLoading}
                          className={`px-3 h-9 rounded-xl text-[12px] font-semibold shrink-0 ${
                            commentText.trim() ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#AEB1B9]'
                          }`}
                        >
                          {commentLoading ? '...' : '등록'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ===== 나눔 탭 ===== */}
        {tab === 'market' && (
          <div className="mt-3 space-y-2">
            {items.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-[#f0f0f0] text-center">
                <p className="text-2xl mb-2">🎁</p>
                <p className="text-[13px] text-[#868B94]">아직 나눔이 없어요</p>
                <p className="text-[11px] text-[#AEB1B9] mt-1">쓰지 않는 육아용품을 나눠보세요!</p>
              </div>
            ) : items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl bg-[#F5F4F1] flex items-center justify-center shrink-0">
                    <span className="text-2xl">{CATEGORY_LABELS[item.category]?.split(' ')[0] || '📦'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1A1918] truncate">{item.title}</p>
                    <p className="text-[11px] text-[#868B94] mt-0.5">
                      {item.baby_age_months}개월 · {item.region}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-[14px] font-bold ${item.price === 0 ? 'text-[#3D8A5A]' : 'text-[#1A1918]'}`}>
                        {item.price === 0 ? '무료 나눔' : `${item.price.toLocaleString()}원`}
                      </p>
                      <div className="flex items-center gap-2">
                        {item.status === 'reserved' && (
                          <span className="text-[9px] font-semibold text-[#D89575] bg-[#FEF0E8] px-1.5 py-0.5 rounded">예약중</span>
                        )}
                        <p className="text-[10px] text-[#AEB1B9]">{timeAgo(item.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {item.user_id === userId && (
                  <div className="flex justify-end mt-2 pt-2 border-t border-[#f0f0f0]">
                    <button onClick={() => handleDeleteItem(item.id)} className="text-[10px] text-[#AEB1B9]">삭제</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 글쓰기 모달 */}
      {writeOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setWriteOpen(false)}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f0]">
              <button onClick={() => setWriteOpen(false)} className="text-[13px] text-[#868B94]">취소</button>
              <p className="text-[14px] font-bold text-[#1A1918]">글쓰기</p>
              <button onClick={handlePost} disabled={!writeText.trim() || posting} className={`text-[13px] font-semibold ${writeText.trim() ? 'text-[#3D8A5A]' : 'text-[#AEB1B9]'}`}>
                {posting ? '등록 중...' : '등록'}
              </button>
            </div>
            <div className="px-5 py-4">
              <textarea value={writeText} onChange={(e) => setWriteText(e.target.value.slice(0, 2000))} placeholder="육아 이야기를 나눠보세요..." className="w-full h-32 text-[14px] text-[#1A1918] resize-none focus:outline-none" autoFocus />
              <p className="text-right text-[11px] text-[#AEB1B9] pt-2">{writeText.length}/2000</p>
            </div>
          </div>
        </div>
      )}

      {/* 나눔 등록 모달 */}
      {marketOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setMarketOpen(false)}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f0] sticky top-0 bg-white">
              <button onClick={() => setMarketOpen(false)} className="text-[13px] text-[#868B94]">취소</button>
              <p className="text-[14px] font-bold text-[#1A1918]">나눔 등록</p>
              <button onClick={handleMarketPost} disabled={!mTitle.trim() || posting} className={`text-[13px] font-semibold ${mTitle.trim() ? 'text-[#3D8A5A]' : 'text-[#AEB1B9]'}`}>
                {posting ? '등록 중...' : '등록'}
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[12px] font-semibold text-[#868B94] mb-1">제목</p>
                <input value={mTitle} onChange={(e) => setMTitle(e.target.value.slice(0, 100))} placeholder="예: 내복 세트 6~12개월" className="w-full h-10 px-3 rounded-xl border border-[#f0f0f0] text-[14px] focus:outline-none focus:border-[#3D8A5A]" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#868B94] mb-1">카테고리</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => setMCategory(key)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${mCategory === key ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#868B94]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#868B94] mb-1">가격</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMPrice(0)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${mPrice === 0 ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#868B94]'}`}>무료 나눔</button>
                  <input type="number" value={mPrice || ''} onChange={(e) => setMPrice(Number(e.target.value))} placeholder="가격 입력" className="flex-1 h-9 px-3 rounded-xl border border-[#f0f0f0] text-[13px] focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-[#868B94] mb-1">아기 월령</p>
                  <select value={mAge} onChange={(e) => setMAge(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-[#f0f0f0] text-[13px]">
                    <option value="0~6">0~6개월</option>
                    <option value="6~12">6~12개월</option>
                    <option value="12~24">12~24개월</option>
                    <option value="24+">24개월+</option>
                    <option value="전연령">전연령</option>
                  </select>
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-[#868B94] mb-1">지역</p>
                  <div className="w-full h-9 px-3 rounded-xl border border-[#f0f0f0] text-[13px] flex items-center text-[#1A1918] bg-[#F7F8FA]">{mRegion}</div>
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#868B94] mb-1">설명 (선택)</p>
                <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value.slice(0, 1000))} placeholder="상태, 사용 기간 등을 적어주세요" className="w-full h-20 px-3 py-2 rounded-xl border border-[#f0f0f0] text-[13px] resize-none focus:outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
