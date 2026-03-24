'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Child, GrowthRecord, CareEvent } from '@/types'

type TabType = 'photo' | 'growth' | 'routine'

interface PhotoEntry {
  id: string
  url: string
  date: string
  label: string
}

function getAgeLabel(birthdate: string, date: string): string {
  const birth = new Date(birthdate)
  const d = new Date(date)
  const months = (d.getFullYear() - birth.getFullYear()) * 12 + (d.getMonth() - birth.getMonth())
  if (months < 1) return '신생아'
  return `${months}개월`
}

export default function TimelapsePage() {
  const [child, setChild] = useState<Child | null>(null)
  const [tab, setTab] = useState<TabType>('photo')
  const [loading, setLoading] = useState(true)

  // 사진
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [playingPhoto, setPlayingPhoto] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // 성장
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([])
  const [playingGrowth, setPlayingGrowth] = useState(false)
  const [growthIndex, setGrowthIndex] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 루틴
  const [routineData, setRoutineData] = useState<{ date: string; events: CareEvent[] }[]>([])
  const [playingRoutine, setPlayingRoutine] = useState(false)
  const [routineIndex, setRoutineIndex] = useState(0)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding'); return }

      const { data: children } = await supabase
        .from('children').select('*').eq('user_id', user.id).limit(1)
      if (!children || children.length === 0) return
      const c = children[0] as Child
      setChild(c)

      // 사진 (로컬 스토리지)
      const savedPhotos = localStorage.getItem('dodam-photos')
      if (savedPhotos) {
        const parsed = JSON.parse(savedPhotos) as PhotoEntry[]
        setPhotos(parsed.map((p) => ({ ...p, label: getAgeLabel(c.birthdate, p.date) })))
      }

      // 성장 기록
      const { data: growth } = await supabase
        .from('growth_records').select('*').eq('child_id', c.id)
        .order('measured_at', { ascending: true })
      if (growth) setGrowthRecords(growth as GrowthRecord[])

      // 루틴 (최근 7일)
      const days: { date: string; events: CareEvent[] }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const { data: dayEvents } = await supabase
          .from('events').select('*').eq('child_id', c.id)
          .gte('start_ts', `${dateStr}T00:00:00`)
          .lte('start_ts', `${dateStr}T23:59:59`)
          .order('start_ts')
        days.push({ date: dateStr, events: (dayEvents || []) as CareEvent[] })
      }
      setRoutineData(days)

      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 사진 타임랩스 재생
  useEffect(() => {
    if (!playingPhoto || photos.length < 2) return
    const timer = setInterval(() => {
      setPhotoIndex((prev) => {
        if (prev >= photos.length - 1) { setPlayingPhoto(false); return photos.length - 1 }
        return prev + 1
      })
    }, 1200)
    return () => clearInterval(timer)
  }, [playingPhoto, photos.length])

  // 성장 타임랩스 재생
  useEffect(() => {
    if (!playingGrowth || growthRecords.length < 2) return
    setGrowthIndex(0)
    const timer = setInterval(() => {
      setGrowthIndex((prev) => {
        if (prev >= growthRecords.length - 1) { setPlayingGrowth(false); return growthRecords.length - 1 }
        return prev + 1
      })
    }, 800)
    return () => clearInterval(timer)
  }, [playingGrowth, growthRecords.length])

  // 루틴 타임랩스 재생
  useEffect(() => {
    if (!playingRoutine || routineData.length < 2) return
    setRoutineIndex(0)
    const timer = setInterval(() => {
      setRoutineIndex((prev) => {
        if (prev >= routineData.length - 1) { setPlayingRoutine(false); return routineData.length - 1 }
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [playingRoutine, routineData.length])

  // 사진 업로드 (리사이즈 + 용량 제한)
  const MAX_PHOTOS = 30
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (photos.length >= MAX_PHOTOS) { alert(`사진은 최대 ${MAX_PHOTOS}장까지 저장할 수 있어요`); return }
    // 이미지 리사이즈 (최대 400px, JPEG 60% 품질)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 400
      let w = img.width, h = img.height
      if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize } }
      else { if (h > maxSize) { w = w * maxSize / h; h = maxSize } }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
      const compressed = canvas.toDataURL('image/jpeg', 0.6)
      const entry: PhotoEntry = {
        id: crypto.randomUUID(),
        url: compressed,
        date: new Date().toISOString().split('T')[0],
        label: child ? getAgeLabel(child.birthdate, new Date().toISOString()) : '',
      }
      const updated = [...photos, entry]
      setPhotos(updated)
      try { localStorage.setItem('dodam-photos', JSON.stringify(updated)) }
      catch { alert('저장 공간이 부족해요. 오래된 사진을 삭제해주세요.') }
    }
    img.src = URL.createObjectURL(file)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-white">
        <div className="w-10 h-10 border-3 border-[#FF6F0F]/20 border-t-[#FF6F0F] rounded-full animate-spin" />
      </div>
    )
  }

  const TYPE_COLORS: Record<string, string> = {
    feed: '#FF6F0F', sleep: '#5B6DFF', poop: '#C68A2E', pee: '#3DA5F5', temp: '#F25555',
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#ECECEC]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto w-full">
          <button onClick={() => router.back()} className="text-[13px] text-[#6B6966]">뒤로</button>
          <h1 className="text-[15px] font-bold text-[#212124]">{child?.name}의 타임랩스</h1>
          <div className="w-8" />
        </div>
      </header>

      {/* 탭 */}
      <div className="flex border-b border-[#ECECEC] max-w-lg mx-auto w-full">
        {([
          { key: 'photo' as TabType, label: '📸 사진', count: photos.length },
          { key: 'growth' as TabType, label: '📊 성장', count: growthRecords.length },
          { key: 'routine' as TabType, label: '🕐 루틴', count: routineData.filter(d => d.events.length > 0).length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-[13px] font-semibold text-center border-b-2 transition-colors ${
              tab === t.key ? 'border-[#FF6F0F] text-[#FF6F0F]' : 'border-transparent text-[#9E9A95]'
            }`}
          >
            {t.label} {t.count > 0 && <span className="text-[10px]">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto w-full px-5 pt-4">

          {/* ===== 사진 타임랩스 ===== */}
          {tab === 'photo' && (
            <>
              {photos.length >= 2 ? (
                <div className="mb-4">
                  <div className="aspect-[3/4] rounded-2xl bg-[#F0EDE8] overflow-hidden relative">
                    <img
                      src={photos[playingPhoto ? photoIndex : photos.length - 1]?.url}
                      alt=""
                      className="w-full h-full object-cover transition-all duration-300"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <p className="text-white text-[15px] font-bold">
                        {photos[playingPhoto ? photoIndex : photos.length - 1]?.label}
                      </p>
                      <p className="text-white/70 text-[12px]">
                        {photos[playingPhoto ? photoIndex : photos.length - 1]?.date}
                      </p>
                    </div>
                    {playingPhoto && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/50 text-white text-[11px]">
                        {photoIndex + 1} / {photos.length}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setPlayingPhoto(true); setPhotoIndex(0) }}
                      disabled={playingPhoto}
                      className="flex-1 h-12 rounded-2xl bg-[#FF6F0F] text-white text-[14px] font-semibold active:scale-[0.98] disabled:opacity-50"
                    >
                      {playingPhoto ? `재생 중 ${photoIndex + 1}/${photos.length}` : '▶ 타임랩스 재생'}
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-12 h-12 rounded-2xl border border-[#ECECEC] flex items-center justify-center active:bg-[#F0EDE8]"
                    >
                      <span className="text-lg">+</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-[#FFF0E6] flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">📸</span>
                  </div>
                  <p className="text-[16px] font-bold text-[#212124]">사진 타임랩스</p>
                  <p className="text-[13px] text-[#6B6966] mt-2 leading-relaxed">
                    매월 같은 포즈로 사진을 찍으면<br />
                    아이의 성장을 한눈에 볼 수 있어요
                  </p>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="mt-6 px-8 py-3 rounded-2xl bg-[#FF6F0F] text-white text-[14px] font-semibold active:scale-95"
                  >
                    첫 사진 추가하기
                  </button>
                  <p className="text-[11px] text-[#9E9A95] mt-4">2장 이상이면 타임랩스를 볼 수 있어요</p>
                </div>
              )}

              {/* 사진 그리드 */}
              {photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-[13px] font-bold text-[#212124] mb-2">모든 사진 ({photos.length}장)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p) => (
                      <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden">
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 px-1.5 py-1">
                          <p className="text-[9px] text-white font-medium">{p.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
            </>
          )}

          {/* ===== 성장 타임랩스 ===== */}
          {tab === 'growth' && (
            <>
              {growthRecords.length >= 2 ? (
                <div>
                  {/* 현재 보이는 데이터 */}
                  <div className="p-5 rounded-2xl bg-[#FFF8F3] border border-[#FFE4CC] mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[12px] text-[#6B6966]">
                        {growthRecords[playingGrowth ? growthIndex : growthRecords.length - 1]?.measured_at}
                      </p>
                      {child && (
                        <p className="text-[12px] font-medium text-[#FF6F0F]">
                          {getAgeLabel(child.birthdate, growthRecords[playingGrowth ? growthIndex : growthRecords.length - 1]?.measured_at || '')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-4">
                      {(() => {
                        const r = growthRecords[playingGrowth ? growthIndex : growthRecords.length - 1]
                        return (
                          <>
                            {r?.weight_kg && (
                              <div>
                                <p className="text-[11px] text-[#6B6966]">몸무게</p>
                                <p className="text-[28px] font-bold text-[#FF6F0F]">{Number(r.weight_kg).toFixed(1)}<span className="text-[14px]">kg</span></p>
                              </div>
                            )}
                            {r?.height_cm && (
                              <div>
                                <p className="text-[11px] text-[#6B6966]">키</p>
                                <p className="text-[28px] font-bold text-[#5B6DFF]">{Number(r.height_cm).toFixed(1)}<span className="text-[14px]">cm</span></p>
                              </div>
                            )}
                            {r?.head_cm && (
                              <div>
                                <p className="text-[11px] text-[#6B6966]">머리</p>
                                <p className="text-[28px] font-bold text-[#6B6966]">{Number(r.head_cm).toFixed(1)}<span className="text-[14px]">cm</span></p>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    {playingGrowth && (
                      <div className="mt-2 h-1 bg-[#FFE4CC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF6F0F] rounded-full transition-all duration-700"
                          style={{ width: `${((growthIndex + 1) / growthRecords.length) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setPlayingGrowth(true); setGrowthIndex(0) }}
                    disabled={playingGrowth}
                    className="w-full h-12 rounded-2xl bg-[#FF6F0F] text-white text-[14px] font-semibold active:scale-[0.98] disabled:opacity-50"
                  >
                    {playingGrowth ? `재생 중 ${growthIndex + 1}/${growthRecords.length}` : '▶ 성장 타임랩스 재생'}
                  </button>

                  {/* 기록 리스트 */}
                  <div className="mt-6 space-y-2">
                    {[...growthRecords].reverse().map((r) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F0EDE8]">
                        <p className="text-[12px] text-[#6B6966] w-20 shrink-0">{r.measured_at}</p>
                        <div className="flex gap-3 text-[13px]">
                          {r.weight_kg && <span className="font-medium text-[#FF6F0F]">{Number(r.weight_kg).toFixed(1)}kg</span>}
                          {r.height_cm && <span className="font-medium text-[#5B6DFF]">{Number(r.height_cm).toFixed(1)}cm</span>}
                          {r.head_cm && <span className="font-medium text-[#6B6966]">{Number(r.head_cm).toFixed(1)}cm</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-[#FFF0E6] flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">📊</span>
                  </div>
                  <p className="text-[16px] font-bold text-[#212124]">성장 타임랩스</p>
                  <p className="text-[13px] text-[#6B6966] mt-2">성장 기록이 2건 이상이면 볼 수 있어요</p>
                  <button
                    onClick={() => router.push('/growth/add')}
                    className="mt-6 px-8 py-3 rounded-2xl bg-[#FF6F0F] text-white text-[14px] font-semibold active:scale-95"
                  >
                    성장 기록 추가
                  </button>
                </div>
              )}
            </>
          )}

          {/* ===== 루틴 타임랩스 ===== */}
          {tab === 'routine' && (
            <>
              {routineData.some((d) => d.events.length > 0) ? (
                <div>
                  <p className="text-[13px] text-[#6B6966] mb-3">최근 7일간 루틴 패턴 변화</p>

                  {/* 현재 날짜의 24시간 그리드 */}
                  <div className="p-4 rounded-2xl bg-[#F0EDE8] border border-[#ECECEC] mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[14px] font-bold text-[#212124]">
                        {routineData[playingRoutine ? routineIndex : routineData.length - 1]?.date}
                      </p>
                      <p className="text-[12px] text-[#6B6966]">
                        {routineData[playingRoutine ? routineIndex : routineData.length - 1]?.events.length}건
                      </p>
                    </div>

                    {/* 24시간 바 */}
                    <div className="h-10 bg-white rounded-lg flex overflow-hidden border border-[#ECECEC]">
                      {Array.from({ length: 24 }, (_, h) => {
                        const dayData = routineData[playingRoutine ? routineIndex : routineData.length - 1]
                        const hourEvents = dayData?.events.filter((e) => new Date(e.start_ts).getHours() === h) || []
                        const event = hourEvents[0]
                        const color = event ? TYPE_COLORS[event.type] || '#ECECEC' : 'transparent'
                        return (
                          <div
                            key={h}
                            className="flex-1 transition-colors duration-300"
                            style={{ backgroundColor: color }}
                            title={`${h}시 ${event?.type || ''}`}
                          />
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-[#9E9A95]">0시</span>
                      <span className="text-[9px] text-[#9E9A95]">6시</span>
                      <span className="text-[9px] text-[#9E9A95]">12시</span>
                      <span className="text-[9px] text-[#9E9A95]">18시</span>
                      <span className="text-[9px] text-[#9E9A95]">24시</span>
                    </div>

                    {playingRoutine && (
                      <div className="mt-2 h-1 bg-[#ECECEC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF6F0F] rounded-full transition-all duration-500"
                          style={{ width: `${((routineIndex + 1) / routineData.length) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 범례 */}
                  <div className="flex gap-3 mb-4 flex-wrap">
                    {Object.entries(TYPE_COLORS).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                        <span className="text-[11px] text-[#6B6966]">
                          {type === 'feed' ? '수유' : type === 'sleep' ? '수면' : type === 'poop' ? '대변' : type === 'pee' ? '소변' : '체온'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => { setPlayingRoutine(true); setRoutineIndex(0) }}
                    disabled={playingRoutine}
                    className="w-full h-12 rounded-2xl bg-[#FF6F0F] text-white text-[14px] font-semibold active:scale-[0.98] disabled:opacity-50"
                  >
                    {playingRoutine ? `재생 중 ${routineIndex + 1}/${routineData.length}` : '▶ 루틴 변화 재생'}
                  </button>

                  {/* 7일 미니 그리드 */}
                  <div className="mt-6 space-y-2">
                    {routineData.map((day, i) => (
                      <div key={day.date} className={`flex items-center gap-2 p-2 rounded-lg ${
                        (playingRoutine && i === routineIndex) ? 'bg-[#FFF8F3] border border-[#FFE4CC]' : ''
                      }`}>
                        <span className="text-[11px] text-[#6B6966] w-20 shrink-0">{day.date.slice(5)}</span>
                        <div className="flex-1 h-4 bg-[#F0EDE8] rounded flex overflow-hidden">
                          {Array.from({ length: 24 }, (_, h) => {
                            const ev = day.events.find((e) => new Date(e.start_ts).getHours() === h)
                            return (
                              <div
                                key={h}
                                className="flex-1"
                                style={{ backgroundColor: ev ? TYPE_COLORS[ev.type] || '#ECECEC' : 'transparent' }}
                              />
                            )
                          })}
                        </div>
                        <span className="text-[11px] text-[#9E9A95] w-8 text-right">{day.events.length}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-[#FFF0E6] flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🕐</span>
                  </div>
                  <p className="text-[16px] font-bold text-[#212124]">루틴 타임랩스</p>
                  <p className="text-[13px] text-[#6B6966] mt-2">기록이 쌓이면 루틴 변화를 볼 수 있어요</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
