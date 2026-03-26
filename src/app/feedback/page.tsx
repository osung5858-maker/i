'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESETS = [
  { label: '기능 제안', emoji: '💡', desc: '이런 기능이 있으면 좋겠어요' },
  { label: 'UX 의견', emoji: '🎨', desc: '디자인이나 사용성 관련' },
  { label: '버그 제보', emoji: '🐛', desc: '오류를 발견했어요' },
  { label: '칭찬', emoji: '💌', desc: '응원 한마디' },
  { label: '제휴 제안', emoji: '🤝', desc: '협업/파트너십 문의' },
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
        <p className="text-[48px] mb-4">💌</p>
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
    <div className="min-h-[100dvh] bg-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#F0EDE8]">
        <div className="flex items-center justify-between h-14 lg:h-16 px-5 lg:px-8 max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="text-[14px] text-[#6B6966]">닫기</button>
          <h1 className="text-[15px] lg:text-[17px] font-bold text-[#1A1918]">의견 보내기</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 lg:px-8 py-8 lg:py-12">
        {/* 인트로 */}
        <div className="mb-8 lg:mb-10">
          <h2 className="text-[22px] lg:text-[30px] font-bold text-[#1A1918] mb-2">
            어떤 이야기를 들려주실 건가요?
          </h2>
          <p className="text-[14px] lg:text-[16px] text-[#6B6966]">
            보내주신 의견은 osung5858@gmail.com으로 전달돼요
          </p>
        </div>

        {/* 프리셋 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3 mb-8 lg:mb-10">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setPreset(prev => prev === p.label ? '' : p.label)}
              className="p-3 lg:p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.97]"
              style={{
                borderColor: preset === p.label ? '#E8937A' : '#F0EDE8',
                backgroundColor: preset === p.label ? '#FFF5F2' : '#FAFAF8',
              }}
            >
              <span className="text-[20px] lg:text-[24px] block mb-1.5">{p.emoji}</span>
              <span className="text-[13px] lg:text-[15px] font-bold text-[#1A1918] block">{p.label}</span>
              <span className="text-[11px] lg:text-[13px] text-[#9E9A95]">{p.desc}</span>
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
