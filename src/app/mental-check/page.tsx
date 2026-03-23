'use client'

import { useState } from 'react'

// 에든버러 산후우울증 척도 (EPDS) — 10문항
const QUESTIONS = [
  { q: '웃을 수 있었고, 사물의 재미있는 면을 볼 수 있었다', options: ['항상 그랬다', '대부분 그랬다', '가끔 그랬다', '전혀 그렇지 않았다'] },
  { q: '즐거운 기대감을 가지고 일을 기다렸다', options: ['항상 그랬다', '대부분 그랬다', '가끔 그랬다', '거의 그렇지 않았다'] },
  { q: '일이 잘못될 때 필요 이상으로 자신을 탓했다', options: ['전혀 그렇지 않았다', '자주 그렇지는 않았다', '가끔 그랬다', '대부분 그랬다'], reverse: true },
  { q: '특별한 이유 없이 불안하거나 걱정이 되었다', options: ['전혀 그렇지 않았다', '거의 그렇지 않았다', '가끔 그랬다', '자주 그랬다'], reverse: true },
  { q: '특별한 이유 없이 무섭거나 공포감을 느꼈다', options: ['전혀 그렇지 않았다', '거의 그렇지 않았다', '가끔 그랬다', '자주 그랬다'], reverse: true },
  { q: '일들이 힘겹게 다가왔다', options: ['대부분 잘 처리했다', '가끔 잘 처리하지 못했다', '대부분 잘 처리하지 못했다', '전혀 처리할 수 없었다'], reverse: true },
  { q: '너무 불행해서 잠을 잘 수 없었다', options: ['전혀 그렇지 않았다', '자주 그렇지는 않았다', '가끔 그랬다', '대부분 그랬다'], reverse: true },
  { q: '슬프거나 비참한 느낌이 들었다', options: ['전혀 그렇지 않았다', '자주 그렇지는 않았다', '가끔 그랬다', '대부분 그랬다'], reverse: true },
  { q: '너무 불행해서 울었다', options: ['전혀 그렇지 않았다', '가끔 그랬다', '자주 그랬다', '항상 그랬다'], reverse: true },
  { q: '자해에 대한 생각이 들었다', options: ['전혀 그렇지 않았다', '거의 그렇지 않았다', '가끔 그랬다', '자주 그랬다'], reverse: true },
]

function getResult(score: number) {
  if (score <= 8) return { level: 'safe', color: '#3D8A5A', emoji: '💚', title: '안정', desc: '현재 정서 상태가 양호해요. 지금처럼 자신을 잘 돌봐주세요.' }
  if (score <= 12) return { level: 'caution', color: '#C4A35A', emoji: '💛', title: '주의', desc: '가벼운 우울감이 있을 수 있어요. 충분한 휴식과 주변의 도움을 받아보세요.' }
  if (score <= 19) return { level: 'warning', color: '#D08068', emoji: '🧡', title: '경계', desc: '전문 상담을 권장해요. 산부인과 또는 정신건강의학과 방문을 추천드려요.' }
  return { level: 'danger', color: '#D05050', emoji: '❤️', title: '위험', desc: '전문가의 즉각적인 도움이 필요해요. 지금 바로 상담 전화를 해주세요.' }
}

