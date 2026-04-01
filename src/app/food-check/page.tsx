'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageLayout'
import { SparkleIcon, SearchIcon, XIcon } from '@/components/ui/Icons'

interface FoodResult {
  safety: 'safe' | 'caution' | 'avoid'
  emoji: string
  summary: string
  reason: string
  tip: string
  food: string
}

const SAFETY_CONFIG = {
  safe:    { label: '안전',   bg: '#F0FFF4', border: '#86EFAC', text: '#166534', badge: '#22C55E' },
  caution: { label: '주의',   bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', badge: '#F59E0B' },
  avoid:   { label: '주의요망', bg: '#FFF1F2', border: '#FCA5A5', text: '#991B1B', badge: '#EF4444' },
}

const RECENT_KEY = 'dodam_food_check_recent'
const MAX_RECENT = 8

export default function FoodCheckPage() {
  return <Suspense><FoodCheckPageInner /></Suspense>
}

function FoodCheckPageInner() {
  const searchParams = useSearchParams()
  const [input, setInput] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FoodResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [mode, setMode] = useState('pregnant')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMode(localStorage.getItem('dodam_mode') || 'pregnant')
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')) } catch { /* */ }
    // URL에 q 파라미터가 있으면 자동으로 검색
    const q = searchParams.get('q')
    if (q?.trim()) {
      setTimeout(() => check(q.trim()), 100)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveRecent = (food: string) => {
    const next = [food, ...recent.filter(r => r !== food)].slice(0, MAX_RECENT)
    setRecent(next)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* */ }
  }

  const check = async (food: string) => {
    const f = food.trim()
    if (!f) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai-food-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food: f, mode }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult({ ...data, food: f })
      saveRecent(f)
    } catch {
      setError('네트워크 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    check(input)
  }

  const modeLabel = mode === 'pregnant' ? '임신 중' : mode === 'preparing' ? '임신 준비 중' : '육아 중'

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="음식 물어보기" showBack />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-4 space-y-4">

        {/* 모드 표시 */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[12px] text-[#9E9A95]">현재 모드</span>
          <span className="text-[12px] font-semibold text-[var(--color-primary)] bg-[var(--color-accent-bg)] px-2 py-0.5 rounded-full">{modeLabel}</span>
        </div>

        {/* 검색 입력 */}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9A95]" />
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="음식 이름을 입력하세요 (예: 회, 카페인)"
                className="w-full pl-9 pr-9 py-3 rounded-xl border border-[#E8E4DF] bg-white text-[14px] outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              {input && (
                <button type="button" onClick={() => { setInput(''); setResult(null); setError(null) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <XIcon className="w-4 h-4 text-[#9E9A95]" />
                </button>
              )}
            </div>
            <button type="submit" disabled={!input.trim() || loading}
              className="px-4 py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold active:opacity-80 disabled:opacity-40 shrink-0 transition-opacity">
              확인
            </button>
          </div>
        </form>

        {/* 로딩 */}
        {loading && (
          <div className="bg-white rounded-2xl border border-[#E8E4DF] p-6 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
            <p className="text-[13px] text-[#6B6966]">AI가 확인하고 있어요...</p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="bg-[#FFF1F2] rounded-xl border border-[#FCA5A5] p-4">
            <p className="text-[13px] text-[#991B1B]">{error}</p>
          </div>
        )}

        {/* 결과 카드 */}
        {result && !loading && (() => {
          const cfg = SAFETY_CONFIG[result.safety]
          return (
            <div className="rounded-2xl border p-5 space-y-4 transition-all" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
              {/* 음식명 + 안전도 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[40px] leading-none">{result.emoji}</span>
                  <div>
                    <p className="text-[16px] font-bold text-[#1A1918]">{result.food}</p>
                    <p className="text-[13px] font-medium mt-0.5" style={{ color: cfg.text }}>{result.summary}</p>
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: cfg.badge }}>
                  {cfg.label}
                </span>
              </div>

              {/* 이유 */}
              <div className="bg-white/60 rounded-xl p-3">
                <p className="text-[12px] font-semibold text-[#1A1918] mb-1 flex items-center gap-1">
                  <SparkleIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" /> AI 설명
                </p>
                <p className="text-[13px] text-[#4A4744] leading-relaxed">{result.reason}</p>
              </div>

              {/* 팁 */}
              <div className="flex items-start gap-2">
                <span className="text-[14px] mt-0.5">💡</span>
                <p className="text-[12px] text-[#6B6966] leading-relaxed">{result.tip}</p>
              </div>

              <p className="text-[10px] text-[#9E9A95] text-center">AI 응답은 참고용입니다. 의심되면 담당 의사에게 확인하세요.</p>
            </div>
          )
        })()}

        {/* 최근 검색 */}
        {!result && !loading && recent.length > 0 && (
          <div>
            <p className="text-[12px] text-[#9E9A95] mb-2 px-1">최근 검색</p>
            <div className="flex flex-wrap gap-2">
              {recent.map(food => (
                <button key={food} onClick={() => { setInput(food); check(food) }}
                  className="px-3 py-1.5 rounded-full bg-white border border-[#E8E4DF] text-[13px] text-[#4A4744] active:bg-[#F5F3F0] transition-colors">
                  {food}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 자주 묻는 음식 */}
        {!result && !loading && (
          <div>
            <p className="text-[12px] text-[#9E9A95] mb-2 px-1">자주 묻는 음식</p>
            <div className="flex flex-wrap gap-2">
              {(mode === 'pregnant'
                ? ['회·초밥', '커피', '삼겹살', '참치캔', '치즈', '꿀', '아이스크림', '라면', '매운 음식', '홍삼']
                : mode === 'preparing'
                ? ['카페인', '술', '엽산 음식', '철분 음식', '생선', '콩류', '견과류', '시금치', '두부', '아보카도']
                : ['꿀', '생우유', '견과류', '달걀', '새우·갑각류', '땅콩', '밀가루', '이유식 재료', '돼지고기', '소고기']
              ).map(food => (
                <button key={food} onClick={() => { setInput(food); check(food) }}
                  className="px-3 py-1.5 rounded-full bg-white border border-[#E8E4DF] text-[13px] text-[#4A4744] active:bg-[#F5F3F0] transition-colors">
                  {food}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
