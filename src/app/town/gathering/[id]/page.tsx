'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MapIcon, BabyIcon, UsersIcon, ChatIcon, PenIcon, TrashIcon, HeartIcon, ShareIcon, CalendarIcon } from '@/components/ui/Icons'
import PageHeader from '@/components/layout/PageHeader'

const REACTION_EMOJIS = ['❤️', '😂', '👍', '😢', '🥰', '👶']
import { sanitizeUserInput } from '@/lib/sanitize'

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
  reactions?: Record<string, number>
  myReactions?: Set<string>
  commentCount?: number
}

interface GatheringComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  reactions?: Record<string, number>
  myReactions?: Set<string>
}

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  playgroup: { label: '놀이모임', emoji: '🎈', color: 'text-rose-600', bg: 'bg-rose-50' },
  study:     { label: '공부/교육', emoji: '📚', color: 'text-blue-600', bg: 'bg-blue-50' },
  hobby:     { label: '취미', emoji: '🎨', color: 'text-purple-600', bg: 'bg-purple-50' },
  support:   { label: '육아정보', emoji: '💬', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  outdoor:   { label: '야외활동', emoji: '🏃', color: 'text-amber-600', bg: 'bg-amber-50' },
  etc:       { label: '기타', emoji: '🤝', color: 'text-slate-600', bg: 'bg-slate-50' },
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

  const [tab, setTab] = useState<'board' | 'info'>('info')
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const [kickMemberId, setKickMemberId] = useState<string | null>(null)
  const [nicknames, setNicknames] = useState<Record<string, string>>({})

  const [reportPostId, setReportPostId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)

  const [openComments, setOpenComments] = useState<string | null>(null)
  const [postComments, setPostComments] = useState<Record<string, GatheringComment[]>>({})
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)


  useEffect(() => { loadData() }, [resolvedParams.id])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }
      setUserId(user.id)

      // H-3: 병렬 실행 — gathering, members, posts 동시 조회
      const [gatheringRes, membersRes, postsRes] = await Promise.all([
        supabase.from('town_gatherings').select('*').eq('id', resolvedParams.id).single(),
        supabase.from('gathering_participants').select('*').eq('gathering_id', resolvedParams.id).order('joined_at', { ascending: true }),
        supabase.from('gathering_posts').select('*').eq('gathering_id', resolvedParams.id).order('created_at', { ascending: false }).limit(POST_PAGE_SIZE),
      ])

      const gatheringData = gatheringRes.data
      if (!gatheringData) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '존재하지 않는 소모임이에요' } }))
        router.back()
        return
      }
      setGathering(gatheringData)
      setIsCreator(gatheringData.creator_id === user.id)

      const membersData = membersRes.data
      if (membersData) {
        // user_id 기준 중복 제거 (먼저 참여한 레코드 유지)
        const seen = new Set<string>()
        const uniqueMembers = membersData.filter((m: Member) => {
          if (seen.has(m.user_id)) return false
          seen.add(m.user_id)
          return true
        })
        setMembers(uniqueMembers)
        const memberCheck = uniqueMembers.some((m: Member) => m.user_id === user.id)
        setIsMember(memberCheck)
        if (memberCheck || gatheringData.creator_id === user.id) setTab('board')
        // 멤버 닉네임 조회 (RLS 우회 — API route 사용)
        const memberIds = uniqueMembers.map((m: Member) => m.user_id)
        if (memberIds.length > 0) {
          try {
            const res = await fetch('/api/nicknames', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userIds: memberIds }),
            })
            if (res.ok) {
              const map = await res.json()
              setNicknames(map)
            }
          } catch (err) {
            console.error('Failed to load nicknames:', err)
          }
        }
      }

      const postsData = postsRes.data

      if (postsData) {
        const postIds = postsData.map((p: Post) => p.id)
        const [likesRes, userLikesRes, commentCountsRes] = await Promise.all([
          supabase.from('gathering_post_likes').select('post_id, emoji').in('post_id', postIds),
          supabase.from('gathering_post_likes').select('post_id, emoji').in('post_id', postIds).eq('user_id', user.id),
          supabase.from('gathering_post_comments').select('post_id').in('post_id', postIds),
        ])
        const reactionMap = new Map<string, Record<string, number>>()
        likesRes.data?.forEach((l: { post_id: string; emoji: string }) => {
          const e = l.emoji || '❤️'
          if (!reactionMap.has(l.post_id)) reactionMap.set(l.post_id, {})
          const c = reactionMap.get(l.post_id)!
          c[e] = (c[e] || 0) + 1
        })
        const myReactionMap = new Map<string, Set<string>>()
        userLikesRes.data?.forEach((l: { post_id: string; emoji: string }) => {
          if (!myReactionMap.has(l.post_id)) myReactionMap.set(l.post_id, new Set())
          myReactionMap.get(l.post_id)!.add(l.emoji || '❤️')
        })
        const commentCounts = new Map<string, number>()
        commentCountsRes.data?.forEach((c: { post_id: string }) => { commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1) })
        const enriched = postsData.map((p: Post) => ({
          ...p,
          reactions: reactionMap.get(p.id) || {},
          myReactions: myReactionMap.get(p.id) || new Set<string>(),
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

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMorePosts || posts.length === 0 || !userId) return
    setLoadingMore(true)
    try {
      const supabase = createClient()
      const last = posts[posts.length - 1]
      const { data: postsData } = await supabase
        .from('gathering_posts').select('*').eq('gathering_id', resolvedParams.id)
        .lt('created_at', last.created_at).order('created_at', { ascending: false }).limit(POST_PAGE_SIZE)

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map((p: Post) => p.id)
        const [likesRes, userLikesRes, commentCountsRes] = await Promise.all([
          supabase.from('gathering_post_likes').select('post_id, emoji').in('post_id', postIds),
          supabase.from('gathering_post_likes').select('post_id, emoji').in('post_id', postIds).eq('user_id', userId),
          supabase.from('gathering_post_comments').select('post_id').in('post_id', postIds),
        ])
        const reactionMap = new Map<string, Record<string, number>>()
        likesRes.data?.forEach((l: { post_id: string; emoji: string }) => {
          const e = l.emoji || '❤️'
          if (!reactionMap.has(l.post_id)) reactionMap.set(l.post_id, {})
          const c = reactionMap.get(l.post_id)!
          c[e] = (c[e] || 0) + 1
        })
        const myReactionMap = new Map<string, Set<string>>()
        userLikesRes.data?.forEach((l: { post_id: string; emoji: string }) => {
          if (!myReactionMap.has(l.post_id)) myReactionMap.set(l.post_id, new Set())
          myReactionMap.get(l.post_id)!.add(l.emoji || '❤️')
        })
        const commentCounts = new Map<string, number>()
        commentCountsRes.data?.forEach((c: { post_id: string }) => { commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1) })
        const enriched = postsData.map((p: Post) => ({
          ...p,
          reactions: reactionMap.get(p.id) || {},
          myReactions: myReactionMap.get(p.id) || new Set<string>(),
          commentCount: commentCounts.get(p.id) || 0,
        }))
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

  useEffect(() => {
    const el = observerRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMorePosts() }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loadMorePosts])

  const loadComments = useCallback(async (postId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('gathering_post_comments').select('id, post_id, user_id, content, created_at')
      .eq('post_id', postId).order('created_at', { ascending: true })
    if (data) {
      let enriched: GatheringComment[] = (data as GatheringComment[]).map(c => ({ ...c, reactions: {}, myReactions: new Set<string>() }))
      try {
        const commentIds = data.map((c: GatheringComment) => c.id)
        const [clRes, myClRes] = await Promise.all([
          supabase.from('gathering_post_comment_likes').select('comment_id, emoji').in('comment_id', commentIds),
          userId
            ? supabase.from('gathering_post_comment_likes').select('comment_id, emoji').in('comment_id', commentIds).eq('user_id', userId)
            : Promise.resolve({ data: [] }),
        ])
        if (clRes.data) {
          const crMap = new Map<string, Record<string, number>>()
          clRes.data.forEach((l: { comment_id: string; emoji: string }) => {
            const e = l.emoji || '❤️'
            if (!crMap.has(l.comment_id)) crMap.set(l.comment_id, {})
            const cc = crMap.get(l.comment_id)!
            cc[e] = (cc[e] || 0) + 1
          })
          const mycrMap = new Map<string, Set<string>>()
          ;(myClRes as { data: { comment_id: string; emoji: string }[] | null }).data?.forEach(l => {
            if (!mycrMap.has(l.comment_id)) mycrMap.set(l.comment_id, new Set())
            mycrMap.get(l.comment_id)!.add(l.emoji || '❤️')
          })
          enriched = enriched.map(c => ({ ...c, reactions: crMap.get(c.id) || {}, myReactions: mycrMap.get(c.id) || new Set<string>() }))
        }
      } catch { /* table may not exist yet */ }
      setPostComments(prev => ({ ...prev, [postId]: enriched }))
    }
  }, [userId])

  const toggleComments = useCallback(async (postId: string) => {
    if (openComments === postId) { setOpenComments(null) }
    else { setOpenComments(postId); if (!postComments[postId]) await loadComments(postId) }
    setCommentText('')
  }, [openComments, postComments, loadComments])

  const submitComment = useCallback(async (postId: string) => {
    if (!commentText.trim() || !userId || commentLoading) return
    setCommentLoading(true)
    try {
      const supabase = createClient()
      const sanitized = sanitizeUserInput(commentText, 500)
      if (!sanitized) return
      const { data, error } = await supabase
        .from('gathering_post_comments').insert({ post_id: postId, user_id: userId, content: sanitized }).select().single()
      if (error) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '댓글 작성에 실패했어요' } }))
        return
      }
      if (data) {
        const newComment: GatheringComment = { ...(data as GatheringComment), reactions: {}, myReactions: new Set<string>() }
        setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }))
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))
      }
      setCommentText('')
    } catch (err) {
      console.error('Failed to submit comment:', err)
    } finally {
      setCommentLoading(false)
    }
  }, [commentText, userId, commentLoading])

  const deleteComment = useCallback(async (commentId: string, postId: string) => {
    if (!userId) return
    const supabase = createClient()
    const { error } = await supabase.from('gathering_post_comments').delete().eq('id', commentId).eq('user_id', userId)
    if (error) {
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '댓글 삭제에 실패했어요' } }))
      return
    }
    setPostComments(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }))
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) } : p))
  }, [userId])

  const handleJoin = async () => {
    if (!userId || isMember) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('gathering_participants').insert({ gathering_id: resolvedParams.id, user_id: userId })
      if (error) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '참여에 실패했어요' } }))
        return
      }
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '소모임에 참여했어요!' } }))
      loadData()
    } catch (err) {
      console.error('Failed to join:', err)
    }
  }

  const handleLeave = async () => {
    if (!userId || !isMember || isCreator) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('gathering_participants').delete().eq('gathering_id', resolvedParams.id).eq('user_id', userId)
      if (error) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '나가기에 실패했어요' } }))
        return
      }
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '소모임에서 나갔어요' } }))
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
        .from('gathering_posts').insert({ gathering_id: resolvedParams.id, user_id: userId, content: sanitizedContent }).select().single()
      if (error) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '글 작성에 실패했어요' } }))
        setPosting(false)
        return
      }
      if (data) {
        setPosts(prev => [{ ...(data as Post), reactions: {}, myReactions: new Set<string>(), commentCount: 0 }, ...prev])
      }
      setNewPost('')
    } catch (err) {
      console.error('Failed to post:', err)
    } finally {
      setPosting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const supabase = createClient()
      let query = supabase.from('gathering_posts').delete().eq('id', postId)
      if (!isCreator) query = query.eq('user_id', userId!)
      const { error } = await query
      if (error) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '삭제에 실패했어요' } }))
        return
      }
      setPosts(prev => prev.filter(p => p.id !== postId))
      setDeletePostId(null)
    } catch (err) {
      console.error('Failed to delete post:', err)
    }
  }

  const handleReaction = async (postId: string, emoji: string) => {
    if (!userId) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const myReactions = post.myReactions || new Set<string>()
    const reactions = { ...(post.reactions || {}) }
    const already = myReactions.has(emoji)
    const newMyReactions = new Set(myReactions)
    if (already) {
      newMyReactions.delete(emoji)
      reactions[emoji] = Math.max(0, (reactions[emoji] || 0) - 1)
      if (reactions[emoji] === 0) delete reactions[emoji]
    } else {
      newMyReactions.add(emoji)
      reactions[emoji] = (reactions[emoji] || 0) + 1
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions, myReactions: newMyReactions } : p))
    try {
      const supabase = createClient()
      if (already) { await supabase.from('gathering_post_likes').delete().eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji) }
      else { await supabase.from('gathering_post_likes').insert({ post_id: postId, user_id: userId, emoji }) }
    } catch {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: post.reactions, myReactions: post.myReactions } : p))
    }
  }

  const handleCommentReaction = async (commentId: string, postId: string, emoji: string) => {
    if (!userId) return
    const comments = postComments[postId] || []
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return
    const myReactions = comment.myReactions || new Set<string>()
    const reactions = { ...(comment.reactions || {}) }
    const already = myReactions.has(emoji)
    const newMyReactions = new Set(myReactions)
    if (already) {
      newMyReactions.delete(emoji)
      reactions[emoji] = Math.max(0, (reactions[emoji] || 0) - 1)
      if (reactions[emoji] === 0) delete reactions[emoji]
    } else {
      newMyReactions.add(emoji)
      reactions[emoji] = (reactions[emoji] || 0) + 1
    }
    setPostComments(prev => ({ ...prev, [postId]: (prev[postId] || []).map(c => c.id === commentId ? { ...c, reactions, myReactions: newMyReactions } : c) }))
    try {
      const supabase = createClient()
      if (already) { await supabase.from('gathering_post_comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId).eq('emoji', emoji) }
      else { await supabase.from('gathering_post_comment_likes').insert({ comment_id: commentId, user_id: userId, emoji }) }
    } catch {
      setPostComments(prev => ({ ...prev, [postId]: (prev[postId] || []).map(c => c.id === commentId ? { ...c, reactions: comment.reactions, myReactions: comment.myReactions } : c) }))
    }
  }

  const REPORT_REASONS = ['스팸/광고', '욕설/비하', '부적절한 콘텐츠', '허위 정보', '개인정보 노출']

  const handleReportPost = (postId: string) => {
    if (!userId) return
    setReportPostId(postId)
    setReportReason('')
    setReportDone(false)
  }

  const submitReport = async () => {
    if (!userId || !reportPostId) return
    setReportSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('gathering_post_reports').insert({ post_id: reportPostId, reporter_id: userId, reason: reportReason || '사유 미입력', status: 'pending' })
      if (error) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '신고 접수에 실패했어요' } }))
        return
      }
      setReportDone(true)
      setTimeout(() => { setReportPostId(null); setReportDone(false) }, 1500)
    } catch (err) {
      console.error('Failed to report post:', err)
    } finally {
      setReportSubmitting(false)
    }
  }

  const handleKickMember = async (memberId: string) => {
    if (!isCreator) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('gathering_participants').delete().eq('id', memberId).eq('gathering_id', resolvedParams.id)
      if (error) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '멤버 내보내기에 실패했어요' } }))
        return
      }
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

  const catMeta = CATEGORY_META[gathering.category || 'etc'] || CATEGORY_META.etc
  const tabs = [
    ...((isMember || isCreator) ? [{ key: 'board' as const, label: '게시판' }] : []),
    { key: 'info' as const, label: '정보' },
  ]

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <PageHeader title="소모임" standalone rightAction={
        <div className="flex items-center gap-1">
          {isCreator && (
            <button onClick={() => router.push(`/town/gathering/${resolvedParams.id}/edit`)} className="p-1.5 rounded-xl active:bg-[var(--color-surface-alt)] transition-colors">
              <PenIcon className="w-5 h-5 text-[var(--color-primary)]" />
            </button>
          )}
          <button onClick={() => setBookmarked(!bookmarked)} className="p-1.5 rounded-xl active:bg-[var(--color-surface-alt)] transition-colors">
            <HeartIcon className={`w-5 h-5 ${bookmarked ? 'fill-red-500 text-red-500' : 'text-tertiary'}`} />
          </button>
          <button
            onClick={async () => { try { if (navigator.share) await navigator.share({ title: gathering?.title, url: window.location.href }) } catch {} }}
            className="p-1.5 rounded-xl active:bg-[var(--color-surface-alt)] transition-colors"
          >
            <ShareIcon className="w-5 h-5 text-tertiary" />
          </button>
        </div>
      } />

      {/* 히어로 영역 */}
      <div className="bg-white px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
        <div className="flex gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl ${catMeta.bg} flex items-center justify-center shrink-0`}>
            <span className="text-3xl">{catMeta.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            {/* 배지 */}
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md ${catMeta.bg} ${catMeta.color} text-[11px] font-semibold`}>
                {catMeta.label}
              </span>
              {gathering.meeting_frequency && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-tertiary text-[11px] font-medium">
                  {FREQUENCY_LABELS[gathering.meeting_frequency]}
                </span>
              )}
              {isCreator && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[11px] font-semibold">
                  소모임장
                </span>
              )}
            </div>
            <h1 className="text-[18px] font-bold text-primary leading-snug">{gathering.title}</h1>
          </div>
        </div>

        {/* 설명 */}
        {gathering.description && (
          <p className="text-[13px] text-secondary leading-relaxed mb-4">{gathering.description}</p>
        )}

        {/* 메타 칩 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          {gathering.place_name && (
            <div className="flex items-center gap-1.5 text-[12px] text-secondary">
              <MapIcon className="w-3.5 h-3.5 text-tertiary" />
              <span>{gathering.place_name}</span>
            </div>
          )}
          {(gathering.min_child_age_months !== null || gathering.max_child_age_months !== null) && (
            <div className="flex items-center gap-1.5 text-[12px] text-secondary">
              <BabyIcon className="w-3.5 h-3.5 text-tertiary" />
              <span>{gathering.min_child_age_months || 0}~{gathering.max_child_age_months || 60}개월</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[12px] text-secondary">
            <UsersIcon className="w-3.5 h-3.5 text-tertiary" />
            <span>{members.length}명 참여{gathering.max_participants ? ` / ${gathering.max_participants}명` : ''}</span>
          </div>
        </div>

        {/* 참여/나가기 */}
        {!isMember && !isCreator && (
          <button
            onClick={handleJoin}
            className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-white text-[15px] font-bold active:scale-[0.98] transition-transform shadow-[0_2px_12px_var(--color-fab-shadow)]"
          >
            소모임 참여하기
          </button>
        )}
      </div>

      {/* 탭 바 */}
      <div className="bg-white border-b border-[var(--color-border)] sticky top-[56px] z-10">
        <div className="flex max-w-lg mx-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex-1 py-3.5 text-center text-[14px] font-semibold transition-colors ${
                tab === t.key ? 'text-[var(--color-primary)]' : 'text-tertiary'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-4 right-4 h-[2.5px] rounded-full bg-[var(--color-primary)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ 정보 탭 ═══════ */}
      {tab === 'info' && (
        <div className="px-5 py-5 space-y-3 max-w-lg mx-auto">
          {/* 소모임장 안내 */}
          {isCreator && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-lg">👑</span>
              </div>
              <div>
                <p className="text-[13px] font-bold text-amber-800 mb-0.5">소모임장 알림</p>
                <p className="text-[12px] text-amber-700 leading-relaxed">멤버들이 편안하게 활동할 수 있도록 소모임 규칙을 공지사항으로 작성해보세요.</p>
              </div>
            </div>
          )}

          {/* 다음 모임 */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-bg)] flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
              <h3 className="text-[14px] font-bold text-primary">다음 모임</h3>
            </div>
            <div className="text-center py-5">
              <p className="text-[13px] text-tertiary">
                {isCreator ? '게시판에서 다음 모임 일정을 공유해보세요' : '아직 예정된 모임이 없어요'}
              </p>
            </div>
          </div>

          {/* 활동 통계 */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
            <h3 className="text-[14px] font-bold text-primary mb-4">소모임 활동</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: members.length, label: '멤버', emoji: '👥' },
                { value: posts.length, label: '게시글', emoji: '📝' },
                { value: Math.max(1, Math.floor((Date.now() - new Date(gathering.created_at).getTime()) / 86400000) + 1), label: '일째', emoji: '📅' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-3 rounded-xl bg-[var(--color-surface-alt)]">
                  <p className="text-[11px] mb-1">{stat.emoji}</p>
                  <p className="text-[20px] font-bold text-primary">{stat.value}</p>
                  <p className="text-[11px] text-tertiary mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 소개 */}
          {gathering.description && (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
              <h3 className="text-[14px] font-bold text-primary mb-2.5">소모임 소개</h3>
              <p className="text-[13px] text-secondary leading-relaxed whitespace-pre-wrap">{gathering.description}</p>
            </div>
          )}

          {/* 모임 장소 */}
          {gathering.place_name && (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
              <h3 className="text-[14px] font-bold text-primary mb-2.5">주요 모임 장소</h3>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center">
                  <MapIcon className="w-4 h-4 text-tertiary" />
                </div>
                <span className="text-[13px] text-secondary">{gathering.place_name}</span>
              </div>
            </div>
          )}

          {/* 멤버 목록 */}
          {(isMember || isCreator) && members.length > 0 && (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-primary flex items-center gap-1.5">
                  <span className="text-[16px]">👥</span> 멤버 {members.length}명
                  {gathering.max_participants && (
                    <span className="text-[12px] font-normal text-tertiary">/ {gathering.max_participants}명</span>
                  )}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => {
                  const name = nicknames[member.user_id] || '멤버'
                  const isLeader = member.user_id === gathering.creator_id
                  const initial = name.charAt(0)
                  return (
                    <div key={member.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 ${isLeader ? 'bg-amber-400' : 'bg-[var(--color-primary)]'}`}>
                        {initial}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-medium text-primary">{name}</span>
                        {isLeader && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-semibold">모임장</span>
                        )}
                      </div>
                      {isCreator && member.user_id !== userId && (
                        <>
                          {kickMemberId !== member.id ? (
                            <button
                              onClick={() => setKickMemberId(member.id)}
                              className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-red-500 border border-red-200 active:bg-red-50"
                            >
                              내보내기
                            </button>
                          ) : (
                            <div className="flex gap-1 ml-1">
                              <button onClick={() => setKickMemberId(null)} className="px-1.5 py-0.5 rounded-md text-[10px] text-tertiary border border-[var(--color-border)]">취소</button>
                              <button onClick={() => handleKickMember(member.id)} className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-white bg-red-500 active:bg-red-600">확인</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 소모임 나가기 — 정보 탭 최하단 */}
          {isMember && !isCreator && (
            <div className="pt-6 pb-2">
              {!showLeaveConfirm ? (
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="w-full py-3 rounded-2xl border border-red-200 text-red-400 text-[13px] font-medium active:bg-red-50 transition-colors"
                >
                  소모임 나가기
                </button>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <p className="text-[13px] text-orange-700 font-semibold mb-3 text-center">
                    정말 소모임을 나가시겠어요?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-2 rounded-xl bg-white border border-[var(--color-border)] text-primary text-[13px] font-medium active:bg-[var(--color-surface-alt)]">취소</button>
                    <button onClick={handleLeave} className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-[13px] font-semibold active:bg-orange-600">나가기</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════ 게시판 탭 ═══════ */}
      {tab === 'board' && (isMember || isCreator) && (
        <div className="px-5 py-5 space-y-3 max-w-lg mx-auto">
          {/* 글쓰기 */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
            <div className="flex gap-3">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="소모임 멤버들과 이야기를 나눠보세요"
                maxLength={2000}
                className="flex-1 min-h-[72px] text-[14px] text-primary placeholder:text-tertiary resize-none outline-none leading-relaxed"
              />
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--color-border-light)]">
              <p className="text-[11px] text-tertiary">{newPost.length}/2000</p>
              <button
                onClick={handlePost}
                disabled={!newPost.trim() || posting}
                className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  newPost.trim()
                    ? 'bg-[var(--color-primary)] text-white active:scale-[0.97] shadow-sm'
                    : 'bg-[var(--color-surface-alt)] text-tertiary'
                }`}
              >
                {posting ? '올리는 중...' : '올리기'}
              </button>
            </div>
          </div>

          {/* 게시글 목록 */}
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center">
                <ChatIcon className="w-7 h-7 text-tertiary" />
              </div>
              <p className="text-[15px] font-semibold text-primary">아직 게시글이 없어요</p>
              <p className="text-[13px] text-tertiary mt-1">첫 글을 작성해보세요!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl border border-[var(--color-border)]">
                <div className="p-4">
                  {/* 작성자 헤더 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-primary">{nicknames[post.user_id] || '멤버'}</p>
                          {post.user_id === gathering.creator_id && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-semibold">소모임장</span>
                          )}
                        </div>
                        <p className="text-[11px] text-tertiary">{getTimeAgo(post.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {(post.user_id === userId || isCreator) && (
                        <button onClick={() => setDeletePostId(post.id)} className="p-1.5 rounded-lg text-tertiary active:bg-[var(--color-surface-alt)] transition-colors">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                      {post.user_id !== userId && (
                        <button onClick={() => handleReportPost(post.id)} className="p-1.5 rounded-lg text-tertiary text-[11px] active:bg-[var(--color-surface-alt)] transition-colors">
                          신고
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 삭제 확인 */}
                  {deletePostId === post.id && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 mb-3">
                      <p className="text-[13px] text-red-700 font-semibold mb-2.5 text-center">정말 삭제할까요?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setDeletePostId(null)} className="flex-1 py-2 rounded-xl bg-white border border-[var(--color-border)] text-primary text-[13px] active:bg-[var(--color-surface-alt)]">취소</button>
                        <button onClick={() => handleDeletePost(post.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-[13px] font-semibold active:bg-red-600">삭제</button>
                      </div>
                    </div>
                  )}

                  {/* 글 내용 */}
                  <p className="text-[14px] text-primary leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* 이모지 반응 + 댓글 버튼 */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--color-border-light)]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {REACTION_EMOJIS.map(emoji => {
                      const count = post.reactions?.[emoji] || 0
                      const isMine = post.myReactions?.has(emoji)
                      return (
                        <button key={emoji} onClick={() => handleReaction(post.id, emoji)}
                          className={`flex items-center gap-1 h-7 px-2 rounded-full text-[13px] transition-all ${
                            isMine
                              ? 'bg-[var(--color-primary-bg)] ring-1 ring-[var(--color-primary)]/30'
                              : count > 0
                                ? 'bg-[var(--color-surface-alt)]'
                                : 'opacity-40 hover:opacity-70'
                          }`}>
                          <span className="leading-none">{emoji}</span>
                          {count > 0 && <span className={`text-[11px] font-semibold ${isMine ? 'text-[var(--color-primary)]' : 'text-secondary'}`}>{count}</span>}
                        </button>
                      )
                    })}
                  </div>
                  <button onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors shrink-0 ${openComments === post.id ? 'text-[var(--color-primary)]' : 'text-tertiary active:bg-[var(--color-surface-alt)]'}`}>
                    <ChatIcon className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">{(post.commentCount || 0) > 0 ? post.commentCount : ''}</span>
                  </button>
                </div>

                {/* 댓글 섹션 */}
                {openComments === post.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-[var(--color-border-light)] bg-[var(--color-page-bg)]/50">
                    {(postComments[post.id] || []).length > 0 ? (
                      <div className="space-y-2.5 mb-3">
                        {(postComments[post.id] || []).map((c) => (
                          <div key={c.id} className="flex gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="bg-white rounded-xl px-3 py-2 border border-[var(--color-border-light)]">
                                <p className="text-[13px] text-primary leading-relaxed">{c.content}</p>
                              </div>
                              <div className="flex items-center gap-2 mt-1 px-1">
                                <span className="text-[11px] text-tertiary">{getTimeAgo(c.created_at)}</span>
                                {c.user_id === userId && deleteCommentId !== c.id && (
                                  <button onClick={() => setDeleteCommentId(c.id)} className="text-[11px] text-tertiary active:text-red-500">삭제</button>
                                )}
                                {c.user_id === userId && deleteCommentId === c.id && (
                                  <span className="flex items-center gap-1.5">
                                    <button onClick={() => { deleteComment(c.id, post.id); setDeleteCommentId(null) }} className="text-[11px] text-red-500 font-semibold">확인</button>
                                    <button onClick={() => setDeleteCommentId(null)} className="text-[11px] text-tertiary">취소</button>
                                  </span>
                                )}
                              </div>
                              {/* 댓글 이모지 반응 */}
                              <div className="flex items-center gap-1 mt-1 px-1">
                                {REACTION_EMOJIS.map(emoji => {
                                  const count = c.reactions?.[emoji] || 0
                                  const isMine = c.myReactions?.has(emoji)
                                  return (
                                    <button key={emoji} onClick={() => handleCommentReaction(c.id, post.id, emoji)}
                                      className={`flex items-center gap-0.5 h-6 px-1.5 rounded-full text-[11px] transition-all ${
                                        isMine
                                          ? 'bg-[var(--color-primary-bg)] ring-1 ring-[var(--color-primary)]/30'
                                          : count > 0
                                            ? 'bg-[var(--color-surface-alt)]'
                                            : 'opacity-40 hover:opacity-70'
                                      }`}>
                                      <span className="text-[11px] leading-none">{emoji}</span>
                                      {count > 0 && <span className={`text-[10px] font-semibold ${isMine ? 'text-[var(--color-primary)]' : 'text-secondary'}`}>{count}</span>}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-tertiary text-center py-3 mb-2">아직 댓글이 없어요</p>
                    )}

                    {/* 댓글 입력 */}
                    <div className="flex gap-2">
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
                        placeholder="댓글을 입력하세요..."
                        maxLength={500}
                        className="flex-1 h-9 px-3.5 rounded-full bg-white border border-[var(--color-border)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-shadow"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(post.id) } }}
                      />
                      <button
                        onClick={() => submitComment(post.id)}
                        disabled={!commentText.trim() || commentLoading}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          commentText.trim() ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-tertiary'
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {hasMorePosts && (
            <div ref={observerRef} className="flex justify-center py-6">
              {loadingMore && <div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />}
            </div>
          )}
        </div>
      )}

      {/* 하단 여백 */}
      <div className="h-20" />

      {/* 신고 바텀시트 */}
      {reportPostId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[80]" onClick={() => !reportSubmitting && setReportPostId(null)} />
          <div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-[81]"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32,0.72,0,1)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
            </div>

            {reportDone ? (
              <div className="px-6 pt-4 pb-8 text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--color-primary-bg)] flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[15px] font-bold text-primary">신고가 접수되었습니다</p>
                <p className="text-[13px] text-secondary mt-1">검토 후 조치하겠습니다</p>
              </div>
            ) : (
              <div className="px-6 pt-2 pb-4">
                <p className="text-[16px] font-bold text-primary mb-1">게시글 신고</p>
                <p className="text-[13px] text-secondary mb-4">신고 사유를 선택해주세요</p>

                <div className="space-y-2 mb-5">
                  {REPORT_REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                        reportReason === reason
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
                          : 'border-[var(--color-border)] bg-white active:bg-[var(--color-surface-alt)]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        reportReason === reason ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-border)]'
                      }`}>
                        {reportReason === reason && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className={`text-[13px] ${reportReason === reason ? 'text-primary font-semibold' : 'text-secondary'}`}>{reason}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setReportPostId(null)} disabled={reportSubmitting} className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-[14px] font-semibold text-secondary active:bg-[var(--color-surface-alt)] transition-colors">취소</button>
                  <button onClick={submitReport} disabled={!reportReason || reportSubmitting} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[14px] font-bold active:bg-red-600 disabled:opacity-40 transition-colors">
                    {reportSubmitting ? '접수 중...' : '신고하기'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <style jsx>{`
            @keyframes slideUpSheet {
              from { transform: translate(-50%, 100%); }
              to { transform: translate(-50%, 0); }
            }
          `}</style>
        </>
      )}
    </div>
  )
}
