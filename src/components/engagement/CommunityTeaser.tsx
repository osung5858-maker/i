'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChatIcon } from '@/components/ui/Icons'

// 동네 수다 활동 티저 — "다른 엄마들이 이야기하고 있어요"
export default function CommunityTeaser() {
  const [recentCount, setRecentCount] = useState(0)
  const [latestPost, setLatestPost] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      // 최근 24시간 글 수
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since)

      setRecentCount(count || 0)

      // 최신 글 1개
      const { data } = await supabase
        .from('posts')
        .select('content')
        .order('created_at', { ascending: false })
        .limit(1)

      if (data?.[0]) {
        const text = data[0].content
        setLatestPost(text.length > 40 ? text.slice(0, 40) + '...' : text)
      }
    }
    fetch()
  }, [])

  if (recentCount === 0 && !latestPost) return null

  return (
    <Link href="/town" className="block bg-white rounded-xl border border-[#E8E4DF] p-3 active:bg-[var(--color-page-bg)]">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#F0F9F4] flex items-center justify-center shrink-0">
          <ChatIcon className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-emphasis text-primary">
            {recentCount > 0 ? `오늘 ${recentCount}개의 수다가 올라왔어요` : '동네 수다방'}
          </p>
          {latestPost && (
            <p className="text-body-emphasis text-secondary truncate">&ldquo;{latestPost}&rdquo;</p>
          )}
        </div>
        <span className="text-tertiary text-sm shrink-0">→</span>
      </div>
    </Link>
  )
}
