'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'
import IllustVideo from '@/components/ui/IllustVideo'
import { shareMentalCheck } from '@/lib/kakao/share-parenting'
import { fetchUserRecords, upsertUserRecord } from '@/lib/supabase/userRecord'

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
  if (score <= 8) return { level: 'safe', color: 'var(--color-primary)', emoji: '/images/illustrations/e1.webm', title: '안정', desc: '현재 정서 상태가 양호해요. 지금처럼 자신을 잘 돌봐주세요.' }
  if (score <= 12) return { level: 'caution', color: '#C4A35A', emoji: '/images/illustrations/e2.webm', title: '주의', desc: '가벼운 우울감이 있을 수 있어요. 충분한 휴식과 주변의 도움을 받아보세요.' }
  if (score <= 19) return { level: 'warning', color: '#D08068', emoji: '/images/illustrations/e3.webm', title: '경계', desc: '전문 상담을 권장해요. 산부인과 또는 정신건강의학과 방문을 추천드려요.' }
  return { level: 'danger', color: '#D05050', emoji: '/images/illustrations/e4.webm', title: '위험', desc: '전문가의 즉각적인 도움이 필요해요. 지금 바로 상담 전화를 해주세요.' }
}

interface ParentProfile {
  primaryStyle: string
  primaryPct: number
  secondaryStyle: string
  secondaryPct: number
  strengths: string[]
  weeklyTip: string
  emotionTrend: string
  burnoutRisk: string
  burnoutMessage: string
  encouragement: string
}

