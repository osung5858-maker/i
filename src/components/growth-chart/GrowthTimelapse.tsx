'use client'

import { useState, useEffect, useRef } from 'react'
import type { GrowthRecord } from '@/types'

type Metric = 'weight' | 'height' | 'head'

// WHO 50th percentile by month (male, simplified)
const WHO_CURVES: Record<Metric, Record<number, number>> = {
  weight: { 0:3.3,1:4.5,2:5.6,3:6.4,4:7.0,5:7.5,6:7.9,7:8.3,8:8.6,9:8.9,10:9.2,11:9.4,12:9.6,15:10.3,18:10.9,24:12.2,30:13.3,36:14.3 },
  height: { 0:49.9,1:54.7,2:58.4,3:61.4,4:63.9,5:65.9,6:67.6,7:69.2,8:70.6,9:72.0,10:73.3,11:74.5,12:75.7,15:79.1,18:82.3,24:87.8,30:92.4,36:96.1 },
  head: { 0:34.5,1:37.3,2:39.1,3:40.5,4:41.6,5:42.6,6:43.3,7:44.0,8:44.5,9:45.0,10:45.4,11:45.8,12:46.1,15:47.0,18:47.8,24:48.7,30:49.3,36:49.7 },
}

const METRIC_CONFIG: Record<Metric, { label: string; field: string; unit: string; color: string }> = {
  weight: { label: '몸무게', field: 'weight_kg', unit: 'kg', color: '#0052FF' },
  height: { label: '키', field: 'height_cm', unit: 'cm', color: 'var(--color-primary)' },
  head: { label: '머리둘레', field: 'head_cm', unit: 'cm', color: '#D89575' },
}

function interpolateWHO(curve: Record<number, number>, month: number): number {
  const months = Object.keys(curve).map(Number).sort((a, b) => a - b)
  const exact = curve[month]
  if (exact !== undefined) return exact
  const lower = months.filter((m) => m <= month).pop() || months[0]
  const upper = months.find((m) => m > month) || months[months.length - 1]
  if (lower === upper) return curve[lower]
  return curve[lower] + (curve[upper] - curve[lower]) * ((month - lower) / (upper - lower))
}

interface Props {
  records: GrowthRecord[]
  childName: string
  birthdate?: string
}

export default function GrowthTimelapse({ records, childName, birthdate }: Props) {
  const [playing, setPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [metric, setMetric] = useState<Metric>('weight')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const config = METRIC_CONFIG[metric]
  const weightRecords = records.filter((r) => (r as any)[config.field])

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

    const weights = weightRecords.map((r) => Number((r as any)[config.field]))
    // WHO 범위도 고려하여 min/max 설정
    const whoVals = birthdate ? [0,3,6,9,12,18,24,36].map((m) => interpolateWHO(WHO_CURVES[metric], m)).filter((v) => v > 0) : []
    const allVals = [...weights, ...whoVals.slice(0, weights.length)]
    const minW = Math.floor(Math.min(...allVals) - 1)
    const maxW = Math.ceil(Math.max(...allVals) + 1)

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

    // WHO 50th percentile 곡선 (점선)
    if (birthdate) {
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(61,138,90,0.3)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      weightRecords.forEach((r, i) => {
        const x = padding.left + (i / Math.max(weightRecords.length - 1, 1)) * chartW
        const ageMonths = Math.round((new Date(r.measured_at).getTime() - new Date(birthdate).getTime()) / (30.44 * 86400000))
        const whoVal = interpolateWHO(WHO_CURVES[metric], ageMonths)
        const y = padding.top + chartH - ((whoVal - minW) / (maxW - minW)) * chartH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])
      // 라벨
      ctx.fillStyle = 'rgba(61,138,90,0.5)'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('WHO 50th', padding.left + 4, padding.top + 12)
    }

    // 라인 그리기
    if (visibleRecords.length >= 2) {
      ctx.beginPath()
      ctx.strokeStyle = config.color
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'

      visibleRecords.forEach((r, i) => {
        const x = padding.left + (i / Math.max(weightRecords.length - 1, 1)) * chartW
        const y = padding.top + chartH - ((Number((r as any)[config.field]) - minW) / (maxW - minW)) * chartH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // 포인트 그리기
    visibleRecords.forEach((r, i) => {
      const x = padding.left + (i / Math.max(weightRecords.length - 1, 1)) * chartW
      const y = padding.top + chartH - ((Number((r as any)[config.field]) - minW) / (maxW - minW)) * chartH

      const isLast = i === visibleRecords.length - 1

      ctx.beginPath()
      ctx.arc(x, y, isLast ? 6 : 4, 0, Math.PI * 2)
      ctx.fillStyle = isLast ? config.color : `${config.color}99`
      ctx.fill()

      if (isLast) {
        ctx.beginPath()
        ctx.arc(x, y, 10, 0, Math.PI * 2)
        ctx.strokeStyle = `${config.color}4D`
        ctx.lineWidth = 2
        ctx.stroke()

        // 값 표시
        ctx.fillStyle = config.color
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`${Number((r as any)[config.field]).toFixed(1)}${config.unit}`, x, y - 14)
      }
    })
  }, [currentIndex, weightRecords, metric, config, birthdate])

  if (weightRecords.length < 2) {
    return (
      <div className="p-5 rounded-2xl bg-white border border-[#E8E4DF] text-center">
        <p className="text-sm text-tertiary">성장 기록이 2건 이상이면 타임랩스를 볼 수 있어요</p>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl bg-white border border-[#E8E4DF]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-primary">{childName}의 성장 타임랩스</h3>
        <button
          onClick={() => { setPlaying(true); setCurrentIndex(-1) }}
          disabled={playing}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white active:scale-95 transition-transform disabled:opacity-50"
          style={{ backgroundColor: config.color }}
        >
          {playing ? '재생 중...' : '▶ 재생'}
        </button>
      </div>
      {/* Metric 탭 */}
      <div className="flex gap-1.5 mb-3">
        {(['weight', 'height', 'head'] as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMetric(m); setCurrentIndex(-1); setPlaying(false) }}
            className={`flex-1 py-1.5 rounded-lg text-caption font-semibold transition-colors ${
              metric === m ? 'text-white' : 'bg-[#F0EDE8] text-secondary'
            }`}
            style={metric === m ? { backgroundColor: METRIC_CONFIG[m].color } : {}}
          >
            {METRIC_CONFIG[m].label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-48"
        style={{ width: '100%', height: '192px' }}
      />
    </div>
  )
}
