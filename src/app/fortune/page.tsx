'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSecure } from '@/lib/secureStorage'
import { PageHeader } from '@/components/layout/PageLayout'
import { CrystalBallIcon, DragonIcon, CardIcon, StarIcon, HeartIcon, AlertIcon, LightbulbIcon, RefreshIcon } from '@/components/ui/Icons'
import { shareFortune } from '@/lib/kakao/share-parenting'

function FortuneContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'biorhythm' | 'zodiac' | 'fortune'>('biorhythm')
  const [birthDate, setBirthDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [mode, setMode] = useState('')
  const [fortuneResult, setFortuneResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'zodiac' || t === 'fortune' || t === 'biorhythm') setTab(t)
    const mb = localStorage.getItem('dodam_mother_birth') || ''
    setBirthDate(mb)
    setMode(localStorage.getItem('dodam_mode') || '')
    getSecure('dodam_due_date').then(v => { if (v) setDueDate(v) })
  }, [])

  // 바이오리듬 계산 (과학적 23/28/33일 주기)
  const calcBiorhythm = () => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    const days = Math.floor((today.getTime() - birth.getTime()) / 86400000)
    return {
      physical: Math.sin((2 * Math.PI * days) / 23) * 100,
      emotional: Math.sin((2 * Math.PI * days) / 28) * 100,
      intellectual: Math.sin((2 * Math.PI * days) / 33) * 100,
    }
  }

  // 띠 계산
  const getZodiacAnimal = (year: number) => {
    const animals = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양']
    return animals[year % 12]
  }

  // 띠 → 파일명
  const getAnimalFile = (animal: string) => {
    const map: Record<string, string> = {
      '쥐': 'rat', '소': 'ox', '호랑이': 'tiger', '토끼': 'rabbit',
      '용': 'dragon', '뱀': 'snake', '말': 'horse', '양': 'goat',
      '원숭이': 'monkey', '닭': 'rooster', '개': 'dog', '돼지': 'pig',
    }
    return map[animal] || null
  }

  // 별자리 계산
  const getConstellation = (month: number, day: number) => {
    const signs = [
      { name: '염소자리', end: [1, 19] }, { name: '물병자리', end: [2, 18] },
      { name: '물고기자리', end: [3, 20] }, { name: '양자리', end: [4, 19] },
      { name: '황소자리', end: [5, 20] }, { name: '쌍둥이자리', end: [6, 21] },
      { name: '게자리', end: [7, 22] }, { name: '사자자리', end: [8, 22] },
      { name: '처녀자리', end: [9, 22] }, { name: '천칭자리', end: [10, 23] },
      { name: '전갈자리', end: [11, 22] }, { name: '궁수자리', end: [12, 21] },
    ]
    for (const sign of signs) {
      if (month < sign.end[0] || (month === sign.end[0] && day <= sign.end[1])) return sign.name
    }
    return '염소자리'
  }

  // 별자리 → 파일명
  const getConstellationFile = (name: string) => {
    const map: Record<string, string> = {
      '염소자리': 'capricorn', '물병자리': 'aquarius', '물고기자리': 'pisces',
      '양자리': 'aries', '황소자리': 'taurus', '쌍둥이자리': 'gemini',
      '게자리': 'cancer', '사자자리': 'leo', '처녀자리': 'virgo',
      '천칭자리': 'libra', '전갈자리': 'scorpio', '궁수자리': 'sagittarius',
    }
    return map[name] || null
  }

  // AI 운세 (Gemini 직접 호출)
  const fetchFortune = async () => {
    if (!birthDate) return
    setLoading(true)
    try {
      const birth = new Date(birthDate)
      const year = birth.getFullYear()
      const month = birth.getMonth() + 1
      const day = birth.getDate()
      const animal = getZodiacAnimal(year)
      const constellation = getConstellation(month, day)
      const mode = localStorage.getItem('dodam_mode') || 'parenting'
      const context = mode === 'preparing' ? '임신 준비 중' : mode === 'pregnant' ? '임신 중' : '육아 중'

      const cacheKey = `dodam_fortune_${new Date().toISOString().split('T')[0]}_${birthDate}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) { try { setFortuneResult(JSON.parse(cached)); setLoading(false); return } catch { /* */ } }

      const res = await fetch('/api/ai-pregnant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'fortune',
          birthYear: year, birthMonth: month, birthDay: day,
          animal, constellation, context, dueDate,
        }),
      })
      const data = await res.json()
      if (!data.error && data.todayLuck) {
        setFortuneResult(data)
        localStorage.setItem(cacheKey, JSON.stringify(data))
      } else if (data.error) {
        setFortuneResult({ todayLuck: '운세 조회에 실패했어요. 다시 시도해주세요.' })
      }
    } catch { setFortuneResult({ todayLuck: '연결 오류. 다시 시도해주세요.' }) }
    setLoading(false)
  }

  const bio = calcBiorhythm()
  const birthParts = birthDate ? birthDate.split('-').map(Number) : [0, 0, 0]

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="운세 · 바이오리듬" showBack />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-4 space-y-3 w-full">
        {/* 탭 */}
        <div className="flex gap-1.5">
          {[
            { key: 'biorhythm' as const, label: '바이오리듬', icon: <CrystalBallIcon className="w-3.5 h-3.5 inline mr-0.5" /> },
            { key: 'zodiac' as const, label: '띠 · 별자리', icon: <DragonIcon className="w-3.5 h-3.5 inline mr-0.5" /> },
            { key: 'fortune' as const, label: '오늘의 운세', icon: <CardIcon className="w-3.5 h-3.5 inline mr-0.5" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-body font-semibold ${tab === t.key ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-secondary border border-[#E8E4DF]'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* 바이오리듬 */}
        {tab === 'biorhythm' && bio && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-3">오늘의 바이오리듬</p>
            {[
              { label: '신체', value: bio.physical, color: '#D08068' },
              { label: '감정', value: bio.emotional, color: 'var(--color-primary)' },
              { label: '지성', value: bio.intellectual, color: '#4A90D9' },
            ].map(b => (
              <div key={b.label} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-body-emphasis text-primary">{b.label}</span>
                  <span className="text-body-emphasis font-bold" style={{ color: b.color }}>{Math.round(b.value)}%</span>
                </div>
                <div className="w-full h-2 bg-[#E8E4DF] rounded-full relative">
                  <div className="absolute top-0 left-1/2 w-px h-2 bg-[#AEB1B9]" />
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.abs(b.value) / 2 + 50}%`,
                    marginLeft: b.value < 0 ? `${50 + b.value / 2}%` : '50%',
                    backgroundColor: b.color,
                    maxWidth: '50%',
                  }} />
                </div>
              </div>
            ))}
            <p className="text-body-emphasis text-secondary mt-2 text-center">
              {bio.physical > 50 && bio.emotional > 50 ? '오늘 컨디션 최고!' :
               bio.emotional < -30 ? '감정 기복이 있을 수 있어요. 쉬어가세요' :
               '도담하게 보내세요'}
            </p>
          </div>
        )}

        {/* 띠 · 별자리 */}
        {tab === 'zodiac' && birthDate && (
          <div className="space-y-3">
            {/* 엄마 */}
            {(() => {
              const animal = getZodiacAnimal(birthParts[0])
              const constellation = getConstellation(birthParts[1], birthParts[2])
              const animalFile = getAnimalFile(animal)
              const starFile = getConstellationFile(constellation)
              return (
                <div className="bg-gradient-to-br from-white to-[#FFF8F3] rounded-xl border border-[#FFDDC8]/50 p-4">
                  <p className="text-body font-bold text-primary mb-3 text-center">엄마의 띠 · 별자리</p>
                  <div className="flex gap-3">
                    {/* 띠 */}
                    <div className="flex-1 flex flex-col items-center gap-1">
                      {animalFile && (
                        <video src={`/images/illustrations/${animalFile}.webm`} autoPlay loop muted playsInline
                          className="w-20 h-20 object-contain"
                          style={{ maskImage: 'radial-gradient(circle, black 55%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 80%)' }} />
                      )}
                      <p className="text-subtitle text-primary">{animal}띠</p>
                      <p className="text-label text-tertiary">{birthParts[0]}년생</p>
                    </div>
                    <div className="w-px bg-[#E8E4DF]" />
                    {/* 별자리 */}
                    <div className="flex-1 flex flex-col items-center gap-1">
                      {starFile && (
                        <video src={`/images/illustrations/${starFile}.webm`} autoPlay loop muted playsInline
                          className="w-20 h-20 object-contain"
                          style={{ maskImage: 'radial-gradient(circle, black 55%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 80%)' }} />
                      )}
                      <p className="text-subtitle text-primary">{constellation}</p>
                      <p className="text-label text-tertiary">{birthParts[1]}/{birthParts[2]}</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* 아이 */}
            {dueDate && (() => {
              const due = new Date(dueDate)
              const animal = getZodiacAnimal(due.getFullYear())
              const constellation = getConstellation(due.getMonth() + 1, due.getDate())
              const animalFile = getAnimalFile(animal)
              const starFile = getConstellationFile(constellation)
              return (
                <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[var(--color-accent-bg)]/50 p-4">
                  <p className="text-body font-bold text-primary mb-3 text-center">아이 예상 띠 · 별자리</p>
                  <div className="flex gap-3">
                    {/* 띠 */}
                    <div className="flex-1 flex flex-col items-center gap-1">
                      {animalFile && (
                        <video src={`/images/illustrations/${animalFile}.webm`} autoPlay loop muted playsInline
                          className="w-20 h-20 object-contain"
                          style={{ maskImage: 'radial-gradient(circle, black 55%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 80%)' }} />
                      )}
                      <p className="text-subtitle text-primary">{animal}띠</p>
                      <p className="text-label text-tertiary">{due.getFullYear()}년생 예정</p>
                    </div>
                    <div className="w-px bg-[#E8E4DF]" />
                    {/* 별자리 */}
                    <div className="flex-1 flex flex-col items-center gap-1">
                      {starFile && (
                        <video src={`/images/illustrations/${starFile}.webm`} autoPlay loop muted playsInline
                          className="w-20 h-20 object-contain"
                          style={{ maskImage: 'radial-gradient(circle, black 55%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 80%)' }} />
                      )}
                      <p className="text-subtitle text-primary">{constellation}</p>
                      <p className="text-label text-tertiary">출산 예정일 기준</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* 띠/별자리 운세 */}
            {fortuneResult?.animalFortune || fortuneResult?.starFortune ? (
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-3">
                {fortuneResult.animalFortune && (
                  <div>
                    <p className="text-body-emphasis font-bold text-primary mb-1">{getZodiacAnimal(birthParts[0])} 오늘의 운세</p>
                    <p className="text-body-emphasis text-secondary leading-relaxed">{fortuneResult.animalFortune}</p>
                  </div>
                )}
                {fortuneResult.starFortune && (
                  <div className="pt-2 border-t border-[#E8E4DF]">
                    <p className="text-body-emphasis font-bold text-primary mb-1">{getConstellation(birthParts[1], birthParts[2])} 오늘의 운세</p>
                    <p className="text-body-emphasis text-secondary leading-relaxed">{fortuneResult.starFortune}</p>
                  </div>
                )}
                <p className="text-body text-tertiary text-center">재미로만 봐주세요</p>
              </div>
            ) : (
              <button onClick={fetchFortune} disabled={loading}
                className="w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? '운세 보는 중...' : '띠 · 별자리 운세 보기'}
              </button>
            )}
          </div>
        )}

        {/* 오늘의 운세 */}
        {tab === 'fortune' && (
          <div className="space-y-3">
            {fortuneResult ? (
              <>
                {/* 전체 운세 */}
                <div className="bg-gradient-to-br from-[#FFF8F3] to-[#F0F9F4] rounded-xl border border-[#FFDDC8]/50 p-4">
                  <p className="text-body-emphasis font-bold text-primary mb-2 flex items-center gap-1"><CardIcon className="w-4 h-4" /> 오늘의 운세</p>
                  <p className="text-body text-primary leading-relaxed">{fortuneResult.todayLuck}</p>
                </div>

                {/* 띠/별자리 운세 */}
                {(fortuneResult.animalFortune || fortuneResult.starFortune) && (
                  <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-2">
                    {fortuneResult.animalFortune && (
                      <div>
                        <p className="text-body-emphasis text-primary mb-0.5">{getZodiacAnimal(new Date(birthDate).getFullYear())} 띠 운세</p>
                        <p className="text-body text-secondary leading-relaxed">{fortuneResult.animalFortune}</p>
                      </div>
                    )}
                    {fortuneResult.starFortune && (
                      <div className="pt-2 border-t border-[#E8E4DF]">
                        <p className="text-body-emphasis text-primary mb-0.5">{getConstellation(new Date(birthDate).getMonth() + 1, new Date(birthDate).getDate())} 운세</p>
                        <p className="text-body text-secondary leading-relaxed">{fortuneResult.starFortune}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 세부 운세 */}
                <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-2.5">
                  {fortuneResult.loveLuck && (
                    <div className="flex items-start gap-2">
                      <HeartIcon className="w-4 h-4 shrink-0 text-[#D08068]" />
                      <div><p className="text-body font-semibold text-primary">사랑/가족운</p><p className="text-body text-secondary">{fortuneResult.loveLuck}</p></div>
                    </div>
                  )}
                  {fortuneResult.healthLuck && (
                    <div className="flex items-start gap-2">
                      <HeartIcon className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                      <div><p className="text-body font-semibold text-primary">건강운</p><p className="text-body text-secondary">{fortuneResult.healthLuck}</p></div>
                    </div>
                  )}
                  {fortuneResult.moneyLuck && (
                    <div className="flex items-start gap-2">
                      <StarIcon className="w-4 h-4 shrink-0 text-[#C4A35A]" />
                      <div><p className="text-body font-semibold text-primary">재물운</p><p className="text-body text-secondary">{fortuneResult.moneyLuck}</p></div>
                    </div>
                  )}
                </div>

                {/* 행운 아이템 */}
                <div className="grid grid-cols-2 gap-2">
                  {fortuneResult.luckyColor && <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 text-center"><p className="text-body text-secondary">행운의 색</p><p className="text-body font-bold text-primary">{fortuneResult.luckyColor}</p></div>}
                  {fortuneResult.luckyFood && <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 text-center"><p className="text-body text-secondary">행운의 음식</p><p className="text-body font-bold text-primary">{fortuneResult.luckyFood}</p></div>}
                  {fortuneResult.luckyNumber && <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 text-center"><p className="text-body text-secondary">행운의 숫자</p><p className="text-body font-bold text-primary">{fortuneResult.luckyNumber}</p></div>}
                  {fortuneResult.luckyTime && <div className="bg-white rounded-xl border border-[#E8E4DF] p-3 text-center"><p className="text-body text-secondary">행운의 시간</p><p className="text-body font-bold text-primary">{fortuneResult.luckyTime}</p></div>}
                </div>

                {/* 주간 조언 + 피할 것 */}
                <div className="bg-white rounded-xl border border-[#E8E4DF] p-4 space-y-2">
                  {fortuneResult.weekAdvice && <p className="text-body text-[var(--color-primary)] flex items-start gap-1"><LightbulbIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" /> 이번 주: {fortuneResult.weekAdvice}</p>}
                  {fortuneResult.avoidToday && <p className="text-body text-[#D08068] flex items-start gap-1"><AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" /> 오늘 피할 것: {fortuneResult.avoidToday}</p>}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-body text-tertiary">재미로만 봐주세요</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => shareFortune(fortuneResult.todayLuck || '')} className="text-caption text-[var(--color-primary)] font-semibold">카톡 공유</button>
                    <button onClick={() => { localStorage.removeItem(`dodam_fortune_${new Date().toISOString().split('T')[0]}_${birthDate}`); setFortuneResult(null); fetchFortune() }} className="text-body-emphasis text-[var(--color-primary)] flex items-center gap-1">다시 보기 <RefreshIcon className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-[#E8E4DF] p-5 text-center">
                <span className="block mb-2"><CardIcon className="w-8 h-8 mx-auto text-[var(--color-primary)]" /></span>
                <p className="text-body-emphasis font-bold text-primary mb-1">오늘의 운세</p>
                <p className="text-body-emphasis text-secondary mb-4">띠·별자리·사주 기반 AI 운세를 봐드려요</p>
                <button onClick={fetchFortune} disabled={loading || !birthDate}
                  className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                  {loading ? '운세 보는 중...' : '오늘의 운세 보기'}
                </button>
              </div>
            )}
          </div>
        )}

        {!birthDate && (
          <div className="bg-[#FFF0E6] rounded-xl p-4 text-center">
            <p className="text-body-emphasis text-[#D08068]">생년월일이 설정되지 않았어요</p>
            <p className="text-body-emphasis text-secondary mt-1">설정에서 생년월일을 입력하면 이용할 수 있어요</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FortunePage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)]" />}>
      <FortuneContent />
    </Suspense>
  )
}
