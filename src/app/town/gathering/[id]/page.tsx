'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MapIcon, BabyIcon, UsersIcon, ChatIcon, PenIcon, ArrowLeftIcon, TrashIcon, HeartIcon, ShareIcon, CalendarIcon } from '@/components/ui/Icons'
import { sanitizeUserInput } from '@/lib/sanitize'
import UserAvatar from '@/components/ui/UserAvatar'

interface Gathering {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: string | null
  place_name: string | null
  max_participants: number | null
  min_child_age_months: number | null
  max_child_age_months: number | null
  meeting_frequency: string | null
  created_at: string
}

interface Member {
  id: string
  user_id: string
  child_age_months: number | null
  joined_at: string
}

interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  liked?: boolean
  likeCount?: number
  commentCount?: number
}

interface GatheringComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  playgroup: '놀이모임',
  study: '공부/교육',
  hobby: '취미',
  support: '육아정보',
  outdoor: '야외활동',
  etc: '기타',
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: '주 1회',
  biweekly: '2주 1회',
  monthly: '월 1회',
  irregular: '비정기',
}

const POST_PAGE_SIZE = 20

export default function GatheringDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [gathering, setGathering] = useState<Gathering | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isCreator, setIsCreator] = useState(false)
  const [isMember, setIsMember] = useState(false)

  const [tab, setTab] = useState<'board' | 'members' | 'info'>('info')
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const [kickMemberId, setKickMemberId] = useState<string | null>(null)

  // 인피니티 스크롤
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)

  // 댓글
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [postComments, setPostComments] = useState<Record<string, GatheringComment[]>>({})
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [resolvedParams.id])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/onboarding')
        return
      }
      setUserId(user.id)

      // 소모임 정보
      const { data: gatheringData } = await supabase
        .from('town_gatherings')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()

      if (!gatheringData) {
        alert('존재하지 않는 소모임입니다')
        router.back()
        return
      }

      setGathering(gatheringData)
      setIsCreator(gatheringData.creator_id === user.id)

      // 멤버 목록
      const { data: membersData } = await supabase
        .from('gathering_participants')
        .select('*')
        .eq('gathering_id', resolvedParams.id)
        .order('joined_at', { ascending: true })

      if (membersData) {
        setMembers(membersData)
        setIsMember(membersData.some((m: Member) => m.user_id === user.id))
      }

      // 게시판 글 목록
      const { data: postsData } = await supabase
        .from('gathering_posts')
        .select('*')
        .eq('gathering_id', resolvedParams.id)
        .order('created_at', { ascending: false })
        .limit(POST_PAGE_SIZE)

      if (postsData) {
        // 실제 좋아요 데이터 조회
        const postIds = postsData.map((p: Post) => p.id)
        const [likesRes, userLikesRes, commentCountsRes] = await Promise.all([
          supabase
            .from('gathering_post_likes')
            .select('post_id')
            .in('post_id', postIds),
          supabase
            .from('gathering_post_likes')
            .select('post_id')
            .in('post_id', postIds)
            .eq('user_id', user.id),
          supabase
            .from('gathering_post_comments')
            .select('post_id')
            .in('post_id', postIds),
        ])

        const likeCounts = new Map<string, number>()
        likesRes.data?.forEach((like: { post_id: string }) => {
          likeCounts.set(like.post_id, (likeCounts.get(like.post_id) || 0) + 1)
        })

        const commentCounts = new Map<string, number>()
        commentCountsRes.data?.forEach((c: { post_id: string }) => {
          commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1)
        })

        const userLikedIds = new Set(userLikesRes.data?.map((l: { post_id: string }) => l.post_id))

        const enriched = postsData.map((p: Post) => ({
          ...p,
          liked: userLikedIds.has(p.id),
          likeCount: likeCounts.get(p.id) || 0,
          commentCount: commentCounts.get(p.id) || 0,
        }))
        setPosts(enriched)
        setHasMorePosts(postsData.length >= POST_PAGE_SIZE)
      }

    } catch (err) {
      console.error('Failed to load gathering:', err)
    } finally {
      setLoading(false)
    }
  }

  // 인피니티 스크롤 — 더 불러오기
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMorePosts || posts.length === 0 || !userId) return
    setLoadingMore(true)
    try {
      const supabase = createClient()
      const last = posts[posts.length - 1]
      const { data: postsData } = await supabase
        .from('gathering_posts')
        .select('*')
        .eq('gathering_id', resolvedParams.id)
        .lt('created_at', last.created_at)
        .order('created_at', { ascending: false })
        .limit(POST_PAGE_SIZE)

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map((p: Post) => p.id)
        const [likesRes, userLikesRes, commentCountsRes] = await Promise.all([
          supabase.from('gathering_post_likes').select('post_id').in('post_id', postIds),
          supabase.from('gathering_post_likes').select('post_id').in('post_id', postIds).eq('user_id', userId),
          supabase.from('gathering_post_comments').select('post_id').in('post_id', postIds),
        ])
        const likeCounts = new Map<string, number>()
        likesRes.data?.forEach((l: { post_id: string }) => { likeCounts.set(l.post_id, (likeCounts.get(l.post_id) || 0) + 1) })
        const commentCounts = new Map<string, number>()
        commentCountsRes.data?.forEach((c: { post_id: string }) => { commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1) })
        const userLikedIds = new Set(userLikesRes.data?.map((l: { post_id: string }) => l.post_id))
        const enriched = postsData.map((p: Post) => ({ ...p, liked: userLikedIds.has(p.id), likeCount: likeCounts.get(p.id) || 0, commentCount: commentCounts.get(p.id) || 0 }))
        setPosts(prev => [...prev, ...enriched])
        setHasMorePosts(postsData.length >= POST_PAGE_SIZE)
      } else {
        setHasMorePosts(false)
      }
    } catch (err) {
      console.error('Failed to load more posts:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMorePosts, posts, userId, resolvedParams.id])

  // IntersectionObserver
  useEffect(() => {
    const el = observerRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMorePosts()
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loadMorePosts])

  // 댓글 로드
  const loadComments = useCallback(async (postId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('gathering_post_comments')
      .select('id, post_id, user_id, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setPostComments(prev => ({ ...prev, [postId]: data as GatheringComment[] }))
  }, [])

  const toggleComments = useCallback(async (postId: string) => {
    if (openComments === postId) {
      setOpenComments(null)
    } else {
      setOpenComments(postId)
      if (!postComments[postId]) await loadComments(postId)
    }
    setCommentText('')
  }, [openComments, postComments, loadComments])

  const submitComment = useCallback(async (postId: string) => {
    if (!commentText.trim() || !userId || commentLoading) return
    setCommentLoading(true)
    const supabase = createClient()
    const sanitized = sanitizeUserInput(commentText, 500)
    if (!sanitized) { setCommentLoading(false); return }
    const { data } = await supabase
      .from('gathering_post_comments')
      .insert({ post_id: postId, user_id: userId, content: sanitized })
      .select().single()
    if (data) {
      setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data as GatheringComment] }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))
    }
    setCommentText('')
    setCommentLoading(false)
  }, [commentText, userId, commentLoading])

  const deleteComment = useCallback(async (commentId: string, postId: string) => {
    const supabase = createClient()
    await supabase.from('gathering_post_comments').delete().eq('id', commentId)
    setPostComments(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }))
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) } : p))
  }, [])

  const handleJoin = async () => {
    if (!userId || isMember) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('gathering_participants').insert({
        gathering_id: resolvedParams.id,
        user_id: userId,
      })

      if (error) {
        alert('참여에 실패했습니다')
        return
      }

      alert('소모임에 참여했습니다!')
      loadData()
    } catch (err) {
      console.error('Failed to join:', err)
    }
  }

  const handleLeave = async () => {
    if (!userId || !isMember || isCreator) return

    try {
      const supabase = createClient()
      await supabase
        .from('gathering_participants')
        .delete()
        .eq('gathering_id', resolvedParams.id)
        .eq('user_id', userId)

      alert('소모임에서 나갔습니다')
      router.push('/town?tab=gather')
    } catch (err) {
      console.error('Failed to leave:', err)
    }
  }

  const handlePost = async () => {
    if (!newPost.trim() || !userId || posting || !isMember) return

    setPosting(true)
    try {
      const supabase = createClient()
      const sanitizedContent = sanitizeUserInput(newPost, 2000, { preserveNewlines: true })
      if (!sanitizedContent) { setPosting(false); return }
      const { data, error } = await supabase
        .from('gathering_posts')
        .insert({
          gathering_id: resolvedParams.id,
          user_id: userId,
          content: sanitizedContent,
        })
        .select()
        .single()

      if (error) {
        alert('글 작성에 실패했습니다')
        setPosting(false)
        return
      }

      if (data) setPosts([{ ...(data as Post), likeCount: 0, liked: false, commentCount: 0 }, ...posts])
      setNewPost('')
    } catch (err) {
      console.error('Failed to post:', err)
      alert('글 작성에 실패했습니다')
    } finally {
      setPosting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const supabase = createClient()
      await supabase.from('gathering_posts').delete().eq('id', postId)
      setPosts(posts.filter(p => p.id !== postId))
      setDeletePostId(null)
    } catch (err) {
      console.error('Failed to delete post:', err)
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!userId) return

    const post = posts.find(p => p.id === postId)
    if (!post) return

    const newLiked = !post.liked

    // 낙관적 업데이트 (Optimistic Update)
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          liked: newLiked,
          likeCount: (p.likeCount || 0) + (newLiked ? 1 : -1)
        }
      }
      return p
    }))

    try {
      const supabase = createClient()

      if (newLiked) {
        await supabase.from('gathering_post_likes').insert({
          post_id: postId,
          user_id: userId
        })
      } else {
        await supabase.from('gathering_post_likes').delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
      // 실패 시 롤백
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            liked: post.liked,
            likeCount: post.likeCount || 0
          }
        }
        return p
      }))
    }
  }

  const handleReportPost = async (postId: string) => {
    if (!userId) return

    const reason = prompt('신고 사유를 입력해주세요 (선택사항)')
    if (reason === null) return // 취소 버튼 클릭

    try {
      const supabase = createClient()
      await supabase.from('gathering_post_reports').insert({
        post_id: postId,
        reporter_id: userId,
        reason: reason || '사유 미입력',
        status: 'pending'
      })

      alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.')
    } catch (err) {
      console.error('Failed to report post:', err)
      alert('신고 처리 중 오류가 발생했습니다.')
    }
  }

  const handleKickMember = async (memberId: string) => {
    if (!isCreator) return

    try {
      const supabase = createClient()
      await supabase
        .from('gathering_participants')
        .delete()
        .eq('id', memberId)

      loadData()
      setKickMemberId(null)
    } catch (err) {
      console.error('Failed to kick member:', err)
    }
  }

  const getTimeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 1) return '방금 전'
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    return `${Math.floor(hours / 24)}일 전`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  if (!gathering) return null

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)] pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E8E4DF] px-5 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeftIcon className="w-5 h-5 text-primary" />
          </button>
          <h2 className="text-subtitle text-primary">소모임</h2>
          <div className="flex items-center gap-2">
            {isCreator && (
              <button
                onClick={() => router.push(`/town/gathering/${resolvedParams.id}/edit`)}
                className="p-1"
                aria-label="소모임 수정"
              >
                <PenIcon className="w-5 h-5 text-[var(--color-primary)]" />
              </button>
            )}
            <button
              onClick={() => setBookmarked(!bookmarked)}
              className="p-1"
            >
              <HeartIcon className={`w-5 h-5 ${bookmarked ? 'fill-red-500 text-red-500' : 'text-tertiary'}`} />
            </button>
            <button
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({
                    title: gathering?.title,
                    url: window.location.href
                  })
                }
              }}
              className="p-1"
            >
              <ShareIcon className="w-5 h-5 text-tertiary" />
            </button>
          </div>
        </div>
      </div>

      {/* 소모임 정보 */}
      <div className="bg-white px-5 py-4 border-b border-[#E8E4DF]">
        {/* 헤더: 배지 + 제목 */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            {gathering.category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-label font-bold">
                {CATEGORY_LABELS[gathering.category]}
              </span>
            )}
            {gathering.meeting_frequency && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F0EDE8] text-secondary text-label font-semibold">
                {FREQUENCY_LABELS[gathering.meeting_frequency]}
              </span>
            )}
            {isCreator && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-label font-bold">
                소모임장
              </span>
            )}
          </div>
          <h1 className="text-[17px] font-bold text-primary leading-snug">{gathering.title}</h1>
        </div>

        {/* 설명 (있을 경우) */}
        {gathering.description && (
          <p className="text-body text-secondary leading-relaxed mb-3">{gathering.description}</p>
        )}

        {/* 상세 정보 */}
        <div className="space-y-1.5 mb-3">
          {gathering.place_name && (
            <div className="flex items-center gap-1.5 text-caption text-secondary">
              <MapIcon className="w-3.5 h-3.5 text-tertiary" />
              <span>{gathering.place_name}</span>
            </div>
          )}
          {(gathering.min_child_age_months !== null || gathering.max_child_age_months !== null) && (
            <div className="flex items-center gap-1.5 text-caption text-secondary">
              <BabyIcon className="w-3.5 h-3.5 text-tertiary" />
              <span>
                {gathering.min_child_age_months || 0}~{gathering.max_child_age_months || 60}개월
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-caption text-secondary">
            <UsersIcon className="w-3.5 h-3.5 text-tertiary" />
            <span>
              {members.length}명 참여
              {gathering.max_participants && ` / 최대 ${gathering.max_participants}명`}
            </span>
          </div>
        </div>

        {/* 참여/나가기 버튼 */}
        {!isMember && !isCreator && (
          <button
            onClick={handleJoin}
            className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white font-bold active:opacity-80 transition-opacity"
          >
            소모임 참여하기
          </button>
        )}
        {isMember && !isCreator && (
          <>
            {!showLeaveConfirm ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full py-2.5 rounded-lg bg-[#E8E4DF] text-secondary text-body-emphasis active:opacity-80 transition-opacity"
              >
                소모임 나가기
              </button>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-body text-orange-700 font-semibold mb-2 text-center">
                  정말 소모임을 나가시겠어요?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 py-2 rounded-lg bg-white border border-[#E8E4DF] text-primary text-body-emphasis active:bg-[#F0EDE8]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleLeave}
                    className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-body-emphasis active:bg-orange-600"
                  >
                    나가기
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-[#E8E4DF] px-5">
        <div className="flex gap-4">
          <button
            onClick={() => setTab('info')}
            className={`py-3 text-body font-semibold border-b-2 transition-colors ${
              tab === 'info'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-tertiary'
            }`}
          >
            정보
          </button>
          {(isMember || isCreator) && (
            <>
              <button
                onClick={() => setTab('board')}
                className={`py-3 text-body font-semibold border-b-2 transition-colors ${
                  tab === 'board'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-tertiary'
                }`}
              >
                게시판
              </button>
              <button
                onClick={() => setTab('members')}
                className={`py-3 text-body font-semibold border-b-2 transition-colors ${
                  tab === 'members'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-tertiary'
                }`}
              >
                멤버 ({members.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* 정보 탭 */}
      {tab === 'info' && (
            <div className="px-5 py-4 space-y-3">
              {/* 소모임 규칙 */}
              {isCreator && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-body font-bold text-amber-800">소모임장 알림</span>
                  </div>
                  <p className="text-caption text-amber-700 leading-relaxed">
                    멤버들이 편안하게 활동할 수 있도록 소모임 규칙을 공지사항으로 작성해보세요.
                  </p>
                </div>
              )}

              {/* 다음 모임 일정 */}
              <div className="bg-white rounded-lg border border-[#E8E4DF] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="w-4 h-4 text-[var(--color-primary)]" />
                  <h3 className="text-body-emphasis font-bold text-primary">다음 모임</h3>
                </div>
                <div className="text-center py-6">
                  <p className="text-body text-tertiary">
                    {isCreator ? '게시판에서 다음 모임 일정을 공유해보세요' : '아직 예정된 모임이 없어요'}
                  </p>
                </div>
              </div>

              {/* 활동 통계 */}
              <div className="bg-white rounded-lg border border-[#E8E4DF] p-4">
                <h3 className="text-body-emphasis font-bold text-primary mb-3">소모임 활동</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-heading-2 text-[var(--color-primary)]">{members.length}</p>
                    <p className="text-label text-tertiary mt-0.5">멤버</p>
                  </div>
                  <div className="text-center">
                    <p className="text-heading-2 text-[var(--color-primary)]">{posts.length}</p>
                    <p className="text-label text-tertiary mt-0.5">게시글</p>
                  </div>
                  <div className="text-center">
                    <p className="text-heading-2 text-[var(--color-primary)]">
                      {Math.floor((Date.now() - new Date(gathering?.created_at || 0).getTime()) / 86400000)}
                    </p>
                    <p className="text-label text-tertiary mt-0.5">일째</p>
                  </div>
                </div>
              </div>

              {/* 소모임 소개 */}
              {gathering?.description && (
                <div className="bg-white rounded-lg border border-[#E8E4DF] p-4">
                  <h3 className="text-body-emphasis font-bold text-primary mb-2">소모임 소개</h3>
                  <p className="text-body text-secondary leading-relaxed whitespace-pre-wrap">
                    {gathering.description}
                  </p>
                </div>
              )}

              {/* 모임 장소 */}
              {gathering?.place_name && (
                <div className="bg-white rounded-lg border border-[#E8E4DF] p-4">
                  <h3 className="text-body-emphasis font-bold text-primary mb-2">주요 모임 장소</h3>
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-tertiary" />
                    <span className="text-body text-secondary">{gathering.place_name}</span>
                  </div>
                </div>
              )}
            </div>
          )}

      {/* 게시판 탭 */}
      {tab === 'board' && (isMember || isCreator) && (
            <div className="px-5 py-4 space-y-3">
              {/* 글쓰기 */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="소모임 멤버들과 이야기를 나눠보세요"
                  maxLength={2000}
                  className="w-full h-24 text-body-emphasis text-primary placeholder:text-tertiary resize-none outline-none"
                />
                <div className="flex justify-end mt-3 pt-3 border-t border-[#F0EDE8]">
                  <button
                    onClick={handlePost}
                    disabled={!newPost.trim() || posting}
                    className="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 transition-opacity shadow-sm"
                  >
                    {posting ? '올리는 중...' : '올리기'}
                  </button>
                </div>
              </div>

              {/* 게시글 목록 */}
              {posts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                    <ChatIcon className="w-8 h-8 text-tertiary" />
                  </div>
                  <p className="text-subtitle text-primary">아직 게시글이 없어요</p>
                  <p className="text-body text-tertiary mt-1.5">첫 글을 작성해보세요!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar userId={post.user_id} size={36} />
                        <div>
                          <p className="text-body font-semibold text-primary">멤버</p>
                          <p className="text-label text-tertiary">{getTimeAgo(post.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {(post.user_id === userId || isCreator) && (
                          <button onClick={() => setDeletePostId(post.id)} className="p-1 text-tertiary hover:text-red-500 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                        {post.user_id !== userId && (
                          <button onClick={() => handleReportPost(post.id)} className="px-2 py-0.5 text-label text-tertiary hover:text-red-500">
                            신고
                          </button>
                        )}
                      </div>
                    </div>

                    {deletePostId === post.id ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <p className="text-body text-red-700 font-semibold mb-2 text-center">
                          정말 삭제할까요?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeletePostId(null)}
                            className="flex-1 py-2 rounded-lg bg-white border border-[#E8E4DF] text-primary text-body active:bg-[#F0EDE8]"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="flex-1 py-2 rounded-lg bg-red-500 text-white text-body active:bg-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <p className="text-body-emphasis text-primary leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>

                    {/* 반응 버튼 */}
                    <div className="flex items-center gap-3 pt-2 border-t border-[#F0EDE8]">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[#F0EDE8] transition-colors"
                      >
                        <HeartIcon className={`w-4 h-4 ${post.liked ? 'fill-red-500 text-red-500' : 'text-tertiary'}`} />
                        {(post.likeCount || 0) > 0 && (
                          <span className={`text-caption font-semibold ${post.liked ? 'text-red-500' : 'text-tertiary'}`}>
                            {post.likeCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => toggleComments(post.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[#F0EDE8] transition-colors ${openComments === post.id ? 'text-[var(--color-primary)] font-semibold' : 'text-tertiary'}`}
                      >
                        <ChatIcon className="w-4 h-4" />
                        <span className="text-caption font-semibold">댓글 {(post.commentCount || 0) > 0 ? post.commentCount : ''}</span>
                      </button>
                    </div>

                    {/* 댓글 섹션 */}
                    {openComments === post.id && (
                      <div className="mt-3 pt-3 border-t border-[#F0EDE8]">
                        {(postComments[post.id] || []).length > 0 ? (
                          <div className="space-y-2 mb-3">
                            {(postComments[post.id] || []).map((c) => (
                              <div key={c.id} className="flex gap-2">
                                <UserAvatar userId={c.user_id} size={24} className="mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-body-emphasis text-primary leading-relaxed">{c.content}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-body text-tertiary">{getTimeAgo(c.created_at)}</span>
                                    {c.user_id === userId && (
                                      <button onClick={() => { if (confirm('댓글을 삭제할까요?')) deleteComment(c.id, post.id) }} className="text-tertiary"><TrashIcon className="w-3 h-3" /></button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-body text-tertiary text-center mb-3">아직 댓글이 없어요</p>
                        )}

                        {/* 댓글 입력 */}
                        <div className="flex gap-2">
                          <input
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
                            placeholder="댓글을 입력하세요..."
                            maxLength={500}
                            className="flex-1 h-9 px-3 rounded-xl bg-[var(--color-page-bg)] text-body-emphasis focus:outline-none"
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(post.id) } }}
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            disabled={!commentText.trim() || commentLoading}
                            className={`px-3 h-9 rounded-xl text-body-emphasis shrink-0 ${
                              commentText.trim() ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E8E4DF] text-tertiary'
                            }`}
                          >
                            {commentLoading ? '...' : '등록'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* 인피니티 스크롤 센티널 */}
              {hasMorePosts && (
                <div ref={observerRef} className="flex justify-center py-4">
                  {loadingMore && <div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />}
                </div>
              )}
            </div>
          )}

      {/* 멤버 탭 */}
      {tab === 'members' && (isMember || isCreator) && (
            <div className="px-5 py-4 space-y-2.5">
              {members.map((member) => (
                <div key={member.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar userId={member.user_id} size={44} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-body-emphasis text-primary">멤버</p>
                        {member.user_id === gathering.creator_id && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-label font-bold">
                            소모임장
                          </span>
                        )}
                      </div>
                      <p className="text-caption text-tertiary">{getTimeAgo(member.joined_at)} 가입</p>
                    </div>
                  </div>
                  {isCreator && member.user_id !== userId && (
                    <>
                      {kickMemberId !== member.id ? (
                        <button
                          onClick={() => setKickMemberId(member.id)}
                          className="px-3 py-1.5 rounded-lg text-caption font-semibold text-red-600 border border-red-200 active:bg-red-50 transition-colors"
                        >
                          내보내기
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setKickMemberId(null)}
                            className="px-2 py-1 rounded text-label text-tertiary border border-[#E8E4DF] active:bg-[#F0EDE8]"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleKickMember(member.id)}
                            className="px-2 py-1 rounded text-label font-semibold text-white bg-red-500 active:bg-red-600"
                          >
                            확인
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
    </div>
  )
}
