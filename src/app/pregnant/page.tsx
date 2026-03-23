'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

const FETAL_DATA = [
  { week: 4, fruit: '🌰', fruitName: '참깨', length: '0.1cm', weight: '-', desc: '수정란이 자궁에 착상했어요', tip: '엽산 복용을 시작하세요' },
  { week: 8, fruit: '🫐', fruitName: '블루베리', length: '1.6cm', weight: '1g', desc: '심장이 뛰기 시작했어요!', tip: '첫 초음파 검사를 받아보세요' },
  { week: 12, fruit: '🍑', fruitName: '자두', length: '5.4cm', weight: '14g', desc: '손가락 발가락이 생겼어요', tip: '입덧이 줄어들기 시작해요' },
  { week: 16, fruit: '🍊', fruitName: '오렌지', length: '11.6cm', weight: '100g', desc: '태동을 느낄 수 있어요!', tip: '안정기 진입! 가벼운 산책을 시작하세요' },
  { week: 20, fruit: '🍌', fruitName: '바나나', length: '25cm', weight: '300g', desc: '성별을 확인할 수 있어요', tip: '정밀 초음파 검사 시기예요' },
  { week: 24, fruit: '🌽', fruitName: '옥수수', length: '30cm', weight: '600g', desc: '소리를 들을 수 있어요', tip: '태교 음악을 들려주세요' },
  { week: 28, fruit: '🥥', fruitName: '코코넛', length: '37cm', weight: '1kg', desc: '눈을 뜨기 시작해요', tip: '임신성 당뇨 검사를 받으세요' },
  { week: 32, fruit: '🍈', fruitName: '멜론', length: '42cm', weight: '1.7kg', desc: '폐가 성숙해지고 있어요', tip: '출산 가방을 준비하세요' },
  { week: 36, fruit: '🍉', fruitName: '수박', length: '47cm', weight: '2.6kg', desc: '출산 자세로 내려오고 있어요', tip: '2주마다 검진을 받으세요' },
  { week: 40, fruit: '🎃', fruitName: '호박', length: '51cm', weight: '3.4kg', desc: '만삭! 언제든 만날 수 있어요', tip: '진통 신호를 확인해두세요' },
]

const CHECKLIST_BY_TRIMESTER = {
  first: ['산부인과 초진', '엽산 복용 시작', '임신 확인서 발급', '모자보건수첩 수령', '직장 보고 (선택)', '보험 확인'],
  second: ['정밀 초음파', '임신성 당뇨 검사', '태교 시작', '이름 후보 정하기', '출산 교실 등록', '아기 용품 리서치'],
  third: ['출산 가방 준비', '출산 병원 확정', '신생아 용품 구매', '산후조리원 예약', '육아 앱 설정 완료', '자동차 카시트 설치'],
}

