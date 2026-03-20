'use client'

import { useState, useEffect, useRef } from 'react'
import type { GrowthRecord } from '@/types'

interface Props {
  records: GrowthRecord[]
  childName: string
}

export default function GrowthTimelapse({ records, childName }: Props) {
  const [playing, setPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const weightRecords = records.filter((r) => r.weight_kg)

  useEffect(() => {
    if (!playing || weightRecords.length < 2) return

    setCurrentIndex(0)
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= weightRecords.length - 1) {
          setPlaying(false)
          return weightRecords.length - 1
        }
        return prev + 1
      })
    }, 800)

    return () => clearInterval(interval)
  }, [playing, weightRecords.length])

  // 캔버스에 차트 그리기
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || weightRecords.length < 1) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    // 클리어
    ctx.clearRect(0, 0, w, h)

    const padding = { top: 20, right: 20, bottom: 30, left: 40 }
    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom

    const weights = weightRecords.map((r) => Number(r.weight_kg))
    const minW = Math.floor(Math.min(...weights) - 1)
    const maxW = Math.ceil(Math.max(...weights) + 1)

    // Y축 그리드
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    for (let v = minW; v <= maxW; v++) {
      const y = padding.top + chartH - ((v - minW) / (maxW - minW)) * chartH
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(w - padding.right, y)
      ctx.stroke()
      ctx.fillStyle = '#9B9B9B'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${v}`, padding.left - 6, y + 3)
    }

    // X축 날짜
    const displayCount = currentIndex >= 0 ? currentIndex + 1 : weightRecords.length
    const visibleRecords = weightRecords.slice(0, displayCount)

    visibleRecords.forEach((r, i) => {
      const x = padding.left + (i / Math.max(weightRecords.length - 1, 1)) * chartW
      ctx.fillStyle = '#9B9B9B'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      const date = new Date(r.measured_at)
      ctx.fillText(`${date.getMonth() + 1}/${date.getDate()}`, x, h - 8)
    })

    // 라인 그리기
    if (visibleRecords.length >= 2) {
      ctx.beginPath()
      ctx.strokeStyle = '#0052FF'
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'

      visibleRecords.forEach((r, i) => {
        const x = padding.left + (i / Math.max(weightRecords.length - 1, 1)) * chartW
        const y = padding.top + chartH - ((Number(r.weight_kg) - minW) / (maxW - minW)) * chartH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // 포인트 그리기
    visibleRecords.forEach((r, i) => {
      const x = padding.left + (i / Math.max(weightRecords.length - 1, 1)) * chartW
      const y = padding.top + chartH - ((Number(r.weight_kg) - minW) / (maxW - minW)) * chartH

      const isLast = i === visibleRecords.length - 1

      ctx.beginPath()
      ctx.arc(x, y, isLast ? 6 : 4, 0, Math.PI * 2)
      ctx.fillStyle = isLast ? '#0052FF' : '#4A90D9'
      ctx.fill()

      if (isLast) {
        ctx.beginPath()
        ctx.arc(x, y, 10, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(0, 82, 255, 0.3)'
        ctx.lineWidth = 2
        ctx.stroke()

        // 값 표시
        ctx.fillStyle = '#0052FF'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`${Number(r.weight_kg).toFixed(1)}kg`, x, y - 14)
      }
    })
  }, [currentIndex, weightRecords])

  if (weightRecords.length < 2) {
    return (
      <div className="p-5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a] text-center">
        <p className="text-sm text-[#9B9B9B]">성장 기록이 2건 이상이면 타임랩스를 볼 수 있어요</p>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#f0f0f0] dark:border-[#2a2a2a]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#0A0B0D] dark:text-white">{childName}의 성장 타임랩스</h3>
        <button
          onClick={() => { setPlaying(true); setCurrentIndex(-1) }}
          disabled={playing}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#0052FF] text-white active:scale-95 transition-transform disabled:opacity-50"
        >
          {playing ? '재생 중...' : '▶ 재생'}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-48"
        style={{ width: '100%', height: '192px' }}
      />
    </div>
  )
}
