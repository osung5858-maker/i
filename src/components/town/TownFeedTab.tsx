'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatIcon, ClockIcon } from '@/components/ui/Icons'
import { sanitizeUserInput } from '@/lib/sanitize'

interface FeedPost {
  id: string
  user_id: string
  user_name: string | null
  content: string
  range_meters?: number
  created_at: string
  reactions?: Record<string, number> // { '❤️': 3, '😂': 1, ... }
  myReactions?: Set<string>          // 내가 누른 이모지
  commentCount?: number
}

const REACTION_EMOJIS = ['❤️', '😂', '👍', '😢', '🥰', '👶']

interface FeedComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  reactions?: Record<string, number>
  myReactions?: Set<string>
}

const PAGE_SIZE = 15

export default function TownFeedTab({ range }: { range: number }) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [nicknames, setNicknames] = useState<Record<string, string>>({})

  // 좋아요/댓글 관련
  const [hasSocialTables, setHasSocialTables] = useState(false)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [postComments, setPostComments] = useState<Record<string, FeedComment[]>>({})
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)

  // 신고
  const [reportPostId, setReportPostId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  // 삭제 확인
  const [deletePostId, setDeletePostId] = useState<string | null>(null)


  useEffect(() => {
    initUser()
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserPos({ lat: 37.4979, lng: 127.0276 })
    )
  }, [])

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) loadFeed()
  }, [range, initialized])

  const initUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)

    // 소셜 테이블 존재 여부 확인
    const { error } = await supabase.from('town_feed_likes').select('post_id').limit(0)
    setHasSocialTables(!error)
    setInitialized(true)
  }

  const loadFeed = async () => {
    try {
      const supabase = createClient()
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('town_feed')
        .select('*')
        .lte('created_at', now)
        .gte('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (data && data.length > 0) {
        const enriched = await enrichPosts(data, supabase)
        setPosts(enriched)
        setHasMore(data.length >= PAGE_SIZE)
        // 닉네임 로드
        await loadNicknames(data.map((p: FeedPost) => p.user_id))
      } else {
        setPosts([])
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load feed:', err)
    } finally {
      setLoading(false)
    }
  }

  const enrichPosts = async (rawPosts: FeedPost[], supabase: ReturnType<typeof createClient>) => {
    if (!hasSocialTables || rawPosts.length === 0) return rawPosts

    const postIds = rawPosts.map(p => p.id)
    try {
      const [likesRes, userLikesRes, commentCountsRes] = await Promise.all([
        supabase.from('town_feed_likes').select('post_id, emoji').in('post_id', postIds),
        userId
          ? supabase.from('town_feed_likes').select('post_id, emoji').in('post_id', postIds).eq('user_id', userId)
          : Promise.resolve({ data: [] }),
        supabase.from('town_feed_comments').select('post_id').in('post_id', postIds),
      ])

      // 이모지별 카운트 집계
      const reactionMap = new Map<string, Record<string, number>>()
      likesRes.data?.forEach((l: { post_id: string; emoji: string }) => {
        const emoji = l.emoji || '❤️'
        if (!reactionMap.has(l.post_id)) reactionMap.set(l.post_id, {})
        const counts = reactionMap.get(l.post_id)!
        counts[emoji] = (counts[emoji] || 0) + 1
      })

      // 내가 누른 이모지
      const myReactionMap = new Map<string, Set<string>>()
      ;(userLikesRes as { data: { post_id: string; emoji: string }[] | null }).data?.forEach(l => {
        if (!myReactionMap.has(l.post_id)) myReactionMap.set(l.post_id, new Set())
        myReactionMap.get(l.post_id)!.add(l.emoji || '❤️')
      })

      const commentCounts = new Map<string, number>()
      commentCountsRes.data?.forEach((c: { post_id: string }) => {
        commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1)
      })

      return rawPosts.map(p => ({
        ...p,
        reactions: reactionMap.get(p.id) || {},
        myReactions: myReactionMap.get(p.id) || new Set<string>(),
        commentCount: commentCounts.get(p.id) || 0,
      }))
    } catch (err) {
      console.error('Failed to enrich posts:', err)
      return rawPosts
    }
  }

  const loadNicknames = async (userIds: string[]) => {
    const newIds = userIds.filter(id => !nicknames[id])
    if (newIds.length === 0) return
    try {
      const res = await fetch('/api/nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [...new Set(newIds)] }),
      })
      if (res.ok) {
        const map = await res.json()
        setNicknames(prev => ({ ...prev, ...map }))
      }
    } catch (err) {
      console.error('Failed to load nicknames:', err)
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return
    setLoadingMore(true)
    try {
      const supabase = createClient()
      const now = new Date().toISOString()
      const last = posts[posts.length - 1]
      const { data } = await supabase
        .from('town_feed')
        .select('*')
        .lte('created_at', now)
        .gte('expires_at', now)
        .lt('created_at', last.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (data && data.length > 0) {
        const enriched = await enrichPosts(data, supabase)
        setPosts(prev => [...prev, ...enriched])
        setHasMore(data.length >= PAGE_SIZE)
        await loadNicknames(data.map((p: FeedPost) => p.user_id))
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load more feed:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, posts])

  // IntersectionObserver
  useEffect(() => {
    const el = observerRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore()
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  const handlePost = async () => {
    if (!newPost.trim() || !userPos || posting) return
    setPosting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('로그인이 필요합니다')
        setPosting(false)
        return
      }

      const sanitized = sanitizeUserInput(newPost, 2000, { preserveNewlines: true })
      if (!sanitized) { setPosting(false); return }

      const userName = user.user_metadata?.name || user.user_metadata?.full_name || '익명'

      const { data, error } = await supabase.from('town_feed').insert({
        user_id: user.id,
        user_name: userName,
        content: sanitized,
        lat: userPos.lat,
        lng: userPos.lng,
        range_meters: range,
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      }).select().single()

      if (error) {
        console.error('Insert error:', error)
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '소식 등록에 실패했어요' } }))
        setPosting(false)
        return
      }

      if (data) {
        setPosts(prev => [{ ...data, reactions: {}, myReactions: new Set<string>(), commentCount: 0 }, ...prev])
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
      const { error } = await supabase.from('town_feed').delete().eq('id', postId).eq('user_id', userId!)
      if (error) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '삭제에 실패했어요' } }))
        return
      }
      setPosts(prev => prev.filter(p => p.id !== postId))
      setDeletePostId(null)
    } catch (err) {
      console.error('Failed to delete post:', err)
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '삭제에 실패했어요' } }))
    }
  }

  const handleReaction = async (postId: string, emoji: string) => {
    if (!userId || !hasSocialTables) return
    const post = posts.find(p => p.id === postId)
    if (!post) return

    const myReactions = post.myReactions || new Set<string>()
    const reactions = { ...(post.reactions || {}) }
    const alreadyReacted = myReactions.has(emoji)

    // 낙관적 업데이트
    const newMyReactions = new Set(myReactions)
    if (alreadyReacted) {
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
      if (alreadyReacted) {
        await supabase.from('town_feed_likes').delete().eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji)
      } else {
        await supabase.from('town_feed_likes').insert({ post_id: postId, user_id: userId, emoji })
      }
    } catch {
      // 롤백
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: post.reactions, myReactions: post.myReactions } : p))
    }
  }

  const loadComments = useCallback(async (postId: string) => {
    if (!hasSocialTables) return
    const supabase = createClient()
    const { data } = await supabase
      .from('town_feed_comments').select('id, post_id, user_id, content, created_at')
      .eq('post_id', postId).order('created_at', { ascending: true })
    if (data) {
      let enriched: FeedComment[] = (data as FeedComment[]).map(c => ({ ...c, reactions: {}, myReactions: new Set<string>() }))
      try {
        const commentIds = data.map((c: FeedComment) => c.id)
        const [clRes, myClRes] = await Promise.all([
          supabase.from('town_feed_comment_likes').select('comment_id, emoji').in('comment_id', commentIds),
          userId
            ? supabase.from('town_feed_comment_likes').select('comment_id, emoji').in('comment_id', commentIds).eq('user_id', userId)
            : Promise.resolve({ data: [] }),
        ])
        if (clRes.data) {
          const crMap = new Map<string, Record<string, number>>()
          clRes.data.forEach((l: { comment_id: string; emoji: string }) => {
            const e = l.emoji || '❤️'
            if (!crMap.has(l.comment_id)) crMap.set(l.comment_id, {})
            const c = crMap.get(l.comment_id)!
            c[e] = (c[e] || 0) + 1
          })
          const mycrMap = new Map<string, Set<string>>()
          ;(myClRes as { data: { comment_id: string; emoji: string }[] | null }).data?.forEach(l => {
            if (!mycrMap.has(l.comment_id)) mycrMap.set(l.comment_id, new Set())
            mycrMap.get(l.comment_id)!.add(l.emoji || '❤️')
          })
          enriched = enriched.map(c => ({
            ...c,
            reactions: crMap.get(c.id) || {},
            myReactions: mycrMap.get(c.id) || new Set<string>(),
          }))
        }
      } catch { /* town_feed_comment_likes 테이블 없으면 무시 */ }
      setPostComments(prev => ({ ...prev, [postId]: enriched }))
      await loadNicknames(data.map((c: FeedComment) => c.user_id))
    }
  }, [hasSocialTables, nicknames, userId])

  const toggleComments = useCallback(async (postId: string) => {
    if (openComments === postId) { setOpenComments(null) }
    else { setOpenComments(postId); if (!postComments[postId]) await loadComments(postId) }
    setCommentText('')
  }, [openComments, postComments, loadComments])

  const submitComment = useCallback(async (postId: string) => {
    if (!commentText.trim() || !userId || commentLoading || !hasSocialTables) return
    setCommentLoading(true)
    try {
      const supabase = createClient()
      const sanitized = sanitizeUserInput(commentText, 500)
      if (!sanitized) { setCommentLoading(false); return }
      const { data, error } = await supabase
        .from('town_feed_comments').insert({ post_id: postId, user_id: userId, content: sanitized }).select().single()
      if (error) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '댓글 작성에 실패했어요' } }))
        return
      }
      if (data) {
        const newComment: FeedComment = { ...(data as FeedComment), reactions: {}, myReactions: new Set<string>() }
        setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }))
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))
      }
      setCommentText('')
    } catch (err) {
      console.error('Failed to submit comment:', err)
    } finally {
      setCommentLoading(false)
    }
  }, [commentText, userId, commentLoading, hasSocialTables])

  const deleteComment = useCallback(async (commentId: string, postId: string) => {
    if (!userId) return
    const supabase = createClient()
    const { error } = await supabase.from('town_feed_comments').delete().eq('id', commentId).eq('user_id', userId)
    if (error) return
    setPostComments(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }))
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) } : p))
  }, [userId])

  const handleCommentReaction = async (commentId: string, postId: string, emoji: string) => {
    if (!userId || !hasSocialTables) return
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
    setPostComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).map(c => c.id === commentId ? { ...c, reactions, myReactions: newMyReactions } : c),
    }))

    try {
      const supabase = createClient()
      if (already) {
        await supabase.from('town_feed_comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId).eq('emoji', emoji)
      } else {
        await supabase.from('town_feed_comment_likes').insert({ comment_id: commentId, user_id: userId, emoji })
      }
    } catch {
      setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => c.id === commentId ? { ...c, reactions: comment.reactions, myReactions: comment.myReactions } : c),
      }))
    }
  }

  const REPORT_REASONS = ['스팸/광고', '욕설/비하', '부적절한 콘텐츠', '허위 정보', '개인정보 노출']

  const handleReport = (postId: string) => {
    if (!userId) return
    setReportPostId(postId)
    setReportReason('')
    setReportDone(false)
  }

  const submitReport = async () => {
    if (!userId || !reportPostId || !reportReason) return
    setReportSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('town_feed_reports').insert({
        post_id: reportPostId,
        reporter_id: userId,
        reason: reportReason,
      })
      if (error) {
        // 테이블이 없거나 중복 신고인 경우
        if (error.code === '23505') {
          window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '이미 신고한 게시글입니다' } }))
        } else {
          window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '신고가 접수되었습니다' } }))
        }
      } else {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '신고가 접수되었습니다' } }))
      }
      setReportDone(true)
      setTimeout(() => { setReportPostId(null); setReportDone(false) }, 1500)
    } catch (err) {
      console.error('Failed to report post:', err)
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '신고 접수에 실패했어요' } }))
    } finally {
      setReportSubmitting(false)
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

  return (
    <div className="px-5 pb-24 space-y-3">
      {/* 새 글 작성 */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
        <div className="flex gap-3">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="동네 소식을 공유해보세요 (24시간 후 자동 삭제)"
            maxLength={2000}
            className="flex-1 min-h-[72px] text-[14px] text-primary placeholder:text-tertiary resize-none outline-none leading-relaxed"
          />
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border-light)]">
          <div className="flex items-center gap-1.5 text-[11px] text-tertiary">
            <ClockIcon className="w-3 h-3" />
            <span>{range >= 1000 ? `${range / 1000}km` : `${range}m`} 반경 · 24시간</span>
          </div>
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

      {/* 피드 목록 */}
      {loading ? (
        <div className="space-y-3" aria-label="피드 로딩 중" role="status">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[var(--color-border)] p-4 animate-pulse">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-full bg-[#F0EDE8]" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-20 bg-[#F0EDE8] rounded" />
                  <div className="h-2.5 w-14 bg-[#F0EDE8] rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-full bg-[#F0EDE8] rounded" />
                <div className="h-3.5 w-3/4 bg-[#F0EDE8] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center">
            <ChatIcon className="w-7 h-7 text-tertiary" />
          </div>
          <p className="text-[15px] font-semibold text-primary">아직 동네 소식이 없어요</p>
          <p className="text-[13px] text-tertiary mt-1">첫 소식을 공유해보세요!</p>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white rounded-2xl border border-[var(--color-border)] relative">
            <div className="p-4">
              {/* 작성자 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-primary">
                      {nicknames[post.user_id] || post.user_name || '익명'}
                    </p>
                    <p className="text-[11px] text-tertiary">{getTimeAgo(post.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {post.user_id === userId && (
                    <button
                      onClick={() => setDeletePostId(post.id)}
                      className="p-1.5 rounded-lg text-tertiary text-[11px] active:bg-[var(--color-surface-alt)] transition-colors"
                    >
                      삭제
                    </button>
                  )}
                  {post.user_id !== userId && userId && (
                    <button
                      onClick={() => handleReport(post.id)}
                      className="p-1.5 rounded-lg text-tertiary text-[11px] active:bg-[var(--color-surface-alt)] transition-colors"
                    >
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
                    <button
                      key={emoji}
                      onClick={() => handleReaction(post.id, emoji)}
                      aria-label={`${emoji} 반응${count > 0 ? ` ${count}개` : ''}`}
                      aria-pressed={isMine}
                      className={`flex items-center gap-1 h-8 px-2.5 rounded-full text-[13px] transition-all ${
                        isMine
                          ? 'bg-[var(--color-primary-bg)] ring-1 ring-[var(--color-primary)]/30'
                          : count > 0
                            ? 'bg-[var(--color-surface-alt)]'
                            : 'opacity-40 hover:opacity-70'
                      }`}
                    >
                      <span className="leading-none" aria-hidden="true">{emoji}</span>
                      {count > 0 && <span className={`text-[11px] font-semibold ${isMine ? 'text-[var(--color-primary)]' : 'text-secondary'}`}>{count}</span>}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => toggleComments(post.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                  openComments === post.id ? 'text-[var(--color-primary)]' : 'text-tertiary active:bg-[var(--color-surface-alt)]'
                }`}
              >
                <ChatIcon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">
                  {(post.commentCount || 0) > 0 ? post.commentCount : ''}
                </span>
              </button>
            </div>

            {/* 댓글 섹션 */}
            {openComments === post.id && (
              <div className="px-4 pb-4 pt-2 border-t border-[var(--color-border-light)] bg-[var(--color-page-bg)]/50 rounded-b-2xl">
                {(postComments[post.id] || []).length > 0 ? (
                  <div className="space-y-2.5 mb-3">
                    {(postComments[post.id] || []).map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="bg-white rounded-xl px-3 py-2 border border-[var(--color-border-light)]">
                            <p className="text-[11px] font-semibold text-primary mb-0.5">
                              {nicknames[c.user_id] || '익명'}
                            </p>
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
                                <button
                                  key={emoji}
                                  onClick={() => handleCommentReaction(c.id, post.id, emoji)}
                                  aria-label={`${emoji} 반응${count > 0 ? ` ${count}개` : ''}`}
                                  aria-pressed={isMine}
                                  className={`flex items-center gap-0.5 h-7 px-1.5 rounded-full text-[11px] transition-all ${
                                    isMine
                                      ? 'bg-[var(--color-primary-bg)] ring-1 ring-[var(--color-primary)]/30'
                                      : count > 0
                                        ? 'bg-[var(--color-surface-alt)]'
                                        : 'opacity-40 hover:opacity-70'
                                  }`}
                                >
                                  <span className="text-[11px] leading-none" aria-hidden="true">{emoji}</span>
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
                {userId && (
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
                      aria-label="댓글 보내기"
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        commentText.trim() ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-tertiary'
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* 인피니티 스크롤 센티널 */}
      {hasMore && (
        <div ref={observerRef} className="flex justify-center py-6">
          {loadingMore && <div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />}
        </div>
      )}

      {/* 신고 바텀시트 */}
      {reportPostId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[80]" onClick={() => !reportSubmitting && setReportPostId(null)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="소식 신고"
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-[81]"
            style={{ animation: 'feedSlideUp 0.3s cubic-bezier(0.32,0.72,0,1)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
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
                <p className="text-[16px] font-bold text-primary mb-1">소식 신고</p>
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
            @keyframes feedSlideUp {
              from { transform: translate(-50%, 100%); }
              to { transform: translate(-50%, 0); }
            }
          `}</style>
        </>
      )}
    </div>
  )
}
