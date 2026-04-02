'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {HeartIcon, ChatIcon, ClockIcon} from '@/components/ui/Icons'

interface FeedPost {
  id: string
  user_name: string | null
  content: string
  distance?: number
  created_at: string
}

export default function TownFeedTab({ range }: { range: number }) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    loadFeed()
    // 위치 가져오기
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserPos({ lat: 37.4979, lng: 127.0276 })
    )
  }, [range])

  const loadFeed = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('town_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) setPosts(data)
    } catch (err) {
      console.error('Failed to load feed:', err)
    } finally {
      setLoading(false)
    }
  }

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

      const userName = localStorage.getItem('dodam_user_name') || '익명'

      const { error } = await supabase.from('town_feed').insert({
        user_id: user.id,
        user_name: userName,
        content: newPost,
        lat: userPos.lat,
        lng: userPos.lng,
        range_meters: range,
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(), // 24시간 후
      })

      if (error) {
        console.error('Insert error:', error)
        alert('동네 소식 기능은 곧 출시됩니다!')
        setPosting(false)
        return
      }

      setNewPost('')
      loadFeed()
    } catch (err) {
      console.error('Failed to post:', err)
      alert('동네 소식 기능은 곧 출시됩니다!')
    } finally {
      setPosting(false)
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
      <div className="bg-white rounded-xl border border-[#E8E4DF] p-3">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="동네 소식을 공유해보세요 (24시간 후 자동 삭제)"
          className="w-full h-20 text-body-emphasis text-primary placeholder:text-tertiary resize-none outline-none"
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0EDE8]">
          <span className="text-caption text-tertiary">
            {range >= 1000 ? `${range / 1000}km` : `${range}m`} 반경 공개
          </span>
          <button
            onClick={handlePost}
            disabled={!newPost.trim() || posting}
            className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80"
          >
            {posting ? '올리는 중...' : '올리기'}
          </button>
        </div>
      </div>

      {/* 피드 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body-emphasis text-primary">아직 동네 소식이 없어요</p>
          <p className="text-body text-tertiary mt-1">첫 소식을 공유해보세요!</p>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white rounded-xl border border-[#E8E4DF] p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <span className="text-body font-bold text-[var(--color-primary)]">
                  {post.user_name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-primary">{post.user_name || '익명'}</p>
                <div className="flex items-center gap-1.5 text-label text-tertiary">
                  <ClockIcon className="w-3 h-3" />
                  <span>{getTimeAgo(post.created_at)}</span>
                  {post.distance && <span>· {post.distance}m</span>}
                </div>
              </div>
            </div>
            <p className="text-body-emphasis text-primary leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>
        ))
      )}
    </div>
  )
}
