'use client'

import { useState, useEffect, useRef } from 'react'

type Side = 'left' | 'right'

interface FeedSession {
  side: Side
  startTime: number
  duration: number // seconds
  date: string
}

export default function FeedTimerPage() {
  const [active, setActive] = useState(false)
  const [side, setSide] = useState<Side>('left')
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const startRef = useRef(0)

  const [sessions, setSessions] = useState<FeedSession[]>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_feed_sessions') || '[]') } catch { return [] } }
    return []
  })

  // 타이머
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [active])

  const start = (s: Side) => {
    setSide(s)
    setActive(true)
    startRef.current = Date.now()
    setStartTime(Date.now())
    setElapsed(0)
    if (navigator.vibrate) navigator.vibrate(30)
  }

  const stop = () => {
    setActive(false)
    const duration = Math.floor((Date.now() - startRef.current) / 1000)
    if (duration >= 5) { // 5초 이상만 기록
      const session: FeedSession = { side, startTime, duration, date: new Date().toISOString().split('T')[0] }
      const next = [session, ...sessions].slice(0, 100)
      setSessions(next)
      localStorage.setItem('dodam_feed_sessions', JSON.stringify(next))
    }
    setElapsed(0)
  }

  const switchSide = () => {
    // 현재 세션 저장 후 반대쪽 시작
    const duration = Math.floor((Date.now() - startRef.current) / 1000)
    if (duration >= 5) {
      const session: FeedSession = { side, startTime, duration, date: new Date().toISOString().split('T')[0] }
      const next = [session, ...sessions].slice(0, 100)
      setSessions(next)
      localStorage.setItem('dodam_feed_sessions', JSON.stringify(next))
    }
    const newSide = side === 'left' ? 'right' : 'left'
    setSide(newSide)
    startRef.current = Date.now()
    setStartTime(Date.now())
    setElapsed(0)
    if (navigator.vibrate) navigator.vibrate([30, 50, 30])
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  // 오늘 통계
  const today = new Date().toISOString().split('T')[0]
  const todaySessions = sessions.filter(s => s.date === today)
  const todayTotal = todaySessions.reduce((sum, s) => sum + s.duration, 0)
  const todayLeft = todaySessions.filter(s => s.side === 'left').reduce((sum, s) => sum + s.duration, 0)
  const todayRight = todaySessions.filter(s => s.side === 'right').reduce((sum, s) => sum + s.duration, 0)
  const lastSide = sessions.length > 0 ? sessions[0].side : null

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">수유 타이머</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-6 pb-28 space-y-4">

        {/* 타이머 메인 */}
        <div className="bg-white rounded-2xl border border-[#f0f0f0] p-6 text-center">
          {/* 시간 표시 */}
          <p className={`text-[48px] font-bold tracking-wider ${active ? 'text-[#3D8A5A]' : 'text-[#1A1918]'}`}>
            {formatTime(elapsed)}
          </p>

          {/* 좌/우 표시 */}
          {active && (
            <div className="flex items-center justify-center gap-2 mt-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${side === 'left' ? 'bg-[#4A90D9]' : 'bg-[#F0F0F0]'}`} />
              <p className="text-[14px] font-semibold text-[#1A1918]">{side === 'left' ? '왼쪽' : '오른쪽'}</p>
              <div className={`w-3 h-3 rounded-full ${side === 'right' ? 'bg-[#D089A5]' : 'bg-[#F0F0F0]'}`} />
            </div>
          )}

          {/* 다음 수유 추천 */}
          {!active && lastSide && (
            <p className="text-[12px] text-[#868B94] mt-2 mb-4">
              지난번 <span className="font-semibold">{lastSide === 'left' ? '왼쪽' : '오른쪽'}</span>이었으니 →{' '}
              <span className="text-[#3D8A5A] font-semibold">{lastSide === 'left' ? '오른쪽' : '왼쪽'}</span> 추천
            </p>
          )}

          {/* 버튼 */}
          {active ? (
            <div className="flex gap-3 mt-4">
              <button onClick={switchSide}
                className="flex-1 py-3.5 rounded-xl bg-[#4A90D9] text-white text-[14px] font-semibold active:opacity-80">
                ↔ 교대 ({side === 'left' ? '오른쪽' : '왼쪽'}으로)
              </button>
              <button onClick={stop}
                className="flex-1 py-3.5 rounded-xl bg-[#D08068] text-white text-[14px] font-semibold active:opacity-80">
                ⏹ 종료
              </button>
            </div>
          ) : (
            <div className="flex gap-3 mt-4">
              <button onClick={() => start('left')}
                className="flex-1 py-4 rounded-xl bg-[#4A90D9] text-white text-[15px] font-semibold active:opacity-80">
                <span className="text-xl">🤱</span><br />
                <span className="text-[13px]">왼쪽 시작</span>
              </button>
              <button onClick={() => start('right')}
                className="flex-1 py-4 rounded-xl bg-[#D089A5] text-white text-[15px] font-semibold active:opacity-80">
                <span className="text-xl">🤱</span><br />
                <span className="text-[13px]">오른쪽 시작</span>
              </button>
            </div>
          )}
        </div>

        {/* 오늘 통계 */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-3">오늘 수유</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <p className="text-[20px] font-bold text-[#1A1918]">{todaySessions.length}</p>
              <p className="text-[10px] text-[#868B94]">총 횟수</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold text-[#4A90D9]">{formatTime(todayLeft)}</p>
              <p className="text-[10px] text-[#868B94]">왼쪽</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold text-[#D089A5]">{formatTime(todayRight)}</p>
              <p className="text-[10px] text-[#868B94]">오른쪽</p>
            </div>
          </div>
          {/* 균형 바 */}
          {todayTotal > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden">
              <div className="bg-[#4A90D9]" style={{ width: `${(todayLeft / todayTotal) * 100}%` }} />
              <div className="bg-[#D089A5]" style={{ width: `${(todayRight / todayTotal) * 100}%` }} />
            </div>
          )}
        </div>

        {/* 최근 기록 */}
        {todaySessions.length > 0 && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <p className="text-[13px] font-bold text-[#1A1918] mb-2">최근 기록</p>
            {todaySessions.slice(0, 6).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#f0f0f0] last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.side === 'left' ? 'bg-[#4A90D9]' : 'bg-[#D089A5]'}`} />
                  <span className="text-[12px] text-[#1A1918]">{s.side === 'left' ? '왼쪽' : '오른쪽'}</span>
                </div>
                <span className="text-[12px] text-[#868B94]">{formatTime(s.duration)}</span>
                <span className="text-[10px] text-[#AEB1B9]">{new Date(s.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
