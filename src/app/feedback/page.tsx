'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESETS = [
  { label: '기능 제안', desc: '이런 기능이 있으면 좋겠어요' },
  { label: 'UX 의견', desc: '디자인이나 사용성 관련' },
  { label: '버그 제보', desc: '오류를 발견했어요' },
  { label: '칭찬', desc: '응원 한마디' },
  { label: '제휴 제안', desc: '협업/파트너십 문의' },
]

export default function FeedbackPage() {
  const router = useRouter()
  const [preset, setPreset] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const subject = preset || '도담 사용자 의견'
  const mailto = `mailto:osung5858@gmail.com?subject=${encodeURIComponent(`[도담 의견] ${subject}`)}&body=${encodeURIComponent(message)}`

  const handleSend = () => {
    if (!message.trim()) return
    window.location.href = mailto
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-white">
        <p className="text-[14px] font-medium text-[var(--color-primary)] mb-4">전송 완료</p>
        <h2 className="text-[22px] lg:text-[28px] font-bold text-[#1A1918] mb-2">감사합니다!</h2>
        <p className="text-[14px] lg:text-[16px] text-[#6B6966] mb-8 text-center">
          메일 앱에서 보내기를 눌러주세요.<br />소중한 의견 꼭 반영할게요.
        </p>
        <button
          onClick={() => { setSent(false); setMessage(''); setPreset('') }}
          className="px-6 py-3 rounded-full text-[14px] font-medium text-[#6B6966] bg-[#F5F3F0] active:scale-95 transition-transform"
        >
          다른 의견 보내기
        </button>
        <button
          onClick={() => router.back()}
          className="mt-3 text-[13px] text-[#9E9A95]"
        >
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white pb-24">
      <div className="max-w-2xl mx-auto px-5 lg:px-8 py-8 lg:py-12">
        {/* 인트로 */}
        <div className="mb-8 lg:mb-10">
          <h2 className="text-[22px] lg:text-[30px] font-bold text-[#1A1918] mb-2">
            어떤 이야기를 들려주실 건가요?
          </h2>
          <p className="text-[14px] lg:text-[16px] text-[#6B6966]">
            소중한 의견을 들려주세요
          </p>
        </div>

        {/* 프리셋 */}
        <div className="flex flex-wrap gap-2 mb-8 lg:mb-10">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setPreset(prev => prev === p.label ? '' : p.label)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-[13px] font-medium transition-all active:scale-[0.97]"
              style={{
                borderColor: preset === p.label ? '#E8937A' : '#E8E4DF',
                backgroundColor: preset === p.label ? '#FFF5F2' : '#FAFAF8',
                color: preset === p.label ? '#D47B62' : '#6B6966',
              }}
            >
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* 텍스트 */}
        <div className="mb-6">
          <label className="block text-[13px] lg:text-[14px] font-medium text-[#6B6966] mb-2">내용</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="자유롭게 적어주세요. 불편했던 점, 원하는 기능, 응원 한마디 뭐든 좋아요!"
            rows={6}
            className="w-full p-4 lg:p-5 rounded-2xl border border-[#E8E4DF] bg-[#FAFAF8] text-[14px] lg:text-[16px] text-[#1A1918] placeholder-[#C4C0BB] resize-none focus:outline-none focus:border-[#E8937A] transition-colors"
          />
        </div>

        {/* 보내기 */}
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="w-full py-4 lg:py-5 rounded-2xl font-semibold text-white text-[16px] lg:text-[18px] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: message.trim() ? 'linear-gradient(135deg, #E8937A, #D47B62)' : '#C4C0BB' }}
        >
          의견 보내기
        </button>

        <p className="mt-4 text-center text-[12px] lg:text-[13px] text-[#C4C0BB]">
          메일 앱이 열리면 보내기를 눌러주세요
        </p>
      </div>
    </div>
  )
}
