'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRemoteContent } from '@/lib/useRemoteContent'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChatIcon, FireIcon, TrashIcon, HeartIcon, HeartFilledIcon, BookmarkIcon, BookmarkFilledIcon, GiftIcon, PackageIcon, MapPinIcon, CameraIcon, XIcon } from '@/components/ui/Icons'
import AdSlot from '@/components/ads/AdSlot'

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

type TransactionType = 'sell' | 'share' | 'exchange'

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
  transaction_type?: TransactionType
  exchange_want?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  clothes: '의류',
  feeding: '수유/이유식',
  toys: '장난감',
  furniture: '가구/침대',
  stroller: '유모차/카시트',
  etc: '기타',
}

const CONDITION_LABELS: Record<string, string> = {
  new: '새 상품',
  like_new: '거의 새것',
  good: '상태 좋음',
  used: '사용감 있음',
}

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  sell: '판매',
  share: '나눔',
  exchange: '교환',
}

const AGE_FILTER_OPTIONS = [
  { key: 'all', label: '전체' },
  { key: '0~3', label: '0~3개월' },
  { key: '3~6', label: '3~6개월' },
  { key: '6~12', label: '6~12개월' },
  { key: '12+', label: '12개월+' },
]

function getDodamDays(): number {
  if (typeof window === 'undefined') return 0
  const entries = (() => { try { return JSON.parse(localStorage.getItem('dodam_journey_entries') || '[]') } catch { return [] } })()
  return Math.max(entries.length, 1)
}

const MAX_PHOTOS = 5

const DEFAULT_WEEKLY_POLLS = [
  { q: '이유식 첫 메뉴는?', options: ['쌀미음', '감자', '고구마'] },
  { q: '수면 교육 방법은?', options: ['퍼버법', '쉬닥법', '안 함'] },
  { q: '기저귀 브랜드는?', options: ['하기스', '팸퍼스', '기타'] },
  { q: '분유 vs 모유?', options: ['완모', '혼합', '완분'] },
  { q: '육아 가장 힘든 시간?', options: ['새벽', '저녁', '온종일'] },
  { q: '첫 외출은 언제?', options: ['2주 후', '1개월 후', '2개월 후'] },
  { q: '육아 필수 앱은?', options: ['도담', '베이비타임', '삐요로그'] },
]

const DEFAULT_DAILY_QUESTIONS = [
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

const MODE_TAGS: Record<string, string[]> = {
  preparing: ['난임극복', '기초체온공유', '시술후기', '배란테스트', '임신준비팁', '난임병원추천'],
  pregnant: ['입덧극복', '태교일기', '임산부운동', '출산준비', '병원후기', '임신초기'],
  parenting: ['이유식', '수면교육', '육아템추천', '소아과후기', '발달상담', '일상기록'],
}

function ModeHashtags({ onTag }: { onTag: (tag: string) => void }) {
  const [mode, setMode] = useState('parenting')
  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
  }, [])
  const tags = MODE_TAGS[mode] || MODE_TAGS.parenting
  return (
    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mt-3">
      {tags.map(tag => (
        <button key={tag} onClick={() => onTag(tag)}
          className="shrink-0 px-2.5 py-1.5 rounded-full text-[12px] font-semibold bg-white border border-[#E8E4DF] text-[#6B6966] active:bg-[var(--color-page-bg)]">
          #{tag}
        </button>
      ))}
    </div>
  )
}

// 레거시 /community → /town 리다이렉트 (CommunityPageInner는 /town에서 사용)
export default function CommunityPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/town') }, [router])
  return <div className="flex items-center justify-center h-[100dvh]"><div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" /></div>
}

