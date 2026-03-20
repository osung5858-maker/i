'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Category = 'lullaby' | 'nursery' | 'nature'

interface Track {
  id: string
  title: string
  category: Category
  duration: string
  youtubeId?: string
  avgSleepMin?: number
  isRecommended?: boolean
}

const TRACKS: Track[] = [
  // 자장가 (YouTube 채널 콘텐츠)
  { id: 'l1', title: '잘자요 우리 아기', category: 'lullaby', duration: '3:24', youtubeId: '38MBgTBMM7E', avgSleepMin: 8, isRecommended: true },
  { id: 'l2', title: '꿈나라로 가는 길', category: 'lullaby', duration: '4:12', avgSleepMin: 11 },
  { id: 'l3', title: '별빛 자장가', category: 'lullaby', duration: '3:48', avgSleepMin: 9 },
  { id: 'l4', title: '달빛 아래서', category: 'lullaby', duration: '3:55' },
  { id: 'l5', title: '포근한 밤', category: 'lullaby', duration: '4:30' },
  { id: 'l6', title: '엄마 품에서', category: 'lullaby', duration: '3:15', avgSleepMin: 7 },
  { id: 'l7', title: '자장가 통합본 (1시간)', category: 'lullaby', duration: '60:00' },
  { id: 'l8', title: '자장가 통합본 (2시간)', category: 'lullaby', duration: '120:00' },
  // 동요
  { id: 'n1', title: '곰 세 마리', category: 'nursery', duration: '2:18', youtubeId: 'd4OaQZtHMF0' },
  { id: 'n2', title: '작은 별', category: 'nursery', duration: '2:45' },
  { id: 'n3', title: '나비야', category: 'nursery', duration: '2:12' },
  { id: 'n4', title: '산토끼', category: 'nursery', duration: '1:58' },
  { id: 'n5', title: '동요 통합본 (1시간)', category: 'nursery', duration: '60:00' },
  { id: 'n6', title: '동요 통합본 (2시간)', category: 'nursery', duration: '120:00' },
  // 자연음
  { id: 'w1', title: '빗소리', category: 'nature', duration: '∞', avgSleepMin: 10, isRecommended: true },
  { id: 'w2', title: '파도소리', category: 'nature', duration: '∞', avgSleepMin: 12 },
  { id: 'w3', title: '백색소음', category: 'nature', duration: '∞', avgSleepMin: 14 },
  { id: 'w4', title: '심장소리', category: 'nature', duration: '∞', avgSleepMin: 9 },
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
  const recommended = filtered.find((t) => t.isRecommended) || filtered[0]
  const currentTrack = TRACKS.find((t) => t.id === playing)

  // 타이머
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

  const togglePlay = (trackId: string) => {
    if (playing === trackId) {
      setPlaying(null)
      setTimerLeft(null)
    } else {
      setPlaying(trackId)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#1A1918] text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-[#1A1918]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <Link href="/" className="w-10 h-10 flex items-center justify-center text-white/60 active:opacity-50">
            ✕
          </Link>
          <h1 className="text-[15px] font-bold">🌙 수면 도우미</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-40">
        {/* AI 추천 배너 */}
        {recommended && (
          <div className="mx-4 mt-2 p-3.5 rounded-2xl bg-[#2a2a2a] border border-[#3a3a3a]">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-[#3D8A5A] text-[10px] font-bold">🤖 AI 추천</span>
            </div>
            <p className="text-[13px] text-white/90">
              {recommended.title}
              {recommended.avgSleepMin && (
                <span className="text-[#3D8A5A]"> — 평균 {recommended.avgSleepMin}분 만에 잠들어요</span>
              )}
            </p>
            <button
              onClick={() => togglePlay(recommended.id)}
              className="mt-2 px-4 py-2 rounded-xl bg-[#3D8A5A] text-[12px] font-semibold active:scale-95 transition-transform"
            >
              {playing === recommended.id ? '⏸ 일시정지' : '▶ 바로 재생'}
            </button>
          </div>
        )}

        {/* 카테고리 탭 */}
        <div className="flex gap-2 px-4 mt-4">
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

        {/* 트랙 리스트 */}
        <div className="mt-4 px-4 space-y-2">
          {filtered.map((track) => {
            const isPlaying = playing === track.id
            return (
              <button
                key={track.id}
                onClick={() => togglePlay(track.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-colors active:scale-[0.98] ${
                  isPlaying ? 'bg-[#3D8A5A]/20 border border-[#3D8A5A]/40' : 'bg-[#2a2a2a] border border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isPlaying ? 'bg-[#3D8A5A]' : 'bg-[#3a3a3a]'
                }`}>
                  <span className="text-white text-sm">{isPlaying ? '⏸' : '▶'}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-[13px] font-medium ${isPlaying ? 'text-[#3D8A5A]' : 'text-white/90'}`}>
                    {track.isRecommended && <span className="text-[10px] mr-1">⭐</span>}
                    {track.title}
                  </p>
                  <p className="text-[11px] text-white/40">{track.duration}</p>
                </div>
                {track.avgSleepMin && (
                  <span className="text-[10px] text-[#3D8A5A] font-semibold shrink-0">
                    평균 {track.avgSleepMin}분
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* YouTube 채널 링크 */}
        <div className="mx-4 mt-6 text-center">
          <a
            href={category === 'nursery'
              ? 'https://www.youtube.com/playlist?list=PLAyG7B7am9dZ90gGtuco9wzMj_kdkUlMD'
              : 'https://www.youtube.com/playlist?list=PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-white/40 underline"
          >
            더 많은 {CATEGORY_LABELS[category]} 듣기 →
          </a>
        </div>
      </div>

      {/* 재생 중 바 + 타이머 */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#2a2a2a] border-t border-[#3a3a3a] pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-lg mx-auto">
            {/* Now Playing */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3D8A5A] to-[#5B6DFF] flex items-center justify-center shrink-0">
                <span className="text-lg">🎵</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">{currentTrack.title}</p>
                <p className="text-[11px] text-white/40">AI 자장가</p>
              </div>
              <button
                onClick={() => togglePlay(currentTrack.id)}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform"
              >
                <span className="text-[#1A1918] text-sm">⏸</span>
              </button>
            </div>

            {/* 타이머 */}
            <div className="flex items-center justify-between px-4 pb-3">
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
                  ⏱ {formatTimer(timerLeft)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
