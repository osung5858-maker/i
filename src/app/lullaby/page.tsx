'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Category = 'lullaby' | 'nursery' | 'nature'

interface Track {
  id: string
  title: string
  category: Category
  duration: string
  youtubeId?: string
  playlistId?: string
  avgSleepMin?: number
  isRecommended?: boolean
}

const LULLABY_PLAYLIST = 'PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA'
const NURSERY_PLAYLIST = 'PLAyG7B7am9dZ90gGtuco9wzMj_kdkUlMD'

const TRACKS: Track[] = [
  { id: 'l1', title: '잘자요 우리 아기', category: 'lullaby', duration: '3:24', youtubeId: '38MBgTBMM7E', avgSleepMin: 8, isRecommended: true },
  { id: 'l2', title: '꿈나라로 가는 길', category: 'lullaby', duration: '4:12', avgSleepMin: 11 },
  { id: 'l3', title: '별빛 자장가', category: 'lullaby', duration: '3:48', avgSleepMin: 9 },
  { id: 'l4', title: '달빛 아래서', category: 'lullaby', duration: '3:55' },
  { id: 'l5', title: '포근한 밤', category: 'lullaby', duration: '4:30' },
  { id: 'l6', title: '엄마 품에서', category: 'lullaby', duration: '3:15', avgSleepMin: 7 },
  { id: 'l7', title: '자장가 통합본 (1시간)', category: 'lullaby', duration: '60:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l8', title: '자장가 통합본 (2시간)', category: 'lullaby', duration: '120:00', playlistId: LULLABY_PLAYLIST },
  { id: 'n1', title: '곰 세 마리', category: 'nursery', duration: '2:18', youtubeId: 'd4OaQZtHMF0' },
  { id: 'n2', title: '작은 별', category: 'nursery', duration: '2:45' },
  { id: 'n3', title: '나비야', category: 'nursery', duration: '2:12' },
  { id: 'n4', title: '산토끼', category: 'nursery', duration: '1:58' },
  { id: 'n5', title: '동요 통합본 (1시간)', category: 'nursery', duration: '60:00', playlistId: NURSERY_PLAYLIST },
  { id: 'n6', title: '동요 통합본 (2시간)', category: 'nursery', duration: '120:00', playlistId: NURSERY_PLAYLIST },
  { id: 'w1', title: '빗소리', category: 'nature', duration: '∞', youtubeId: 'yIQd2Ya0Ziw', avgSleepMin: 10, isRecommended: true },
  { id: 'w2', title: '파도소리', category: 'nature', duration: '∞', youtubeId: 'Nep1qytq9JM', avgSleepMin: 12 },
  { id: 'w3', title: '백색소음', category: 'nature', duration: '∞', youtubeId: 'nMfPqeZjc2c', avgSleepMin: 14 },
  { id: 'w4', title: '심장소리', category: 'nature', duration: '∞', youtubeId: 'dfeIYStsEtI', avgSleepMin: 9 },
]

const CATEGORY_LABELS: Record<Category, string> = {
  lullaby: '자장가',
  nursery: '동요',
  nature: '자연음',
}

type TimerOption = 30 | 60 | 0