export function CommunityPageInner({ initialTab: propTab, hideHeader }: { initialTab?: 'feed' | 'market'; hideHeader?: boolean } = {}) {
  const weeklyPolls = useRemoteContent('community_polls', DEFAULT_WEEKLY_POLLS)
  const dailyQuestions = useRemoteContent('community_questions', DEFAULT_DAILY_QUESTIONS)
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
  const todayPoll = weeklyPolls[new Date().getDay() % weeklyPolls.length]
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
  const [mCondition, setMCondition] = useState('good')
  const [mTransType, setMTransType] = useState<TransactionType>('sell')
  const [mExchangeWant, setMExchangeWant] = useState('')

  // 장터 필터
  const [filterCat, setFilterCat] = useState<string>('all')
  const [filterPrice, setFilterPrice] = useState<string>('all')
  const [filterAge, setFilterAge] = useState<string>('all')
  const [uploading, setUploading] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const dailyQuestion = dailyQuestions[new Date().getDay() % dailyQuestions.length]

  const toggleBookmark = (postId: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId); else next.add(postId)
      localStorage.setItem('dodam_bookmarks', JSON.stringify([...next]))
      return next
    })
  }

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dodam.life'

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
      navigator.clipboard.writeText(url).then(() => window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '링크가 복사되었어요!' } })))
    }
  }

  const shareMarketItem = (item: any) => {
    const url = `${SITE_URL}/market-item/${item.id}`
    const title = `도담장터 · ${item.title}`
    const desc = item.price > 0 ? `${item.price.toLocaleString()}원` : '나눔'

    if (window.Kakao?.isInitialized?.()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title, description: `${desc}\n${item.description?.slice(0, 60) || ''}`, imageUrl: item.photos?.[0] || `${SITE_URL}/icon-512x512.png`, link: { mobileWebUrl: url, webUrl: url } },
        buttons: [{ title: '장터 보기', link: { mobileWebUrl: url, webUrl: url } }],
      })
    } else if (navigator.share) {
      navigator.share({ title, text: `${desc} - ${item.description?.slice(0, 60) || ''}`, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '링크가 복사되었어요!' } })))
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
        supabase.from('posts').select('id, user_id, content, like_count, comment_count, created_at').order('created_at', { ascending: false }).limit(30),
        supabase.from('market_items').select('id, user_id, title, description, price, category, baby_age_months, region, photos, status, chat_count, created_at, transaction_type, exchange_want').order('created_at', { ascending: false }).limit(30),
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
    if (!files || !userId || mPhotos.length >= MAX_PHOTOS) return
    setUploading(true)
    const newPhotos = [...mPhotos]
    for (let i = 0; i < Math.min(files.length, MAX_PHOTOS - mPhotos.length); i++) {
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
    const insertData: Record<string, unknown> = {
      user_id: userId, title: mTitle.trim(), description: mDesc.trim(),
      price: mTransType === 'share' ? 0 : mTransType === 'exchange' ? 0 : mPrice,
      category: mCategory, baby_age_months: mAge, region: mRegion || '미설정',
      photos: mPhotos, condition: mCondition,
      transaction_type: mTransType,
      exchange_want: mTransType === 'exchange' ? mExchangeWant.trim() : null,
    }
    const { data, error } = await supabase.from('market_items').insert(insertData).select().single()
    if (error) {
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '등록에 실패했어요. 다시 시도해주세요.' } }))
      setPosting(false)
      return
    }
    if (data) setItems((prev) => [data as MarketItem, ...prev])
    setMTitle(''); setMDesc(''); setMPrice(0); setMPhotos([]); setMTransType('sell'); setMExchangeWant(''); setMarketOpen(false); setPosting(false)
  }, [mTitle, mDesc, mPrice, mCategory, mAge, mRegion, mTransType, mExchangeWant, userId, posting, supabase])

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
      .from('comments').select('id, post_id, user_id, content, created_at').eq('post_id', postId)
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
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={hideHeader ? '' : 'min-h-[100dvh] bg-[var(--color-page-bg)]'}>
      {!hideHeader && (
      <div className="pt-4 pb-2 px-5 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[15px] font-bold text-[#1A1918]">소통</h1>
          <button
            onClick={() => tab === 'feed' ? setWriteOpen(true) : setMarketOpen(true)}
            className="text-[14px] font-semibold text-white bg-[var(--color-primary)] px-3 py-1.5 rounded-lg active:opacity-80"
          >
            {tab === 'feed' ? '글쓰기' : '도담장터 등록'}
          </button>
        </div>

        <div className="flex gap-2">
          {[
            { key: 'feed' as MainTab, label: '이야기' },
            { key: 'market' as MainTab, label: '도담장터' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-[13px] font-semibold text-center rounded-xl transition-colors ${
                tab === t.key ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-[#9E9A95]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* 글쓰기 FAB (hideHeader일 때 = town 페이지에서 사용 시) */}
      {hideHeader && (
        <div className="fixed bottom-24 right-4 z-50 max-w-lg mx-auto">
          <button
            onClick={() => tab === 'feed' ? setWriteOpen(true) : setMarketOpen(true)}
            className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <span className="text-xl font-light">+</span>
          </button>
        </div>
      )}

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28">
        {/* ===== 이야기 탭 ===== */}
        {tab === 'feed' && (
          <>
            {/* 모드별 추천 해시태그 */}
            <ModeHashtags onTag={(tag) => { setWriteText(`#${tag} `); setWriteOpen(true) }} />

            <div className="mt-3 p-4 bg-white rounded-xl border border-[#E8E4DF]">
              <p className="text-[14px] font-semibold text-[var(--color-primary)] mb-1">오늘의 질문</p>
              <p className="text-[14px] font-bold text-[#1A1918] mb-2">{dailyQuestion}</p>
              <button
                onClick={() => { setWriteText(`${dailyQuestion}\n\n`); setWriteOpen(true) }}
                className="text-[13px] font-semibold text-[var(--color-primary)]"
              >
                답변하기 →
              </button>
            </div>

            {/* 주간 투표 */}
            <div className="mt-3 p-4 bg-white rounded-xl border border-[#E8E4DF]">
              <p className="text-[14px] font-semibold text-[var(--color-primary)] mb-1">주간 투표</p>
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
                        pollVote === idx ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 font-semibold text-[#1A1918]' : 'border-[#E8E4DF] text-[#1A1918]'
                      }`}
                    >
                      {pollVote !== null && (
                        <div className="absolute inset-y-0 left-0 bg-[var(--color-primary)]/10 rounded-xl" style={{ width: `${pct}%` }} />
                      )}
                      <span className="relative">{opt}</span>
                      {pollVote !== null && <span className="relative float-right text-[14px] text-[#6B6966]">{pct}%</span>}
                    </button>
                  )
                })}
              </div>
              {pollVote !== null && (
                <p className="text-[14px] text-[#9E9A95] mt-2 text-right">총 {pollVotes.reduce((a, b) => a + b, 0)}명 참여</p>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {posts.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-[#E8E4DF] text-center">
                  <ChatIcon className="w-7 h-7 mx-auto mb-2 text-[#9E9A95]" />
                  <p className="text-[14px] font-bold text-[#1A1918] mb-1">첫 이야기를 나눠보세요</p>
                  <p className="text-[13px] text-[#6B6966] mb-3">우리 동네 부모들과 육아 이야기를 나눠보세요</p>
                  <button onClick={() => setWriteOpen(true)} className="px-4 py-2 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-lg active:opacity-80">글쓰기</button>
                </div>
              ) : posts.map((post, pi) => (
                <div key={post.id}>
                {pi === 3 && posts.length > 5 && <AdSlot className="mb-2" />}
                <div className="bg-white rounded-xl p-4 border border-[#E8E4DF]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--color-page-bg)] flex items-center justify-center">
                        <span className="text-[14px] font-bold text-[var(--color-primary)]">도</span>
                      </div>
                      <p className="text-[14px] text-[#9E9A95]">{timeAgo(post.created_at)}</p>
                      {post.like_count >= 5 && <span className="text-[13px] font-semibold text-[#D89575] flex items-center gap-0.5"><FireIcon className="w-3.5 h-3.5" /> 인기</span>}
                    </div>
                    {post.user_id === userId && (
                      <button onClick={() => { if (confirm('정말 삭제할까요?')) handleDelete(post.id) }} className="text-[#9E9A95]"><TrashIcon className="w-4 h-4" /></button>
                    )}
                  </div>
                  <p className="text-[13px] text-[#1A1918] leading-relaxed mb-3 whitespace-pre-line">{post.content}</p>
                  <div className="flex items-center gap-4 pt-2 border-t border-[#E8E4DF]">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1 text-[13px] ${userLikes.has(post.id) ? 'text-[var(--color-primary)] font-semibold' : 'text-[#6B6966]'}`}
                    >
                      {userLikes.has(post.id) ? <HeartFilledIcon className="w-3.5 h-3.5 inline" /> : <HeartIcon className="w-3.5 h-3.5 inline" />} {post.like_count}
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center gap-1 text-[13px] ${openComments === post.id ? 'text-[var(--color-primary)] font-semibold' : 'text-[#6B6966]'}`}
                    >
                      댓글 {post.comment_count}
                    </button>
                    <button
                      onClick={() => toggleBookmark(post.id)}
                      className={`flex items-center gap-1 text-[13px] ml-auto ${bookmarks.has(post.id) ? 'text-[var(--color-primary)] font-semibold' : 'text-[#6B6966]'}`}
                    >
                      {bookmarks.has(post.id) ? <BookmarkFilledIcon className="w-3.5 h-3.5 inline" /> : <BookmarkIcon className="w-3.5 h-3.5 inline" />}
                    </button>
                    <button
                      onClick={() => sharePost(post)}
                      className="text-[13px] text-[#6B6966]"
                    >
                      공유
                    </button>
                  </div>

                  {/* 댓글 섹션 */}
                  {openComments === post.id && (
                    <div className="mt-3 pt-3 border-t border-[#E8E4DF]">
                      {/* 댓글 목록 */}
                      {(comments[post.id] || []).length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {(comments[post.id] || []).map((c) => (
                            <div key={c.id} className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-[var(--color-page-bg)] flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[13px] font-bold text-[var(--color-primary)]">도</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-[14px] text-[#1A1918] leading-relaxed">{c.content}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[13px] text-[#9E9A95]">{timeAgo(c.created_at)}</span>
                                  {c.user_id === userId && (
                                    <button onClick={() => { if (confirm('댓글을 삭제할까요?')) deleteComment(c.id, post.id) }} className="text-[#9E9A95]"><TrashIcon className="w-3 h-3" /></button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] text-[#9E9A95] text-center mb-3">아직 댓글이 없어요</p>
                      )}

                      {/* 댓글 입력 */}
                      <div className="flex gap-2">
                        <input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
                          placeholder="댓글을 입력하세요..."
                          className="flex-1 h-9 px-3 rounded-xl bg-[var(--color-page-bg)] text-[14px] focus:outline-none"
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(post.id) } }}
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          disabled={!commentText.trim() || commentLoading}
                          className={`px-3 h-9 rounded-xl text-[14px] font-semibold shrink-0 ${
                            commentText.trim() ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-[#9E9A95]'
                          }`}
                        >
                          {commentLoading ? '...' : '등록'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ===== 도담장터 탭 ===== */}
        {tab === 'market' && (
          <div className="mt-3 space-y-2">
            {/* 월령 필터 칩 */}
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
              {AGE_FILTER_OPTIONS.map((opt) => (
                <button key={opt.key} onClick={() => setFilterAge(opt.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${filterAge === opt.key ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-[#E8E4DF] text-[#6B6966]'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {/* 필터 바 */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="h-8 px-2 rounded-lg border border-[#E8E4DF] text-[13px] bg-white shrink-0"
              >
                <option value="all">전체 카테고리</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="h-8 px-2 rounded-lg border border-[#E8E4DF] text-[13px] bg-white shrink-0"
              >
                <option value="all">전체 가격</option>
                <option value="free">무료 나눔</option>
                <option value="under10k">1만원 이하</option>
                <option value="under50k">5만원 이하</option>
                <option value="over50k">5만원 이상</option>
              </select>
            </div>
            {(() => {
              const filtered = items
                .filter((i) => filterCat === 'all' || i.category === filterCat)
                .filter((i) => {
                  if (filterPrice === 'all') return true
                  if (filterPrice === 'free') return i.price === 0
                  if (filterPrice === 'under10k') return i.price > 0 && i.price <= 10000
                  if (filterPrice === 'under50k') return i.price > 0 && i.price <= 50000
                  return i.price > 50000
                })
                .filter((i) => {
                  if (filterAge === 'all') return true
                  const age = i.baby_age_months || ''
                  if (filterAge === '0~3') return age.startsWith('0') || age === '0~3' || age === '0~6'
                  if (filterAge === '3~6') return age === '3~6' || age === '0~6'
                  if (filterAge === '6~12') return age === '6~12'
                  if (filterAge === '12+') return age === '12~24' || age === '24+' || age === '12+'
                  return true
                })
              return filtered.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-[#E8E4DF] text-center">
                <span className="block mb-2"><GiftIcon className="w-7 h-7 mx-auto text-[#9E9A95]" /></span>
                <p className="text-[13px] text-[#6B6966]">아직 등록된 물품이 없어요</p>
                <p className="text-[13px] text-[#9E9A95] mt-1">쓰지 않는 육아용품을 등록해보세요!</p>
              </div>
            ) : filtered.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
                {/* 썸네일 + 기본 정보 */}
                <div className="flex items-start gap-3 p-4">
                  <div className="w-20 h-20 rounded-xl bg-[var(--color-page-bg)] flex items-center justify-center shrink-0 overflow-hidden">
                    {item.photos && item.photos.length > 0 ? (
                      <img src={item.photos[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <PackageIcon className="w-6 h-6 text-[#9E9A95]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'reserved' && (
                        <span className="text-[13px] font-semibold text-white bg-[#D89575] px-1.5 py-0.5 rounded">예약중</span>
                      )}
                      {item.status === 'done' && (
                        <span className="text-[13px] font-semibold text-white bg-[#AEB1B9] px-1.5 py-0.5 rounded">거래완료</span>
                      )}
                      <p className={`text-[14px] font-semibold truncate ${item.status === 'done' ? 'text-[#9E9A95]' : 'text-[#1A1918]'}`}>{item.title}</p>
                    </div>
                    <p className="text-[13px] text-[#6B6966] mt-0.5">
                      {CATEGORY_LABELS[item.category] || item.category} · {item.baby_age_months}개월
                      {(item as MarketItem & { condition?: string }).condition && (
                        <span className="ml-1 text-[#8B7355]">· {CONDITION_LABELS[(item as MarketItem & { condition?: string }).condition!] || ''}</span>
                      )}
                    </p>
                    <p className="text-[14px] text-[#9E9A95] mt-0.5 flex items-center gap-0.5"><MapPinIcon className="w-3 h-3 inline" /> {item.region} · {timeAgo(item.created_at)}</p>
                    <p className={`text-[15px] font-bold mt-1 ${item.price === 0 ? 'text-[var(--color-primary)]' : 'text-[#1A1918]'}`}>
                      {item.price === 0 ? '무료 나눔' : `${item.price.toLocaleString()}원`}
                    </p>
                  </div>
                </div>

                {/* 설명 (있으면) */}
                {item.description && (
                  <div className="px-5 pb-3">
                    <p className="text-[14px] text-[#6B6966] line-clamp-2">{item.description}</p>
                  </div>
                )}

                {/* 사진 여러장 (있으면) */}
                {item.photos && item.photos.length > 1 && (
                  <div className="flex gap-1 px-5 pb-3 overflow-x-auto">
                    {item.photos.map((url: string, i: number) => (
                      <div key={i} className="w-14 h-14 rounded-lg bg-[var(--color-page-bg)] shrink-0 overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex border-t border-[#E8E4DF]">
                  {item.user_id === userId ? (
                    <>
                      {/* 내 글: 상태 변경 + 삭제 */}
                      {item.status === 'active' && (
                        <button
                          onClick={async () => {
                            await supabase.from('market_items').update({ status: 'reserved' }).eq('id', item.id)
                            setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'reserved' } : i))
                          }}
                          className="flex-1 py-2.5 text-[14px] font-semibold text-[#D89575] text-center"
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
                          className="flex-1 py-2.5 text-[14px] font-semibold text-[var(--color-primary)] text-center"
                        >
                          거래완료
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('정말 삭제할까요?')) handleDeleteItem(item.id) }}
                        className="py-2.5 px-4 text-[14px] text-[#9E9A95] border-l border-[#E8E4DF]"
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <>
                      {/* 다른 사람 글: 거래 신청 */}
                      {item.status === 'active' && (
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '채팅 기능은 준비 중이에요' } }))}
                          className="flex-1 py-2.5 text-[14px] font-semibold text-[var(--color-primary)] text-center"
                        >
                          거래 신청하기
                        </button>
                      )}
                      {item.status === 'reserved' && (
                        <p className="flex-1 py-2.5 text-[14px] text-[#6B6966] text-center">예약된 물품이에요</p>
                      )}
                      {item.status === 'done' && (
                        <p className="flex-1 py-2.5 text-[14px] text-[#9E9A95] text-center">거래가 완료되었어요</p>
                      )}
                    </>
                  )}
                  <button onClick={() => shareMarketItem(item)} className="py-2.5 px-3 text-[13px] text-[#6B6966] border-l border-[#E8E4DF]">공유</button>
                </div>
              </div>
            ))
            })()}
          </div>
        )}
      </div>

      {/* 글쓰기 모달 */}
      {writeOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setWriteOpen(false)}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E4DF]">
              <button onClick={() => setWriteOpen(false)} className="text-[13px] text-[#6B6966]">취소</button>
              <p className="text-[14px] font-bold text-[#1A1918]">글쓰기</p>
              <div className="w-8" />
            </div>
            <div className="px-5 py-4">
              <textarea value={writeText} onChange={(e) => setWriteText(e.target.value.slice(0, 2000))} placeholder="육아 이야기를 나눠보세요..." className="w-full h-32 text-[14px] text-[#1A1918] resize-none focus:outline-none" autoFocus />
              <p className="text-right text-[13px] text-[#9E9A95] pt-2">{writeText.length}/2000</p>
            </div>
            <div className="px-5 pb-4">
              <button onClick={handlePost} disabled={!writeText.trim() || posting}
                className={`w-full py-3.5 rounded-xl text-[15px] font-bold transition-colors ${writeText.trim() ? 'bg-[var(--color-primary)] text-white active:bg-[#2D6B45]' : 'bg-[#E8E4DF] text-[#9E9A95]'}`}>
                {posting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 도담장터 등록 모달 */}
      {marketOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setMarketOpen(false)}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E4DF] sticky top-0 bg-white z-10">
              <button onClick={() => setMarketOpen(false)} className="text-[13px] text-[#6B6966]">취소</button>
              <p className="text-[14px] font-bold text-[#1A1918]">도담장터 등록</p>
              <div className="w-8" />
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[14px] font-semibold text-[#6B6966] mb-1">제목</p>
                <input value={mTitle} onChange={(e) => setMTitle(e.target.value.slice(0, 100))} placeholder="예: 내복 세트 6~12개월" className="w-full h-10 px-3 rounded-xl border border-[#E8E4DF] text-[14px] focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#6B6966] mb-1">카테고리</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => setMCategory(key)} className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium ${mCategory === key ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-[#6B6966]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#6B6966] mb-1">가격</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMPrice(0)} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium ${mPrice === 0 ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-[#6B6966]'}`}>무료 나눔</button>
                  <input type="number" value={mPrice || ''} onChange={(e) => setMPrice(Number(e.target.value))} placeholder="가격 입력" className="flex-1 h-9 px-3 rounded-xl border border-[#E8E4DF] text-[13px] focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#6B6966] mb-1">아기 월령</p>
                  <select value={mAge} onChange={(e) => setMAge(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-[#E8E4DF] text-[13px]">
                    <option value="0~6">0~6개월</option>
                    <option value="6~12">6~12개월</option>
                    <option value="12~24">12~24개월</option>
                    <option value="24+">24개월+</option>
                    <option value="전연령">전연령</option>
                  </select>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#6B6966] mb-1">지역</p>
                  <div className="w-full h-9 px-3 rounded-xl border border-[#E8E4DF] text-[13px] flex items-center text-[#1A1918] bg-[#F0EDE8]">{mRegion}</div>
                </div>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#6B6966] mb-1">상품 상태</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => setMCondition(key)} className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium ${mCondition === key ? 'bg-[#8B7355] text-white' : 'bg-[#E8E4DF] text-[#6B6966]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#6B6966] mb-1">사진 (최대 {MAX_PHOTOS}장)</p>
                <div className="flex gap-2">
                  {mPhotos.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-[var(--color-page-bg)]">
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <button
                        onClick={() => setMPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full text-white text-[13px] flex items-center justify-center"
                      ><XIcon className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {mPhotos.length < MAX_PHOTOS && (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-[#AEB1B9] flex flex-col items-center justify-center cursor-pointer active:bg-[var(--color-page-bg)]">
                      {uploading ? <span className="text-lg text-[#9E9A95]">...</span> : <CameraIcon className="w-5 h-5 text-[#9E9A95]" />}
                      <span className="text-[13px] text-[#9E9A95]">{uploading ? '업로드' : '추가'}</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#6B6966] mb-1">설명 (선택)</p>
                <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value.slice(0, 1000))} placeholder="상태, 사용 기간 등을 적어주세요" className="w-full h-20 px-3 py-2 rounded-xl border border-[#E8E4DF] text-[13px] resize-none focus:outline-none" />
              </div>
              <button onClick={handleMarketPost} disabled={!mTitle.trim() || posting}
                className={`w-full py-3.5 rounded-xl text-[15px] font-bold transition-colors ${mTitle.trim() ? 'bg-[var(--color-primary)] text-white active:bg-[#2D6B45]' : 'bg-[#E8E4DF] text-[#9E9A95]'}`}>
                {posting ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
