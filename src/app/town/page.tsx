'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type SubTab = 'town' | 'story' | 'market'

const MAP_CATEGORIES: Record<string, { icon: string; label: string; query: string }[]> = {
  preparing: [
    { icon: '🏥', label: '산부인과', query: '산부인과' },
    { icon: '🧪', label: '난임클리닉', query: '난임클리닉' },
    { icon: '💊', label: '약국', query: '약국' },
    { icon: '🧘', label: '요가', query: '임산부요가' },
  ],
  pregnant: [
    { icon: '🏥', label: '산부인과', query: '산부인과' },
    { icon: '🤱', label: '산후조리원', query: '산후조리원' },
    { icon: '👶', label: '베이비용품', query: '유아용품점' },
    { icon: '💊', label: '약국', query: '약국' },
  ],
  parenting: [
    { icon: '🏥', label: '소아과', query: '소아과' },
    { icon: '🚨', label: '응급소아과', query: '응급소아과' },
    { icon: '🎪', label: '키즈카페', query: '키즈카페' },
    { icon: '📚', label: '문화센터', query: '문화센터' },
    { icon: '🌳', label: '놀이터', query: '어린이놀이터' },
    { icon: '💊', label: '약국', query: '약국' },
  ],
}

interface Place {
  id: string; name: string; address: string; phone: string; distance: string; lat: number; lng: number
}