export default function LullabyPage() {
  const [category, setCategory] = useState<Category>('lullaby')
  const [playing, setPlaying] = useState<string | null>(null)
  const [timer, setTimer] = useState<TimerOption>(30)
  const [timerLeft, setTimerLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const filtered = TRACKS.filter((t) => t.category === category)
  const currentTrack = TRACKS.find((t) => t.id === playing)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (playing && timer > 0) {
      setTimerLeft(timer * 60)
      timerRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev === null || prev <= 1) {
            setPlaying(null)
            if (timerRef.current) clearInterval(timerRef.current)
            return null
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, timer])

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const togglePlay = useCallback((trackId: string) => {
    if (playing === trackId) {
      setPlaying(null)
      setTimerLeft(null)
    } else {
      setPlaying(trackId)
    }
  }, [playing])

  const getYouTubeEmbedUrl = (track: Track): string | null => {
    if (track.playlistId) {
      return `https://www.youtube.com/embed/videoseries?list=${track.playlistId}&autoplay=1&loop=1`
    }
    if (track.youtubeId) {
      return `https://www.youtube.com/embed/${track.youtubeId}?autoplay=1&loop=1&playlist=${track.youtubeId}`
    }
    return null
  }

  return (
    <div className="min-h-[100dvh] bg-[#1A1918] text-white pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-40 bg-[#1A1918]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <Link href="/" className="text-white/60 text-sm">←</Link>
          <h1 className="text-[15px] font-bold">수면 도우미</h1>
          <div className="w-6" />
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-40">
        {/* YouTube player */}
        {currentTrack && getYouTubeEmbedUrl(currentTrack) && (
          <div className="mx-5 mt-2 rounded-xl overflow-hidden bg-black aspect-video">
            <iframe
              src={getYouTubeEmbedUrl(currentTrack)!}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={currentTrack.title}
            />
          </div>
        )}

        {currentTrack && !getYouTubeEmbedUrl(currentTrack) && (
          <div className="mx-5 mt-2 rounded-xl bg-[#2a2a2a] p-6 text-center">
            <p className="text-[14px] font-medium text-white/80">{currentTrack.title}</p>
            <p className="text-[11px] text-white/40 mt-1">곧 추가될 예정이에요</p>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 px-5 mt-4">
          {(['lullaby', 'nursery', 'nature'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-colors ${
                category === cat ? 'bg-white text-[#1A1918]' : 'bg-[#2a2a2a] text-white/60'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Track list */}
        <div className="mt-3 px-5 space-y-1.5">
          {filtered.map((track) => {
            const isPlaying = playing === track.id
            const hasAudio = !!(track.youtubeId || track.playlistId)
            return (
              <button
                key={track.id}
                onClick={() => hasAudio ? togglePlay(track.id) : undefined}
                disabled={!hasAudio}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isPlaying ? 'bg-[#3D8A5A]/20 border border-[#3D8A5A]/40' : hasAudio ? 'bg-[#2a2a2a] border border-transparent' : 'bg-[#2a2a2a]/50 border border-transparent opacity-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  isPlaying ? 'bg-[#3D8A5A]' : 'bg-[#3a3a3a]'
                }`}>
                  <span className="text-white text-sm">{isPlaying ? '⏸' : hasAudio ? '▶' : '🔒'}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-[13px] font-medium ${isPlaying ? 'text-[#3D8A5A]' : 'text-white/90'}`}>
                    {track.title}
                  </p>
                  <p className="text-[11px] text-white/40">{track.duration}</p>
                </div>
                {track.avgSleepMin && (
                  <span className="text-[10px] text-[#3D8A5A] font-semibold shrink-0">
                    ~{track.avgSleepMin}분
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* YouTube link */}
        <div className="mx-5 mt-4 text-center">
          <a
            href={category === 'nursery'
              ? `https://www.youtube.com/playlist?list=${NURSERY_PLAYLIST}`
              : `https://www.youtube.com/playlist?list=${LULLABY_PLAYLIST}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-white/40 font-medium"
          >
            YouTube에서 전체 {CATEGORY_LABELS[category]} 듣기 →
          </a>
        </div>
      </div>

      {/* Bottom control bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#2a2a2a] border-t border-[#3a3a3a] pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">{currentTrack.title}</p>
                <p className="text-[11px] text-white/40">{CATEGORY_LABELS[currentTrack.category]}</p>
              </div>
              <button
                onClick={() => togglePlay(currentTrack.id)}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
              >
                <span className="text-[#1A1918] text-sm">⏹</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-5 pb-3">
              <div className="flex gap-1.5">
                {([30, 60, 0] as TimerOption[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimer(t)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold ${
                      timer === t ? 'bg-[#3D8A5A] text-white' : 'bg-[#3a3a3a] text-white/40'
                    }`}
                  >
                    {t === 0 ? '무한' : `${t}분`}
                  </button>
                ))}
              </div>
              {timerLeft !== null && (
                <span className="text-[11px] text-white/40 font-mono">
                  {formatTimer(timerLeft)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
