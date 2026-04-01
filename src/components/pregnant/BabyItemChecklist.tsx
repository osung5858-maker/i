'use client'

import { useState, useEffect } from 'react'

type Item = { id: string; name: string; cat: string; weekFrom: number; tip: string }

const ITEMS: Item[] = [
  // 수유 (12주~)
  { id: 'nursing_bra', name: '수유 브라', cat: '수유', weekFrom: 12, tip: '출산 전부터 착용 시작, 컵 조절 가능한 제품 추천' },
  { id: 'breast_pad', name: '모유 패드', cat: '수유', weekFrom: 12, tip: '분만 직후 필요, 10~20개 미리 준비' },
  { id: 'nipple_cream', name: '유두 보호 크림', cat: '수유', weekFrom: 16, tip: '라놀린 성분, 수유 전후 바르면 통증 감소' },
  { id: 'bottle', name: '젖병 (2~3개)', cat: '수유', weekFrom: 20, tip: '신생아용 160ml + 표준 240ml 구성 권장' },
  { id: 'bottle_brush', name: '젖병 세척 브러시', cat: '수유', weekFrom: 20, tip: '소독기 세트 구매 시 같이 확인' },
  { id: 'sterilizer', name: '젖병 소독기', cat: '수유', weekFrom: 24, tip: '전자레인지형 or 스팀형, 공간 고려해서 선택' },
  { id: 'formula', name: '분유 (1통)', cat: '수유', weekFrom: 28, tip: '출산 전 1통만 준비, 아기 맞는 분유 확인 후 추가 구매' },

  // 위생 (12주~)
  { id: 'diaper_nb', name: '신생아 기저귀 (1팩)', cat: '위생', weekFrom: 12, tip: '신생아 사이즈는 금방 지나가니 1팩만 준비' },
  { id: 'wet_wipe', name: '물티슈 (3팩 이상)', cat: '위생', weekFrom: 12, tip: '무향·무알코올·저자극 제품, 대용량 구매 추천' },
  { id: 'diaper_cream', name: '기저귀 발진 크림', cat: '위생', weekFrom: 16, tip: '잔여량 없이 두껍게 발라야 효과 있음' },
  { id: 'bath_tub', name: '신생아 욕조', cat: '위생', weekFrom: 20, tip: '미끄럼 방지 기능 확인, 접이식 공간 절약' },
  { id: 'baby_soap', name: '아기 바디워시/샴푸', cat: '위생', weekFrom: 24, tip: '저자극·눈물없는 포뮬러, 0개월부터 사용 가능' },
  { id: 'cotton_swab', name: '아기 면봉', cat: '위생', weekFrom: 24, tip: '일반 면봉보다 가는 아기 전용 제품' },
  { id: 'thermometer', name: '체온계', cat: '위생', weekFrom: 28, tip: '귀 or 이마 타입, 신생아용 0.5초 측정 추천' },
  { id: 'nail_clipper', name: '아기 손톱깎이', cat: '위생', weekFrom: 28, tip: '손톱이 출생 시부터 길게 나오는 경우 있음' },

  // 의류 (16주~)
  { id: 'onesie', name: '바디수트 (5~7벌)', cat: '의류', weekFrom: 16, tip: '신생아 60·70 사이즈, 앞단추형 추천' },
  { id: 'sleepwear', name: '수면 우주복 (3벌)', cat: '의류', weekFrom: 20, tip: '지퍼형이 새벽 기저귀 교체 시 편리' },
  { id: 'socks', name: '아기 양말 (5켤레)', cat: '의류', weekFrom: 20, tip: '발목 고무줄 약한 제품, 자주 잃어버리니 여유 있게' },
  { id: 'mittens', name: '손싸개', cat: '의류', weekFrom: 24, tip: '생후 1개월까지 손톱 긁힘 방지용' },
  { id: 'hat', name: '아기 모자 (2개)', cat: '의류', weekFrom: 28, tip: '두상 형성에 영향, 너무 오래 쓰지 않도록' },

  // 침구 (20주~)
  { id: 'crib', name: '아기 침대 or 범보', cat: '침구', weekFrom: 20, tip: '공동침대 vs 독립침대 미리 결정 필요' },
  { id: 'mattress', name: '신생아 매트리스', cat: '침구', weekFrom: 20, tip: '딱딱해야 안전, 쿠션 너무 부드러운 제품 주의' },
  { id: 'swaddle', name: '속싸개 (4~6장)', cat: '침구', weekFrom: 24, tip: '신생아 모로 반사 억제, 통잠에 도움' },
  { id: 'blanket', name: '아기 담요 (2장)', cat: '침구', weekFrom: 28, tip: '계절에 맞는 두께, 신생아 체온 조절 미숙' },
  { id: 'pillow', name: '짱구 베개', cat: '침구', weekFrom: 32, tip: '두상 형성 도움, 생후 2주부터 사용 가능' },

  // 이동 (24주~)
  { id: 'stroller', name: '유모차', cat: '이동', weekFrom: 24, tip: '절충형 or 디럭스 — 주 사용 환경 (아파트/외출) 고려' },
  { id: 'carseat', name: '카시트 (신생아용)', cat: '이동', weekFrom: 28, tip: '퇴원 시 바로 필요, 병원 대여도 가능' },
  { id: 'carrier', name: '아기띠 or 슬링', cat: '이동', weekFrom: 28, tip: '허리 직립형 권장, 착용 전 설명서 필독' },
  { id: 'diaper_bag', name: '기저귀 가방', cat: '이동', weekFrom: 32, tip: '대용량·방수·여러 수납공간 확인' },
]

