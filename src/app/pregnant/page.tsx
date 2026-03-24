'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { shareFetalSize, shareDday } from '@/lib/kakao/share-pregnant'
import BabyIllust from '@/components/pregnant/BabyIllust'
import StreakCard from '@/components/engagement/StreakCard'
import CommunityTeaser from '@/components/engagement/CommunityTeaser'

// ===== 태아 데이터 =====
const FETAL_DATA = [
  { week: 4, fruit: '🌰', name: '참깨', length: '0.1cm', weight: '-', desc: '수정란이 자궁에 착상했어요', tip: '엽산 복용을 시작하세요' },
  { week: 8, fruit: '🫐', name: '블루베리', length: '1.6cm', weight: '1g', desc: '심장이 뛰기 시작했어요!', tip: '첫 초음파 검사를 받아보세요' },
  { week: 12, fruit: '🍑', name: '자두', length: '5.4cm', weight: '14g', desc: '손가락 발가락이 생겼어요', tip: '입덧이 줄어들기 시작해요' },
  { week: 16, fruit: '🍊', name: '오렌지', length: '11.6cm', weight: '100g', desc: '태동을 느낄 수 있어요!', tip: '안정기 진입! 가벼운 산책을 시작하세요' },
  { week: 20, fruit: '🍌', name: '바나나', length: '25cm', weight: '300g', desc: '성별을 확인할 수 있어요', tip: '정밀 초음파 검사 시기예요' },
  { week: 24, fruit: '🌽', name: '옥수수', length: '30cm', weight: '600g', desc: '소리를 들을 수 있어요', tip: '태교 음악을 들려주세요' },
  { week: 28, fruit: '🥥', name: '코코넛', length: '37cm', weight: '1kg', desc: '눈을 뜨기 시작해요', tip: '임신성 당뇨 검사를 받으세요' },
  { week: 32, fruit: '🍈', name: '멜론', length: '42cm', weight: '1.7kg', desc: '폐가 성숙해지고 있어요', tip: '출산 가방을 준비하세요' },
  { week: 36, fruit: '🍉', name: '수박', length: '47cm', weight: '2.6kg', desc: '출산 자세로 내려오고 있어요', tip: '2주마다 검진을 받으세요' },
  { week: 40, fruit: '🎃', name: '호박', length: '51cm', weight: '3.4kg', desc: '만삭! 언제든 만날 수 있어요', tip: '진통 신호를 확인해두세요' },
]

// ===== 무료 축하박스 · 샘플 =====
const FREE_BOXES = [
  // 임신 축하박스
  { id: 'bebeform_p', category: 'pregnancy', name: '베베폼 임신축하박스', desc: '임신 선물 꾸러미 (SNS 공유 필요)', link: 'https://bebeform.co.kr/giftbox/', tip: '매월 추첨' },
  { id: 'bebeking_p', category: 'pregnancy', name: '베베킹 임신축하박스', desc: '매월 200명 선물 증정', link: 'https://www.bebeking.co.kr/', tip: '매월 추첨' },
  { id: 'momq_hug', category: 'pregnancy', name: '맘큐 하기스 허그박스', desc: '하기스 기저귀 · 물티슈 · 산모용품', link: 'https://www.momq.co.kr/', tip: '배송비 3,500원 · 부부 각각 신청 가능' },
  { id: 'hipp', category: 'pregnancy', name: 'HiPP 힙 축하박스', desc: '유기농 분유 샘플 + 육아용품', link: 'https://www.hipp.co.kr/', tip: '회원가입 후 신청' },
  { id: 'lovemom', category: 'pregnancy', name: '럽맘박스', desc: '매월 육아용품 박스 (최대 8회)', link: 'https://play.google.com/store/apps/details?id=com.momandbaby.lovemom', tip: '럽맘 앱 설치 후 신청' },
  { id: 'doubleheart', category: 'pregnancy', name: '더블하트 더블박스', desc: '약 20만원 상당 육아 필수템', link: 'https://m.doubleheart.co.kr/', tip: '회원가입 후 신청' },
  { id: 'momspack', category: 'pregnancy', name: '맘스팩', desc: '매월 임산부 박스 (태교일기 1일 이상 작성)', link: 'https://www.momspack.co.kr/', tip: '매월 발송' },
  { id: 'maternity_school', category: 'pregnancy', name: '매터니티스쿨', desc: '매월 100명 추첨 출산선물', link: 'https://www.maternitylove.co.kr/', tip: '매월 추첨' },
  // 출산 축하박스 / 분유 샘플
  { id: 'bebeform_b', category: 'birth', name: '베베폼 출산축하박스', desc: '출산 선물 꾸러미', link: 'https://bebeform.co.kr/giftbox/', tip: '출산 후 신청' },
  { id: 'bebeking_b', category: 'birth', name: '베베킹 출산축하박스', desc: '기저귀 · 물티슈 · 샘플 모음', link: 'https://www.bebeking.co.kr/', tip: '출산 후 신청' },
  { id: 'maeil', category: 'birth', name: '매일유업 앱솔루트 샘플', desc: '분유 샘플 + 이유식 샘플', link: 'https://www.maeil.com/', tip: '앱솔루트맘 가입' },
  { id: 'namyang', category: 'birth', name: '남양유업 임페리얼 샘플', desc: '분유 체험팩', link: 'https://www.namyangi.com/', tip: '남양아이 가입' },
  { id: 'ildong', category: 'birth', name: '일동후디스 산양분유 샘플', desc: '산양분유 체험팩', link: 'https://www.foodismall.com/', tip: '후디스몰 가입' },
  { id: 'ivenet', category: 'birth', name: '아이배냇 이유식 샘플', desc: '이유식 · 간식 체험팩', link: 'https://shop.ivenet.co.kr/', tip: '회원가입 후 신청' },
  { id: 'babyfair', category: 'birth', name: '베페 베이비페어', desc: 'COEX — 할인 + 대량 샘플 수령', link: 'https://www.befe.co.kr/', tip: '사전등록 시 무료입장' },
]

// ===== 검진 리마인더 =====
const CHECKUPS = [
  { week: 8, id: 'first_us', title: '첫 초음파', desc: '심장 박동 확인', icon: '🫀' },
  { week: 11, id: 'nt', title: 'NT 검사', desc: '목덜미 투명대 측정', icon: '🔬' },
  { week: 16, id: 'quad', title: '쿼드 검사', desc: '기형아 선별 검사', icon: '🧪' },
  { week: 20, id: 'precise_us', title: '정밀 초음파', desc: '태아 정밀 구조 확인', icon: '📸' },
  { week: 24, id: 'gtt', title: '임신성 당뇨 검사', desc: '포도당 부하 검사', icon: '🍬' },
  { week: 28, id: 'antibody', title: '항체 검사', desc: 'Rh 음성 시 필수', icon: '💉' },
  { week: 32, id: 'nst1', title: 'NST 검사 (1차)', desc: '태아 심박수 모니터링', icon: '💓' },
  { week: 36, id: 'gbs', title: 'GBS 검사', desc: 'B군 연쇄상구균', icon: '🦠' },
  { week: 37, id: 'nst2', title: 'NST (매주)', desc: '주 1회 태아 안녕 평가', icon: '📊' },
]

