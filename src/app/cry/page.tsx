'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'
import { createClient } from '@/lib/supabase/client'
import type { CareEvent } from '@/types'

// --- Types ---
interface AudioFeatures {
  avgVolume: number      // 0-1 RMS
  peakFrequency: number  // Hz
  volumeVariance: number // rhythm pattern indicator
  pitchStability: number // how stable the pitch is (0=erratic, 1=stable)
}

interface CryResult {
  type: 'hungry' | 'sleepy' | 'uncomfortable' | 'pain' | 'bored'
  emoji: string
  label: string
  advice: string
  confidence: number // 1-5
  reasons: string[]
}

interface CryLogEntry {
  id: string
  timestamp: string
  result: CryResult
}

// --- Constants ---
const STORAGE_KEY = 'dodam_cry_log'
const RECORD_DURATION = 5000

const CRY_TYPES: Record<string, { emoji: string; label: string; advice: string; color: string }> = {
  hungry:        { emoji: '\uD83C\uDF7C', label: '\uBC30\uACE0\uD30C\uC694', advice: '\uC218\uC720\uB97C \uC2DC\uB3C4\uD574\uBCF4\uC138\uC694', color: '#FFB347' },
  sleepy:        { emoji: '\uD83D\uDE34', label: '\uC878\uB824\uC694', advice: '\uC7AC\uC6B0\uB294 \uD658\uACBD\uC744 \uB9CC\uB4E4\uC5B4\uC8FC\uC138\uC694', color: '#7B68EE' },
  uncomfortable: { emoji: '\uD83D\uDE23', label: '\uBD88\uD3B8\uD574\uC694', advice: '\uAE30\uC800\uADC0\uB97C \uD655\uC778\uD558\uAC70\uB098 \uC625\uC744 \uAC08\uC544\uC785\uD600\uBCF4\uC138\uC694', color: '#4ECDC4' },
  pain:          { emoji: '\uD83D\uDE2D', label: '\uC544\uD30C\uC694', advice: '\uCCB4\uC628\uC744 \uCE21\uC815\uD558\uACE0 \uC99D\uC0C1\uC744 \uC0B4\uD3B4\uBCF4\uC138\uC694', color: '#D05050' },
  bored:         { emoji: '\uD83E\uDD71', label: '\uC2EC\uC2EC\uD574\uC694', advice: '\uC548\uC544\uC8FC\uAC70\uB098 \uC7A5\uB09C\uAC10\uC744 \uBCF4\uC5EC\uC8FC\uC138\uC694', color: '#FF9ECD' },
}

// --- Helpers ---
function loadLog(): CryLogEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveLog(entries: CryLogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 10)))
}

