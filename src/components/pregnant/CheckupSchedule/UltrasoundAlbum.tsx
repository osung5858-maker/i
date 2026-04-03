'use client'

import { useState, useEffect, useCallback } from 'react'
import { XIcon, CameraIcon } from '@/components/ui/Icons'
import type { CheckupResult, CheckupMedia } from './types'
import { fetchAllCheckupResults } from '@/lib/supabase/pregRecord'
import { getSignedUrls } from '@/lib/supabase/storage'
import { DEFAULT_CHECKUPS } from '@/constants/checkups'

interface AlbumItem {
  week?: number
  title: string
  checkupId: string
  media: CheckupMedia & { signedUrl?: string }
}

export default function UltrasoundAlbum() {
  const [items, setItems] = useState<AlbumItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<AlbumItem | null>(null)

  const load = useCallback(async () => {
    try {
      const results = await fetchAllCheckupResults()
      const allMedia: AlbumItem[] = []
      for (const r of results) {
        const dc = DEFAULT_CHECKUPS.find(d => d.id === r.checkup_id)
        for (const m of r.media || []) {
          allMedia.push({
            week: dc?.week,
            title: dc?.title || r.checkup_id,
            checkupId: r.checkup_id,
            media: m,
          })
        }
      }
      // Get signed URLs
      const paths = allMedia.map(a => a.media.path).filter(Boolean)
      if (paths.length > 0) {
        const urlMap = await getSignedUrls(paths)
        for (const item of allMedia) {
          item.media.signedUrl = urlMap.get(item.media.path)
        }
      }
      // Sort by week
      allMedia.sort((a, b) => (a.week ?? 99) - (b.week ?? 99))
      setItems(allMedia)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
        <div className="h-6 w-32 bg-[#F5F1EC] rounded animate-pulse mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square bg-[#F5F1EC] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 text-center">
        <CameraIcon className="w-8 h-8 text-tertiary mx-auto mb-2" />
        <p className="text-body text-secondary">초음파 사진이 없어요</p>
        <p className="text-caption text-tertiary mt-1">검진 결과에서 사진을 추가해보세요</p>
      </div>
    )
  }

  // Group by week
  const grouped = new Map<number | string, AlbumItem[]>()
  for (const item of items) {
    const key = item.week ?? 'etc'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-body-emphasis font-bold text-primary">초음파 앨범</p>
          <p className="text-caption text-tertiary">{items.length}장</p>
        </div>

        <div className="px-4 pb-4 space-y-4">
          {Array.from(grouped.entries()).map(([week, group]) => (
            <div key={String(week)}>
              <p className="text-caption text-[var(--color-primary)] font-semibold mb-2">
                {typeof week === 'number' ? `${week}주` : '기타'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {group.map((item, idx) => (
                  <button
                    key={`${item.media.path}-${idx}`}
                    onClick={() => setLightbox(item)}
                    className="aspect-square rounded-xl overflow-hidden border border-[#E8E4DF] active:opacity-80"
                  >
                    {item.media.type === 'image' ? (
                      <img
                        src={item.media.signedUrl || ''}
                        alt={`${item.title} 초음파`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#F5F1EC] flex items-center justify-center relative">
                        <video
                          src={item.media.signedUrl || ''}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-fadeIn"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center z-10"
          >
            <XIcon className="w-6 h-6 text-white" />
          </button>

          <div className="max-w-full max-h-full p-4" onClick={e => e.stopPropagation()}>
            {lightbox.media.type === 'image' ? (
              <img
                src={lightbox.media.signedUrl || ''}
                alt={`${lightbox.title} 초음파`}
                className="max-w-full max-h-[85vh] rounded-xl object-contain"
              />
            ) : (
              <video
                src={lightbox.media.signedUrl || ''}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-xl"
              />
            )}
            <div className="text-center mt-3">
              <p className="text-body text-white font-semibold">{lightbox.title}</p>
              {lightbox.week && (
                <p className="text-caption text-white/70">{lightbox.week}주차</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
