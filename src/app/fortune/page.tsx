'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'

export default function FortunePage() {
  const [tab, setTab] = useState<'biorhythm' | 'zodiac' | 'fortune'>('biorhythm')
  const [birthDate, setBirthDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [fortuneResult, setFortuneResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const mb = localStorage.getItem('dodam_mother_birth') || ''
    const dd = localStorage.getItem('dodam_due_date') || ''
    setBirthDate(mb)
    setDueDate(dd)
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
    const animals = ['🐒 원숭이', '🐔 닭', '🐕 개', '🐷 돼지', '🐭 쥐', '🐮 소', '🐯 호랑이', '🐰 토끼', '🐉 용', '🐍 뱀', '🐴 말', '🐑 양']
    return animals[year % 12]
  }

  // 별자리 계산
  const getConstellation = (month: number, day: number) => {
    const signs = [
      { name: '♑ 염소자리', end: [1, 19] }, { name: '♒ 물병자리', end: [2, 18] },
      { name: '♓ 물고기자리', end: [3, 20] }, { name: '♈ 양자리', end: [4, 19] },
      { name: '♉ 황소자리', end: [5, 20] }, { name: '♊ 쌍둥이자리', end: [6, 21] },
      { name: '♋ 게자리', end: [7, 22] }, { name: '♌ 사자자리', end: [8, 22] },
      { name: '♍ 처녀자리', end: [9, 22] }, { name: '♎ 천칭자리', end: [10, 23] },
      { name: '♏ 전갈자리', end: [11, 22] }, { name: '♐ 궁수자리', end: [12, 21] },
    ]
    for (const sign of signs) {
      if (month < sign.end[0] || (month === sign.end[0] && day <= sign.end[1])) return sign.name
    }
    return '♑ 염소자리'
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
    <div className="min-h-[100dvh] bg-[#F5F4F1] flex flex-col">
      <PageHeader title="운세 · 바이오리듬" showBack />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3 w-full">
        {/* 탭 */}
        <div className="flex gap-1.5">
          {[
            { key: 'biorhythm' as const, label: '🔮 바이오리듬' },
            { key: 'zodiac' as const, label: '🐉 띠 · 별자리' },
            { key: 'fortune' as const, label: '🎴 오늘의 운세' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-semibold ${tab === t.key ? 'bg-[#3D8A5A] text-white' : 'bg-white text-[#868B94] border border-[#f0f0f0]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 바이오리듬 */}
        {tab === 'biorhythm' && bio && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <p className="text-[14px] font-bold text-[#1A1918] mb-3">오늘의 바이오리듬</p>
            {[
              { label: '신체', value: bio.physical, color: '#D08068', emoji: '💪' },
              { label: '감정', value: bio.emotional, color: '#3D8A5A', emoji: '💚' },
              { label: '지성', value: bio.intellectual, color: '#4A90D9', emoji: '🧠' },
            ].map(b => (
              <div key={b.label} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-[#1A1918]">{b.emoji} {b.label}</span>
                  <span className="text-[12px] font-bold" style={{ color: b.color }}>{Math.round(b.value)}%</span>
                </div>
                <div className="w-full h-2 bg-[#F0F0F0] rounded-full relative">
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
            <p className="text-[10px] text-[#868B94] mt-2 text-center">
              {bio.physical > 50 && bio.emotional > 50 ? '🌟 오늘 컨디션 최고!' :
               bio.emotional < -30 ? '🫂 감정 기복이 있을 수 있어요. 쉬어가세요' :
               '💚 도담하게 보내세요'}
            </p>
          </div>
        )}

        {/* 띠 · 별자리 */}
        {tab === 'zodiac' && birthDate && (
          <div className="space-y-3">
            {/* 엄마 */}
            <div className="bg-gradient-to-br from-white to-[#FFF8F3] rounded-xl border border-[#FFDDC8]/50 p-4 text-center">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">엄마의 띠 · 별자리</p>
              <p className="text-3xl mb-1">{getZodiacAnimal(birthParts[0]).split(' ')[0]}</p>
              <p className="text-[14px] font-semibold text-[#1A1918]">{getZodiacAnimal(birthParts[0])}</p>
              <p className="text-[13px] text-[#868B94] mt-1">{getConstellation(birthParts[1], birthParts[2])}</p>
            </div>

            {/* 아이 */}
            {dueDate && (() => {
              const due = new Date(dueDate)
              return (
                <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[#C8F0D8]/50 p-4 text-center">
                  <p className="text-[13px] font-bold text-[#1A1918] mb-2">아이 예상 띠 · 별자리</p>
                  <p className="text-3xl mb-1">{getZodiacAnimal(due.getFullYear()).split(' ')[0]}</p>
                  <p className="text-[14px] font-semibold text-[#1A1918]">{getZodiacAnimal(due.getFullYear())}</p>
                  <p className="text-[13px] text-[#868B94] mt-1">{getConstellation(due.getMonth() + 1, due.getDate())}</p>
                  <p className="text-[10px] text-[#AEB1B9] mt-2">출산 예정일 기준</p>
                </div>
              )
            })()}

            {/* 띠/별자리 운세 */}
            {fortuneResult?.animalFortune || fortuneResult?.starFortune ? (
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 space-y-3">
                {fortuneResult.animalFortune && (
                  <div>
                    <p className="text-[12px] font-bold text-[#1A1918] mb-1">{getZodiacAnimal(birthParts[0])} 오늘의 운세</p>
                    <p className="text-[12px] text-[#868B94] leading-relaxed">{fortuneResult.animalFortune}</p>
                  </div>
                )}
                {fortuneResult.starFortune && (
                  <div className="pt-2 border-t border-[#f0f0f0]">
                    <p className="text-[12px] font-bold text-[#1A1918] mb-1">{getConstellation(birthParts[1], birthParts[2])} 오늘의 운세</p>
                    <p className="text-[12px] text-[#868B94] leading-relaxed">{fortuneResult.starFortune}</p>
                  </div>
                )}
                <p className="text-[9px] text-[#AEB1B9] text-center">재미로만 봐주세요 😊</p>
              </div>
            ) : (
              <button onClick={fetchFortune} disabled={loading}
                className="w-full py-3 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? '운세 보는 중...' : '🔮 띠 · 별자리 운세 보기'}
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
                  <p className="text-[14px] font-bold text-[#1A1918] mb-2">🎴 오늘의 운세</p>
                  <p className="text-[13px] text-[#1A1918] leading-relaxed">{fortuneResult.todayLuck}</p>
                </div>

                {/* 아이 메시지 */}
                {fortuneResult.babyMessage && (
                  <div className="bg-[#FFF8F3] rounded-xl border border-[#FFDDC8]/30 p-4 text-center">
                    <p className="text-[20px] mb-1">💌</p>
                    <p className="text-[13px] text-[#1A1918] italic leading-relaxed">"{fortuneResult.babyMessage}"</p>
                    <p className="text-[10px] text-[#868B94] mt-1">아이가 전하는 말</p>
                  </div>
                )}

                {/* 띠/별자리 운세 */}
                {(fortuneResult.animalFortune || fortuneResult.starFortune) && (
                  <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 space-y-2">
                    {fortuneResult.animalFortune && (
                      <div>
                        <p className="text-[12px] font-semibold text-[#1A1918] mb-0.5">{getZodiacAnimal(new Date(birthDate).getFullYear())} 띠 운세</p>
                        <p className="text-[11px] text-[#868B94] leading-relaxed">{fortuneResult.animalFortune}</p>
                      </div>
                    )}
                    {fortuneResult.starFortune && (
                      <div className="pt-2 border-t border-[#f0f0f0]">
                        <p className="text-[12px] font-semibold text-[#1A1918] mb-0.5">{getConstellation(new Date(birthDate).getMonth() + 1, new Date(birthDate).getDate())} 운세</p>
                        <p className="text-[11px] text-[#868B94] leading-relaxed">{fortuneResult.starFortune}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 세부 운세 */}
                <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 space-y-2.5">
                  {fortuneResult.loveLuck && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0">💕</span>
                      <div><p className="text-[11px] font-semibold text-[#1A1918]">사랑/가족운</p><p className="text-[11px] text-[#868B94]">{fortuneResult.loveLuck}</p></div>
                    </div>
                  )}
                  {fortuneResult.healthLuck && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0">💚</span>
                      <div><p className="text-[11px] font-semibold text-[#1A1918]">건강운</p><p className="text-[11px] text-[#868B94]">{fortuneResult.healthLuck}</p></div>
                    </div>
                  )}
                  {fortuneResult.moneyLuck && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0">💰</span>
                      <div><p className="text-[11px] font-semibold text-[#1A1918]">재물운</p><p className="text-[11px] text-[#868B94]">{fortuneResult.moneyLuck}</p></div>
                    </div>
                  )}
                </div>

                {/* 행운 아이템 */}
                <div className="grid grid-cols-2 gap-2">
                  {fortuneResult.luckyColor && <div className="bg-white rounded-xl border border-[#f0f0f0] p-3 text-center"><p className="text-[9px] text-[#868B94]">행운의 색</p><p className="text-[13px] font-bold text-[#1A1918]">🎨 {fortuneResult.luckyColor}</p></div>}
                  {fortuneResult.luckyFood && <div className="bg-white rounded-xl border border-[#f0f0f0] p-3 text-center"><p className="text-[9px] text-[#868B94]">행운의 음식</p><p className="text-[13px] font-bold text-[#1A1918]">🍽️ {fortuneResult.luckyFood}</p></div>}
                  {fortuneResult.luckyNumber && <div className="bg-white rounded-xl border border-[#f0f0f0] p-3 text-center"><p className="text-[9px] text-[#868B94]">행운의 숫자</p><p className="text-[13px] font-bold text-[#1A1918]">🔢 {fortuneResult.luckyNumber}</p></div>}
                  {fortuneResult.luckyTime && <div className="bg-white rounded-xl border border-[#f0f0f0] p-3 text-center"><p className="text-[9px] text-[#868B94]">행운의 시간</p><p className="text-[13px] font-bold text-[#1A1918]">⏰ {fortuneResult.luckyTime}</p></div>}
                </div>

                {/* 주간 조언 + 피할 것 */}
                <div className="bg-white rounded-xl border border-[#f0f0f0] p-4 space-y-2">
                  {fortuneResult.weekAdvice && <p className="text-[11px] text-[#3D8A5A]">💡 이번 주: {fortuneResult.weekAdvice}</p>}
                  {fortuneResult.avoidToday && <p className="text-[11px] text-[#D08068]">⚠️ 오늘 피할 것: {fortuneResult.avoidToday}</p>}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-[9px] text-[#AEB1B9]">재미로만 봐주세요 😊</p>
                  <button onClick={() => { localStorage.removeItem(`dodam_fortune_${new Date().toISOString().split('T')[0]}_${birthDate}`); setFortuneResult(null); fetchFortune() }} className="text-[10px] text-[#3D8A5A]">다시 보기 🔄</button>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 text-center">
                <p className="text-3xl mb-2">🎴</p>
                <p className="text-[14px] font-bold text-[#1A1918] mb-1">오늘의 운세</p>
                <p className="text-[12px] text-[#868B94] mb-4">띠·별자리·사주 기반 AI 운세를 봐드려요</p>
                <button onClick={fetchFortune} disabled={loading || !birthDate}
                  className="px-6 py-2.5 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                  {loading ? '운세 보는 중...' : '오늘의 운세 보기 🎴'}
                </button>
              </div>
            )}
          </div>
        )}

        {!birthDate && (
          <div className="bg-[#FFF0E6] rounded-xl p-4 text-center">
            <p className="text-[12px] text-[#D08068]">생년월일이 설정되지 않았어요</p>
            <p className="text-[10px] text-[#868B94] mt-1">설정에서 생년월일을 입력하면 이용할 수 있어요</p>
          </div>
        )}
      </div>
    </div>
  )
}