export default function TownPage() {
  const [subTab, setSubTab] = useState<SubTab>('town')
  const [mode, setMode] = useState('parenting')

  useEffect(() => {
    const saved = localStorage.getItem('dodam_mode')
    if (saved) setMode(saved)
  }, [])

  const categories = MAP_CATEGORIES[mode] || MAP_CATEGORIES.parenting

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center h-12 px-5">
            <h1 className="text-[17px] font-bold text-[#1A1918]">동네</h1>
          </div>
          <div className="flex px-5 gap-1 pb-2">
            {[
              { key: 'town' as SubTab, label: '동네' },
              { key: 'story' as SubTab, label: '이야기' },
              { key: 'market' as SubTab, label: '도담장터' },
            ].map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-semibold ${subTab === t.key ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {subTab === 'town' && <MapTab categories={categories} />}
        {subTab === 'story' && <StoryTab />}
        {subTab === 'market' && <MarketTab />}
      </div>
    </div>
  )
}

// ===== 동네(지도) 탭 =====
function MapTab({ categories }: { categories: { icon: string; label: string; query: string }[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const mapObjRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const cacheRef = useRef<Record<string, Place[]>>({}) // 검색 결과 캐시
  const posRef = useRef<{ lat: number; lng: number } | null>(null)

  // 마커 초기화
  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
  }

  const searchPlaces = useCallback((query: string) => {
    // 캐시 히트
    if (cacheRef.current[query]) {
      setPlaces(cacheRef.current[query])
      setLoading(false)
      // 마커만 다시 그리기
      clearMarkers()
      if (mapObjRef.current) {
        cacheRef.current[query].forEach(p => {
          const marker = new window.kakao.maps.Marker({ map: mapObjRef.current, position: new window.kakao.maps.LatLng(p.lat, p.lng) })
          markersRef.current.push(marker)
        })
      }
      return
    }

    setLoading(true); setPlaces([])
    if (!window.kakao?.maps) { setLoading(false); return }

    const doSearch = (lat: number, lng: number) => {
      const latlng = new window.kakao.maps.LatLng(lat, lng)
      if (!mapObjRef.current && mapRef.current) {
        mapObjRef.current = new window.kakao.maps.Map(mapRef.current, { center: latlng, level: 5 })
      } else if (mapObjRef.current) { mapObjRef.current.setCenter(latlng) }

      clearMarkers()
      const ps = new window.kakao.maps.services.Places()
      ps.keywordSearch(query, (data: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const results = data.slice(0, 10).map((p: any) => ({
            id: p.id, name: p.place_name, address: p.road_address_name || p.address_name,
            phone: p.phone || '', distance: p.distance ? `${Math.round(Number(p.distance))}m` : '',
            lat: Number(p.y), lng: Number(p.x),
          }))
          setPlaces(results)
          cacheRef.current[query] = results // 캐시 저장
          if (mapObjRef.current) {
            results.forEach(p => {
              const marker = new window.kakao.maps.Marker({ map: mapObjRef.current, position: new window.kakao.maps.LatLng(p.lat, p.lng) })
              markersRef.current.push(marker)
            })
          }
        }
        setLoading(false)
      }, { location: latlng, radius: 5000, sort: (window.kakao.maps.services as any).SortBy?.DISTANCE })
    }

    // 위치 캐시 활용
    if (posRef.current) {
      doSearch(posRef.current.lat, posRef.current.lng)
    } else {
      navigator.geolocation.getCurrentPosition((pos) => {
        posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        doSearch(pos.coords.latitude, pos.coords.longitude)
      }, () => setLoading(false), { enableHighAccuracy: true })
    }
  }, [])

  useEffect(() => {
    const initMap = () => {
      if (window.kakao?.maps) { window.kakao.maps.load(() => searchPlaces(categories[0]?.query || '소아과')) }
      else setTimeout(initMap, 300)
    }
    initMap()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-28">
      <div ref={mapRef} className="w-full h-48 bg-[#E8F0E8]" />
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 py-3">
        {categories.map((cat, i) => (
          <button key={cat.query} onClick={() => { setActiveIdx(i); searchPlaces(cat.query) }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 ${activeIdx === i ? 'bg-[#3D8A5A] text-white' : 'bg-white text-[#868B94] border border-[#f0f0f0]'}`}>
            <span className="text-sm">{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>
      <div className="px-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" /></div>
        ) : places.length === 0 ? (
          <p className="text-[13px] text-[#AEB1B9] text-center py-8">주변에 검색 결과가 없어요</p>
        ) : (
          places.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-[#f0f0f0] p-3">
              <Link href={`/map/${p.id}`} className="block active:opacity-80">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1918] truncate">{p.name}</p>
                    <p className="text-[10px] text-[#868B94] mt-0.5 truncate">{p.address}</p>
                  </div>
                  {p.distance && <span className="text-[10px] text-[#AEB1B9] shrink-0 ml-2">{p.distance}</span>}
                </div>
              </Link>
              <div className="flex gap-2 mt-2 pt-2 border-t border-[#f0f0f0]">
                {p.phone ? (
                  <a href={`tel:${p.phone}`} className="flex-1 py-1.5 bg-[#F0F9F4] rounded-lg text-center text-[11px] text-[#3D8A5A] font-semibold active:opacity-80">📞 전화</a>
                ) : (
                  <div className="flex-1 py-1.5 bg-[#F5F4F1] rounded-lg text-center text-[11px] text-[#AEB1B9]">📞 전화</div>
                )}
                <a href={`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-1.5 bg-[#F0F9F4] rounded-lg text-center text-[11px] text-[#3D8A5A] font-semibold active:opacity-80">🧭 길찾기</a>
                <Link href={`/map/${p.id}/review`} className="flex-1 py-1.5 bg-[#F0F9F4] rounded-lg text-center text-[11px] text-[#3D8A5A] font-semibold active:opacity-80">⭐ 리뷰</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ===== 이야기 탭 =====
function StoryTab() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    async function load() {
      try {
        const supabase = supabaseRef.current
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setUserId(user.id)
        const { data, error: fetchErr } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(30)
        if (fetchErr) setError(fetchErr.message)
        setPosts(data || [])
      } catch (e) { setError(`${e}`) }
      setLoading(false)
    }
    load()
  }, [])

  const handlePost = async () => {
    if (!newPost.trim() || posting || !userId) return
    setPosting(true)
    const sb = supabaseRef.current
    const { data } = await sb.from('posts').insert({ user_id: userId, content: newPost.trim() }).select().single()
    if (data) { setPosts(prev => [data, ...prev]); setNewPost('') }
    setPosting(false)
  }

  const toggleLike = async (postId: string) => {
    if (!userId) return
    const sb = supabaseRef.current
    const { data: existing } = await sb.from('post_likes').select('id').eq('post_id', postId).eq('user_id', userId).single()
    if (existing) {
      await sb.from('post_likes').delete().eq('id', existing.id)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: Math.max(0, p.like_count - 1) } : p))
    } else {
      await sb.from('post_likes').insert({ post_id: postId, user_id: userId })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p))
    }
  }

  const loadComments = async (postId: string) => {
    if (expandedComments[postId]) { setExpandedComments(prev => ({ ...prev, [postId]: false })); return }
    const sb = supabaseRef.current
    const { data } = await sb.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true })
    setComments(prev => ({ ...prev, [postId]: data || [] }))
    setExpandedComments(prev => ({ ...prev, [postId]: true }))
  }

  const addComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim()
    if (!text || !userId) return
    const sb = supabaseRef.current
    const { data } = await sb.from('comments').insert({ post_id: postId, user_id: userId, content: text }).select().single()
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }))
      setCommentTexts(prev => ({ ...prev, [postId]: '' }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p))
    }
  }

  return (
    <div className="px-4 pt-3 pb-28 space-y-2">
      {/* 글쓰기 */}
      <div className="bg-white rounded-xl border border-[#f0f0f0] p-3">
        <textarea value={newPost} onChange={e => setNewPost(e.target.value.slice(0, 500))} placeholder="동네 이야기를 나눠보세요..."
          className="w-full h-14 text-[13px] resize-none focus:outline-none" />
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-[#AEB1B9]">{newPost.length}/500</span>
          <button onClick={handlePost} disabled={!newPost.trim() || posting}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold ${newPost.trim() && !posting ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#AEB1B9]'}`}>
            {posting ? '...' : '올리기'}
          </button>
        </div>
      </div>

      {error && <div className="bg-[#FFF0E6] rounded-xl p-3"><p className="text-[11px] text-[#D08068]">{error}</p></div>}

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" /></div>
      ) : posts.length === 0 ? (
        <p className="text-[13px] text-[#AEB1B9] text-center py-8">첫 이야기를 시작해보세요!</p>
      ) : (
        posts.map(post => (
          <div key={post.id} className="bg-white rounded-xl border border-[#f0f0f0] p-3">
            <p className="text-[13px] text-[#1A1918] leading-relaxed whitespace-pre-line">{post.content}</p>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => toggleLike(post.id)} className="text-[10px] text-[#868B94] active:scale-110">❤️ {post.like_count || 0}</button>
              <button onClick={() => loadComments(post.id)} className="text-[10px] text-[#868B94]">💬 {post.comment_count || 0}</button>
              <span className="text-[10px] text-[#AEB1B9] ml-auto">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
            {/* 댓글 */}
            {expandedComments[post.id] && (
              <div className="mt-2 pt-2 border-t border-[#f0f0f0] space-y-1.5">
                {(comments[post.id] || []).map((c: any) => (
                  <div key={c.id} className="bg-[#F5F4F1] rounded-lg p-2">
                    <p className="text-[12px] text-[#1A1918]">{c.content}</p>
                    <p className="text-[9px] text-[#AEB1B9] mt-0.5">{new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input value={commentTexts[post.id] || ''} onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                    placeholder="댓글..." className="flex-1 h-8 px-2 rounded-lg bg-[#F5F4F1] text-[12px] focus:outline-none" />
                  <button onClick={() => addComment(post.id)} className="px-3 h-8 rounded-lg bg-[#3D8A5A] text-white text-[11px] font-semibold">등록</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ===== 도담장터 탭 =====
function MarketTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState(0)
  const [posting, setPosting] = useState(false)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    async function load() {
      try {
        const sb = supabaseRef.current
        const { data: { user } } = await sb.auth.getUser()
        if (user) setUserId(user.id)
        const { data, error: fetchErr } = await sb.from('market_items').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(30)
        if (fetchErr) setError(fetchErr.message)
        setItems(data || [])
      } catch (e) { setError(`${e}`) }
      setLoading(false)
    }
    load()
  }, [])

  const handlePost = async () => {
    if (!title.trim() || posting || !userId) return
    setPosting(true)
    const sb = supabaseRef.current
    const region = localStorage.getItem('dodam_market_region') || '동네'
    const { data } = await sb.from('market_items').insert({
      user_id: userId, title: title.trim(), description: desc.trim(), price, region, status: 'active',
    }).select().single()
    if (data) { setItems(prev => [data, ...prev]); setTitle(''); setDesc(''); setPrice(0); setFormOpen(false) }
    setPosting(false)
  }

  return (
    <div className="px-4 pt-3 pb-28 space-y-2">
      {/* 등록 버튼/폼 */}
      {formOpen ? (
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-3 space-y-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" className="w-full h-10 px-3 rounded-lg border border-[#f0f0f0] text-[13px]" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="설명" className="w-full h-16 px-3 py-2 rounded-lg border border-[#f0f0f0] text-[13px] resize-none" />
          <div className="flex gap-2 items-center">
            <input type="number" value={price || ''} onChange={e => setPrice(Number(e.target.value))} placeholder="가격 (0=나눔)" className="flex-1 h-10 px-3 rounded-lg border border-[#f0f0f0] text-[13px]" />
            <span className="text-[11px] text-[#868B94]">원</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFormOpen(false)} className="flex-1 py-2 rounded-lg bg-[#F5F4F1] text-[12px] text-[#868B94]">취소</button>
            <button onClick={handlePost} disabled={!title.trim() || posting}
              className={`flex-1 py-2 rounded-lg text-[12px] font-semibold ${title.trim() ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#AEB1B9]'}`}>
              {posting ? '...' : '등록'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setFormOpen(true)} className="w-full bg-[#F0F9F4] rounded-xl p-3 text-center active:opacity-80">
          <p className="text-[12px] text-[#3D8A5A] font-semibold">+ 도담장터에 올리기</p>
        </button>
      )}

      {error && <div className="bg-[#FFF0E6] rounded-xl p-3"><p className="text-[11px] text-[#D08068]">{error}</p></div>}

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#3D8A5A]/20 border-t-[#3D8A5A] rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-[#AEB1B9] text-center py-8">아직 장터 글이 없어요</p>
      ) : (
        items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-[#f0f0f0] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[#1A1918] line-clamp-1 flex-1">{item.title}</p>
              <p className="text-[12px] font-bold text-[#3D8A5A] shrink-0 ml-2">{item.price > 0 ? `${item.price.toLocaleString()}원` : '나눔'}</p>
            </div>
            {item.description && <p className="text-[10px] text-[#868B94] mt-0.5 line-clamp-2">{item.description}</p>}
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] text-[#AEB1B9]">{item.region} · {new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${item.status === 'active' ? 'bg-[#F0F9F4] text-[#3D8A5A]' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                {item.status === 'active' ? '판매중' : item.status === 'reserved' ? '예약중' : '거래완료'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
