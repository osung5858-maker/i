'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'

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
      <>
      <PageHeader title="의견 보내기" />
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <p className="text-body-emphasis font-medium text-[var(--color-primary)] mb-4">전송 완료</p>
        <h2 className="text-heading-2 lg:text-heading-1 font-bold text-primary mb-2">감사합니다!</h2>
        <p className="text-body-emphasis lg:text-subtitle text-secondary mb-8 text-center">
          메일 앱에서 보내기를 눌러주세요.<br />소중한 의견 꼭 반영할게요.
        </p>
        <button
          onClick={() => { setSent(false); setMessage(''); setPreset('') }}
          className="px-6 py-3 rounded-full text-body-emphasis font-medium text-secondary bg-[#F5F3F0] active:scale-95 transition-transform"
        >
          다른 의견 보내기
        </button>
        <button
          onClick={() => router.back()}
          className="mt-3 text-body text-tertiary"
        >
          돌아가기
        </button>
      </div>
      </>
    )
  }

  return (
    <div className="pb-28" style={{ backgroundColor: 'var(--color-page-bg)' }}>
      <PageHeader title="의견 보내기" />
      <div className="max-w-2xl mx-auto px-5 lg:px-8 py-8 lg:py-12">
        {/* 인트로 */}
        <div className="mb-8 lg:mb-10">
          <h2 className="text-heading-2 lg:text-[30px] font-bold text-primary mb-2">
            어떤 이야기를 들려주실 건가요?
          </h2>
          <p className="text-body-emphasis lg:text-subtitle text-secondary">
            소중한 의견을 들려주세요
          </p>
        </div>

        {/* 프리셋 */}
        <div className="flex flex-wrap gap-2 mb-8 lg:mb-10">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setPreset(prev => prev === p.label ? '' : p.label)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-body font-medium transition-all active:scale-[0.97]"
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
          <label className="block text-body lg:text-body-emphasis font-medium text-secondary mb-2">내용</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="자유롭게 적어주세요. 불편했던 점, 원하는 기능, 응원 한마디 뭐든 좋아요!"
            maxLength={2000}
            rows={6}
            className="w-full p-4 lg:p-5 rounded-2xl border border-[#E8E4DF] bg-[#FAFAF8] text-body-emphasis lg:text-subtitle text-primary placeholder-[#C4C0BB] resize-none focus:outline-none focus:border-[#E8937A] transition-colors"
          />
        </div>

        {/* 보내기 */}
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="w-full py-4 lg:py-5 rounded-2xl font-semibold text-white text-subtitle lg:text-heading-3 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: message.trim() ? 'linear-gradient(135deg, #E8937A, #D47B62)' : '#C4C0BB' }}
        >
          의견 보내기
        </button>

        <p className="mt-4 text-center text-caption lg:text-body text-muted">
          메일 앱이 열리면 보내기를 눌러주세요
        </p>
      </div>
    </div>
  )
}
