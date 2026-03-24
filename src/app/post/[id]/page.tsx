'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PublicPostPage() {
  const params = useParams()
  const postId = params.id as string
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: postData } = await supabase.from('posts').select('*').eq('id', postId).single()
      if (postData) setPost(postData)
      const { data: commentData } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true })
      if (commentData) setComments(commentData)
      setLoading(false)
    }
    load()
  }, [postId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-white">
        <div className="w-8 h-8 border-3 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-white px-6">
        <p className="text-[15px] text-[#868B94] mb-4">게시글을 찾을 수 없어요</p>
        <Link href="/onboarding" className="text-[13px] text-[#3D8A5A] font-semibold">도담 시작하기 →</Link>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#3D8A5A] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">도</span>
            </div>
            <span className="text-[15px] font-bold text-[#1A1918]">도담 이야기</span>
          </div>
          <Link href="/onboarding" className="text-[11px] text-[#3D8A5A] font-semibold px-3 py-1.5 bg-[#F0F9F4] rounded-lg">도담 시작하기</Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-20 space-y-3">
        {/* 게시글 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[14px] text-[#1A1918] leading-relaxed whitespace-pre-line">{post.content}</p>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#f0f0f0]">
            <span className="text-[11px] text-[#868B94]">❤️ {post.like_count || 0}</span>
            <span className="text-[11px] text-[#868B94]">💬 {comments.length}</span>
            <span className="text-[11px] text-[#AEB1B9] ml-auto">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>

        {/* 댓글 */}
        {comments.length > 0 && (
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-[#868B94]">댓글 {comments.length}개</p>
            {comments.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-[#f0f0f0] p-3">
                <p className="text-[13px] text-[#1A1918]">{c.content}</p>
                <p className="text-[9px] text-[#AEB1B9] mt-1">{new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="bg-[#F0F9F4] rounded-xl p-4 text-center">
          <p className="text-[13px] font-semibold text-[#3D8A5A] mb-1">도담에서 더 많은 이야기를 나눠보세요</p>
          <p className="text-[11px] text-[#868B94] mb-3">임신 준비부터 육아까지, AI 케어 파트너</p>
          <Link href="/onboarding" className="inline-block px-6 py-2.5 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl">도담 시작하기</Link>
        </div>
      </div>
    </div>
  )
}