function classifyCry(features: AudioFeatures, context: { hoursSinceLastFeed: number | null; hoursSinceLastSleep: number | null; hourOfDay: number }): CryResult {
  const { avgVolume, peakFrequency, volumeVariance, pitchStability } = features
  const { hoursSinceLastFeed, hoursSinceLastSleep, hourOfDay } = context

  // Score each type
  const scores: Record<string, { score: number; reasons: string[] }> = {
    hungry:        { score: 0, reasons: [] },
    sleepy:        { score: 0, reasons: [] },
    uncomfortable: { score: 0, reasons: [] },
    pain:          { score: 0, reasons: [] },
    bored:         { score: 0, reasons: [] },
  }

  // Audio feature scoring
  // Hungry: high pitch + sustained loud
  if (peakFrequency > 400 && avgVolume > 0.4) {
    scores.hungry.score += 3
    scores.hungry.reasons.push('\uC6B8\uC74C \uAC15\uB3C4: \uB192\uC74C')
  }
  if (pitchStability > 0.6) {
    scores.hungry.score += 1
    scores.hungry.reasons.push('\uC77C\uC815\uD55C \uC6B8\uC74C \uD328\uD134')
  }

  // Sleepy: rhythmic on-off pattern
  if (volumeVariance > 0.15 && volumeVariance < 0.4) {
    scores.sleepy.score += 3
    scores.sleepy.reasons.push('\uB9AC\uB4EC\uAC10 \uC788\uB294 \uC6B8\uC74C')
  }
  if (avgVolume < 0.5 && avgVolume > 0.15) {
    scores.sleepy.score += 1
    scores.sleepy.reasons.push('\uC6B8\uC74C \uAC15\uB3C4: \uC911\uAC04')
  }

  // Uncomfortable: sudden sharp peaks
  if (volumeVariance > 0.3 && peakFrequency > 300) {
    scores.uncomfortable.score += 3
    scores.uncomfortable.reasons.push('\uAC11\uC791\uC2A4\uB7EC\uC6B4 \uC6B8\uC74C \uBCC0\uD654')
  }

  // Pain: very high pitch + erratic
  if (peakFrequency > 500 && pitchStability < 0.4) {
    scores.pain.score += 4
    scores.pain.reasons.push('\uB192\uC740 \uC74C\uB3C4 + \uBD88\uADDC\uCE59\uD55C \uD328\uD134')
  }
  if (avgVolume > 0.6) {
    scores.pain.score += 1
    scores.pain.reasons.push('\uC6B8\uC74C \uAC15\uB3C4: \uB9E4\uC6B0 \uB192\uC74C')
  }

  // Bored: low volume + whining
  if (avgVolume < 0.3 && peakFrequency < 350) {
    scores.bored.score += 3
    scores.bored.reasons.push('\uB0AE\uC740 \uAC15\uB3C4\uC758 \uC9E7\uC740 \uC6B8\uC74C')
  }
  if (pitchStability > 0.5 && avgVolume < 0.3) {
    scores.bored.score += 1
    scores.bored.reasons.push('\uC9D5\uC5BC\uAC70\uB9AC\uB294 \uD328\uD134')
  }

  // Context scoring
  if (hoursSinceLastFeed !== null) {
    if (hoursSinceLastFeed > 3) {
      scores.hungry.score += 3
      scores.hungry.reasons.push(`\uB9C8\uC9C0\uB9C9 \uC218\uC720: ${hoursSinceLastFeed.toFixed(1)}\uC2DC\uAC04 \uC804`)
    } else if (hoursSinceLastFeed > 2) {
      scores.hungry.score += 1
      scores.hungry.reasons.push(`\uB9C8\uC9C0\uB9C9 \uC218\uC720: ${hoursSinceLastFeed.toFixed(1)}\uC2DC\uAC04 \uC804`)
    } else {
      scores.hungry.reasons.push(`\uB9C8\uC9C0\uB9C9 \uC218\uC720: ${hoursSinceLastFeed.toFixed(1)}\uC2DC\uAC04 \uC804`)
    }
  }

  if (hoursSinceLastSleep !== null) {
    if (hoursSinceLastSleep > 2) {
      scores.sleepy.score += 3
      scores.sleepy.reasons.push(`\uB9C8\uC9C0\uB9C9 \uC218\uBA74: ${hoursSinceLastSleep.toFixed(1)}\uC2DC\uAC04 \uC804`)
    } else if (hoursSinceLastSleep > 1.5) {
      scores.sleepy.score += 1
      scores.sleepy.reasons.push(`\uB9C8\uC9C0\uB9C9 \uC218\uBA74: ${hoursSinceLastSleep.toFixed(1)}\uC2DC\uAC04 \uC804`)
    } else {
      scores.sleepy.reasons.push(`\uB9C8\uC9C0\uB9C9 \uC218\uBA74: ${hoursSinceLastSleep.toFixed(1)}\uC2DC\uAC04 \uC804`)
    }
  }

  // Time of day context
  if (hourOfDay >= 11 && hourOfDay <= 13) {
    scores.hungry.score += 1
    scores.hungry.reasons.push('\uC2DC\uAC04\uB300: \uC810\uC2EC \uC2DC\uAC04')
  } else if (hourOfDay >= 17 && hourOfDay <= 19) {
    scores.hungry.score += 1
    scores.hungry.reasons.push('\uC2DC\uAC04\uB300: \uC800\uB141 \uC2DC\uAC04')
  } else if (hourOfDay >= 19 || hourOfDay <= 6) {
    scores.sleepy.score += 2
    scores.sleepy.reasons.push('\uC2DC\uAC04\uB300: \uC218\uBA74 \uC2DC\uAC04')
  } else if (hourOfDay >= 14 && hourOfDay <= 16) {
    scores.sleepy.score += 1
    scores.sleepy.reasons.push('\uC2DC\uAC04\uB300: \uB0AE\uC7A0 \uC2DC\uAC04')
  }

  // Find top type
  let topType = 'hungry'
  let topScore = 0
  for (const [type, data] of Object.entries(scores)) {
    if (data.score > topScore) {
      topScore = data.score
      topType = type
    }
  }

  // Calculate confidence (1-5) based on score gap
  const sortedScores = Object.values(scores).map(s => s.score).sort((a, b) => b - a)
  const gap = sortedScores[0] - (sortedScores[1] || 0)
  const confidence = Math.min(5, Math.max(1, Math.round(gap * 1.2 + 1)))

  const info = CRY_TYPES[topType]
  const topReasons = scores[topType].reasons.length > 0 ? scores[topType].reasons : ['\uC6B8\uC74C \uC18C\uB9AC \uD328\uD134 \uBD84\uC11D']

  return {
    type: topType as CryResult['type'],
    emoji: info.emoji,
    label: info.label,
    advice: info.advice,
    confidence,
    reasons: topReasons.slice(0, 4),
  }
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h < 12 ? '\uC624\uC804' : '\uC624\uD6C4'
  return `${ampm} ${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m}`
}