export default function MentalCheckPage() {
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null))
  const [showResult, setShowResult] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [profile, setProfile] = useState<ParentProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [epdsHistory, setEpdsHistory] = useState<{ date: string; score: number; level: string }[]>([])
  const [moodHistory, setMoodHistory] = useState<unknown[]>([])

  // EPDS 채점: Q1,Q2는 정순(0-3), Q3-Q10은 역순(3-0)
  const score = answers.reduce<number>((sum, a, i) => {
    if (a === null) return sum
    return sum + (QUESTIONS[i].reverse ? (3 - a) : a)
  }, 0)
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
    const entry = { date: new Date().toISOString().split('T')[0], score, level: result.level }
    const trimmed = [entry, ...epdsHistory].slice(0, 20)
    setEpdsHistory(trimmed)
    const today = new Date().toISOString().split('T')[0]
    upsertUserRecord(today, 'epds_history', { entries: trimmed })
  }

  // DB에서 EPDS/mood 이력 로드
  useEffect(() => {
    fetchUserRecords(['epds_history']).then(rows => {
      if (rows.length > 0) {
        const entries = (rows[0].value as { entries: { date: string; score: number; level: string }[] }).entries || []
        setEpdsHistory(entries)
      }
    })
    fetchUserRecords(['mood_history']).then(rows => {
      if (rows.length > 0) {
        const entries = (rows[0].value as { entries: unknown[] }).entries || []
        setMoodHistory(entries)
      }
    })
  }, [])

  // 양육 스타일 프로필 AI 분석
  useEffect(() => {
    if (!showResult) return
    setProfileLoading(true)

    fetch('/api/ai-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardType: 'parent-profile',
        moodHistory: moodHistory.slice(0, 28),
        epdsHistory: epdsHistory.slice(0, 8),
        childAge: 0,
        recordPatterns: {},
      }),
    })
      .then(r => r.json())
      .then(data => { if (data.primaryStyle) setProfile(data) })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [showResult])

  if (showResult) {
    return (
      <div className="min-h-[calc(100dvh-144px)] bg-white flex flex-col items-center justify-center px-6">
        <div className="mb-4" style={{ backgroundColor: `${result.color}10`, borderRadius: '50%' }}>
          <IllustVideo src={result.emoji} variant="circle" className="w-28 h-28" />
        </div>
        <p className="text-body text-secondary mb-1">에든버러 산후우울증 척도</p>
        <p className="text-heading-1 font-bold" style={{ color: result.color }}>{score}점</p>
        <p className="text-subtitle font-semibold text-primary mt-1 mb-2">{result.title}</p>
        <p className="text-body text-secondary text-center leading-relaxed max-w-[300px] mb-6">{result.desc}</p>

        {score >= 13 && (
          <div className="w-full max-w-xs bg-[#FDE8E8] rounded-xl p-4 mb-4">
            <p className="text-body font-semibold text-[#D05050] mb-2">도움받을 수 있는 곳</p>
            <a href="tel:1577-0199" className="block text-body-emphasis text-primary py-1">정신건강위기상담 1577-0199</a>
            <a href="tel:109" className="block text-body-emphasis text-primary py-1">자살예방상담 109</a>
            <a href="tel:1393" className="block text-body-emphasis text-primary py-1">정신건강복지센터 1393</a>
          </div>
        )}

        {score <= 12 && (
          <div className="w-full max-w-xs bg-[#F0F9F4] rounded-xl p-4 mb-4">
            <p className="text-body-emphasis text-[var(--color-primary)] text-center">괜찮아요. 당신은 충분히 잘 하고 있어요</p>
          </div>
        )}

        {/* 이력 */}
        {epdsHistory.length > 1 && (
          <div className="w-full max-w-xs mb-4">
            <p className="text-body text-secondary mb-2">이전 기록</p>
            <div className="flex gap-1">
              {epdsHistory.slice(0, 7).map((h, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="w-full h-12 bg-[#E8E4DF] rounded relative">
                    <div className="absolute bottom-0 w-full rounded" style={{ height: `${(h.score / 30) * 100}%`, backgroundColor: getResult(h.score).color }} />
                  </div>
                  <p className="text-body text-tertiary mt-0.5">{h.date.slice(5)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 양육 스타일 프로필 */}
        {profileLoading && (
          <div className="w-full max-w-xs bg-white rounded-xl border border-[#E8E4DF] p-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
              <p className="text-body text-secondary">양육 스타일 분석 중...</p>
            </div>
          </div>
        )}

        {profile && (
          <div className="w-full max-w-xs space-y-3 mb-4">
            {/* 주 양육 스타일 */}
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-label text-tertiary mb-1">나의 양육 스타일</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <p className="text-subtitle font-bold text-primary">{profile.primaryStyle}</p>
                  <p className="text-caption text-secondary mt-0.5">{profile.secondaryStyle} 성향도 있어요</p>
                </div>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(var(--color-primary) ${profile.primaryPct}%, #E8E6E1 0)` }}>
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <span className="text-caption font-bold text-[var(--color-primary)]">{profile.primaryPct}%</span>
                  </div>
                </div>
              </div>

              {/* 강점 */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile.strengths.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-label font-medium bg-[#F0F9F4] text-[#2D7A4A]">{s}</span>
                ))}
              </div>

              {/* 감정 트렌드 */}
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[var(--color-page-bg)]">
                <span className="text-body">{profile.emotionTrend === '상승' ? '+' : profile.emotionTrend === '주의' ? '-' : '='}</span>
                <span className="text-caption text-[#4A4744]">감정 트렌드: {profile.emotionTrend}</span>
              </div>
            </div>

            {/* 번아웃 리스크 */}
            {profile.burnoutRisk !== 'low' && profile.burnoutMessage && (
              <div className={`rounded-xl p-3.5 ${profile.burnoutRisk === 'high' ? 'bg-[#FDE8E8] border border-[#F5C6C6]' : 'bg-[#FFF8E8] border border-[#F5E6C0]'}`}>
                <p className="text-body font-semibold mb-1" style={{ color: profile.burnoutRisk === 'high' ? '#D05050' : '#C4A35A' }}>
                  {profile.burnoutRisk === 'high' ? '번아웃 주의' : '피로도 관찰'}
                </p>
                <p className="text-caption text-[#5A5854]">{profile.burnoutMessage}</p>
              </div>
            )}

            {/* 이번 주 팁 + 격려 */}
            <div className="bg-[#F0F4FF] rounded-xl p-3.5 border border-[#D5DFEF]">
              <p className="text-caption text-[#4A6FA5] font-medium mb-1">{profile.weeklyTip}</p>
              <p className="text-body text-primary font-semibold">{profile.encouragement}</p>
            </div>
          </div>
        )}

        <button onClick={() => shareMentalCheck(score, result.title)} className="text-body text-[var(--color-primary)] font-semibold mb-3">공유하기</button>
        <button onClick={() => { setShowResult(false); setCurrentQ(0); setAnswers(Array(10).fill(null)); setProfile(null) }}
          className="text-body text-secondary">다시 검사하기</button>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="마음 체크" showBack rightAction={<span className="text-body text-secondary">{answers.filter(a => a !== null).length}/10</span>} />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-4">
        {/* 프로그레스 */}
        <div className="flex gap-1 mb-6">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full ${answers[i] !== null ? 'bg-[var(--color-primary)]' : i === currentQ ? 'bg-[var(--color-primary)]/40' : 'bg-[#E8E4DF]'}`} />
          ))}
        </div>

        <p className="text-body-emphasis text-secondary mb-2 text-center">지난 7일간의 기분을 떠올려주세요</p>

        {/* 현재 문항만 표시 */}
        {(() => {
          const q = QUESTIONS[currentQ]
          return (
            <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5">
              <p className="text-body text-[var(--color-primary)] font-semibold mb-2">{currentQ + 1} / 10</p>
              <p className="text-subtitle font-bold text-primary mb-5 leading-relaxed">{q.q}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => handleAnswer(currentQ, oi)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${answers[currentQ] === oi ? 'bg-[var(--color-primary)] font-bold' : 'bg-[var(--color-page-bg)] text-primary active:bg-[#ECECEC]'}`}
                    style={answers[currentQ] === oi ? { fontSize: 15, color: '#FFFFFF' } : { fontSize: 15 }}>
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
            className={`text-body ${currentQ === 0 ? 'text-[#F0F0F0]' : 'text-secondary'}`}>← 이전</button>

          {allAnswered ? (
            <button onClick={() => { saveResult(); setShowResult(true) }}
              className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80">
              결과 보기
            </button>
          ) : (
            <button onClick={() => setCurrentQ(Math.min(9, currentQ + 1))} disabled={answers[currentQ] === null}
              className={`text-body ${answers[currentQ] === null ? 'text-[#F0F0F0]' : 'text-[var(--color-primary)] font-semibold'}`}>다음 →</button>
          )}
        </div>
      </div>
    </div>
  )
}
