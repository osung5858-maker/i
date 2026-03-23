'use client'

import { useState } from 'react'

type Tab = 'nickname' | 'suggest' | 'analyze'

const THEMES = ['건강하게', '지혜롭게', '사랑받는', '밝고 환한', '자연을 닮은', '큰 뜻을 품은', '예술적인', '강인한']
const ELEMENTS = [
  { key: 'wood', label: '목(木)', color: '#3D8A5A', emoji: '🌳' },
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
    } catch (e) { setError(`${e}`) }
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
    } catch (e) { setError(`${e}`) }
    setLoading(false)
  }

  const fetchAnalyze = async () => {
    if (!analyzeName) { setError('이름을 입력해주세요'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'analyze', fullName: analyzeName, birthYear }),
      })
      const data = await res.json()
      if (data.error) setError(data.error); else setAnalyzeResult(data)
    } catch (e) { setError(`${e}`) }
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">이름 짓기</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28">
        {/* 탭 */}
        <div className="flex gap-1.5 mb-4">
          {[
            { key: 'nickname' as Tab, label: '태명' },
            { key: 'suggest' as Tab, label: '이름 추천' },
            { key: 'analyze' as Tab, label: '이름 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(null) }}
              className={`flex-1 py-2 rounded-xl text-[13px] font-semibold ${tab === t.key ? 'bg-[#3D8A5A] text-white' : 'bg-white text-[#868B94] border border-[#f0f0f0]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-[#FFF0E6] rounded-xl p-3 mb-3">
            <p className="text-[11px] text-[#D08068]">{error}</p>
          </div>
        )}

        {/* ===== 태명 탭 ===== */}
        {tab === 'nickname' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[14px] font-bold text-[#1A1918] mb-3">🌟 태명 추천받기</p>
              <p className="text-[12px] text-[#868B94] mb-1">어떤 아이로 자라길 바라나요?</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {THEMES.map(t => (
                  <button key={t} onClick={() => setNickTheme(t)}
                    className={`px-3 py-1.5 rounded-full text-[11px] ${nickTheme === t ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 mb-3">
                {['모름', '남아', '여아'].map(g => (
                  <button key={g} onClick={() => setNickGender(g)}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] ${nickGender === g ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                    {g}
                  </button>
                ))}
              </div>
              <button onClick={fetchNickname} disabled={loading}
                className="w-full py-2.5 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? 'AI가 고민 중...' : '태명 추천받기 ✨'}
              </button>
            </div>

            {nickResult?.names?.map((n: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-[#f0f0f0] p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[18px] font-bold text-[#1A1918]">{n.name}</p>
                  <button onClick={() => saveName(n.name)} className={`text-[11px] px-2 py-0.5 rounded-full ${saved.includes(n.name) ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                    {saved.includes(n.name) ? '♥ 저장됨' : '♡ 저장'}
                  </button>
                </div>
                <p className="text-[12px] text-[#1A1918] mb-1">{n.meaning}</p>
                <div className="flex gap-2">
                  <span className="text-[10px] text-[#868B94] bg-[#F5F4F1] px-2 py-0.5 rounded">{n.origin}</span>
                  <span className="text-[10px] text-[#868B94] bg-[#F5F4F1] px-2 py-0.5 rounded">{n.vibe}</span>
                </div>
              </div>
            ))}
            {nickResult?.tip && <p className="text-[11px] text-[#868B94] text-center">{nickResult.tip}</p>}
          </div>
        )}

        {/* ===== 이름 추천 탭 ===== */}
        {tab === 'suggest' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[14px] font-bold text-[#1A1918] mb-3">✨ AI 이름 추천</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-[10px] text-[#868B94] mb-1">성</p>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="김"
                    className="w-full h-10 rounded-lg border border-[#f0f0f0] px-3 text-[14px]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#868B94] mb-1">글자 수</p>
                  <div className="flex gap-1.5">
                    {[2, 3].map(n => (
                      <button key={n} onClick={() => setSyllables(n)}
                        className={`flex-1 h-10 rounded-lg text-[13px] ${syllables === n ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                        {n}글자
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mb-3">
                {['모름', '남아', '여아'].map(g => (
                  <button key={g} onClick={() => setSuggestGender(g)}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] ${suggestGender === g ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                    {g}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#868B94] mb-1">희망 의미</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {THEMES.map(t => (
                  <button key={t} onClick={() => setSuggestTheme(t)}
                    className={`px-3 py-1.5 rounded-full text-[11px] ${suggestTheme === t ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={fetchSuggest} disabled={loading}
                className="w-full py-2.5 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? 'AI가 이름을 짓는 중...' : '이름 추천받기 ✨'}
              </button>
            </div>

            {suggestResult?.names?.map((n: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-[#f0f0f0] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[18px] font-bold text-[#1A1918]">{lastName}{n.name}</p>
                    {n.hanja && <p className="text-[11px] text-[#868B94]">{n.hanja}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#F0F9F4] flex items-center justify-center">
                      <span className="text-[14px] font-bold text-[#3D8A5A]">{n.score}</span>
                    </div>
                    <button onClick={() => saveName(`${lastName}${n.name}`)} className={`text-[11px] px-2 py-0.5 rounded-full ${saved.includes(`${lastName}${n.name}`) ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                      {saved.includes(`${lastName}${n.name}`) ? '♥' : '♡'}
                    </button>
                  </div>
                </div>
                <p className="text-[12px] text-[#1A1918] mb-2">{n.meaning}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#F0F9F4] text-[#3D8A5A]">{n.fiveElements}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#F5F4F1] text-[#868B94]">{n.pronunciation}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#F5F4F1] text-[#868B94]">{n.uniqueness}</span>
                </div>
                {n.scoreDetail && <p className="text-[10px] text-[#AEB1B9] mt-1">{n.scoreDetail}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ===== 이름 분석 탭 ===== */}
        {tab === 'analyze' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[14px] font-bold text-[#1A1918] mb-3">🔍 이름 분석</p>
              <p className="text-[11px] text-[#868B94] mb-3">음양오행 · 획수 · 발음 종합 분석</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-[10px] text-[#868B94] mb-1">이름 (성 포함)</p>
                  <input value={analyzeName} onChange={e => setAnalyzeName(e.target.value)} placeholder="김도담"
                    className="w-full h-10 rounded-lg border border-[#f0f0f0] px-3 text-[14px]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#868B94] mb-1">출생 연도 (선택)</p>
                  <input value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="2026"
                    className="w-full h-10 rounded-lg border border-[#f0f0f0] px-3 text-[14px]" />
                </div>
              </div>
              <button onClick={fetchAnalyze} disabled={loading}
                className="w-full py-2.5 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? '분석 중...' : '이름 분석하기 🔍'}
              </button>
            </div>

            {analyzeResult && (
              <>
                {/* 총점 */}
                <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[#C8F0D8] p-5 text-center">
                  <p className="text-[13px] text-[#868B94]">{analyzeResult.name}</p>
                  {analyzeResult.hanja && <p className="text-[11px] text-[#AEB1B9]">{analyzeResult.hanja}</p>}
                  <div className="w-20 h-20 mx-auto rounded-full bg-[#3D8A5A] flex items-center justify-center my-3 shadow-[0_4px_20px_rgba(61,138,90,0.3)]">
                    <span className="text-[28px] font-bold text-white">{analyzeResult.totalScore}</span>
                  </div>
                  <p className="text-[10px] text-[#868B94]">종합 점수 (100점 만점)</p>
                  <button onClick={() => saveName(analyzeResult.name)} className={`mt-2 text-[11px] px-3 py-1 rounded-full ${saved.includes(analyzeResult.name) ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                    {saved.includes(analyzeResult.name) ? '♥ 저장됨' : '♡ 저장하기'}
                  </button>
                </div>

                {/* 음양오행 차트 */}
                {analyzeResult.fiveElements && (
                  <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
                    <p className="text-[13px] font-bold text-[#1A1918] mb-3">☯️ 음양오행</p>
                    <div className="space-y-2 mb-3">
                      {ELEMENTS.map(el => {
                        const val = analyzeResult.fiveElements[el.key] || 0
                        return (
                          <div key={el.key} className="flex items-center gap-2">
                            <span className="text-sm w-6">{el.emoji}</span>
                            <span className="text-[11px] text-[#868B94] w-12">{el.label}</span>
                            <div className="flex-1 h-2 bg-[#F0F0F0] rounded-full">
                              <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: el.color }} />
                            </div>
                            <span className="text-[10px] text-[#868B94] w-8 text-right">{val}</span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[11px] text-[#1A1918]">{analyzeResult.fiveElements.balance}</p>
                  </div>
                )}

                {/* 상세 분석 */}
                <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 space-y-2">
                  <p className="text-[13px] font-bold text-[#1A1918] mb-2">📋 상세 분석</p>
                  {analyzeResult.yinYang && <div className="flex gap-2"><span className="text-sm">☯️</span><p className="text-[12px] text-[#1A1918]">{analyzeResult.yinYang}</p></div>}
                  {analyzeResult.pronunciation && <div className="flex gap-2"><span className="text-sm">🗣️</span><p className="text-[12px] text-[#1A1918]">{analyzeResult.pronunciation}</p></div>}
                  {analyzeResult.strokes && <div className="flex gap-2"><span className="text-sm">✏️</span><p className="text-[12px] text-[#1A1918]">{analyzeResult.strokes}</p></div>}
                  {analyzeResult.overall && <div className="bg-[#F0F9F4] rounded-lg p-3 mt-2"><p className="text-[12px] text-[#1A1918] leading-relaxed">{analyzeResult.overall}</p></div>}
                  <div className="flex gap-3 pt-2">
                    {analyzeResult.luckyColor && <p className="text-[10px] text-[#868B94]">🎨 행운의 색: <span className="font-semibold">{analyzeResult.luckyColor}</span></p>}
                    {analyzeResult.luckyNumber && <p className="text-[10px] text-[#868B94]">🔢 행운의 수: <span className="font-semibold">{analyzeResult.luckyNumber}</span></p>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 저장된 이름 */}
        {saved.length > 0 && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 mt-4">
            <p className="text-[13px] font-bold text-[#1A1918] mb-2">♥ 저장된 이름 ({saved.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {saved.map(name => (
                <button key={name} onClick={() => { setAnalyzeName(name); setTab('analyze') }}
                  className="px-3 py-1.5 rounded-full bg-[#F0F9F4] text-[12px] text-[#3D8A5A] font-medium">
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
