'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SparkleIcon, PenIcon, StarIcon, ChartIcon, SearchIcon, TrophyIcon, LightbulbIcon, AlertIcon, XIcon } from '@/components/ui/Icons'
import { shareNameAnalysis } from '@/lib/kakao/share-parenting'

type Tab = 'nickname' | 'suggest' | 'compare' | 'analyze'

const THEMES = ['건강하게', '지혜롭게', '사랑받는', '밝고 환한', '자연을 닮은', '큰 뜻을 품은', '예술적인', '강인한']
const ELEMENTS = [
  { key: 'wood', label: '목(木)', color: 'var(--color-primary)', dot: '#3D8A5A' },
  { key: 'fire', label: '화(火)', color: '#D08068', dot: '#D08068' },
  { key: 'earth', label: '토(土)', color: '#C4A35A', dot: '#C4A35A' },
  { key: 'metal', label: '금(金)', color: '#868B94', dot: '#868B94' },
  { key: 'water', label: '수(水)', color: '#4A90D9', dot: '#4A90D9' },
]

export default function NamePage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('nickname')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  // 태명
  const [nickTheme, setNickTheme] = useState('')
  const [nickGender, setNickGender] = useState('')
  const [nickResult, setNickResult] = useState<any>(null)

  // 이름 추천
  const [lastName, setLastName] = useState('')
  const [suggestGender, setSuggestGender] = useState('')
  const [suggestTheme, setSuggestTheme] = useState('')
  const [syllables, setSyllables] = useState(2)
  const [suggestResult, setSuggestResult] = useState<any>(null)

  // 이름 분석
  const [analyzeName, setAnalyzeName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [analyzeResult, setAnalyzeResult] = useState<any>(null)
  const [hanjaOptions, setHanjaOptions] = useState<any>(null)
  const [selectedHanja, setSelectedHanja] = useState<Record<number, number>>({}) // charIdx → optionIdx
  const [hanjaStep, setHanjaStep] = useState<'input' | 'select' | 'result'>('input')

  // 결과 표시 후 스크롤 상단 이동
  const resultTopRef = useRef<HTMLDivElement>(null)

  // 이름 비교
  const [compareNames, setCompareNames] = useState<string[]>(['', '', ''])
  const [compareBirthYear, setCompareBirthYear] = useState('')
  const [compareResult, setCompareResult] = useState<any>(null)

  // 결정된 태명
  const [chosenNickname, setChosenNickname] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_chosen_nickname') || ''
    return ''
  })

  const chooseNickname = (name: string) => {
    if (chosenNickname === name) {
      // 취소
      setChosenNickname('')
      localStorage.removeItem('dodam_chosen_nickname')
      showToast('태명 결정을 취소했어요')
    } else {
      // 결정 → 오늘 페이지로 이동
      setChosenNickname(name)
      localStorage.setItem('dodam_chosen_nickname', name)
      router.back()
    }
  }

  const fetchNickname = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'nickname', theme: nickTheme, gender: nickGender }),
      })
      const data = await res.json()
      if (data.error) setError(data.error); else {
        setNickResult(data)
        setTimeout(() => resultTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      }
    } catch (e) { setError('일시적 오류가 발생했어요. 잠시 후 다시 시도해주세요.') }
    setLoading(false)
  }

  const fetchSuggest = async () => {
    if (!lastName) { setError('성을 입력해주세요'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'suggest', lastName, gender: suggestGender, theme: suggestTheme, syllables }),
      })
      const data = await res.json()
      if (data.error) setError(data.error); else {
        setSuggestResult(data)
        setTimeout(() => resultTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      }
    } catch (e) { setError('일시적 오류가 발생했어요. 잠시 후 다시 시도해주세요.') }
    setLoading(false)
  }

  // 1단계: 한자 후보 조회
  const fetchHanjaOptions = async () => {
    if (!analyzeName || analyzeName.length < 2) { setError('이름을 입력해주세요 (성+이름)'); return }
    setLoading(true); setError(null); setHanjaOptions(null); setSelectedHanja({}); setAnalyzeResult(null)
    try {
      const res = await fetch('/api/ai-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hanja', fullName: analyzeName }),
      })
      const data = await res.json()
      if (data.error) {
        // parse error는 재시도로 해결되는 경우가 많음
        if (data.error.includes('parse')) {
          setError('AI 응답 처리 중 오류가 발생했어요. 다시 시도해주세요.')
        } else {
          setError(data.error)
        }
      } else { setHanjaOptions(data); setHanjaStep('select') }
    } catch { setError('일시적 오류가 발생했어요. 잠시 후 다시 시도해주세요.') }
    setLoading(false)
  }

  // 2단계: 선택한 한자로 분석
  const fetchAnalyze = async () => {
    setLoading(true); setError(null)
    // 선택한 한자 조합
    let hanjaStr = hanjaOptions?.surnameHanja || analyzeName[0]
    hanjaOptions?.characters?.forEach((c: any, i: number) => {
      const optIdx = selectedHanja[i] ?? 0
      hanjaStr += c.options?.[optIdx]?.hanja || c.char
    })
    try {
      const res = await fetch('/api/ai-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'analyze', fullName: analyzeName, birthYear, hanja: hanjaStr }),
      })
      const data = await res.json()
      if (data.error) setError(data.error); else {
        setAnalyzeResult(data)
        setHanjaStep('result')
        // 결과 상단으로 스크롤
        setTimeout(() => resultTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      }
    } catch { setError('일시적 오류가 발생했어요. 잠시 후 다시 시도해주세요.') }
    setLoading(false)
  }

  const fetchCompare = async () => {
    const valid = compareNames.filter(n => n.trim())
    if (valid.length < 2) { setError('2개 이상 이름을 입력해주세요'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'compare', names: valid, birthYear: compareBirthYear }),
      })
      const data = await res.json()
      if (data.error) setError(data.error); else {
        setCompareResult(data)
        setTimeout(() => resultTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      }
    } catch (e) { setError('일시적 오류가 발생했어요. 잠시 후 다시 시도해주세요.') }
    setLoading(false)
  }

  const updateCompareName = (index: number, value: string) => {
    const next = [...compareNames]
    next[index] = value
    setCompareNames(next)
  }

  const addCompareSlot = () => {
    if (compareNames.length < 6) setCompareNames([...compareNames, ''])
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-page-bg)]">
      <header className="sticky top-[72px] z-30 bg-white border-b border-[#E8E4DF]">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full active:bg-[var(--color-page-bg)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="flex-1 text-center">
            <p className="text-subtitle text-primary">이름 짓기</p>
          </div>
          <div className="w-10" />
        </div>
      </header>
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1A1918] text-white text-body font-medium px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap animate-[fadeIn_0.2s]">
          {toast}
        </div>
      )}

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-4">
        {/* 탭 */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto hide-scrollbar -mx-5 px-5">
          {[
            { key: 'nickname' as Tab, label: '태명' },
            { key: 'suggest' as Tab, label: 'AI 추천' },
            { key: 'compare' as Tab, label: '후보 비교' },
            { key: 'analyze' as Tab, label: '이름 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(null) }}
              className={`shrink-0 px-4 py-2 rounded-xl text-body font-semibold ${tab === t.key ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-secondary border border-[#E8E4DF]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-[#FFF0E6] rounded-xl p-3 mb-3">
            <p className="text-body text-[#D08068]">
              {error.includes('429') || error.includes('바빠') ? 'AI 서버가 바빠요. 잠시 후 다시 시도해주세요.' :
               error.includes('parse') ? 'AI 응답 처리 중 오류가 발생했어요. 다시 시도해주세요.' :
               error.includes('quota') ? 'API 사용량 초과. 잠시 후 다시 시도해주세요.' :
               error}
            </p>
            <button onClick={() => setError(null)} className="text-caption text-[var(--color-primary)] font-semibold mt-1">닫기</button>
          </div>
        )}

        {/* ===== 태명 탭 ===== */}
        {tab === 'nickname' && (
          <div className="space-y-3">
            {chosenNickname && (
              <div className="bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] rounded-xl border border-[#FFDDC8]/60 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-label text-tertiary font-medium">결정된 태명</p>
                  <p className="text-subtitle font-bold text-primary">{chosenNickname}</p>
                </div>
                <button onClick={() => chooseNickname(chosenNickname)} className="text-caption text-tertiary px-2 py-1 rounded-lg border border-[#E8E4DF] bg-white">취소</button>
              </div>
            )}
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-body-emphasis font-bold text-primary mb-3 flex items-center gap-1"><StarIcon className="w-4 h-4 text-[#C4913E]" /> 태명 추천받기</p>
              <p className="text-body-emphasis text-secondary mb-1">어떤 아이로 자라길 바라나요?</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {THEMES.map(t => (
                  <button key={t} onClick={() => setNickTheme(t)}
                    className={`px-3 py-1.5 rounded-full text-body ${nickTheme === t ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-page-bg)] text-secondary'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 mb-3">
                {['모름', '남아', '여아'].map(g => (
                  <button key={g} onClick={() => setNickGender(g)}
                    className={`flex-1 py-1.5 rounded-lg text-body-emphasis ${nickGender === g ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-page-bg)] text-secondary'}`}>
                    {g}
                  </button>
                ))}
              </div>
              <button onClick={fetchNickname} disabled={loading}
                className="w-full py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? 'AI가 고민 중...' : '태명 추천받기'}
              </button>
            </div>

            <div ref={nickResult ? resultTopRef : undefined} />
            {nickResult?.names?.map((n: any, i: number) => {
              const isChosen = chosenNickname === n.name
              return (
                <div key={i} className={`bg-white rounded-xl border p-4 transition-all ${isChosen ? 'border-[var(--color-primary)] shadow-sm' : 'border-[#E8E4DF]'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-heading-3 text-primary">{n.name}</p>
                    <button
                      onClick={() => chooseNickname(n.name)}
                      className={`text-caption px-2.5 py-1 rounded-full font-semibold transition-colors ${isChosen ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-accent-bg)] text-[var(--color-primary)]'}`}
                    >
                      {isChosen ? '✓ 결정됨' : '결정'}
                    </button>
                  </div>
                  <p className="text-body-emphasis text-primary mb-2">{n.meaning}</p>
                  <div className="flex gap-2">
                    <span className="text-body text-secondary bg-[var(--color-page-bg)] px-2 py-0.5 rounded">{n.origin}</span>
                    <span className="text-body text-secondary bg-[var(--color-page-bg)] px-2 py-0.5 rounded">{n.vibe}</span>
                  </div>
                </div>
              )
            })}
            {nickResult?.tip && <p className="text-body text-secondary text-center">{nickResult.tip}</p>}
          </div>
        )}

        {/* ===== 이름 추천 탭 ===== */}
        {tab === 'suggest' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-body-emphasis font-bold text-primary mb-1 flex items-center gap-1"><SparkleIcon className="w-4 h-4 text-[#C4913E]" /> AI 이름 추천</p>
              <div className="flex gap-2 mb-3">
                <a href="https://baby-name.kr/" target="_blank" rel="noopener noreferrer" className="text-body text-[var(--color-primary)] px-2 py-0.5 bg-[#F0F9F4] rounded-full">인기 이름 순위</a>
                <a href="https://www.namechart.kr/" target="_blank" rel="noopener noreferrer" className="text-body text-[var(--color-primary)] px-2 py-0.5 bg-[#F0F9F4] rounded-full">이름 차트</a>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-body-emphasis text-secondary mb-1">성</p>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="김"
                    className="w-full h-10 rounded-lg border border-[#E8E4DF] px-3 text-body-emphasis" />
                </div>
                <div>
                  <p className="text-body-emphasis text-secondary mb-1">글자 수</p>
                  <div className="flex gap-1.5">
                    {[2, 3].map(n => (
                      <button key={n} onClick={() => setSyllables(n)}
                        className={`flex-1 h-10 rounded-lg text-body ${syllables === n ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-page-bg)] text-secondary'}`}>
                        {n}글자
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mb-3">
                {['모름', '남아', '여아'].map(g => (
                  <button key={g} onClick={() => setSuggestGender(g)}
                    className={`flex-1 py-1.5 rounded-lg text-body-emphasis ${suggestGender === g ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-page-bg)] text-secondary'}`}>
                    {g}
                  </button>
                ))}
              </div>
              <p className="text-body-emphasis text-secondary mb-1">희망 의미</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {THEMES.map(t => (
                  <button key={t} onClick={() => setSuggestTheme(t)}
                    className={`px-3 py-1.5 rounded-full text-body ${suggestTheme === t ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-page-bg)] text-secondary'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={fetchSuggest} disabled={loading}
                className="w-full py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? 'AI가 이름을 짓는 중...' : '이름 추천받기'}
              </button>
            </div>

            <div ref={suggestResult ? resultTopRef : undefined} />
            {suggestResult?.names?.map((n: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-heading-3 text-primary">{lastName}{n.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#F0F9F4] flex items-center justify-center">
                      <span className="text-body-emphasis font-bold text-[var(--color-primary)]">{n.score}</span>
                    </div>
                  </div>
                </div>

                {/* 한자 후보 선택 */}
                {n.hanjaOptions && n.hanjaOptions.length > 0 ? (
                  <div className="mb-2 space-y-1">
                    {n.hanjaOptions.map((h: any, j: number) => (
                      <div key={j} className="flex items-center gap-2 p-2 bg-[var(--color-page-bg)] rounded-lg">
                        <span className="text-body-emphasis text-primary">{h.hanja}</span>
                        <p className="text-body-emphasis text-secondary flex-1">{h.meaning}</p>
                      </div>
                    ))}
                  </div>
                ) : n.hanja ? (
                  <p className="text-body text-secondary mb-2">{n.hanja}</p>
                ) : null}

                <p className="text-body-emphasis text-primary mb-2">{n.meaning}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-body-emphasis px-2 py-0.5 rounded bg-[#F0F9F4] text-[var(--color-primary)]">{n.fiveElements}</span>
                  <span className="text-body-emphasis px-2 py-0.5 rounded bg-[var(--color-page-bg)] text-secondary">{n.pronunciation}</span>
                  <span className="text-body-emphasis px-2 py-0.5 rounded bg-[var(--color-page-bg)] text-secondary">{n.uniqueness}</span>
                  {n.popularity && <span className="text-body-emphasis px-2 py-0.5 rounded bg-[#FFF8F3] text-[#C4A35A] flex items-center gap-0.5"><ChartIcon className="w-3.5 h-3.5 inline" /> {n.popularity}</span>}
                </div>
                {n.scoreDetail && <p className="text-body-emphasis text-tertiary mt-1">{n.scoreDetail}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ===== 후보 비교 탭 ===== */}
        {tab === 'compare' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-body-emphasis font-bold text-primary mb-1 flex items-center gap-1"><TrophyIcon className="w-4 h-4 text-[#C4913E]" /> 이름 후보 비교</p>
              <p className="text-body text-secondary mb-3">원하는 이름을 입력하면 AI가 비교 분석해드려요</p>

              <div className="space-y-2 mb-3">
                {compareNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-body-emphasis text-tertiary w-5">{i + 1}.</span>
                    <input value={name} onChange={e => updateCompareName(i, e.target.value)} placeholder={`후보 ${i + 1}`}
                      className="flex-1 h-10 rounded-lg border border-[#E8E4DF] px-3 text-body-emphasis" />
                    {compareNames.length > 2 && (
                      <button onClick={() => setCompareNames(compareNames.filter((_, j) => j !== i))} className="text-tertiary"><XIcon className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                {compareNames.length < 6 && (
                  <button onClick={addCompareSlot} className="flex-1 py-2 rounded-lg border border-dashed border-[#AEB1B9] text-body-emphasis text-secondary">+ 후보 추가</button>
                )}
                <div className="flex-1">
                  <input value={compareBirthYear} onChange={e => setCompareBirthYear(e.target.value)} placeholder="출생 연도 (선택)"
                    className="w-full h-9 rounded-lg border border-[#E8E4DF] px-3 text-body-emphasis" />
                </div>
              </div>

              {/* 저장된 이름에서 추가 — 제거됨 */}
              {false && (
                <div className="mb-3">
                </div>
              )}

              <button onClick={fetchCompare} disabled={loading}
                className="w-full py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? 'AI가 비교 분석 중...' : '비교 분석하기'}
              </button>
            </div>

            {compareResult && (
              <>
                <div ref={resultTopRef} />
                {/* 순위 결과 */}
                {compareResult.results?.map((r: any, i: number) => (
                  <div key={i} className={`bg-white rounded-xl border ${r.rank === 1 ? 'border-[var(--color-accent-bg)] bg-gradient-to-br from-white to-[#F0F9F4]' : 'border-[#E8E4DF]'} p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-body-emphasis font-bold ${
                          r.rank === 1 ? 'bg-[var(--color-primary)] text-white' : r.rank === 2 ? 'bg-[#C4A35A] text-white' : 'bg-[#E8E4DF] text-secondary'
                        }`}>{r.rank}</div>
                        <div>
                          <p className="text-subtitle font-bold text-primary">{r.name}</p>
                          {r.hanja && <p className="text-body-emphasis text-tertiary">{r.hanja}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.rank === 1 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-page-bg)]'}`}>
                          <span className={`text-body-emphasis font-bold ${r.rank === 1 ? 'text-white' : 'text-primary'}`}>{r.score}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-body-emphasis text-primary mb-1">{r.meaning}</p>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <span className="text-body-emphasis px-2 py-0.5 rounded bg-[#F0F9F4] text-[var(--color-primary)]">{r.fiveElements}</span>
                      <span className="text-body-emphasis px-2 py-0.5 rounded bg-[var(--color-page-bg)] text-secondary">{r.pronunciation}</span>
                      <span className="text-body-emphasis px-2 py-0.5 rounded bg-[var(--color-page-bg)] text-secondary">{r.strokes}</span>
                    </div>
                    {r.highlight && <p className="text-body text-[var(--color-primary)]">{r.highlight}</p>}
                  </div>
                ))}

                {/* 종합 추천 */}
                {compareResult.recommendation && (
                  <div className="bg-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-4">
                    <p className="text-body font-bold text-[var(--color-primary)] mb-1 flex items-center gap-1"><TrophyIcon className="w-3.5 h-3.5" /> AI 추천</p>
                    <p className="text-body-emphasis text-primary leading-relaxed">{compareResult.recommendation}</p>
                    {compareResult.tip && <p className="text-body-emphasis text-secondary mt-2">{compareResult.tip}</p>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== 이름 분석 탭 ===== */}
        {tab === 'analyze' && (
          <div className="space-y-3">
            {/* 1단계: 이름 입력 */}
            {hanjaStep === 'input' && (
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                <p className="text-body-emphasis font-bold text-primary mb-3 flex items-center gap-1"><SearchIcon className="w-4 h-4" /> 이름 분석</p>
                <p className="text-body text-secondary mb-3">한자를 선택하고 음양오행 · 획수 · 발음 종합 분석</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-body-emphasis text-secondary mb-1">이름 (성 포함)</p>
                    <input value={analyzeName} onChange={e => setAnalyzeName(e.target.value)} placeholder="김도담"
                      className="w-full h-10 rounded-lg border border-[#E8E4DF] px-3 text-body-emphasis" />
                  </div>
                  <div>
                    <p className="text-body-emphasis text-secondary mb-1">출생 연도 (선택)</p>
                    <input value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="2026"
                      className="w-full h-10 rounded-lg border border-[#E8E4DF] px-3 text-body-emphasis" />
                  </div>
                </div>
                <button onClick={fetchHanjaOptions} disabled={loading}
                  className="w-full py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                  {loading ? '한자 후보 조회 중...' : '한자 선택하기 →'}
                </button>
              </div>
            )}

            {/* 2단계: 한자 선택 */}
            {hanjaStep === 'select' && hanjaOptions && (
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-body-emphasis font-bold text-primary">한자 선택</p>
                  <button onClick={() => setHanjaStep('input')} className="text-body text-secondary">← 다시 입력</button>
                </div>
                <p className="text-body text-secondary mb-3">각 글자의 한자를 선택해주세요</p>

                {/* 성 */}
                <div className="mb-4">
                  <p className="text-body-emphasis text-primary mb-1.5">
                    {hanjaOptions.surname} → {hanjaOptions.surnameHanja || '?'}
                    <span className="text-body-emphasis text-secondary ml-1">(성)</span>
                  </p>
                </div>

                {/* 이름 글자별 */}
                {hanjaOptions.characters?.map((c: any, cIdx: number) => (
                  <div key={cIdx} className="mb-4">
                    <p className="text-body-emphasis text-primary mb-1.5">{c.char}</p>
                    <div className="space-y-1">
                      {c.options?.map((opt: any, oIdx: number) => (
                        <button key={oIdx} onClick={() => setSelectedHanja(prev => ({ ...prev, [cIdx]: oIdx }))}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                            (selectedHanja[cIdx] ?? 0) === oIdx ? 'bg-[#E8F5E9] border border-[var(--color-primary)]' : 'bg-[#F5F1EC] border border-transparent'
                          }`}>
                          <span className="text-heading-2 font-serif shrink-0">{opt.hanja}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-body-emphasis font-medium text-primary">{opt.meaning}</span>
                              {opt.popular && <span className="text-body bg-[#FFE0E6] text-[#E8537A] px-1 py-0.5 rounded">인기</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-body text-secondary">{opt.strokes}획</span>
                              <span className="text-body text-secondary">{opt.element}</span>
                            </div>
                          </div>
                          {(selectedHanja[cIdx] ?? 0) === oIdx && <svg className="w-4 h-4 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 선택 결과 미리보기 */}
                <div className="bg-[var(--color-page-bg)] rounded-lg p-3 mb-3 text-center">
                  <span className="text-heading-2 font-serif tracking-wider">
                    {hanjaOptions.surnameHanja}
                    {hanjaOptions.characters?.map((c: any, i: number) => c.options?.[(selectedHanja[i] ?? 0)]?.hanja || '?').join('')}
                  </span>
                  <span className="text-body text-secondary ml-2">({analyzeName})</span>
                </div>

                <button onClick={fetchAnalyze} disabled={loading}
                  className="w-full py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                  {loading ? '분석 중...' : '이 한자로 분석하기'}
                </button>
              </div>
            )}

            {/* 3단계: 분석 결과 */}
            {hanjaStep === 'result' && analyzeResult && (
              <div ref={resultTopRef} className="flex items-center justify-between">
                <button onClick={() => setHanjaStep('select')} className="text-body text-secondary">← 한자 다시 선택</button>
                <button onClick={() => { setHanjaStep('input'); setAnalyzeResult(null); setHanjaOptions(null) }} className="text-body text-secondary">새 이름 분석</button>
              </div>
            )}

            {hanjaStep === 'result' && analyzeResult && (
              <>
                {/* 총점 */}
                <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-5 text-center">
                  <p className="text-body text-secondary">{analyzeResult.name}</p>
                  {analyzeResult.hanja && <p className="text-body text-tertiary">{analyzeResult.hanja}</p>}
                  <div className="w-20 h-20 mx-auto rounded-full bg-[var(--color-primary)] flex items-center justify-center my-3 shadow-[0_4px_20px_rgba(61,138,90,0.3)]">
                    <span className="text-heading-1 font-bold text-white">{analyzeResult.totalScore}</span>
                  </div>
                  <p className="text-body-emphasis text-secondary">종합 점수 (100점 만점)</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <button onClick={() => shareNameAnalysis(analyzeResult.name, analyzeResult.hanja || '', analyzeResult.totalScore, analyzeResult.meaning || '')} className="text-body text-[var(--color-primary)] font-semibold px-3 py-1 rounded-full bg-[var(--color-page-bg)]">
                      카톡 공유
                    </button>
                  </div>
                </div>

                {/* 한자 획수 상세 */}
                {analyzeResult.hanjaDetail && analyzeResult.hanjaDetail.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                    <p className="text-body font-bold text-primary mb-3 flex items-center gap-1"><PenIcon className="w-3.5 h-3.5" /> 한자 획수 (정자체 기준)</p>
                    <div className="flex gap-2">
                      {analyzeResult.hanjaDetail.map((h: any, i: number) => (
                        <div key={i} className="flex-1 p-2.5 rounded-xl bg-[var(--color-page-bg)] text-center">
                          <p className="text-heading-3 text-primary">{h.char}</p>
                          <p className="text-caption text-secondary">{h.reading}</p>
                          <p className="text-body-emphasis font-bold text-[var(--color-primary)]">{h.strokes}획</p>
                          <p className="text-label text-tertiary">{h.element}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 삼원(三元) 계산 상세 */}
                {analyzeResult.strokeCalc && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                    <p className="text-body font-bold text-primary mb-3">삼원(三元) 수리 분석</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { key: 'wongyeok', label: '원격(천격)' },
                        { key: 'hyunggyeok', label: '형격(인격)' },
                        { key: 'igyeok', label: '이격(지격)' },
                        { key: 'jeonggyeok', label: '정격(총격)' },
                      ].map(g => {
                        const d = analyzeResult.strokeCalc[g.key]
                        if (!d) return null
                        const gilColor = d.gilhyung === '길' ? '#2D7A4A' : d.gilhyung === '흉' ? '#D05050' : '#C4A35A'
                        return (
                          <div key={g.key} className="p-2.5 rounded-xl bg-[var(--color-page-bg)]">
                            <p className="text-label text-tertiary">{g.label}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-subtitle text-primary">{d.value}</span>
                              <span className="text-caption font-semibold" style={{ color: gilColor }}>{d.element} · {d.gilhyung}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* 삼원오행 흐름 */}
                    {analyzeResult.strokeCalc.samwonFlow && (
                      <div className="p-3 rounded-xl bg-[#F0F4FF] border border-[#D5DFEF]">
                        <p className="text-caption text-[#4A6FA5] font-medium mb-1">삼원오행 흐름</p>
                        <p className="text-body-emphasis font-bold text-primary">{analyzeResult.strokeCalc.samwonFlow}</p>
                        <p className="text-caption text-secondary mt-0.5">{analyzeResult.strokeCalc.samwonResult}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 음양조화 */}
                {analyzeResult.yinYang && analyzeResult.yinYang.pattern && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                    <p className="text-body font-bold text-primary mb-2">음양 조화</p>
                    <p className="text-body-emphasis font-bold text-primary text-center mb-1">{analyzeResult.yinYang.pattern}</p>
                    <p className="text-caption text-secondary text-center">{analyzeResult.yinYang.evaluation}</p>
                  </div>
                )}

                {/* 음양오행 레이더 차트 */}
                {analyzeResult.fiveElements && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                    <p className="text-body font-bold text-primary mb-3">음양오행</p>
                    <div className="flex justify-center mb-3">
                      <svg viewBox="0 0 200 200" width="200" height="200">
                        {/* 배경 오각형 (3단계) */}
                        {[100, 66, 33].map(scale => {
                          const points = ELEMENTS.map((_, i) => {
                            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
                            const r = scale * 0.8
                            return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`
                          }).join(' ')
                          return <polygon key={scale} points={points} fill="none" stroke="#F0F0F0" strokeWidth="1" />
                        })}
                        {/* 축 라인 */}
                        {ELEMENTS.map((_, i) => {
                          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
                          return <line key={i} x1="100" y1="100" x2={100 + 80 * Math.cos(angle)} y2={100 + 80 * Math.sin(angle)} stroke="#F0F0F0" strokeWidth="1" />
                        })}
                        {/* 데이터 오각형 */}
                        <polygon
                          points={ELEMENTS.map((el, i) => {
                            const val = (analyzeResult.fiveElements[el.key] || 0) / 100
                            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
                            const r = val * 80
                            return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`
                          }).join(' ')}
                          fill="rgba(61,138,90,0.2)" stroke="var(--color-primary)" strokeWidth="2"
                        />
                        {/* 꼭짓점 점 */}
                        {ELEMENTS.map((el, i) => {
                          const val = (analyzeResult.fiveElements[el.key] || 0) / 100
                          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
                          const r = val * 80
                          return <circle key={el.key} cx={100 + r * Math.cos(angle)} cy={100 + r * Math.sin(angle)} r="3" fill="var(--color-primary)" />
                        })}
                        {/* 라벨 */}
                        {ELEMENTS.map((el, i) => {
                          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
                          const r = 95
                          const val = analyzeResult.fiveElements[el.key] || 0
                          return (
                            <text key={el.key} x={100 + r * Math.cos(angle)} y={100 + r * Math.sin(angle)}
                              textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={el.color} fontWeight="600">
                              {el.label.charAt(0)} {val}
                            </text>
                          )
                        })}
                      </svg>
                    </div>
                    {/* 범례 */}
                    <div className="flex justify-center gap-3 mb-2">
                      {ELEMENTS.map(el => (
                        <span key={el.key} className="text-body-emphasis" style={{ color: el.color }}>{el.label}</span>
                      ))}
                    </div>
                    <p className="text-body text-primary text-center">{analyzeResult.fiveElements.balance}</p>
                  </div>
                )}

                {/* 5대 지표 상세 점수 */}
                {analyzeResult.scoreBreakdown && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                    <p className="text-body font-bold text-primary mb-3">성명학 5대 지표</p>
                    <div className="space-y-3">
                      {[
                        { key: 'pronunciationOheng', icon: '', label: '발음오행' },
                        { key: 'suriOheng', icon: '', label: '수리오행' },
                        { key: 'yinYangHarmony', icon: '', label: '음양조화' },
                        { key: 'sourceOheng', icon: '', label: '자원오행' },
                        { key: 'pronunciation', icon: '', label: '발음/어감' },
                      ].map(item => {
                        const data = analyzeResult.scoreBreakdown[item.key]
                        if (!data) return null
                        const pct = data.max > 0 ? (data.score / data.max) * 100 : 0
                        return (
                          <div key={item.key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-caption font-semibold text-primary">{item.label}</span>
                              <span className="text-caption font-bold text-[var(--color-primary)]">{data.score}/{data.max}</span>
                            </div>
                            <div className="h-2 bg-[#E8E4DF] rounded-full overflow-hidden mb-1">
                              <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-label text-secondary leading-snug">{data.detail}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 종합 분석 */}
                <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-2">
                  <p className="text-body font-bold text-primary mb-2 flex items-center gap-1"><LightbulbIcon className="w-3.5 h-3.5" /> 종합 분석</p>
                  {analyzeResult.meaning && (
                    <div className="bg-[var(--color-page-bg)] rounded-lg p-3">
                      <p className="text-caption font-semibold text-secondary mb-1">이름 뜻</p>
                      <p className="text-body text-primary leading-relaxed">{analyzeResult.meaning}</p>
                    </div>
                  )}
                  {analyzeResult.strengths && (
                    <div className="flex gap-2">
                      <StarIcon className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                      <p className="text-body text-primary leading-relaxed">{analyzeResult.strengths}</p>
                    </div>
                  )}
                  {analyzeResult.caution && analyzeResult.caution !== '특별한 주의사항 없음' && (
                    <div className="flex gap-2">
                      <AlertIcon className="w-4 h-4 shrink-0 text-[#D08068]" />
                      <p className="text-body text-[#D08068] leading-relaxed">{analyzeResult.caution}</p>
                    </div>
                  )}
                  {analyzeResult.overall && (
                    <div className="bg-[#F0F9F4] rounded-lg p-3 mt-2">
                      <p className="text-body text-primary leading-relaxed">{analyzeResult.overall}</p>
                    </div>
                  )}
                  <div className="flex gap-4 pt-2">
                    {analyzeResult.luckyColor && <p className="text-caption text-secondary">행운의 색: <span className="font-semibold">{analyzeResult.luckyColor}</span></p>}
                    {analyzeResult.luckyNumber && <p className="text-caption text-secondary">행운의 수: <span className="font-semibold">{analyzeResult.luckyNumber}</span></p>}
                  </div>
                </div>

                {/* 레거시 호환 (scoreBreakdown 없는 경우) */}
                {!analyzeResult.scoreBreakdown && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-2">
                    {analyzeResult.yinYang && <div className="flex gap-2"><p className="text-body text-primary">{analyzeResult.yinYang}</p></div>}
                    {analyzeResult.pronunciation && <div className="flex gap-2"><p className="text-body text-primary">{analyzeResult.pronunciation}</p></div>}
                    {analyzeResult.strokes && <div className="flex gap-2"><PenIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-secondary" /><p className="text-body text-primary">{analyzeResult.strokes}</p></div>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