// ===== 혜택 · 제도 타임라인 =====
const BENEFITS_TIMELINE = [
  // 임신 확인 즉시
  { week: 0, id: 'happy_card', title: '국민행복카드 신청', desc: '임신 1회당 100만원 (다태아 140만원) 바우처', when: '임신 확인 즉시', icon: '💳', link: 'https://www.gov.kr/portal/onestopSvc/fertility', priority: 'high' },
  { week: 0, id: 'health_center', title: '보건소 등록', desc: '엽산제 · 철분제 무료 + 산전검사', when: '임신 확인 즉시', icon: '🏥', link: 'https://www.gov.kr/portal/onestopSvc/fertility', priority: 'high' },
  { week: 0, id: 'mother_book', title: '모자보건수첩 발급', desc: '산부인과 또는 보건소에서 발급', when: '임신 확인 즉시', icon: '📗', priority: 'high' },
  // 초기
  { week: 8, id: 'workplace', title: '직장 보고 (선택)', desc: '근로기준법상 임산부 보호 적용', when: '8주 이후', icon: '🏢', priority: 'medium' },
  { week: 12, id: 'high_risk', title: '고위험 임산부 확인', desc: '해당 시 의료비 90% 지원 (소득 무관)', when: '12주 전후', icon: '🩺', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000114', priority: 'medium' },
  // 중기
  { week: 16, id: 'postpartum_reserve', title: '산후조리원 예약', desc: '인기 조리원은 초기에 예약 필수!', when: '16주 전후', icon: '🤱', priority: 'high' },
  { week: 20, id: 'insurance', title: '태아 보험 가입', desc: '출산 전 가입 시 선천이상 보장', when: '22주 전 권장', icon: '🛡️', priority: 'high' },
  { week: 20, id: 'transport', title: '임산부 교통비 확인', desc: '서울 월 7만원 등 지자체별 상이', when: '20주~', icon: '🚌', priority: 'low' },
  // 후기
  { week: 30, id: 'birth_plan', title: '출산 병원 확정', desc: '분만실 예약 · 입원 절차 확인', when: '30주 전후', icon: '🏨', priority: 'high' },
  { week: 32, id: 'postnatal_helper', title: '산후도우미 신청', desc: '정부 바우처 산후도우미 서비스', when: '32주~', icon: '👩‍⚕️', link: 'https://www.gov.kr/portal/onestopSvc/happyBirth', priority: 'medium' },
  { week: 36, id: 'birth_docs', title: '출생신고 서류 준비', desc: '신분증 · 혼인관계증명서 · 인감', when: '36주~', icon: '📄', priority: 'medium' },
  // 출산 후
  { week: 41, id: 'birth_report', title: '출생신고 (행복출산 원스톱)', desc: '14일 이내 — 6종 서비스 한번에 신청', when: '출산 후 즉시', icon: '📋', link: 'https://www.gov.kr/portal/onestopSvc/happyBirth', priority: 'high' },
  { week: 41, id: 'first_meet', title: '첫만남이용권', desc: '첫째 200만원 · 둘째 이상 300만원', when: '출생신고 시 자동', icon: '🎉', link: 'https://www.gov.kr/portal/service/serviceInfo/135200005015', priority: 'high' },
  { week: 41, id: 'parent_pay', title: '부모급여 신청', desc: '0세 월 100만원 · 1세 월 50만원', when: '출산 후 60일 내', icon: '💰', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000143', priority: 'high' },
  { week: 41, id: 'child_allow', title: '아동수당 신청', desc: '만 8세 미만 월 10만원', when: '출산 후', icon: '👶', link: 'https://www.gov.kr/portal/service/serviceInfo/135200000120', priority: 'high' },
  { week: 41, id: 'baby_insurance_add', title: '건강보험 피부양자 등록', desc: '출생 후 14일 내 등록', when: '출산 후', icon: '🏥', priority: 'high' },
]

// ===== 출산 가방 =====
const HOSPITAL_BAG = {
  mom: [
    '산모 수첩 · 보험증', '수유 브라 2개', '산모 패드', '산모복 · 속옷',
    '세면도구 · 수건', '슬리퍼', '보온 양말', '간식 · 음료', '충전기', '산후 복대',
  ],
  baby: [
    '배냇저고리 2벌', '속싸개 · 겉싸개', '기저귀 (신생아)', '물티슈',
    '카시트 (퇴원용)', '모자 · 양말', '젖병 1개', '분유 소량 (비상용)',
  ],
  partner: [
    '간식 · 음료', '충전기 · 보조배터리', '카메라', '갈아입을 옷',
    '출생신고 서류', '주차 동전',
  ],
}

// ===== 감정 =====
const MOODS = [
  { emoji: '🥰', key: 'happy', label: '행복' },
  { emoji: '😌', key: 'calm', label: '평온' },
  { emoji: '😰', key: 'anxious', label: '불안' },
  { emoji: '🤢', key: 'sick', label: '입덧' },
  { emoji: '😴', key: 'tired', label: '피곤' },
]

// ===== 검진 기록 =====
function CheckupRecord({ currentWeek }: { currentWeek: number }) {
  const [records, setRecords] = useState<any[]>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_checkup_records') || '[]') } catch { return [] } }
    return []
  })
  const [formOpen, setFormOpen] = useState(false)
  const [week, setWeek] = useState(String(currentWeek))
  const [note, setNote] = useState('')
  const [babyWeight, setBabyWeight] = useState('')
  const [babyStatus, setBabyStatus] = useState('')
  const [doctorNote, setDoctorNote] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setUploading(false); return }

      const newPhotos: string[] = []
      for (let i = 0; i < Math.min(files.length, 5 - photos.length); i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const path = `checkup/${user.id}/${Date.now()}_${i}.${ext}`
        const { error } = await supabase.storage.from('photos').upload(path, file)
        if (!error) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
          newPhotos.push(urlData.publicUrl)
        }
      }
      setPhotos(prev => [...prev, ...newPhotos])
    } catch { /* */ }
    setUploading(false)
  }

  const save = () => {
    if (!note.trim() && !doctorNote.trim() && photos.length === 0) return
    const entry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      week: Number(week),
      note: note.trim(),
      babyWeight: babyWeight.trim(),
      babyStatus,
      doctorNote: doctorNote.trim(),
      photos,
    }
    const next = [entry, ...records]
    setRecords(next)
    localStorage.setItem('dodam_checkup_records', JSON.stringify(next))
    setNote(''); setBabyWeight(''); setBabyStatus(''); setDoctorNote(''); setPhotos([])
    setFormOpen(false)
  }

  return (
    <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[14px] font-bold text-[#1A1918]">🏥 검진 기록</p>
        <button onClick={() => setFormOpen(!formOpen)} className="text-[11px] text-[#3D8A5A] font-semibold">
          {formOpen ? '취소' : '+ 기록'}
        </button>
      </div>

      {formOpen && (
        <div className="space-y-2 mb-3 pb-3 border-b border-[#f0f0f0]">
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-[#868B94] mb-0.5">검진 주차</p>
              <input type="number" value={week} onChange={e => setWeek(e.target.value)} className="w-full h-9 rounded-lg border border-[#f0f0f0] px-2 text-[13px] text-center" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-[#868B94] mb-0.5">아기 체중 (g)</p>
              <input type="text" value={babyWeight} onChange={e => setBabyWeight(e.target.value)} placeholder="예: 500g" className="w-full h-9 rounded-lg border border-[#f0f0f0] px-2 text-[13px]" />
            </div>
          </div>

          <div>
            <p className="text-[10px] text-[#868B94] mb-0.5">아기 상태</p>
            <div className="flex gap-1.5">
              {['정상 👍', '주의 ⚠️', '정밀 검사 필요'].map(s => (
                <button key={s} onClick={() => setBabyStatus(s)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium ${babyStatus === s ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#868B94]'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-[#868B94] mb-0.5">의사 소견 / 메모</p>
            <textarea value={doctorNote} onChange={e => setDoctorNote(e.target.value)} placeholder="의사 선생님이 말씀하신 내용..."
              className="w-full h-14 text-[12px] p-2 bg-[#F5F4F1] rounded-lg resize-none focus:outline-none" />
          </div>

          <div>
            <p className="text-[10px] text-[#868B94] mb-0.5">특이사항 메모</p>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="초음파 결과, 느낀 점 등"
              className="w-full h-9 rounded-lg border border-[#f0f0f0] px-2 text-[12px]" />
          </div>

          {/* 사진 업로드 */}
          <div>
            <p className="text-[10px] text-[#868B94] mb-1">📸 초음파 사진 / 영상 캡처 (최대 5장)</p>
            <div className="flex gap-2 flex-wrap">
              {photos.map((url, i) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden relative">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-0 right-0 w-4 h-4 bg-black/50 text-white text-[8px] rounded-bl-lg">×</button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[#AEB1B9] flex flex-col items-center justify-center cursor-pointer active:opacity-60">
                  <span className="text-lg text-[#AEB1B9]">{uploading ? '...' : '📷'}</span>
                  <span className="text-[8px] text-[#AEB1B9]">{uploading ? '업로드' : '추가'}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>

          <button onClick={save} className="w-full py-2 bg-[#3D8A5A] text-white text-[12px] font-semibold rounded-lg active:opacity-80">검진 기록 저장</button>
        </div>
      )}

      {/* 기록 목록 */}
      {records.length === 0 ? (
        <p className="text-[11px] text-[#AEB1B9] text-center py-2">검진 기록이 없어요</p>
      ) : (
        <div className="space-y-2">
          {records.slice(0, 3).map((r: any) => (
            <div key={r.id} className="bg-[#F5F4F1] rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-[#1A1918]">{r.week}주차 검진</span>
                <div className="flex items-center gap-2">
                  {r.babyWeight && <span className="text-[10px] text-[#3D8A5A]">⚖️ {r.babyWeight}</span>}
                  <span className="text-[9px] text-[#AEB1B9]">{r.date}</span>
                </div>
              </div>
              {r.babyStatus && <p className="text-[10px] text-[#1A1918] mb-0.5">{r.babyStatus}</p>}
              {r.doctorNote && <p className="text-[10px] text-[#868B94]">👨‍⚕️ {r.doctorNote}</p>}
              {r.note && <p className="text-[10px] text-[#868B94]">📝 {r.note}</p>}
              {r.photos && r.photos.length > 0 && (
                <div className="flex gap-1.5 mt-1.5">
                  {r.photos.map((url: string, j: number) => (
                    <img key={j} src={url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </div>
          ))}
          {records.length > 3 && <p className="text-[9px] text-[#AEB1B9] text-center">+{records.length - 3}건 더</p>}
        </div>
      )}
    </div>
  )
}

// ===== AI 디스플레이 — 요약 + 펼치기 =====
function PregnantAIDisplay({ briefing, onRefresh, week, daysLeft, fruit }: { briefing: any; onRefresh: () => void; week: number; daysLeft: number; fruit: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-[#3D8A5A] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] text-white font-bold">AI</span>
        </div>
        <div className="flex-1">
          {/* 요약 (항상) */}
          <p className="text-[12px] text-[#1A1918] leading-relaxed">{briefing.greeting || briefing.mainAdvice?.slice(0, 80)}</p>

          {/* 아기 메시지 (항상) */}
          {briefing.babyMessage && (
            <div className="bg-[#FFF8F3] rounded-lg p-2 mt-1.5">
              <p className="text-[11px] text-[#1A1918]">💌 {briefing.babyMessage}</p>
            </div>
          )}

          {/* 펼침 */}
          {expanded && (
            <div className="mt-2 space-y-1.5 bg-white/60 rounded-lg p-2.5">
              {briefing.mainAdvice && <p className="text-[11px] text-[#1A1918] leading-relaxed">{briefing.mainAdvice}</p>}
              {briefing.weekHighlight && <p className="text-[10px] text-[#868B94]">🧒 {briefing.weekHighlight}</p>}
              {briefing.bodyTip && <p className="text-[10px] text-[#868B94]">🏃‍♀️ {briefing.bodyTip}</p>}
              {briefing.emotionalCare && <p className="text-[10px] text-[#868B94]">💚 {briefing.emotionalCare}</p>}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-[#3D8A5A] font-semibold">
              {expanded ? '접기 ▲' : '자세히 ▼'}
            </button>
            <button onClick={onRefresh} className="text-[10px] text-[#AEB1B9]">다시 받기</button>
            <button onClick={() => shareDday(week, daysLeft, fruit)} className="text-[10px] text-[#3D8A5A]">공유</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PregnantPage() {
  const [dueDate, setDueDate] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dodam_due_date') || ''
    return ''
  })
  const [editingDate, setEditingDate] = useState(!dueDate)

  // 건강 기록
  const today = new Date().toISOString().split('T')[0]
  const [weight, setWeight] = useState<number>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')[today]?.weight || 0 } catch { return 0 } }
    return 0
  })
  const [bp, setBp] = useState<string>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')[today]?.bp || '' } catch { return '' } }
    return ''
  })
  const [fetalMove, setFetalMove] = useState<number>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')[today]?.fetalMove || 0 } catch { return 0 } }
    return 0
  })
  const [mood, setMood] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(`dodam_preg_mood_${today}`) || ''
    return ''
  })

  // 태교 일기
  const [diaryText, setDiaryText] = useState('')
  const [diaryOpen, setDiaryOpen] = useState(false)
  const [diarySaving, setDiarySaving] = useState(false)
  const [diaries, setDiaries] = useState<{ text: string; date: string; mood: string; comment: string }[]>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_diary') || '[]') } catch { return [] } }
    return []
  })

  // 체크
  const [checkupDone, setCheckupDone] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_preg_checkups') || '{}') } catch { return {} } }
    return {}
  })
  const [bagChecked, setBagChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_hospital_bag') || '{}') } catch { return {} } }
    return {}
  })

  // 혜택 체크
  const [benefitDone, setBenefitDone] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('dodam_benefits') || '{}') } catch { return {} } }
    return {}
  })

  // 진통 타이머
  const [contractions, setContractions] = useState<{ start: number; end?: number }[]>([])
  const [contractionActive, setContractionActive] = useState(false)

  // AI
  const [aiBriefing, setAiBriefing] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  // 식단
  const [aiMeal, setAiMeal] = useState<any>(null)
  const [aiMealLoading, setAiMealLoading] = useState(false)

  // 더보기
  const [moreOpen, setMoreOpen] = useState(false)

  const currentWeek = useMemo(() => {
    if (!dueDate) return 0
    const diff = Math.floor((new Date(dueDate).getTime() - Date.now()) / 86400000)
    return Math.max(1, Math.min(42, 40 - Math.floor(diff / 7)))
  }, [dueDate])

  const daysLeft = useMemo(() => {
    if (!dueDate) return 0
    return Math.max(0, Math.floor((new Date(dueDate).getTime() - Date.now()) / 86400000))
  }, [dueDate])

  const currentFetal = useMemo(() => {
    return [...FETAL_DATA].reverse().find(f => currentWeek >= f.week) || FETAL_DATA[0]
  }, [currentWeek])

  const trimester = currentWeek <= 13 ? '초기' : currentWeek <= 27 ? '중기' : '후기'
  const upcomingCheckups = CHECKUPS.filter(c => c.week >= currentWeek && !checkupDone[c.id]).slice(0, 3)

  // 저장 핸들러
  const saveHealth = () => {
    const all = JSON.parse(localStorage.getItem('dodam_preg_health') || '{}')
    all[today] = { weight, bp, fetalMove }
    localStorage.setItem('dodam_preg_health', JSON.stringify(all))
  }
  const saveMood = (m: string) => {
    setMood(m); localStorage.setItem(`dodam_preg_mood_${today}`, m)
  }
  const toggleCheckup = (id: string) => {
    const next = { ...checkupDone, [id]: !checkupDone[id] }
    setCheckupDone(next); localStorage.setItem('dodam_preg_checkups', JSON.stringify(next))
  }
  const toggleBag = (item: string) => {
    const next = { ...bagChecked, [item]: !bagChecked[item] }
    setBagChecked(next); localStorage.setItem('dodam_hospital_bag', JSON.stringify(next))
  }
  const toggleBenefit = (id: string) => {
    const next = { ...benefitDone, [id]: !benefitDone[id] }
    setBenefitDone(next); localStorage.setItem('dodam_benefits', JSON.stringify(next))
  }

  // 태교 일기 저장
  const saveDiary = async () => {
    if (!diaryText.trim()) return
    setDiarySaving(true)
    let comment = '오늘도 도담하게 잘 지내고 있어요 💚'
    try {
      const res = await fetch('/api/ai-pregnant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'diary', text: diaryText, week: currentWeek, mood }),
      })
      const data = await res.json()
      if (data.comment) comment = data.comment
    } catch { /* fallback */ }
    const entry = { text: diaryText.trim(), date: new Date().toISOString(), mood, comment }
    const next = [entry, ...diaries]
    setDiaries(next); localStorage.setItem('dodam_preg_diary', JSON.stringify(next))
    setDiaryText(''); setDiaryOpen(false); setDiarySaving(false)
  }

  // 진통 타이머
  const startContraction = () => {
    setContractionActive(true)
    setContractions(prev => [...prev, { start: Date.now() }])
  }
  const endContraction = () => {
    setContractionActive(false)
    setContractions(prev => {
      const copy = [...prev]
      if (copy.length > 0) copy[copy.length - 1].end = Date.now()
      return copy
    })
  }
  const lastInterval = contractions.length >= 2
    ? Math.round((contractions[contractions.length - 1].start - contractions[contractions.length - 2].start) / 60000)
    : null

  // AI 브리핑
  const fetchAI = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem('dodam_preg_ai')
      if (cached) { try { const { date, data } = JSON.parse(cached); if (date === today && data.greeting) { setAiBriefing(data); return } } catch { /* */ } }
    }
    setAiLoading(true)
    try {
      const healthRaw = localStorage.getItem('dodam_health_records')
      const health = healthRaw ? JSON.parse(healthRaw) : {}
      const res = await fetch('/api/ai-pregnant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'daily', week: currentWeek, trimester, daysLeft, weight, bloodPressure: bp, fetalMovement: fetalMove, mood, sleep: health[today]?.sleep }),
      })
      const data = await res.json()
      if (!data.error) { setAiBriefing(data); localStorage.setItem('dodam_preg_ai', JSON.stringify({ date: today, data })) }
    } catch { /* */ }
    setAiLoading(false)
  }

  const fetchMeal = async () => {
    const cached = localStorage.getItem('dodam_preg_meal')
    if (cached) { try { const { date, data } = JSON.parse(cached); if (date === today && data.breakfast) { setAiMeal(data); return } } catch { /* */ } }
    setAiMealLoading(true)
    try {
      const res = await fetch('/api/ai-pregnant', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meal', week: currentWeek }) })
      const data = await res.json()
      if (!data.error && data.breakfast) { setAiMeal(data); localStorage.setItem('dodam_preg_meal', JSON.stringify({ date: today, data })) }
    } catch { /* */ }
    setAiMealLoading(false)
  }

  useEffect(() => { if (dueDate && !aiBriefing) fetchAI() }, [!!dueDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // 출산 예정일 입력
  const [tempDueDate, setTempDueDate] = useState(dueDate)
  if (editingDate) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
        <h1 className="text-[22px] font-bold text-[#1A1918] mb-2">출산 예정일이 언제인가요?</h1>
        <p className="text-[13px] text-[#868B94] mb-8">주차별 성장 정보를 알려드릴게요</p>
        <input type="date" value={tempDueDate} onChange={(e) => setTempDueDate(e.target.value)}
          className="w-full max-w-xs h-[52px] rounded-xl border border-[#f0f0f0] px-4 text-[15px] text-center" />
        <button
          onClick={() => { if (tempDueDate) { setDueDate(tempDueDate); localStorage.setItem('dodam_due_date', tempDueDate); setEditingDate(false) } }}
          disabled={!tempDueDate}
          className={`mt-6 w-full max-w-xs py-3 rounded-xl text-[14px] font-semibold ${tempDueDate ? 'bg-[#3D8A5A] text-white active:opacity-80' : 'bg-[#F0F0F0] text-[#AEB1B9]'}`}
        >
          완료
        </button>
        {dueDate && <button onClick={() => setEditingDate(false)} className="mt-3 text-[13px] text-[#868B94]">돌아가기</button>}
      </div>
    )
  }

  const bagTotal = [...HOSPITAL_BAG.mom, ...HOSPITAL_BAG.baby, ...HOSPITAL_BAG.partner].length
  const bagDone = Object.values(bagChecked).filter(Boolean).length

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
          <div>
            <p className="text-[12px] text-[#868B94]">임신 {currentWeek}주차 · {trimester}</p>
            <p className="text-[16px] font-bold text-[#1A1918]">D-{daysLeft}</p>
          </div>
          <button onClick={() => setEditingDate(true)} className="text-[11px] text-[#868B94]">수정</button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-4 pb-28 space-y-3">

        {/* ━━━ 태명 유도 (미설정 시) ━━━ */}
        {!localStorage.getItem('dodam_baby_nickname') && (
          <Link href="/name" className="block bg-gradient-to-r from-[#FFF8F3] to-[#F0F9F4] rounded-xl border border-[#FFDDC8]/50 p-4 active:opacity-80">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌟</span>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-[#1A1918]">우리 아이 태명을 지어볼까요?</p>
                <p className="text-[11px] text-[#868B94]">AI가 예쁜 태명을 추천해드려요</p>
              </div>
              <span className="text-[#AEB1B9]">→</span>
            </div>
          </Link>
        )}

        {/* ━━━ 1. AI 히어로 + 태아 ━━━ */}
        <div className="bg-gradient-to-br from-white to-[#F0F9F4] rounded-xl border border-[#C8F0D8] p-4">
          {/* 태아 비주얼 — 감성 */}
          <div className="text-center mb-3">
            <div className="mx-auto mb-1">
              <BabyIllust week={currentWeek} />
            </div>
            <p className="text-[14px] font-bold text-[#1A1918]">{currentWeek}주차 — <span className="text-[#3D8A5A]">{currentFetal.name}</span>만해요</p>
            <div className="flex justify-center gap-4 mt-1">
              <span className="text-[11px] text-[#868B94]">📏 {currentFetal.length}</span>
              <span className="text-[11px] text-[#868B94]">⚖️ {currentFetal.weight}</span>
              <button onClick={() => shareFetalSize(currentWeek, currentFetal.fruit, currentFetal.name, currentFetal.length, currentFetal.weight, daysLeft)} className="text-[10px] text-[#3D8A5A]">공유</button>
            </div>
            {/* 아기 한마디 */}
            <div className="bg-[#FFF8F3] rounded-xl p-2.5 mt-2 inline-block">
              <p className="text-[11px] text-[#1A1918] italic">
                {currentWeek <= 12 ? '"엄마, 나 여기 있어요! 아직 작지만 열심히 자라고 있어요 🌱"' :
                 currentWeek <= 20 ? '"엄마, 내가 움직이는 거 느꼈어요? 안에서 춤추고 있어요 💃"' :
                 currentWeek <= 30 ? '"엄마 목소리가 들려요. 계속 이야기해줘요 🎵"' :
                 currentWeek <= 36 ? '"엄마, 나 이제 거의 다 준비됐어요. 곧 만나요! 🤗"' :
                 '"엄마, 언제든 나갈 준비 완료! 빨리 안아줘요 💛"'}
              </p>
            </div>
          </div>

          {/* AI 브리핑 — 요약 + 펼치기 */}
          {aiLoading ? (
            <div className="py-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#3D8A5A] flex items-center justify-center"><span className="text-[9px] text-white">AI</span></div>
                <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-[#3D8A5A] rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-[#3D8A5A] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} /><span className="w-1.5 h-1.5 bg-[#3D8A5A] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} /></div>
              </div>
            </div>
          ) : aiBriefing ? (
            <PregnantAIDisplay briefing={aiBriefing} onRefresh={() => fetchAI(true)} week={currentWeek} daysLeft={daysLeft} fruit={currentFetal.fruit} />
          ) : (
            <div className="text-center py-2">
              <button onClick={() => fetchAI()} className="px-6 py-2 bg-[#3D8A5A] text-white text-[12px] font-semibold rounded-xl active:opacity-80">✨ AI 조언 받기</button>
            </div>
          )}

          {/* 프로그레스 + 감성 */}
          <div className="mt-3 pt-3 border-t border-[#C8F0D8]/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-[#868B94]">
                {daysLeft <= 14 ? '💛 곧 만나요!' : daysLeft <= 60 ? '🌈 조금만 더!' : '🌱 함께 자라는 중'}
              </p>
              <p className="text-[10px] text-[#3D8A5A]">{currentWeek}주 · D-{daysLeft}</p>
            </div>
            <div className="w-full h-2 bg-white/50 rounded-full">
              <div className="h-full bg-[#3D8A5A] rounded-full transition-all" style={{ width: `${(currentWeek / 40) * 100}%` }} />
            </div>
            <p className="text-[9px] text-[#AEB1B9] mt-1 text-center">
              {Math.round((currentWeek / 40) * 100)}% 완료 · 아이를 만나는 날까지 {daysLeft}일
            </p>
          </div>
        </div>

        {/* ━━━ 2. 오늘 할 일 ━━━ */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <p className="text-[14px] font-bold text-[#1A1918] mb-3">오늘 기록</p>

          {/* 감정 */}
          <div className="mb-3">
            <p className="text-[12px] font-semibold text-[#868B94] mb-1.5">오늘 기분</p>
            <div className="flex gap-1.5">
              {MOODS.map(m => (
                <button key={m.key} onClick={() => saveMood(m.key)}
                  className={`flex-1 py-1.5 rounded-lg text-center ${mood === m.key ? 'bg-[#3D8A5A] ring-2 ring-[#3D8A5A]/30' : 'bg-[#F5F4F1]'}`}>
                  <p className="text-lg">{m.emoji}</p>
                </button>
              ))}
            </div>
            {mood && (
              <p className="text-[11px] text-[#3D8A5A] mt-2 text-center">
                {({ happy: '행복한 엄마, 행복한 아이! 오늘도 도담하게 💛', calm: '평온한 마음이 아이에게 최고의 태교예요 🌿', anxious: '걱정은 사랑의 다른 이름이에요. 괜찮아요 💚', sick: '입덧이 힘들죠. 이것도 아이가 잘 자라는 신호예요 🤗', tired: '피곤한 날엔 아이와 함께 쉬어요. 쉬는 것도 돌봄이에요 🫂' } as Record<string, string>)[mood]}
              </p>
            )}
          </div>

          {/* 건강 기록 인라인 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <p className="text-[10px] text-[#868B94] mb-1">체중 (kg)</p>
              <input type="number" step="0.1" value={weight || ''} onChange={e => setWeight(Number(e.target.value))}
                placeholder="00.0" className="w-full h-9 rounded-lg border border-[#f0f0f0] px-2 text-[13px] text-center" />
            </div>
            <div>
              <p className="text-[10px] text-[#868B94] mb-1">혈압</p>
              <input type="text" value={bp} onChange={e => setBp(e.target.value)}
                placeholder="120/80" className="w-full h-9 rounded-lg border border-[#f0f0f0] px-2 text-[13px] text-center" />
            </div>
            <div>
              <p className="text-[10px] text-[#868B94] mb-1">태동</p>
              <div className="flex items-center justify-center h-9 gap-2">
                <button onClick={() => setFetalMove(Math.max(0, fetalMove - 1))} className="w-7 h-7 rounded-full bg-[#F5F4F1] text-[14px]">−</button>
                <span className="text-[14px] font-bold w-6 text-center">{fetalMove}</span>
                <button onClick={() => setFetalMove(fetalMove + 1)} className="w-7 h-7 rounded-full bg-[#3D8A5A] text-white text-[14px]">+</button>
              </div>
            </div>
          </div>
          <button onClick={saveHealth} className="w-full py-2 bg-[#3D8A5A] text-white text-[12px] font-semibold rounded-lg active:opacity-80">기록 저장</button>

          {/* 태교 일기 — AI 유도 + 초음파 */}
          <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
            {diaryOpen ? (
              <div>
                {/* AI 유도 프롬프트 */}
                <p className="text-[11px] text-[#3D8A5A] mb-2 italic">
                  {[
                    `${currentWeek}주차, 오늘 아이에게 하고 싶은 말이 있나요?`,
                    '오늘 태동을 느꼈다면 어떤 느낌이었나요?',
                    '아이에게 들려주고 싶은 노래가 있나요?',
                    '오늘 먹은 음식 중 아이도 좋아할 것 같은 건?',
                    '아이의 태명을 부르며 어떤 이야기를 했나요?',
                  ][Math.floor(Date.now() / 86400000) % 5]}
                </p>
                <textarea value={diaryText} onChange={e => setDiaryText(e.target.value.slice(0, 500))}
                  placeholder="자유롭게 적어보세요..."
                  className="w-full h-20 text-[13px] p-3 bg-[#F5F4F1] rounded-xl resize-none focus:outline-none" autoFocus />
                <div className="flex justify-between items-center mt-2">
                  <button onClick={() => setDiaryOpen(false)} className="text-[12px] text-[#868B94]">취소</button>
                  <button onClick={saveDiary} disabled={!diaryText.trim() || diarySaving}
                    className={`text-[12px] font-semibold px-3 py-1 rounded-lg ${diaryText.trim() && !diarySaving ? 'bg-[#3D8A5A] text-white' : 'bg-[#F0F0F0] text-[#AEB1B9]'}`}>
                    {diarySaving ? 'AI 코멘트 중...' : '저장'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button onClick={() => setDiaryOpen(true)} className="w-full py-2.5 text-[12px] font-semibold text-[#3D8A5A] bg-[#F0F9F4] rounded-lg active:opacity-80">
                  ✍️ 오늘의 태교일기
                </button>
                {diaries.length > 0 && (
                  <div className="p-2.5 bg-[#F5F4F1] rounded-lg">
                    <p className="text-[11px] text-[#1A1918] line-clamp-2">{diaries[0].text}</p>
                    <p className="text-[10px] text-[#3D8A5A] mt-1">{diaries[0].comment}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ━━━ 검진 기록 ━━━ */}
        <CheckupRecord currentWeek={currentWeek} />

        {/* ━━━ 식단 추천 ━━━ */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[14px] font-bold text-[#1A1918]">🍽️ {new Date().getHours() < 10 ? '아침' : new Date().getHours() < 14 ? '점심' : new Date().getHours() < 18 ? '간식' : '저녁'} 뭐 먹지?</p>
            {aiMeal && <button onClick={() => { localStorage.removeItem('dodam_preg_meal'); setAiMeal(null); fetchMeal() }} className="text-[10px] text-[#3D8A5A]">다른 추천</button>}
          </div>
          {aiMeal ? (
            <div className="space-y-1.5">
              {[
                { key: 'breakfast', label: '아침', icon: '🌅', data: aiMeal.breakfast },
                { key: 'lunch', label: '점심', icon: '☀️', data: aiMeal.lunch },
                { key: 'dinner', label: '저녁', icon: '🌙', data: aiMeal.dinner },
                { key: 'snack', label: '간식', icon: '🍎', data: aiMeal.snack },
              ].map(m => {
                if (!m.data) return null
                const hour = new Date().getHours()
                const isCurrent = m.key === (hour < 10 ? 'breakfast' : hour < 14 ? 'lunch' : hour < 18 ? 'snack' : 'dinner')
                return (
                  <div key={m.key} className={`rounded-lg ${isCurrent ? 'bg-[#F0F9F4] -mx-1 px-3 py-2' : 'py-1'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{m.icon}</span>
                        <span className={`text-[10px] ${isCurrent ? 'text-[#3D8A5A] font-bold' : 'text-[#AEB1B9]'}`}>{m.label}</span>
                        <p className="text-[12px] font-semibold text-[#1A1918]">{m.data.menu}</p>
                        {isCurrent && <span className="text-[7px] bg-[#3D8A5A] text-white px-1 rounded">지금</span>}
                      </div>
                      <Link href={`/map?q=${encodeURIComponent(m.data.menu.split(' ')[0] + ' 맛집')}`} className="text-[9px] text-[#3D8A5A]">📍</Link>
                    </div>
                    <p className="text-[10px] text-[#868B94] ml-7">{m.data.reason}</p>
                  </div>
                )
              })}
              {aiMeal.avoid && <p className="text-[10px] text-[#D08068] mt-1">🚫 {aiMeal.avoid}</p>}
            </div>
          ) : (
            <button onClick={fetchMeal} disabled={aiMealLoading} className="w-full py-2.5 text-[12px] font-semibold text-[#3D8A5A] bg-[#F0F9F4] rounded-xl active:opacity-80">
              {aiMealLoading ? 'AI가 식단 준비 중...' : '오늘의 식단 추천받기 🍽️'}
            </button>
          )}
        </div>

        {/* ━━━ 3. 상태 카드 — 주차별 동적 ━━━ */}
        {(() => {
          // 초기(~13주): 검진 중심
          if (currentWeek <= 13) return (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">🏥 다음 검진</p>
                {upcomingCheckups.length > 0 ? (
                  <><p className="text-[12px] font-bold text-[#1A1918] mt-0.5 line-clamp-1">{upcomingCheckups[0].title}</p><p className="text-[9px] text-[#3D8A5A]">{upcomingCheckups[0].week}주</p></>
                ) : <p className="text-[11px] text-[#AEB1B9] mt-1">완료!</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">📅 주차</p>
                <p className="text-[20px] font-bold text-[#3D8A5A] mt-0.5">{currentWeek}<span className="text-[12px] text-[#AEB1B9]">주</span></p>
              </div>
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">🎯 D-day</p>
                <p className="text-[20px] font-bold text-[#1A1918] mt-0.5">{daysLeft}<span className="text-[12px] text-[#AEB1B9]">일</span></p>
              </div>
            </div>
          )
          // 중기(14~27주): 검진 + 태동 시작
          if (currentWeek <= 27) return (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">🏥 다음 검진</p>
                {upcomingCheckups.length > 0 ? (
                  <><p className="text-[12px] font-bold text-[#1A1918] mt-0.5 line-clamp-1">{upcomingCheckups[0].title}</p><p className="text-[9px] text-[#3D8A5A]">{upcomingCheckups[0].week}주</p></>
                ) : <p className="text-[11px] text-[#AEB1B9] mt-1">완료!</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">👶 오늘 태동</p>
                <p className="text-[20px] font-bold text-[#3D8A5A] mt-0.5">{fetalMove}<span className="text-[12px] text-[#AEB1B9]">회</span></p>
              </div>
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">🎯 D-day</p>
                <p className="text-[20px] font-bold text-[#1A1918] mt-0.5">{daysLeft}<span className="text-[12px] text-[#AEB1B9]">일</span></p>
              </div>
            </div>
          )
          // 후기(28주+): 출산 가방 + 태동 + 검진
          return (
            <div className="grid grid-cols-3 gap-2">
              <div className={`bg-white rounded-xl border p-2.5 text-center ${bagDone < bagTotal ? 'border-[#C8F0D8]' : 'border-[#f0f0f0]'}`}>
                <p className="text-[10px] text-[#868B94]">🎒 출산 가방</p>
                <p className="text-[20px] font-bold text-[#1A1918] mt-0.5">{bagDone}<span className="text-[12px] text-[#AEB1B9]">/{bagTotal}</span></p>
                {bagDone < bagTotal && <p className="text-[8px] text-[#3D8A5A]">준비하세요!</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">👶 오늘 태동</p>
                <p className="text-[20px] font-bold text-[#3D8A5A] mt-0.5">{fetalMove}<span className="text-[12px] text-[#AEB1B9]">회</span></p>
                {fetalMove > 0 && fetalMove < 10 && <p className="text-[8px] text-[#D08068]">10회 이상 확인</p>}
              </div>
              <div className="bg-white rounded-xl border border-[#f0f0f0] p-2.5 text-center">
                <p className="text-[10px] text-[#868B94]">🎯 D-day</p>
                <p className={`text-[20px] font-bold mt-0.5 ${daysLeft <= 14 ? 'text-[#D08068]' : 'text-[#1A1918]'}`}>{daysLeft}<span className="text-[12px] text-[#AEB1B9]">일</span></p>
                {daysLeft <= 14 && <p className="text-[8px] text-[#D08068]">곧 만나요!</p>}
              </div>
            </div>
          )
        })()}

        {/* ━━━ 4. 진통 타이머 (후기만) ━━━ */}
        {currentWeek >= 36 && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <p className="text-[14px] font-bold text-[#1A1918] mb-2">⏱️ 진통 타이머</p>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={contractionActive ? endContraction : startContraction}
                className={`flex-1 py-3 rounded-xl text-[14px] font-semibold ${contractionActive ? 'bg-[#D08068] text-white animate-pulse' : 'bg-[#3D8A5A] text-white'}`}
              >
                {contractionActive ? '진통 끝' : '진통 시작'}
              </button>
              {contractions.length > 0 && (
                <button onClick={() => setContractions([])} className="text-[11px] text-[#AEB1B9]">초기화</button>
              )}
            </div>
            {lastInterval !== null && (
              <div className="bg-[#F5F4F1] rounded-lg p-2 text-center">
                <p className="text-[12px] text-[#868B94]">마지막 간격</p>
                <p className="text-[20px] font-bold text-[#1A1918]">{lastInterval}분</p>
                {lastInterval <= 5 && <p className="text-[11px] text-[#D08068] font-semibold mt-1">간격이 5분 이하! 병원에 연락하세요 🚨</p>}
              </div>
            )}
            <p className="text-[9px] text-[#AEB1B9] mt-2">기록: {contractions.length}회{contractions.length >= 3 ? ` · 평균 ${Math.round(contractions.slice(1).reduce((sum, c, i) => sum + (c.start - contractions[i].start), 0) / ((contractions.length - 1) * 60000))}분 간격` : ''}</p>
          </div>
        )}

        {/* ━━━ 긴급 혜택 알림 ━━━ */}
        {(() => {
          const urgent = BENEFITS_TIMELINE.filter(b => b.week <= currentWeek && !benefitDone[b.id] && b.priority === 'high' && b.week <= 40)
          if (urgent.length === 0) return null
          return (
            <div className="bg-[#FFF8F3] rounded-xl border border-[#FFDDC8] p-3">
              <p className="text-[12px] font-semibold text-[#D08068] mb-1">⚡ 아직 안 챙긴 혜택이 {urgent.length}개 있어요</p>
              {urgent.slice(0, 2).map(b => (
                <p key={b.id} className="text-[11px] text-[#1A1918]">{b.icon} {b.title} — {b.desc.slice(0, 30)}</p>
              ))}
              {urgent.length > 2 && <p className="text-[10px] text-[#868B94]">+{urgent.length - 2}개 더 (아래 더보기)</p>}
            </div>
          )
        })()}

        {/* ━━━ 스트릭 ━━━ */}
        <StreakCard mode="pregnant" />

        {/* ━━━ 주차별 한줄 체크 ━━━ */}
        <div className="bg-white rounded-xl border border-[#f0f0f0] p-3">
          <p className="text-[12px] font-bold text-[#1A1918] mb-1.5">📋 {currentWeek}주차 체크</p>
          <p className="text-[11px] text-[#868B94]">
            {currentWeek <= 8 ? '첫 초음파 · 엽산 복용 · 모자수첩 발급' :
             currentWeek <= 12 ? 'NT 검사 · 입덧 관리 · 보건소 등록' :
             currentWeek <= 16 ? '쿼드 검사 · 안정기 진입 · 산후조리원 예약' :
             currentWeek <= 20 ? '정밀 초음파 · 태교여행 · 이름 짓기 시작' :
             currentWeek <= 24 ? '임신성 당뇨 검사 · 태동 카운트' :
             currentWeek <= 28 ? '항체 검사 · 출산 교실 등록' :
             currentWeek <= 32 ? 'NST 검사 · 출산 가방 준비' :
             currentWeek <= 36 ? 'GBS 검사 · 출산 병원 확정 · 서류 준비' :
             '매주 NST · 진통 신호 확인 · 언제든 준비 완료!'}
          </p>
        </div>

        {/* ━━━ 기다림 탭 안내 ━━━ */}
        <Link href="/waiting" className="w-full bg-white rounded-xl border border-[#f0f0f0] p-3 flex items-center justify-between active:bg-[#F5F4F1]">
          <div>
            <p className="text-[13px] font-semibold text-[#1A1918]">기다림 탭에서 더 보기</p>
            <p className="text-[10px] text-[#868B94]">검진 · 혜택 · 축하박스 · 출산 가방 · 이름 짓기</p>
          </div>
          <span className="text-[#AEB1B9]">→</span>
        </Link>

        {false && moreOpen && (
          <div className="space-y-3">
            {/* 주차별 맞춤 제안 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-3">💡 {currentWeek}주차에 필요한 것</p>
              <div className="space-y-2">
                {/* 주차별 동적 제안 */}
                {currentWeek <= 12 && (
                  <>
                    <Link href="/town" className="flex items-center gap-2 p-2 bg-[#F5F4F1] rounded-lg active:opacity-80">
                      <span className="text-sm">🏥</span><p className="text-[11px] text-[#1A1918]">근처 산부인과 찾기</p><span className="text-[#AEB1B9] ml-auto text-xs">→</span>
                    </Link>
                    <div className="flex items-center gap-2 p-2 bg-[#F5F4F1] rounded-lg">
                      <span className="text-sm">🤢</span><p className="text-[11px] text-[#1A1918]">입덧 완화법: 소량 자주 식사, 생강차, 레몬향</p>
                    </div>
                  </>
                )}
                {currentWeek >= 13 && currentWeek <= 27 && (
                  <>
                    <Link href="/name" className="flex items-center gap-2 p-2 bg-[#F5F4F1] rounded-lg active:opacity-80">
                      <span className="text-sm">✨</span><p className="text-[11px] text-[#1A1918]">이름 짓기 시작하기</p><span className="text-[#AEB1B9] ml-auto text-xs">→</span>
                    </Link>
                    <div className="flex items-center gap-2 p-2 bg-[#F5F4F1] rounded-lg">
                      <span className="text-sm">✈️</span><p className="text-[11px] text-[#1A1918]">태교여행 적기! 안정기(16~28주) 국내 여행 추천</p>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-[#F5F4F1] rounded-lg">
                      <span className="text-sm">☕</span><p className="text-[11px] text-[#1A1918]">카페인 대체: 디카페인, 루이보스, 보리차</p>
                    </div>
                  </>
                )}
                {currentWeek >= 28 && (
                  <>
                    <Link href="/town" className="flex items-center gap-2 p-2 bg-[#F0F9F4] rounded-lg active:opacity-80">
                      <span className="text-sm">🤱</span><p className="text-[11px] text-[#3D8A5A] font-semibold">산후조리원 투어 예약</p><span className="text-[#3D8A5A] ml-auto text-xs">→</span>
                    </Link>
                    <div className="flex items-center gap-2 p-2 bg-[#F5F4F1] rounded-lg">
                      <span className="text-sm">📸</span><p className="text-[11px] text-[#1A1918]">만삭 사진 찍기 — 소중한 추억!</p>
                    </div>
                  </>
                )}
                {/* 공통 */}
                <div className="flex items-center gap-2 p-2 bg-[#F5F4F1] rounded-lg">
                  <span className="text-sm">🚫</span><p className="text-[11px] text-[#1A1918]">피해야 할 음식: 날생선, 생고기, 알코올, 고카페인</p>
                </div>
              </div>
            </div>

            {/* 동네 소식 */}
            <CommunityTeaser />

            {/* 검진 리마인더 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">🏥 검진 리마인더</p>
              {CHECKUPS.map(c => (
                <button key={c.id} onClick={() => toggleCheckup(c.id)} className="w-full flex items-center gap-2 py-1.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${checkupDone[c.id] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#AEB1B9]'}`}>
                    {checkupDone[c.id] && <span className="text-white text-[8px]">✓</span>}
                  </div>
                  <span className={`text-[12px] flex-1 text-left ${checkupDone[c.id] ? 'text-[#AEB1B9] line-through' : 'text-[#1A1918]'}`}>{c.icon} {c.title}</span>
                  <span className={`text-[10px] ${c.week <= currentWeek && !checkupDone[c.id] ? 'text-[#D08068] font-semibold' : 'text-[#AEB1B9]'}`}>{c.week}주</span>
                </button>
              ))}
            </div>

            {/* 혜택 · 제도 타임라인 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-[#1A1918]">🎁 혜택 · 제도 챙기기</p>
                <p className="text-[10px] text-[#3D8A5A] font-semibold">{BENEFITS_TIMELINE.filter(b => benefitDone[b.id]).length}/{BENEFITS_TIMELINE.length}</p>
              </div>

              {/* 지금 해야 할 것 (현재 주차 기준) */}
              {(() => {
                const urgent = BENEFITS_TIMELINE.filter(b => b.week <= currentWeek && !benefitDone[b.id] && b.week <= 40)
                const upcoming = BENEFITS_TIMELINE.filter(b => b.week > currentWeek && b.week <= 40 && !benefitDone[b.id]).slice(0, 3)
                const afterBirth = BENEFITS_TIMELINE.filter(b => b.week > 40)

                return (
                  <div className="space-y-1">
                    {urgent.length > 0 && (
                      <p className="text-[10px] font-semibold text-[#D08068] mb-1">⚡ 지금 챙기세요</p>
                    )}
                    {urgent.map(b => (
                      <button key={b.id} onClick={() => toggleBenefit(b.id)} className="w-full flex items-start gap-2 py-1.5 active:bg-[#F5F4F1] rounded-lg">
                        <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${benefitDone[b.id] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#D08068]'}`}>
                          {benefitDone[b.id] && <span className="text-white text-[8px]">✓</span>}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[12px] font-semibold text-[#1A1918]">{b.icon} {b.title}</p>
                          <p className="text-[10px] text-[#868B94]">{b.desc}</p>
                        </div>
                        {b.link && <a href={b.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[9px] text-[#3D8A5A] shrink-0 mt-1">신청 →</a>}
                      </button>
                    ))}

                    {upcoming.length > 0 && (
                      <p className="text-[10px] font-semibold text-[#868B94] mt-2 mb-1">📅 다가오는 일정</p>
                    )}
                    {upcoming.map(b => (
                      <button key={b.id} onClick={() => toggleBenefit(b.id)} className="w-full flex items-start gap-2 py-1.5 active:bg-[#F5F4F1] rounded-lg">
                        <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${benefitDone[b.id] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#AEB1B9]'}`}>
                          {benefitDone[b.id] && <span className="text-white text-[8px]">✓</span>}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-[12px] ${benefitDone[b.id] ? 'text-[#AEB1B9] line-through' : 'text-[#1A1918]'}`}>{b.icon} {b.title}</p>
                          <p className="text-[10px] text-[#868B94]">{b.desc}</p>
                        </div>
                        <span className="text-[9px] text-[#AEB1B9] shrink-0 mt-1">{b.when}</span>
                      </button>
                    ))}

                    <p className="text-[10px] font-semibold text-[#868B94] mt-2 mb-1">🍼 출산 후 챙길 것</p>
                    {afterBirth.map(b => (
                      <button key={b.id} onClick={() => toggleBenefit(b.id)} className="w-full flex items-start gap-2 py-1.5 active:bg-[#F5F4F1] rounded-lg">
                        <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${benefitDone[b.id] ? 'bg-[#3D8A5A] border-[#3D8A5A]' : 'border-[#AEB1B9]'}`}>
                          {benefitDone[b.id] && <span className="text-white text-[8px]">✓</span>}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-[12px] ${benefitDone[b.id] ? 'text-[#AEB1B9] line-through' : 'text-[#1A1918]'}`}>{b.icon} {b.title}</p>
                          <p className="text-[10px] text-[#868B94]">{b.desc}</p>
                        </div>
                        {b.link && <a href={b.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[9px] text-[#3D8A5A] shrink-0 mt-1">신청 →</a>}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* 무료 축하박스 · 샘플 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-3">🎁 무료 축하박스 · 샘플</p>

              <p className="text-[11px] font-semibold text-[#3D8A5A] mb-2">임신 축하박스</p>
              <div className="space-y-1.5 mb-4">
                {FREE_BOXES.filter(b => b.category === 'pregnancy').map(b => (
                  <a key={b.id} href={b.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 py-2 px-2 rounded-lg active:bg-[#F5F4F1] -mx-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F0F9F4] flex items-center justify-center shrink-0">
                      <span className="text-sm">🎁</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#1A1918]">{b.name}</p>
                      <p className="text-[10px] text-[#868B94]">{b.desc}</p>
                    </div>
                    <span className="text-[9px] text-[#AEB1B9] shrink-0">{b.tip}</span>
                  </a>
                ))}
              </div>

              <p className="text-[11px] font-semibold text-[#3D8A5A] mb-2">출산 축하박스 · 분유 샘플</p>
              <div className="space-y-1.5">
                {FREE_BOXES.filter(b => b.category === 'birth').map(b => (
                  <a key={b.id} href={b.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 py-2 px-2 rounded-lg active:bg-[#F5F4F1] -mx-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF8F3] flex items-center justify-center shrink-0">
                      <span className="text-sm">📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#1A1918]">{b.name}</p>
                      <p className="text-[10px] text-[#868B94]">{b.desc}</p>
                    </div>
                    <span className="text-[9px] text-[#AEB1B9] shrink-0">{b.tip}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* 출산 가방 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">🎒 출산 가방 체크리스트</p>
              {(['mom', 'baby', 'partner'] as const).map(cat => (
                <div key={cat} className="mb-3 last:mb-0">
                  <p className="text-[11px] font-semibold text-[#868B94] mb-1">{cat === 'mom' ? '👩 엄마' : cat === 'baby' ? '👶 아기' : '👨 파트너'}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {HOSPITAL_BAG[cat].map(item => (
                      <button key={item} onClick={() => toggleBag(item)} className={`text-[11px] py-1.5 px-2 rounded-lg text-left ${bagChecked[item] ? 'bg-[#3D8A5A] text-white' : 'bg-[#F5F4F1] text-[#1A1918]'}`}>
                        {bagChecked[item] ? '✓ ' : ''}{item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 이번 주 발달 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <p className="text-[13px] font-bold text-[#1A1918] mb-2">🧒 이번 주 발달</p>
              <p className="text-[12px] text-[#1A1918] mb-2">{currentFetal.desc}</p>
              <div className="bg-[#F0F9F4] rounded-lg p-2">
                <p className="text-[11px] text-[#3D8A5A]">💡 {currentFetal.tip}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
