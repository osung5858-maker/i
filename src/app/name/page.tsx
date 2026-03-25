'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'

type Tab = 'nickname' | 'suggest' | 'compare' | 'analyze'

const THEMES = ['건강하게', '지혜롭게', '사랑받는', '밝고 환한', '자연을 닮은', '큰 뜻을 품은', '예술적인', '강인한']
const ELEMENTS = [
  { key: 'wood', label: '목(木)', color: 'var(--color-primary)', emoji: '🌳' },
  { key: 'fire', label: '화(火)', color: '#D08068', emoji: '🔥' },
  { key: 'earth', label: '토(土)', color: '#C4A35A', emoji: '🏔️' },
  { key: 'metal', label: '금(金)', color: '#868B94', emoji: '⚙️' },
  { key: 'water', label: '수(水)', color: '#4A90D9', emoji: '💧' },
]

export default function NamePage() {
  const [tab, setTab] = useState<Tab>('nickname')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // 이름 비교
  const [compareNames, setCompareNames] = useState<string[]>(['', '', ''])
  const [compareBirthYear, setCompareBirthYear] = useState('')
  const [compareResult, setCompareResult] = useState<any>(null)

  // 저장된 이름
  const [saved, setSaved] = useState<string[]>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_saved_names') || '[]') } catch { return [] } }
    return []
  })

  const saveName = (name: string) => {
    const next = saved.includes(name) ? saved.filter(n => n !== name) : [...saved, name]
    setSaved(next); localStorage.setItem('dodam_saved_names', JSON.stringify(next))
  }

  const fetchNickname = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'nickname', theme: nickTheme, gender: nickGender }),
      })
      const data = await res.json()
      if (data.error) setError(data.error); else setNickResult(data)
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
      if (data.error) setError(data.error); else setSuggestResult(data)
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
      if (data.error) setError(data.error); else { setAnalyzeResult(data); setHanjaStep('result') }
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
      if (data.error) setError(data.error); else setCompareResult(data)
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
    <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col">
      <PageHeader title="이름 짓기" showBack />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28">
        {/* 탭 */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto hide-scrollbar -mx-5 px-5">
          {[
            { key: 'nickname' as Tab, label: '태명' },
            { key: 'suggest' as Tab, label: 'AI 추천' },
            { key: 'compare' as Tab, label: '후보 비교' },
            { key: 'analyze' as Tab, label: '이름 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(null) }}
              className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold ${tab === t.key ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[#6B6966] border border-[#E8E4DF]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-[#FFF0E6] rounded-xl p-3 mb-3">
            <p className="text-[13px] text-[#D08068]">{error}</p>
          </div>
        )}

        {/* ===== 태명 탭 ===== */}
        {tab === 'nickname' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-[14px] font-bold text-[#1A1918] mb-3">🌟 태명 추천받기</p>
              <p className="text-[14px] text-[#6B6966] mb-1">어떤 아이로 자라길 바라나요?</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {THEMES.map(t => (
                  <button key={t} onClick={() => setNickTheme(t)}
                    className={`px-3 py-1.5 rounded-full text-[13px] ${nickTheme === t ? 'bg-[var(--color-primary)] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 mb-3">
                {['모름', '남아', '여아'].map(g => (
                  <button key={g} onClick={() => setNickGender(g)}
                    className={`flex-1 py-1.5 rounded-lg text-[14px] ${nickGender === g ? 'bg-[var(--color-primary)] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                    {g}
                  </button>
                ))}
              </div>
              <button onClick={fetchNickname} disabled={loading}
                className="w-full py-2.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? 'AI가 고민 중...' : '태명 추천받기 ✨'}
              </button>
            </div>

            {nickResult?.names?.map((n: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[18px] font-bold text-[#1A1918]">{n.name}</p>
                  <button onClick={() => saveName(n.name)} className={`text-[13px] px-2 py-0.5 rounded-full ${saved.includes(n.name) ? 'bg-[var(--color-primary)] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                    {saved.includes(n.name) ? '♥ 저장됨' : '♡ 저장'}
                  </button>
                </div>
                <p className="text-[14px] text-[#1A1918] mb-1">{n.meaning}</p>
                <div className="flex gap-2">
                  <span className="text-[14px] text-[#6B6966] bg-[#FFF9F5] px-2 py-0.5 rounded">{n.origin}</span>
                  <span className="text-[14px] text-[#6B6966] bg-[#FFF9F5] px-2 py-0.5 rounded">{n.vibe}</span>
                </div>
              </div>
            ))}
            {nickResult?.tip && <p className="text-[13px] text-[#6B6966] text-center">{nickResult.tip}</p>}
          </div>
        )}

        {/* ===== 이름 추천 탭 ===== */}
        {tab === 'suggest' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-[14px] font-bold text-[#1A1918] mb-1">✨ AI 이름 추천</p>
              <div className="flex gap-2 mb-3">
                <a href="https://baby-name.kr/" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[var(--color-primary)] px-2 py-0.5 bg-[#F0F9F4] rounded-full">📊 인기 이름 순위</a>
                <a href="https://www.namechart.kr/" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[var(--color-primary)] px-2 py-0.5 bg-[#F0F9F4] rounded-full">📈 이름 차트</a>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-[14px] text-[#6B6966] mb-1">성</p>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="김"
                    className="w-full h-10 rounded-lg border border-[#E8E4DF] px-3 text-[14px]" />
                </div>
                <div>
                  <p className="text-[14px] text-[#6B6966] mb-1">글자 수</p>
                  <div className="flex gap-1.5">
                    {[2, 3].map(n => (
                      <button key={n} onClick={() => setSyllables(n)}
                        className={`flex-1 h-10 rounded-lg text-[13px] ${syllables === n ? 'bg-[var(--color-primary)] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                        {n}글자
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mb-3">
                {['모름', '남아', '여아'].map(g => (
                  <button key={g} onClick={() => setSuggestGender(g)}
                    className={`flex-1 py-1.5 rounded-lg text-[14px] ${suggestGender === g ? 'bg-[var(--color-primary)] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                    {g}
                  </button>
                ))}
              </div>
              <p className="text-[14px] text-[#6B6966] mb-1">희망 의미</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {THEMES.map(t => (
                  <button key={t} onClick={() => setSuggestTheme(t)}
                    className={`px-3 py-1.5 rounded-full text-[13px] ${suggestTheme === t ? 'bg-[var(--color-primary)] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={fetchSuggest} disabled={loading}
                className="w-full py-2.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? 'AI가 이름을 짓는 중...' : '이름 추천받기 ✨'}
              </button>
            </div>

            {suggestResult?.names?.map((n: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[18px] font-bold text-[#1A1918]">{lastName}{n.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#F0F9F4] flex items-center justify-center">
                      <span className="text-[14px] font-bold text-[var(--color-primary)]">{n.score}</span>
                    </div>
                    <button onClick={() => saveName(`${lastName}${n.name}`)} className={`text-[13px] px-2 py-0.5 rounded-full ${saved.includes(`${lastName}${n.name}`) ? 'bg-[var(--color-primary)] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                      {saved.includes(`${lastName}${n.name}`) ? '♥' : '♡'}
                    </button>
                  </div>
                </div>

                {/* 한자 후보 선택 */}
                {n.hanjaOptions && n.hanjaOptions.length > 0 ? (
                  <div className="mb-2 space-y-1">
                    {n.hanjaOptions.map((h: any, j: number) => (
                      <div key={j} className="flex items-center gap-2 p-2 bg-[#FFF9F5] rounded-lg">
                        <span className="text-[14px] font-semibold text-[#1A1918]">{h.hanja}</span>
                        <p className="text-[14px] text-[#6B6966] flex-1">{h.meaning}</p>
                      </div>
                    ))}
                  </div>
                ) : n.hanja ? (
                  <p className="text-[13px] text-[#6B6966] mb-2">{n.hanja}</p>
                ) : null}

                <p className="text-[14px] text-[#1A1918] mb-2">{n.meaning}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[14px] px-2 py-0.5 rounded bg-[#F0F9F4] text-[var(--color-primary)]">{n.fiveElements}</span>
                  <span className="text-[14px] px-2 py-0.5 rounded bg-[#FFF9F5] text-[#6B6966]">{n.pronunciation}</span>
                  <span className="text-[14px] px-2 py-0.5 rounded bg-[#FFF9F5] text-[#6B6966]">{n.uniqueness}</span>
                  {n.popularity && <span className="text-[14px] px-2 py-0.5 rounded bg-[#FFF8F3] text-[#C4A35A]">📊 {n.popularity}</span>}
                </div>
                {n.scoreDetail && <p className="text-[14px] text-[#9E9A95] mt-1">{n.scoreDetail}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ===== 후보 비교 탭 ===== */}
        {tab === 'compare' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-[14px] font-bold text-[#1A1918] mb-1">🏆 이름 후보 비교</p>
              <p className="text-[13px] text-[#6B6966] mb-3">원하는 이름을 입력하면 AI가 비교 분석해드려요</p>

              <div className="space-y-2 mb-3">
                {compareNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[14px] text-[#9E9A95] w-5">{i + 1}.</span>
                    <input value={name} onChange={e => updateCompareName(i, e.target.value)} placeholder={`후보 ${i + 1}`}
                      className="flex-1 h-10 rounded-lg border border-[#E8E4DF] px-3 text-[14px]" />
                    {compareNames.length > 2 && (
                      <button onClick={() => setCompareNames(compareNames.filter((_, j) => j !== i))} className="text-[#9E9A95] text-lg">✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                {compareNames.length < 6 && (
                  <button onClick={addCompareSlot} className="flex-1 py-2 rounded-lg border border-dashed border-[#AEB1B9] text-[14px] text-[#6B6966]">+ 후보 추가</button>
                )}
                <div className="flex-1">
                  <input value={compareBirthYear} onChange={e => setCompareBirthYear(e.target.value)} placeholder="출생 연도 (선택)"
                    className="w-full h-9 rounded-lg border border-[#E8E4DF] px-3 text-[14px]" />
                </div>
              </div>

              {/* 저장된 이름에서 추가 */}
              {saved.length > 0 && (
                <div className="mb-3">
                  <p className="text-[14px] text-[#6B6966] mb-1">저장된 이름에서 추가</p>
                  <div className="flex flex-wrap gap-1">
                    {saved.filter(n => !compareNames.includes(n)).map(name => (
                      <button key={name} onClick={() => {
                        const emptyIdx = compareNames.findIndex(n => !n.trim())
                        if (emptyIdx >= 0) updateCompareName(emptyIdx, name)
                        else if (compareNames.length < 6) setCompareNames([...compareNames, name])
                      }} className="px-2 py-1 rounded-full bg-[#F0F9F4] text-[14px] text-[var(--color-primary)]">
                        + {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={fetchCompare} disabled={loading}
                className="w-full py-2.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? 'AI가 비교 분석 중...' : '비교 분석하기 🏆'}
              </button>
            </div>

            {compareResult && (
              <>
                {/* 순위 결과 */}
                {compareResult.results?.map((r: any, i: number) => (
                  <div key={i} className={`bg-white rounded-xl border ${r.rank === 1 ? 'border-[var(--color-accent-bg)] bg-gradient-to-br from-white to-[#F0F9F4]' : 'border-[#E8E4DF]'} p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] font-bold ${
                          r.rank === 1 ? 'bg-[var(--color-primary)] text-white' : r.rank === 2 ? 'bg-[#C4A35A] text-white' : 'bg-[#E8E4DF] text-[#6B6966]'
                        }`}>{r.rank}</div>
                        <div>
                          <p className="text-[16px] font-bold text-[#1A1918]">{r.name}</p>
                          {r.hanja && <p className="text-[14px] text-[#9E9A95]">{r.hanja}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.rank === 1 ? 'bg-[var(--color-primary)]' : 'bg-[#FFF9F5]'}`}>
                          <span className={`text-[14px] font-bold ${r.rank === 1 ? 'text-white' : 'text-[#1A1918]'}`}>{r.score}</span>
                        </div>
                        <button onClick={() => saveName(r.name)} className={`text-[13px] px-2 py-0.5 rounded-full ${saved.includes(r.name) ? 'bg-[var(--color-primary)] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                          {saved.includes(r.name) ? '♥' : '♡'}
                        </button>
                      </div>
                    </div>
                    <p className="text-[14px] text-[#1A1918] mb-1">{r.meaning}</p>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <span className="text-[14px] px-2 py-0.5 rounded bg-[#F0F9F4] text-[var(--color-primary)]">{r.fiveElements}</span>
                      <span className="text-[14px] px-2 py-0.5 rounded bg-[#FFF9F5] text-[#6B6966]">{r.pronunciation}</span>
                      <span className="text-[14px] px-2 py-0.5 rounded bg-[#FFF9F5] text-[#6B6966]">{r.strokes}</span>
                    </div>
                    {r.highlight && <p className="text-[13px] text-[var(--color-primary)]">✨ {r.highlight}</p>}
                  </div>
                ))}

                {/* 종합 추천 */}
                {compareResult.recommendation && (
                  <div className="bg-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-4">
                    <p className="text-[13px] font-bold text-[var(--color-primary)] mb-1">🏆 AI 추천</p>
                    <p className="text-[14px] text-[#1A1918] leading-relaxed">{compareResult.recommendation}</p>
                    {compareResult.tip && <p className="text-[14px] text-[#6B6966] mt-2">{compareResult.tip}</p>}
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
                <p className="text-[14px] font-bold text-[#1A1918] mb-3">🔍 이름 분석</p>
                <p className="text-[13px] text-[#6B6966] mb-3">한자를 선택하고 음양오행 · 획수 · 발음 종합 분석</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-[14px] text-[#6B6966] mb-1">이름 (성 포함)</p>
                    <input value={analyzeName} onChange={e => setAnalyzeName(e.target.value)} placeholder="김도담"
                      className="w-full h-10 rounded-lg border border-[#E8E4DF] px-3 text-[14px]" />
                  </div>
                  <div>
                    <p className="text-[14px] text-[#6B6966] mb-1">출생 연도 (선택)</p>
                    <input value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="2026"
                      className="w-full h-10 rounded-lg border border-[#E8E4DF] px-3 text-[14px]" />
                  </div>
                </div>
                <button onClick={fetchHanjaOptions} disabled={loading}
                  className="w-full py-2.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                  {loading ? '한자 후보 조회 중...' : '한자 선택하기 →'}
                </button>
              </div>
            )}

            {/* 2단계: 한자 선택 */}
            {hanjaStep === 'select' && hanjaOptions && (
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[14px] font-bold text-[#1A1918]">한자 선택</p>
                  <button onClick={() => setHanjaStep('input')} className="text-[13px] text-[#6B6966]">← 다시 입력</button>
                </div>
                <p className="text-[13px] text-[#6B6966] mb-3">각 글자의 한자를 선택해주세요</p>

                {/* 성 */}
                <div className="mb-4">
                  <p className="text-[14px] font-semibold text-[#1A1918] mb-1.5">
                    {hanjaOptions.surname} → {hanjaOptions.surnameHanja || '?'}
                    <span className="text-[14px] text-[#6B6966] ml-1">(성)</span>
                  </p>
                </div>

                {/* 이름 글자별 */}
                {hanjaOptions.characters?.map((c: any, cIdx: number) => (
                  <div key={cIdx} className="mb-4">
                    <p className="text-[14px] font-semibold text-[#1A1918] mb-1.5">{c.char}</p>
                    <div className="space-y-1">
                      {c.options?.map((opt: any, oIdx: number) => (
                        <button key={oIdx} onClick={() => setSelectedHanja(prev => ({ ...prev, [cIdx]: oIdx }))}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                            (selectedHanja[cIdx] ?? 0) === oIdx ? 'bg-[#E8F5E9] border border-[var(--color-primary)]' : 'bg-[#F5F1EC] border border-transparent'
                          }`}>
                          <span className="text-[20px] font-serif shrink-0">{opt.hanja}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[14px] font-medium text-[#1A1918]">{opt.meaning}</span>
                              {opt.popular && <span className="text-[13px] bg-[#FFE0E6] text-[#E8537A] px-1 py-0.5 rounded">인기</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[13px] text-[#6B6966]">{opt.strokes}획</span>
                              <span className="text-[13px] text-[#6B6966]">{opt.element}</span>
                            </div>
                          </div>
                          {(selectedHanja[cIdx] ?? 0) === oIdx && <span className="text-[var(--color-primary)] text-sm">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 선택 결과 미리보기 */}
                <div className="bg-[#FFF9F5] rounded-lg p-3 mb-3 text-center">
                  <span className="text-[20px] font-serif tracking-wider">
                    {hanjaOptions.surnameHanja}
                    {hanjaOptions.characters?.map((c: any, i: number) => c.options?.[(selectedHanja[i] ?? 0)]?.hanja || '?').join('')}
                  </span>
                  <span className="text-[13px] text-[#6B6966] ml-2">({analyzeName})</span>
                </div>

                <button onClick={fetchAnalyze} disabled={loading}
                  className="w-full py-2.5 bg-[var(--color-primary)] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                  {loading ? '분석 중...' : '이 한자로 분석하기 🔍'}
                </button>
              </div>
            )}

            {/* 3단계: 분석 결과 */}
            {hanjaStep === 'result' && analyzeResult && (
              <div className="flex items-center justify-between">
                <button onClick={() => setHanjaStep('select')} className="text-[13px] text-[#6B6966]">← 한자 다시 선택</button>
                <button onClick={() => { setHanjaStep('input'); setAnalyzeResult(null); setHanjaOptions(null) }} className="text-[13px] text-[#6B6966]">새 이름 분석</button>
              </div>
            )}

            {analyzeResult && (
              <>
                {/* 총점 */}
                <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)] p-5 text-center">
                  <p className="text-[13px] text-[#6B6966]">{analyzeResult.name}</p>
                  {analyzeResult.hanja && <p className="text-[13px] text-[#9E9A95]">{analyzeResult.hanja}</p>}
                  <div className="w-20 h-20 mx-auto rounded-full bg-[var(--color-primary)] flex items-center justify-center my-3 shadow-[0_4px_20px_rgba(61,138,90,0.3)]">
                    <span className="text-[28px] font-bold text-white">{analyzeResult.totalScore}</span>
                  </div>
                  <p className="text-[14px] text-[#6B6966]">종합 점수 (100점 만점)</p>
                  <button onClick={() => saveName(analyzeResult.name)} className={`mt-2 text-[13px] px-3 py-1 rounded-full ${saved.includes(analyzeResult.name) ? 'bg-[var(--color-primary)] text-white' : 'bg-[#FFF9F5] text-[#6B6966]'}`}>
                    {saved.includes(analyzeResult.name) ? '♥ 저장됨' : '♡ 저장하기'}
                  </button>
                </div>

                {/* 음양오행 레이더 차트 */}
                {analyzeResult.fiveElements && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                    <p className="text-[13px] font-bold text-[#1A1918] mb-3">☯️ 음양오행</p>
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
                              {el.emoji} {val}
                            </text>
                          )
                        })}
                      </svg>
                    </div>
                    {/* 범례 */}
                    <div className="flex justify-center gap-3 mb-2">
                      {ELEMENTS.map(el => (
                        <span key={el.key} className="text-[14px]" style={{ color: el.color }}>{el.label}</span>
                      ))}
                    </div>
                    <p className="text-[13px] text-[#1A1918] text-center">{analyzeResult.fiveElements.balance}</p>
                  </div>
                )}

                {/* 5대 지표 상세 점수 */}
                {analyzeResult.scoreBreakdown && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
                    <p className="text-[13px] font-bold text-[#1A1918] mb-3">📋 성명학 5대 지표</p>
                    <div className="space-y-3">
                      {[
                        { key: 'pronunciationOheng', icon: '🔊', label: '발음오행' },
                        { key: 'suriOheng', icon: '🔢', label: '수리오행' },
                        { key: 'yinYangHarmony', icon: '☯️', label: '음양조화' },
                        { key: 'sourceOheng', icon: '🌿', label: '자원오행' },
                        { key: 'pronunciation', icon: '🗣️', label: '발음/어감' },
                      ].map(item => {
                        const data = analyzeResult.scoreBreakdown[item.key]
                        if (!data) return null
                        const pct = data.max > 0 ? (data.score / data.max) * 100 : 0
                        return (
                          <div key={item.key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-semibold text-[#1A1918]">{item.icon} {item.label}</span>
                              <span className="text-[12px] font-bold text-[var(--color-primary)]">{data.score}/{data.max}</span>
                            </div>
                            <div className="h-2 bg-[#E8E4DF] rounded-full overflow-hidden mb-1">
                              <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[11px] text-[#6B6966] leading-snug">{data.detail}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 종합 분석 */}
                <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-2">
                  <p className="text-[13px] font-bold text-[#1A1918] mb-2">💡 종합 분석</p>
                  {analyzeResult.meaning && (
                    <div className="bg-[#FFF9F5] rounded-lg p-3">
                      <p className="text-[12px] font-semibold text-[#6B6966] mb-1">이름 뜻</p>
                      <p className="text-[13px] text-[#1A1918] leading-relaxed">{analyzeResult.meaning}</p>
                    </div>
                  )}
                  {analyzeResult.strengths && (
                    <div className="flex gap-2">
                      <span className="text-sm shrink-0">💪</span>
                      <p className="text-[13px] text-[#1A1918] leading-relaxed">{analyzeResult.strengths}</p>
                    </div>
                  )}
                  {analyzeResult.caution && analyzeResult.caution !== '특별한 주의사항 없음' && (
                    <div className="flex gap-2">
                      <span className="text-sm shrink-0">⚠️</span>
                      <p className="text-[13px] text-[#D08068] leading-relaxed">{analyzeResult.caution}</p>
                    </div>
                  )}
                  {analyzeResult.overall && (
                    <div className="bg-[#F0F9F4] rounded-lg p-3 mt-2">
                      <p className="text-[13px] text-[#1A1918] leading-relaxed">{analyzeResult.overall}</p>
                    </div>
                  )}
                  <div className="flex gap-4 pt-2">
                    {analyzeResult.luckyColor && <p className="text-[12px] text-[#6B6966]">🎨 행운의 색: <span className="font-semibold">{analyzeResult.luckyColor}</span></p>}
                    {analyzeResult.luckyNumber && <p className="text-[12px] text-[#6B6966]">🔢 행운의 수: <span className="font-semibold">{analyzeResult.luckyNumber}</span></p>}
                  </div>
                </div>

                {/* 레거시 호환 (scoreBreakdown 없는 경우) */}
                {!analyzeResult.scoreBreakdown && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-2">
                    {analyzeResult.yinYang && <div className="flex gap-2"><span className="text-sm">☯️</span><p className="text-[13px] text-[#1A1918]">{analyzeResult.yinYang}</p></div>}
                    {analyzeResult.pronunciation && <div className="flex gap-2"><span className="text-sm">🗣️</span><p className="text-[13px] text-[#1A1918]">{analyzeResult.pronunciation}</p></div>}
                    {analyzeResult.strokes && <div className="flex gap-2"><span className="text-sm">✏️</span><p className="text-[13px] text-[#1A1918]">{analyzeResult.strokes}</p></div>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 저장된 이름 */}
        {saved.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 mt-4">
            <p className="text-[13px] font-bold text-[#1A1918] mb-2">♥ 저장된 이름 ({saved.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {saved.map(name => (
                <button key={name} onClick={() => { setAnalyzeName(name); setTab('analyze') }}
                  className="px-3 py-1.5 rounded-full bg-[#F0F9F4] text-[14px] text-[var(--color-primary)] font-medium">
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
