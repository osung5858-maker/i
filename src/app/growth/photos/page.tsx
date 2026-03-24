'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface PhotoEntry {
  id: string
  url: string
  date: string
  ageMonths: number
}

export default function PhotoTimelapsePage() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [uploading, setUploading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 로컬 스토리지에서 사진 로드 (MVP: 로컬 저장)
    const saved = localStorage.getItem('dodam-photos')
    if (saved) setPhotos(JSON.parse(saved))
  }, [])

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      const now = new Date()
      const entry: PhotoEntry = {
        id: crypto.randomUUID(),
        url,
        date: now.toISOString().split('T')[0],
        ageMonths: 0, // TODO: 아기 개월 수 계산
      }

      const updated = [...photos, entry]
      setPhotos(updated)
      localStorage.setItem('dodam-photos', JSON.stringify(updated))
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const handlePlay = () => {
    if (photos.length < 2) return
    setPlaying(true)
    setCurrentIndex(0)
  }

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= photos.length - 1) {
          setPlaying(false)
          return photos.length - 1
        }
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [playing, photos.length])

  const handleDelete = (id: string) => {
    const updated = photos.filter((p) => p.id !== id)
    setPhotos(updated)
    localStorage.setItem('dodam-photos', JSON.stringify(updated))
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECECEC]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-[13px] text-[#6B6966]">뒤로</button>
          <h1 className="text-[15px] font-bold text-[#212124]">사진 타임랩스</h1>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-[12px] font-semibold text-[#FF6F0F]"
          >
            + 추가
          </button>
        </div>
      </header>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28">
        {/* 재생 영역 */}
        {photos.length >= 2 && (
          <div className="mb-4">
            <div className="aspect-square rounded-2xl bg-[#F0EDE8] overflow-hidden relative">
              {playing || currentIndex > 0 ? (
                <img
                  src={photos[currentIndex]?.url}
                  alt=""
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              ) : (
                <img
                  src={photos[photos.length - 1]?.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              {playing && (
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/50 text-white text-[11px]">
                  {currentIndex + 1} / {photos.length}
                </div>
              )}
            </div>
            <button
              onClick={handlePlay}
              disabled={playing}
              className="w-full h-11 rounded-xl bg-[#FF6F0F] text-white text-[13px] font-semibold mt-3 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {playing ? '재생 중...' : '▶ 타임랩스 재생'}
            </button>
          </div>
        )}

        {/* 사진 그리드 */}
        {photos.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F0EDE8] flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">📸</span>
            </div>
            <p className="text-[14px] font-semibold text-[#212124]">아직 사진이 없어요</p>
            <p className="text-[12px] text-[#6B6966] mt-1">매월 같은 포즈로 사진을 찍어보세요</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-4 px-6 py-2.5 rounded-xl bg-[#FF6F0F] text-white text-[13px] font-semibold active:scale-95 transition-transform"
            >
              첫 사진 추가
            </button>
          </div>
        ) : (
          <>
            <p className="text-[13px] font-bold text-[#212124] mb-2">사진 {photos.length}장</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#F0EDE8]">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 px-2 py-1">
                    <p className="text-[10px] text-white">{photo.date}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-[11px] text-[#9E9A95] text-center mt-6">
          💡 매월 같은 장소, 같은 포즈로 사진을 찍으면<br />타임랩스가 더 멋져요!
        </p>
      </div>
    </div>
  )
}