const CATS = ['전체', '수유', '위생', '의류', '침구', '이동']
const STORAGE_KEY = 'dodam_baby_items_done'

export default function BabyItemChecklist({ currentWeek }: { currentWeek: number }) {
  const [cat, setCat] = useState('전체')
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) } catch { /* */ }
  }, [])

  const available = ITEMS.filter(i => i.weekFrom <= currentWeek)
  const filtered = available.filter(i => cat === '전체' || i.cat === cat)
  const doneCount = available.filter(i => done[i.id]).length
  const nowItems = available.filter(i => !done[i.id]).slice(0, expanded ? 999 : 4)

  const toggle = (id: string) => {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* */ }
  }

  if (available.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-[14px] font-bold text-[#1A1918]">아기 용품 체크리스트</p>
          <p className="text-[12px] text-[#9E9A95] mt-0.5">{doneCount}/{available.length}개 준비 완료</p>
        </div>
        <div className="w-10 h-10 relative">
          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#F0EDE8" strokeWidth="4" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-primary)" strokeWidth="4"
              strokeDasharray={`${Math.round((doneCount / available.length) * 94.2)} 94.2`}
              strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--color-primary)]">
            {Math.round((doneCount / available.length) * 100)}%
          </span>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto hide-scrollbar">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${cat === c ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[#F5F1EC] text-[#6B6966] border-transparent'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* 아이템 목록 */}
      <div className="px-4 pb-3 space-y-1.5">
        {(cat === '전체' ? nowItems : filtered).map(item => (
          <button key={item.id} onClick={() => toggle(item.id)}
            className="w-full flex items-start gap-2.5 p-2.5 rounded-xl active:bg-[#F5F1EC] text-left">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${done[item.id] ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[#D4CFC9]'}`}>
              {done[item.id] && <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-medium ${done[item.id] ? 'line-through text-[#B0ADA9]' : 'text-[#1A1918]'}`}>{item.name}</p>
              <p className="text-[11px] text-[#9E9A95] mt-0.5 leading-snug">{item.tip}</p>
            </div>
            <span className="text-[10px] text-[#B0ADA9] shrink-0 mt-1">{item.cat}</span>
          </button>
        ))}
      </div>

      {/* 더보기 */}
      {cat === '전체' && available.filter(i => !done[i.id]).length > 4 && (
        <button onClick={() => setExpanded(e => !e)}
          className="w-full py-2.5 text-[12px] text-[#9E9A95] border-t border-[#F0EDE8] active:bg-[#F5F1EC]">
          {expanded ? '접기' : `미완료 ${available.filter(i => !done[i.id]).length - 4}개 더보기`}
        </button>
      )}
    </div>
  )
}
