'use client'

import { useState } from 'react'

const PRESETS = [
  '이런 기능이 있으면 좋겠어요',
  '디자인/사용성 의견',
  '버그를 발견했어요',
  '칭찬/응원 한마디',
  '제휴/협업 제안',
]

export default function FeedbackForm() {
  const [preset, setPreset] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const subject = preset || '도담 사용자 의견'
  const body = message
  const mailto = `mailto:osung5858@gmail.com?subject=${encodeURIComponent(`[도담 의견] ${subject}`)}&body=${encodeURIComponent(body)}`

  const handleSend = () => {
    if (!message.trim()) return
    window.location.href = mailto
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <section className="px-6 py-16 sm:py-20 lg:py-28 bg-white">
      <div className="max-w-lg lg:max-w-2xl mx-auto">
        <h2 className="text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3">
          의견을 들려주세요
        </h2>
        <p className="text-center text-body-emphasis lg:text-subtitle text-secondary mb-10 lg:mb-12">
          더 좋은 도담을 만드는 데 큰 힘이 돼요
        </p>

        {/* 프리셋 */}
        <div className="flex flex-wrap justify-center gap-2 mb-6 lg:mb-8">
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setPreset(prev => prev === p ? '' : p)}
              className="px-4 py-2 lg:px-5 lg:py-2.5 rounded-full text-body lg:text-body-emphasis font-medium transition-all"
              style={{
                backgroundColor: preset === p ? '#E8937A' : '#F5F3F0',
                color: preset === p ? '#fff' : '#6B6966',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 텍스트 입력 */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="자유롭게 적어주세요..."
          maxLength={2000}
          rows={4}
          className="w-full p-4 lg:p-5 rounded-2xl border border-[#E8E4DF] bg-[#FAFAF8] text-body-emphasis lg:text-subtitle text-primary placeholder-[#C4C0BB] resize-none focus:outline-none focus:border-[#E8937A] transition-colors"
        />

        {/* 보내기 */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="px-8 py-3.5 lg:px-10 lg:py-4 rounded-full font-semibold text-white text-subtitle lg:text-subtitle active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: message.trim() ? 'linear-gradient(135deg, #E8937A, #D47B62)' : '#C4C0BB' }}
          >
            {sent ? '메일 앱에서 보내주세요!' : '의견 보내기'}
          </button>
        </div>
      </div>
    </section>
  )
}