export default function PregnantPage() {
  const [dueDate, setDueDate] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_due_date') || ''
    return ''
  })
  const [editingDate, setEditingDate] = useState(!dueDate)
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dodam_pregnancy_checks')
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })

  const currentWeek = useMemo(() => {
    if (!dueDate) return 0
    const due = new Date(dueDate)
    const now = new Date()
    const diffDays = Math.floor((due.getTime() - now.getTime()) / 86400000)
    const week = 40 - Math.floor(diffDays / 7)
    return Math.max(1, Math.min(42, week))
  }, [dueDate])

  const daysLeft = useMemo(() => {
    if (!dueDate) return 0
    return Math.max(0, Math.floor((new Date(dueDate).getTime() - Date.now()) / 86400000))
  }, [dueDate])

  const currentFetal = useMemo(() => {
    const sorted = [...FETAL_DATA].reverse()
    return sorted.find((f) => currentWeek >= f.week) || FETAL_DATA[0]
  }, [currentWeek])

  const trimester = currentWeek <= 13 ? 'first' : currentWeek <= 27 ? 'second' : 'third'
  const trimesterLabel = trimester === 'first' ? '초기 (1~13주)' : trimester === 'second' ? '중기 (14~27주)' : '후기 (28~40주)'
  const checklist = CHECKLIST_BY_TRIMESTER[trimester]

  const handleSaveDueDate = (date: string) => {
    setDueDate(date)
    localStorage.setItem('dodam_due_date', date)
    setEditingDate(false)
  }

  const toggleCheck = (item: string) => {
    const next = { ...checked, [item]: !checked[item] }
    setChecked(next)
    localStorage.setItem('dodam_pregnancy_checks', JSON.stringify(next))
  }

  if (editingDate) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
        <h1 className="text-[22px] font-bold text-[#1A1918] mb-2">출산 예정일이 언제인가요?</h1>
        <p className="text-[13px] text-[#868B94] mb-8">주차별 성장 정보를 알려드릴게요</p>
        <input
          type="date"
          defaultValue={dueDate}
          onChange={(e) => e.target.value && handleSaveDueDate(e.target.value)}
          className="w-full max-w-xs h-[52px] rounded-xl border border-[#f0f0f0] px-4 text-[15px] text-[#1A1918] text-center"
        />
        {dueDate && (
          <button onClick={() => setEditingDate(false)} className="mt-4 text-[13px] text-[#3D8A5A] font-semibold">
            돌아가기
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <div>
            <p className="text-[12px] text-[#868B94]">임신 {currentWeek}주차</p>
            <p className="text-[16px] font-bold text-[#1A1918]">D-{daysLeft}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setEditingDate(true)} className="text-[11px] text-[#868B94]">예정일 수정</button>
            <Link href="/" className="text-[11px] text-[#3D8A5A] font-semibold">육아 모드 →</Link>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pb-28 space-y-3 pt-4">
        {/* 태아 히어로 */}
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0] text-center">
          <div className="text-4xl mb-2">{currentFetal.fruit}</div>
          <p className="text-[13px] text-[#868B94]">지금 아기는 <span className="font-semibold text-[#3D8A5A]">{currentFetal.fruitName}</span>만해요</p>
          <p className="text-[18px] font-bold text-[#1A1918] mt-1">{currentWeek}주차</p>
          <div className="flex justify-center gap-4 mt-3">
            <div className="text-center">
              <p className="text-[10px] text-[#868B94]">키</p>
              <p className="text-[14px] font-bold text-[#1A1918]">{currentFetal.length}</p>
            </div>
            <div className="w-px bg-[#f0f0f0]" />
            <div className="text-center">
              <p className="text-[10px] text-[#868B94]">무게</p>
              <p className="text-[14px] font-bold text-[#1A1918]">{currentFetal.weight}</p>
            </div>
            <div className="w-px bg-[#f0f0f0]" />
            <div className="text-center">
              <p className="text-[10px] text-[#868B94]">D-day</p>
              <p className="text-[14px] font-bold text-[#3D8A5A]">{daysLeft}일</p>
            </div>
          </div>
        </div>

        {/* 이번 주 발달 */}
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
          <h3 className="text-[14px] font-bold text-[#1A1918] mb-2">이번 주 아기는</h3>
          <p className="text-[13px] text-[#868B94] leading-relaxed">{currentFetal.desc}</p>
          <div className="mt-3 p-3 rounded-xl bg-[#F5F4F1]">
            <p className="text-[12px] text-[#3D8A5A]">{currentFetal.tip}</p>
          </div>
        </div>

        {/* 주차 프로그레스 */}
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-[#1A1918]">임신 여정</h3>
            <span className="text-[11px] text-[#868B94]">{currentWeek}/40주</span>
          </div>
          <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3D8A5A] rounded-full transition-all duration-500"
              style={{ width: `${Math.min((currentWeek / 40) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-[#AEB1B9]">초기</span>
            <span className="text-[9px] text-[#AEB1B9]">중기</span>
            <span className="text-[9px] text-[#AEB1B9]">후기</span>
            <span className="text-[9px] text-[#AEB1B9]">출산</span>
          </div>
        </div>

        {/* 체크리스트 */}
        <div className="bg-white rounded-xl p-4 border border-[#f0f0f0]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-[#1A1918]">{trimesterLabel} 체크리스트</h3>
            <span className="text-[11px] text-[#868B94]">{checklist.filter((c) => checked[c]).length}/{checklist.length}</span>
          </div>
          <div className="space-y-1">
            {checklist.map((item) => (
              <button
                key={item}
                onClick={() => toggleCheck(item)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left active:bg-[#F5F4F1] transition-colors"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  checked[item] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#AEB1B9]'
                }`}>
                  {checked[item] && <span className="text-white text-[10px]">✓</span>}
                </div>
                <span className={`text-[13px] ${checked[item] ? 'text-[#AEB1B9] line-through' : 'text-[#1A1918]'}`}>
                  {item}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
