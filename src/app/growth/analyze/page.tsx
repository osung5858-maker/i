'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SparkleIcon, ChartIcon, ClipboardIcon } from '@/components/ui/Icons'

interface AnalysisResult {
  extracted: {
    height_cm?: number
    weight_kg?: number
    head_cm?: number
    age_months?: number
  }
  summary: string
  details: string[]
  recommendations: string[]
}

interface HistoryItem {
  date: string
  summary: string
  extracted: AnalysisResult['extracted']
}

export default function AnalyzeCheckupPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [childId, setChildId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // 히스토리 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dodam_checkup_history')
      if (saved) setHistory(JSON.parse(saved))
    } catch { /* */ }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('children').select('id').eq('user_id', user.id).limit(1)
      if (data && data.length > 0) setChildId(data[0].id)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 10 * 1024 * 1024) {
      setError('파일 크기가 10MB를 초과해요.')
      return
    }

    setFile(selected)
    setResult(null)
    setSaved(false)
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(selected)
  }

  const handleAnalyze = async () => {
    if (!file || !preview) return
    setAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/analyze-checkup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview }),
      })

      if (!res.ok) throw new Error('분석에 실패했어요')

      const data = await res.json()
      setResult(data)
    } catch {
      setError('분석에 실패했어요. 다시 시도해주세요.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSaveToGrowth = async () => {
    if (!result?.extracted || !childId) return
    setSaving(true)

    const { height_cm, weight_kg, head_cm } = result.extracted

    if (!height_cm && !weight_kg && !head_cm) {
      setError('추출된 성장 데이터가 없어요.')
      setSaving(false)
      return
    }

    await supabase.from('growth_records').insert({
      child_id: childId,
      measured_at: new Date().toISOString().split('T')[0],
      height_cm: height_cm || null,
      weight_kg: weight_kg || null,
      head_cm: head_cm || null,
    })

    // 히스토리에 추가
    const newHistory: HistoryItem = {
      date: new Date().toISOString().split('T')[0],
      summary: result.summary,
      extracted: result.extracted,
    }
    const updated = [newHistory, ...history].slice(0, 20)
    setHistory(updated)
    localStorage.setItem('dodam_checkup_history', JSON.stringify(updated))

    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <div className="pt-4 pb-2 px-5 max-w-lg mx-auto w-full flex items-center justify-between">
        <button onClick={() => router.back()} className="text-[13px] text-[#6B6966]">뒤로</button>
        <h1 className="text-[15px] font-bold text-[#212124]">검진결과 AI 분석</h1>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(!showHistory)} className="text-[13px] text-[var(--color-primary)] font-medium">
            이력 {history.length}건
          </button>
        )}
        {history.length === 0 && <div className="w-8" />}
      </div>

      <div className="flex-1 px-5 pt-6 max-w-lg mx-auto w-full pb-10">
        {/* 검진 히스토리 */}
        {showHistory && history.length > 0 && (
          <div className="mb-4 bg-[var(--color-page-bg)] rounded-xl p-3 space-y-2">
            <p className="text-[13px] font-bold text-[#1A1918]">분석 이력</p>
            {history.map((h, i) => (
              <div key={i} className="bg-white rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#6B6966]">{h.date}</span>
                  <div className="flex gap-2 text-[12px] text-[var(--color-primary)]">
                    {h.extracted.height_cm && <span>{h.extracted.height_cm}cm</span>}
                    {h.extracted.weight_kg && <span>{h.extracted.weight_kg}kg</span>}
                    {h.extracted.head_cm && <span>머리 {h.extracted.head_cm}cm</span>}
                  </div>
                </div>
                <p className="text-[12px] text-[#4A4744] mt-1 line-clamp-2">{h.summary}</p>
              </div>
            ))}
          </div>
        )}
        {/* 업로드 영역 */}
        {!preview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[#ECECEC] flex flex-col items-center justify-center gap-3 hover:border-[var(--color-primary)] hover:bg-[#FFF8F3] transition-colors active:scale-[0.99]"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#FFF0E6] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" strokeLinecap="round" />
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-[#212124]">검진결과표를 올려주세요</p>
              <p className="text-[14px] text-[#6B6966] mt-1">사진 또는 PDF (최대 10MB)</p>
            </div>
          </button>
        ) : (
          <div className="relative">
            <img src={preview} alt="검진결과표" className="w-full rounded-2xl border border-[#ECECEC] object-contain max-h-80" loading="lazy" />
            <button
              onClick={() => { setPreview(null); setFile(null); setResult(null) }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white text-sm flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 분석 버튼 */}
        {preview && !result && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full h-[52px] rounded-2xl font-semibold text-[15px] bg-[var(--color-primary)] text-white mt-5 active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI가 분석하는 중이에요...
              </>
            ) : (
              'AI 분석 시작'
            )}
          </button>
        )}

        {/* 에러 */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-[#FFF0E6] text-[13px] text-[var(--color-primary)] text-center font-medium">
            {error}
          </div>
        )}

        {/* 분석 결과 */}
        {result && (
          <div className="mt-5 space-y-4">
            {/* 추출된 수치 */}
            {(result.extracted.height_cm || result.extracted.weight_kg || result.extracted.head_cm) && (
              <div className="p-4 rounded-2xl bg-[#FFF8F3] border border-[#FFE4CC]">
                <p className="text-[13px] font-bold text-[var(--color-primary)] mb-3 flex items-center gap-1"><ChartIcon className="w-3.5 h-3.5" /> 추출된 성장 데이터</p>
                <div className="flex gap-3">
                  {result.extracted.weight_kg && (
                    <div className="flex-1 bg-white rounded-xl p-3 text-center">
                      <p className="text-[13px] text-[#6B6966]">몸무게</p>
                      <p className="text-[18px] font-bold text-[#212124]">{result.extracted.weight_kg}<span className="text-[13px] text-[#9E9A95]">kg</span></p>
                    </div>
                  )}
                  {result.extracted.height_cm && (
                    <div className="flex-1 bg-white rounded-xl p-3 text-center">
                      <p className="text-[13px] text-[#6B6966]">키</p>
                      <p className="text-[18px] font-bold text-[#212124]">{result.extracted.height_cm}<span className="text-[13px] text-[#9E9A95]">cm</span></p>
                    </div>
                  )}
                  {result.extracted.head_cm && (
                    <div className="flex-1 bg-white rounded-xl p-3 text-center">
                      <p className="text-[13px] text-[#6B6966]">머리둘레</p>
                      <p className="text-[18px] font-bold text-[#212124]">{result.extracted.head_cm}<span className="text-[13px] text-[#9E9A95]">cm</span></p>
                    </div>
                  )}
                </div>

                {!saved ? (
                  <button
                    onClick={handleSaveToGrowth}
                    disabled={saving}
                    className="w-full h-11 rounded-xl font-semibold text-[13px] bg-[var(--color-primary)] text-white mt-3 active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '성장 기록에 저장하기'}
                  </button>
                ) : (
                  <div className="mt-3 py-2 text-center text-[13px] text-green-600 font-medium">
                    성장 기록에 저장되었어요!
                  </div>
                )}
              </div>
            )}

            {/* AI 요약 */}
            <div className="p-4 rounded-2xl bg-white border border-[#ECECEC]">
              <p className="text-[13px] font-bold text-[#212124] mb-2 flex items-center gap-1"><SparkleIcon className="w-3.5 h-3.5" /> AI 분석 요약</p>
              <p className="text-[14px] text-[#212124] leading-relaxed">{result.summary}</p>
            </div>

            {/* 상세 분석 */}
            {result.details.length > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-[#ECECEC]">
                <p className="text-[13px] font-bold text-[#212124] mb-2 flex items-center gap-1"><ClipboardIcon className="w-3.5 h-3.5" /> 상세 분석</p>
                <ul className="space-y-2">
                  {result.details.map((d, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-[#212124]">
                      <span className="text-[var(--color-primary)] shrink-0">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 권장사항 */}
            {result.recommendations.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#F0F4FF] border border-[#D0DBFF]">
                <p className="text-[13px] font-bold text-[#5B6DFF] mb-2">권장사항</p>
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-[#212124]">
                      <span className="text-[#5B6DFF] shrink-0">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 면책 */}
            <p className="text-[13px] text-[#9E9A95] text-center px-4">
              참고용 정보예요. 정확한 진단은 소아과 전문의와 상담하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