export default function MentalCheckPage() {
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null))
  const [showResult, setShowResult] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)

  const score = answers.reduce<number>((sum, a) => sum + (a ?? 0), 0)
  const allAnswered = answers.every(a => a !== null)
  const result = getResult(score)

  const handleAnswer = (qIndex: number, optIndex: number) => {
    const next = [...answers]
    next[qIndex] = optIndex
    setAnswers(next)
    // 자동으로 다음 문항
    if (qIndex < 9) setTimeout(() => setCurrentQ(qIndex + 1), 300)
  }

  const saveResult = () => {
    const history = JSON.parse(localStorage.getItem('dodam_epds_history') || '[]')
    history.unshift({ date: new Date().toISOString().split('T')[0], score, level: result.level })
    localStorage.setItem('dodam_epds_history', JSON.stringify(history.slice(0, 20)))
  }

  if (showResult) {
    const history = JSON.parse(localStorage.getItem('dodam_epds_history') || '[]')
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${result.color}20` }}>
          <span className="text-4xl">{result.emoji}</span>
        </div>
        <p className="text-[13px] text-[#868B94] mb-1">에든버러 산후우울증 척도</p>
        <p className="text-[28px] font-bold" style={{ color: result.color }}>{score}점</p>
        <p className="text-[16px] font-semibold text-[#1A1918] mt-1 mb-2">{result.title}</p>
        <p className="text-[13px] text-[#868B94] text-center leading-relaxed max-w-[300px] mb-6">{result.desc}</p>

        {score >= 13 && (
          <div className="w-full max-w-xs bg-[#FDE8E8] rounded-xl p-4 mb-4">
            <p className="text-[13px] font-semibold text-[#D05050] mb-2">도움받을 수 있는 곳</p>
            <a href="tel:1577-0199" className="block text-[12px] text-[#1A1918] py-1">📞 정신건강위기상담 1577-0199</a>
            <a href="tel:109" className="block text-[12px] text-[#1A1918] py-1">📞 자살예방상담 109</a>
            <a href="tel:1393" className="block text-[12px] text-[#1A1918] py-1">📞 정신건강복지센터 1393</a>
          </div>
        )}

        {score <= 12 && (
          <div className="w-full max-w-xs bg-[#F0F9F4] rounded-xl p-4 mb-4">
            <p className="text-[12px] text-[#3D8A5A] text-center">괜찮아요. 당신은 충분히 잘 하고 있어요 💚</p>
          </div>
        )}

        {/* 이력 */}
        {history.length > 1 && (
          <div className="w-full max-w-xs mb-4">
            <p className="text-[11px] text-[#868B94] mb-2">이전 기록</p>
            <div className="flex gap-1">
              {history.slice(0, 7).map((h: any, i: number) => (
                <div key={i} className="flex-1 text-center">
                  <div className="w-full h-12 bg-[#F0F0F0] rounded relative">
                    <div className="absolute bottom-0 w-full rounded" style={{ height: `${(h.score / 30) * 100}%`, backgroundColor: getResult(h.score).color }} />
                  </div>
                  <p className="text-[8px] text-[#AEB1B9] mt-0.5">{h.date.slice(5)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => { setShowResult(false); setCurrentQ(0); setAnswers(Array(10).fill(null)) }}
          className="text-[13px] text-[#868B94]">다시 검사하기</button>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <h1 className="text-[17px] font-bold text-[#1A1918]">마음 체크</h1>
          <p className="text-[11px] text-[#868B94]">{answers.filter(a => a !== null).length}/10</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 pt-6 pb-28">
        {/* 프로그레스 */}
        <div className="flex gap-1 mb-6">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full ${answers[i] !== null ? 'bg-[#3D8A5A]' : i === currentQ ? 'bg-[#3D8A5A]/40' : 'bg-[#F0F0F0]'}`} />
          ))}
        </div>

        <p className="text-[12px] text-[#868B94] mb-2 text-center">지난 7일간의 기분을 떠올려주세요</p>

        {/* 현재 문항만 표시 */}
        {(() => {
          const q = QUESTIONS[currentQ]
          return (
            <div className="bg-white rounded-2xl border border-[#f0f0f0] p-5">
              <p className="text-[11px] text-[#3D8A5A] font-semibold mb-2">{currentQ + 1} / 10</p>
              <p className="text-[16px] font-bold text-[#1A1918] mb-5 leading-relaxed">{q.q}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => handleAnswer(currentQ, oi)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-[14px] transition-all ${answers[currentQ] === oi ? 'bg-[#3D8A5A] text-white font-semibold' : 'bg-[#F5F4F1] text-[#1A1918] active:bg-[#ECECEC]'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* 이전/다음 네비게이션 */}
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
            className={`text-[13px] ${currentQ === 0 ? 'text-[#F0F0F0]' : 'text-[#868B94]'}`}>← 이전</button>

          {allAnswered ? (
            <button onClick={() => { saveResult(); setShowResult(true) }}
              className="px-6 py-2.5 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl active:opacity-80">
              결과 보기
            </button>
          ) : (
            <button onClick={() => setCurrentQ(Math.min(9, currentQ + 1))} disabled={answers[currentQ] === null}
              className={`text-[13px] ${answers[currentQ] === null ? 'text-[#F0F0F0]' : 'text-[#3D8A5A] font-semibold'}`}>다음 →</button>
          )}
        </div>
      </div>
    </div>
  )
}
