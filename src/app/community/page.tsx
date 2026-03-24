'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  photos: string[]
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

const WEEKLY_POLLS = [
  { q: '이유식 첫 메뉴는?', options: ['쌀미음', '감자', '고구마'] },
  { q: '수면 교육 방법은?', options: ['퍼버법', '쉬닥법', '안 함'] },
  { q: '기저귀 브랜드는?', options: ['하기스', '팸퍼스', '기타'] },
  { q: '분유 vs 모유?', options: ['완모', '혼합', '완분'] },
  { q: '육아 가장 힘든 시간?', options: ['새벽', '저녁', '온종일'] },
  { q: '첫 외출은 언제?', options: ['2주 후', '1개월 후', '2개월 후'] },
  { q: '육아 필수 앱은?', options: ['도담', '베이비타임', '삐요로그'] },
]

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
  return <Suspense><CommunityPageInner /></Suspense>
}

export function CommunityPageInner({ initialTab: propTab, hideHeader }: { initialTab?: 'feed' | 'market'; hideHeader?: boolean } = {}) {
  const searchParams = useSearchParams()
  const paramTab = searchParams.get('tab') === 'market' ? 'market' : 'feed'
  const [tab, setTab] = useState<MainTab>(propTab || paramTab as MainTab)
  const [posts, setPosts] = useState<Post[]>([])
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set())

  // 북마크
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('dodam_bookmarks')
      return s ? new Set(JSON.parse(s)) : new Set()
    }
    return new Set()
  })

  // 주간 투표
  const todayPoll = WEEKLY_POLLS[new Date().getDay() % WEEKLY_POLLS.length]
  const pollKey = `dodam_poll_${new Date().getDay()}`
  const [pollVote, setPollVote] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem(pollKey)
      return v !== null ? Number(v) : null
    }
    return null
  })
  const [pollVotes, setPollVotes] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem(`${pollKey}_votes`)
      return s ? JSON.parse(s) : todayPoll.options.map(() => 0)
    }
    return todayPoll.options.map(() => 0)
  })

  // 글쓰기
  const [writeOpen, setWriteOpen] = useState(false)
  const [writeText, setWriteText] = useState('')
  const [posting, setPosting] = useState(false)

  // 댓글
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  // 도담장터 등록
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
  const [mPhotos, setMPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const dailyQuestion = DAILY_QUESTIONS[new Date().getDay() % DAILY_QUESTIONS.length]

  const toggleBookmark = (postId: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId); else next.add(postId)
      localStorage.setItem('dodam_bookmarks', JSON.stringify([...next]))
      return next
    })
  }

  const SITE_URL = 'https://dodam.life'

  const sharePost = (post: any) => {
    const url = `${SITE_URL}/post/${post.id}`
    const title = '도담 이야기'
    const desc = post.content.slice(0, 80) + (post.content.length > 80 ? '...' : '')

    if (window.Kakao?.isInitialized?.()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title, description: desc, imageUrl: `${SITE_URL}/icon-512x512.png`, link: { mobileWebUrl: url, webUrl: url } },
        buttons: [{ title: '이야기 보기', link: { mobileWebUrl: url, webUrl: url } }],
      })
    } else if (navigator.share) {
      navigator.share({ title, text: desc, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => alert('링크가 복사되었어요!'))
    }
  }

  const shareMarketItem = (item: any) => {
    const url = `${SITE_URL}/market-item/${item.id}`
    const title = `도담장터 · ${item.title}`
    const desc = item.price > 0 ? `${item.price.toLocaleString()}원` : '나눔 🤝'

    if (window.Kakao?.isInitialized?.()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title, description: `${desc}\n${item.description?.slice(0, 60) || ''}`, imageUrl: item.photos?.[0] || `${SITE_URL}/icon-512x512.png`, link: { mobileWebUrl: url, webUrl: url } },
        buttons: [{ title: '장터 보기', link: { mobileWebUrl: url, webUrl: url } }],
      })
    } else if (navigator.share) {
      navigator.share({ title, text: `${desc} - ${item.description?.slice(0, 60) || ''}`, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => alert('링크가 복사되었어요!'))
    }
  }

  const votePoll = (idx: number) => {
    if (pollVote !== null) return
    setPollVote(idx)
    localStorage.setItem(pollKey, String(idx))
    const next = [...pollVotes]
    next[idx] += 1
    setPollVotes(next)
    localStorage.setItem(`${pollKey}_votes`, JSON.stringify(next))
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      setUserId(user.id)

      const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id)
      if (likes) setUserLikes(new Set(likes.map((l: { post_id: string }) => l.post_id)))

      const [postsRes, itemsRes] = await Promise.all([
        supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('market_items').select('*').order('created_at', { ascending: false }).limit(30),
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

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !userId || mPhotos.length >= 3) return
    setUploading(true)
    const newPhotos = [...mPhotos]
    for (let i = 0; i < Math.min(files.length, 3 - mPhotos.length); i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `market/${userId}/${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage.from('photos').upload(path, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
        newPhotos.push(urlData.publicUrl)
      }
    }
    setMPhotos(newPhotos)
    setUploading(false)
    e.target.value = ''
  }, [userId, mPhotos, supabase])

  const handleMarketPost = useCallback(async () => {
    if (!mTitle.trim() || !userId || posting) return
    setPosting(true)
    const { data, error } = await supabase.from('market_items').insert({
      user_id: userId, title: mTitle.trim(), description: mDesc.trim(),
      price: mPrice, category: mCategory, baby_age_months: mAge, region: mRegion || '미설정',
      photos: mPhotos,
    }).select().single()
    if (error) {
      console.error('Market post error:', error)
      alert(`등록 실패: ${error.message}`)
      setPosting(false)
      return
    }
    if (data) setItems((prev) => [data as MarketItem, ...prev])
    setMTitle(''); setMDesc(''); setMPrice(0); setMPhotos([]); setMarketOpen(false); setPosting(false)
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
    <div className={hideHeader ? '' : 'min-h-[100dvh] bg-[#F5F4F1]'}>
      {!hideHeader && (
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <h1 className="text-[17px] font-bold text-[#1A1918]">소통</h1>
          <button
            onClick={() => tab === 'feed' ? setWriteOpen(true) : setMarketOpen(true)}
            className="text-[12px] font-semibold text-white bg-[#3D8A5A] px-3 py-1.5 rounded-lg active:opacity-80"
          >
            {tab === 'feed' ? '글쓰기' : '도담장터 등록'}
          </button>
        </div>

        <div className="flex px-5 pb-2 max-w-lg mx-auto w-full gap-2">
          {[
            { key: 'feed' as MainTab, label: '이야기' },
            { key: 'market' as MainTab, label: '도담장터' },
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
      )}

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28">
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

            {/* 주간 투표 */}
            <div className="mt-3 p-4 bg-white rounded-xl border border-[#f0f0f0]">
              <p className="text-[10px] font-semibold text-[#3D8A5A] mb-1">주간 투표</p>
              <p className="text-[14px] font-bold text-[#1A1918] mb-3">{todayPoll.q}</p>
              <div className="space-y-2">
                {todayPoll.options.map((opt, idx) => {
                  const total = pollVotes.reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? Math.round((pollVotes[idx] / total) * 100) : 0
                  return (
                    <button
                      key={idx}
                      onClick={() => votePoll(idx)}
                      disabled={pollVote !== null}
                      className={`w-full text-left rounded-xl px-3 py-2 text-[13px] relative overflow-hidden border ${
                        pollVote === idx ? 'border-[#3D8A5A] bg-[#3D8A5A]/5 font-semibold text-[#1A1918]' : 'border-[#f0f0f0] text-[#1A1918]'
                      }`}
                    >
                      {pollVote !== null && (
                        <div className="absolute inset-y-0 left-0 bg-[#3D8A5A]/10 rounded-xl" style={{ width: `${pct}%` }} />
                      )}
                      <span className="relative">{opt}</span>
                      {pollVote !== null && <span className="relative float-right text-[12px] text-[#868B94]">{pct}%</span>}
                    </button>
                  )
                })}
              </div>
              {pollVote !== null && (
                <p className="text-[10px] text-[#AEB1B9] mt-2 text-right">총 {pollVotes.reduce((a, b) => a + b, 0)}명 참여</p>
              )}
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
                      {post.like_count >= 5 && <span className="text-[9px] font-semibold text-[#D89575]">🔥 인기</span>}
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
                    <button
                      onClick={() => toggleBookmark(post.id)}
                      className={`flex items-center gap-1 text-[11px] ml-auto ${bookmarks.has(post.id) ? 'text-[#3D8A5A] font-semibold' : 'text-[#868B94]'}`}
                    >
                      {bookmarks.has(post.id) ? '🔖' : '🔖'}
                    </button>
                    <button
                      onClick={() => sharePost(post)}
                      className="text-[11px] text-[#868B94]"
                    >
                      공유
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

        {/* ===== 도담장터 탭 ===== */}
        {tab === 'market' && (
          <div className="mt-3 space-y-2">
            {items.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-[#f0f0f0] text-center">
                <p className="text-2xl mb-2">🎁</p>
                <p className="text-[13px] text-[#868B94]">아직 등록된 물품이 없어요</p>
                <p className="text-[11px] text-[#AEB1B9] mt-1">쓰지 않는 육아용품을 등록해보세요!</p>
              </div>
            ) : items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-[#f0f0f0] overflow-hidden">
                {/* 썸네일 + 기본 정보 */}
                <div className="flex items-start gap-3 p-4">
                  <div className="w-20 h-20 rounded-xl bg-[#F5F4F1] flex items-center justify-center shrink-0 overflow-hidden">
                    {item.photos && item.photos.length > 0 ? (
                      <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{CATEGORY_LABELS[item.category]?.split(' ')[0] || '📦'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'reserved' && (
                        <span className="text-[9px] font-semibold text-white bg-[#D89575] px-1.5 py-0.5 rounded">예약중</span>
                      )}
                      {item.status === 'done' && (
                        <span className="text-[9px] font-semibold text-white bg-[#AEB1B9] px-1.5 py-0.5 rounded">거래완료</span>
                      )}
                      <p className={`text-[14px] font-semibold truncate ${item.status === 'done' ? 'text-[#AEB1B9]' : 'text-[#1A1918]'}`}>{item.title}</p>
                    </div>
                    <p className="text-[11px] text-[#868B94] mt-0.5">{CATEGORY_LABELS[item.category] || item.category} · {item.baby_age_months}개월</p>
                    <p className="text-[10px] text-[#AEB1B9] mt-0.5">📍 {item.region} · {timeAgo(item.created_at)}</p>
                    <p className={`text-[15px] font-bold mt-1 ${item.price === 0 ? 'text-[#3D8A5A]' : 'text-[#1A1918]'}`}>
                      {item.price === 0 ? '무료 나눔' : `${item.price.toLocaleString()}원`}
                    </p>
                  </div>
                </div>

                {/* 설명 (있으면) */}
                {item.description && (
                  <div className="px-4 pb-3">
                    <p className="text-[12px] text-[#868B94] line-clamp-2">{item.description}</p>
                  </div>
                )}

                {/* 사진 여러장 (있으면) */}
                {item.photos && item.photos.length > 1 && (
                  <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
                    {item.photos.map((url: string, i: number) => (
                      <div key={i} className="w-14 h-14 rounded-lg bg-[#F5F4F1] shrink-0 overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex border-t border-[#f0f0f0]">
                  {item.user_id === userId ? (
                    <>
                      {/* 내 글: 상태 변경 + 삭제 */}
                      {item.status === 'active' && (
                        <button
                          onClick={async () => {
                            await supabase.from('market_items').update({ status: 'reserved' }).eq('id', item.id)
                            setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'reserved' } : i))
                          }}
                          className="flex-1 py-2.5 text-[12px] font-semibold text-[#D89575] text-center"
                        >
                          예약중으로 변경
                        </button>
                      )}
                      {item.status === 'reserved' && (
                        <button
                          onClick={async () => {
                            await supabase.from('market_items').update({ status: 'done' }).eq('id', item.id)
                            setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'done' } : i))
                          }}
                          className="flex-1 py-2.5 text-[12px] font-semibold text-[#3D8A5A] text-center"
                        >
                          거래완료
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('정말 삭제할까요?')) handleDeleteItem(item.id) }}
                        className="py-2.5 px-4 text-[12px] text-[#AEB1B9] border-l border-[#f0f0f0]"
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <>
                      {/* 다른 사람 글: 거래 신청 */}
                      {item.status === 'active' && (
                        <button
                          onClick={() => alert('채팅 기능은 준비 중이에요. 소통 탭에서 글로 문의해주세요!')}
                          className="flex-1 py-2.5 text-[12px] font-semibold text-[#3D8A5A] text-center"
                        >
                          거래 신청하기
                        </button>
                      )}
                      {item.status === 'reserved' && (
                        <p className="flex-1 py-2.5 text-[12px] text-[#868B94] text-center">예약된 물품이에요</p>
                      )}
                      {item.status === 'done' && (
                        <p className="flex-1 py-2.5 text-[12px] text-[#AEB1B9] text-center">거래가 완료되었어요</p>
                      )}
                    </>
                  )}
                  <button onClick={() => shareMarketItem(item)} className="py-2.5 px-3 text-[11px] text-[#868B94] border-l border-[#f0f0f0]">공유</button>
                </div>
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

      {/* 도담장터 등록 모달 */}
      {marketOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setMarketOpen(false)}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f0] sticky top-0 bg-white">
              <button onClick={() => setMarketOpen(false)} className="text-[13px] text-[#868B94]">취소</button>
              <p className="text-[14px] font-bold text-[#1A1918]">도담장터 등록</p>
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
                <p className="text-[12px] font-semibold text-[#868B94] mb-1">사진 (최대 3장)</p>
                <div className="flex gap-2">
                  {mPhotos.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#F5F4F1]">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setMPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full text-white text-[8px] flex items-center justify-center"
                      >✕</button>
                    </div>
                  ))}
                  {mPhotos.length < 3 && (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-[#AEB1B9] flex flex-col items-center justify-center cursor-pointer active:bg-[#F5F4F1]">
                      <span className="text-lg text-[#AEB1B9]">{uploading ? '...' : '📷'}</span>
                      <span className="text-[8px] text-[#AEB1B9]">{uploading ? '업로드' : '추가'}</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                    </label>
                  )}
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