function formatDate(ts: string): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}\uC6D4 ${d.getDate()}\uC77C`
}

// --- Component ---
export default function CryPage() {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'analyzing' | 'result'>('idle')
  const [countdown, setCountdown] = useState(5)
  const [result, setResult] = useState<CryResult | null>(null)
  const [log, setLog] = useState<CryLogEntry[]>([])
  const [error, setError] = useState('')
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const volumeSamplesRef = useRef<number[]>([])
  const frequencySamplesRef = useRef<number[]>([])

  const supabase = createClient()

  useEffect(() => {
    setLog(loadLog())
  }, [])

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const getContext = useCallback(async () => {
    let hoursSinceLastFeed: number | null = null
    let hoursSinceLastSleep: number | null = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const childId = localStorage.getItem('dodam_child_id')
        if (childId) {
          const now = new Date()
          const { data: feedEvents } = await supabase
            .from('events').select('start_ts')
            .eq('child_id', childId).eq('type', 'feed')
            .order('start_ts', { ascending: false }).limit(1)

          if (feedEvents && feedEvents.length > 0) {
            hoursSinceLastFeed = (now.getTime() - new Date(feedEvents[0].start_ts).getTime()) / 3600000
          }

          const { data: sleepEvents } = await supabase
            .from('events').select('start_ts,end_ts')
            .eq('child_id', childId).eq('type', 'sleep')
            .order('start_ts', { ascending: false }).limit(1)

          if (sleepEvents && sleepEvents.length > 0) {
            const sleepEnd = sleepEvents[0].end_ts || sleepEvents[0].start_ts
            hoursSinceLastSleep = (now.getTime() - new Date(sleepEnd).getTime()) / 3600000
          }
        }
      }
    } catch {
      // Supabase unavailable, continue without context
    }

    // Also check localStorage feed sessions as fallback
    if (hoursSinceLastFeed === null) {
      try {
        const sessions = JSON.parse(localStorage.getItem('dodam_feed_sessions') || '[]')
        if (sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1]
          const ts = lastSession.endTime || lastSession.startTime
          if (ts) {
            hoursSinceLastFeed = (Date.now() - new Date(ts).getTime()) / 3600000
          }
        }
      } catch { /* ignore */ }
    }

    return {
      hoursSinceLastFeed,
      hoursSinceLastSleep,
      hourOfDay: new Date().getHours(),
    }
  }, [supabase])

  const startRecording = useCallback(async () => {
    setError('')
    setResult(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setMicPermission('granted')

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser

      volumeSamplesRef.current = []
      frequencySamplesRef.current = []

      setPhase('recording')
      setCountdown(5)

      // Collect audio data
      const timeDomain = new Float32Array(analyser.fftSize)
      const freqData = new Uint8Array(analyser.frequencyBinCount)

      function sample() {
        if (!analyserRef.current) return
        analyserRef.current.getFloatTimeDomainData(timeDomain)
        analyserRef.current.getByteFrequencyData(freqData)

        // RMS volume
        let sum = 0
        for (let i = 0; i < timeDomain.length; i++) {
          sum += timeDomain[i] * timeDomain[i]
        }
        const rms = Math.sqrt(sum / timeDomain.length)
        volumeSamplesRef.current.push(rms)

        // Peak frequency
        let maxVal = 0
        let maxIdx = 0
        for (let i = 0; i < freqData.length; i++) {
          if (freqData[i] > maxVal) {
            maxVal = freqData[i]
            maxIdx = i
          }
        }
        const peakFreq = (maxIdx * audioContext.sampleRate) / analyser.fftSize
        frequencySamplesRef.current.push(peakFreq)

        animFrameRef.current = requestAnimationFrame(sample)
      }
      animFrameRef.current = requestAnimationFrame(sample)

      // Countdown
      let remaining = 5
      const interval = setInterval(() => {
        remaining--
        setCountdown(remaining)
        if (remaining <= 0) clearInterval(interval)
      }, 1000)

      // Stop after RECORD_DURATION
      setTimeout(async () => {
        clearInterval(interval)
        cancelAnimationFrame(animFrameRef.current)

        // Stop stream
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (audioContext.state !== 'closed') {
          audioContext.close().catch(() => {})
        }

        setPhase('analyzing')

        // Compute features
        const volumes = volumeSamplesRef.current
        const freqs = frequencySamplesRef.current

        if (volumes.length === 0) {
          setError('\uC624\uB514\uC624 \uB370\uC774\uD130\uB97C \uC218\uC9D1\uD560 \uC218 \uC5C6\uC5C8\uC5B4\uC694')
          setPhase('idle')
          return
        }

        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
        const avgFreq = freqs.length > 0 ? freqs.reduce((a, b) => a + b, 0) / freqs.length : 300

        // Volume variance (rhythm)
        const volMean = avgVolume
        const volVariance = volumes.reduce((sum, v) => sum + (v - volMean) ** 2, 0) / volumes.length

        // Pitch stability (lower = more erratic)
        const freqMean = avgFreq
        const freqVariance = freqs.length > 1
          ? freqs.reduce((sum, f) => sum + (f - freqMean) ** 2, 0) / freqs.length
          : 0
        const pitchStability = Math.max(0, Math.min(1, 1 - Math.min(1, Math.sqrt(freqVariance) / 300)))

        const features: AudioFeatures = {
          avgVolume: Math.min(1, avgVolume * 5), // scale up for sensitivity
          peakFrequency: avgFreq,
          volumeVariance: Math.min(1, Math.sqrt(volVariance) * 10),
          pitchStability,
        }

        const context = await getContext()
        const cryResult = classifyCry(features, context)

        setResult(cryResult)
        setPhase('result')

        // Save to log
        const entry: CryLogEntry = {
          id: Date.now().toString(36),
          timestamp: new Date().toISOString(),
          result: cryResult,
        }
        const updated = [entry, ...loadLog()].slice(0, 10)
        saveLog(updated)
        setLog(updated)
      }, RECORD_DURATION)

    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setMicPermission('denied')
        setError('\uB9C8\uC774\uD06C \uAD8C\uD55C\uC774 \uD544\uC694\uD574\uC694. \uC124\uC815\uC5D0\uC11C \uB9C8\uC774\uD06C \uAD8C\uD55C\uC744 \uD5C8\uC6A9\uD574\uC8FC\uC138\uC694.')
      } else {
        setError('\uB9C8\uC774\uD06C\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC5B4\uC694')
      }
      setPhase('idle')
      cleanup()
    }
  }, [cleanup, getContext])

  const resetToIdle = useCallback(() => {
    cleanup()
    setPhase('idle')
    setResult(null)
    setError('')
    setCountdown(5)
  }, [cleanup])

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="울음 번역기" subtitle="아이의 울음 소리를 분석해요" showBack />

      <div className="flex-1 max-w-lg mx-auto w-full px-5 pb-4 space-y-5">

        {/* Idle State */}
        {phase === 'idle' && !result && (
          <div className="pt-8 text-center space-y-6">
            <p className="text-[15px] text-[#6B6966]">{'\uC544\uAE30\uAC00 \uC6B8\uACE0 \uC788\uB098\uC694?'}</p>

            {/* Mic button */}
            <button
              onClick={startRecording}
              className="w-28 h-28 rounded-full mx-auto flex items-center justify-center transition-transform active:scale-95"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>

            <p className="text-[13px] text-[#9E9A95]">{'\uD0ED\uD558\uBA74 5\uCD08\uAC04 \uB179\uC74C\uD574\uC694'}</p>

            {micPermission === 'denied' && (
              <div className="bg-[#FFF5F5] border border-[#FFCCC7] rounded-xl p-4 text-[13px] text-[#D05050]">
                {'\uB9C8\uC774\uD06C \uAD8C\uD55C\uC774 \uCC28\uB2E8\uB418\uC5C8\uC5B4\uC694. \uBE0C\uB77C\uC6B0\uC800 \uC124\uC815\uC5D0\uC11C \uB9C8\uC774\uD06C\uB97C \uD5C8\uC6A9\uD574\uC8FC\uC138\uC694.'}
              </div>
            )}

            {error && (
              <div className="bg-[#FFF5F5] border border-[#FFCCC7] rounded-xl p-4 text-[13px] text-[#D05050]">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Recording State */}
        {phase === 'recording' && (
          <div className="pt-12 text-center space-y-6">
            <p className="text-[15px] font-semibold text-[#1A1918]">{'\uB179\uC74C \uC911...'}</p>

            {/* Pulsing mic */}
            <div className="relative w-28 h-28 mx-auto">
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
              <div
                className="absolute inset-2 rounded-full animate-pulse opacity-30"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
              <div
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span className="text-white text-[32px] font-bold">{countdown}</span>
              </div>
            </div>

            <p className="text-[13px] text-[#6B6966]">{'\uC544\uC774\uC758 \uC6B8\uC74C \uC18C\uB9AC\uB97C \uB4E3\uACE0 \uC788\uC5B4\uC694'}</p>

            {/* Progress bar */}
            <div className="w-48 h-2 bg-[#F0EDE8] rounded-full mx-auto overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  width: `${((5 - countdown) / 5) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Analyzing State */}
        {phase === 'analyzing' && (
          <div className="pt-16 text-center space-y-4">
            <div className="text-5xl animate-bounce">{'\uD83D\uDD0D'}</div>
            <p className="text-[15px] font-semibold text-[#1A1918]">{'\uBD84\uC11D \uC911...'}</p>
            <p className="text-[13px] text-[#6B6966]">{'\uC6B8\uC74C \uD328\uD134\uC744 \uBD84\uC11D\uD558\uACE0 \uC788\uC5B4\uC694'}</p>
            <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Result State */}
        {phase === 'result' && result && (
          <>
            <div
              className="rounded-2xl p-6 text-center space-y-3"
              style={{ backgroundColor: CRY_TYPES[result.type].color + '15' }}
            >
              <div className="text-5xl">{result.emoji}</div>
              <h2 className="text-[20px] font-bold text-[#1A1918]">{result.label}</h2>
              <p className="text-[14px] text-[#4A4845] leading-relaxed">{`"${result.advice}"`}</p>

              {/* Confidence dots */}
              <div className="flex items-center justify-center gap-1 pt-1">
                <span className="text-[13px] text-[#6B6966] mr-1">{'\uC2E0\uB8B0\uB3C4:'}</span>
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: i <= result.confidence
                        ? CRY_TYPES[result.type].color
                        : '#E8E4DF',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Analysis reasons */}
            <div className="bg-white rounded-xl border border-[#D5D0CA] p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-[#1A1918]">{'\uD83D\uDCCA \uBD84\uC11D \uADFC\uAC70'}</h3>
              <div className="space-y-2">
                {result.reasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[var(--color-primary)] mt-0.5">{'\u00B7'}</span>
                    <p className="text-[14px] text-[#4A4845]">{reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Info note */}
            <div className="bg-[#FFF8E1] rounded-xl p-3">
              <p className="text-[12px] text-[#8D6E00] leading-relaxed">
                {'\u26A0\uFE0F \uC774 \uACB0\uACFC\uB294 \uC74C\uD5A5 \uD328\uD134\uACFC \uC721\uC544 \uAE30\uB85D\uC744 \uAE30\uBC18\uC73C\uB85C \uD55C \uCC38\uACE0\uC6A9 \uBD84\uC11D\uC774\uC5D0\uC694. \uC544\uC774\uAC00 \uC9C0\uC18D\uC801\uC73C\uB85C \uC6B8\uAC70\uB098 \uC774\uC0C1 \uC99D\uC0C1\uC774 \uC788\uC73C\uBA74 \uC18C\uC544\uACFC\uC5D0 \uC0C1\uB2F4\uD574\uC8FC\uC138\uC694.'}
              </p>
            </div>

            {/* Retry button */}
            <button
              onClick={resetToIdle}
              className="w-full py-3 rounded-xl font-semibold text-[var(--color-primary)] border-2 border-[var(--color-primary)] text-[15px]"
            >
              {'\uB2E4\uC2DC \uB179\uC74C\uD558\uAE30'}
            </button>
          </>
        )}

        {/* History */}
        {log.length > 0 && phase !== 'recording' && phase !== 'analyzing' && (
          <div className="space-y-2 pt-2">
            <p className="text-[13px] font-bold text-[#1A1918]">{`\uCD5C\uADFC \uBD84\uC11D (${log.length})`}</p>
            <div className="bg-white rounded-xl border border-[#D5D0CA] overflow-hidden">
              {log.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[#E8E4DF]' : ''}`}
                >
                  <span className="text-[24px] shrink-0">{entry.result.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1A1918]">{entry.result.label}</p>
                    <p className="text-[11px] text-[#9E9A95]">{formatDate(entry.timestamp)} {formatTime(entry.timestamp)}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map(d => (
                      <div
                        key={d}
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: d <= entry.result.confidence
                            ? CRY_TYPES[entry.result.type]?.color || '#9E9A95'
                            : '#E8E4DF',
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
