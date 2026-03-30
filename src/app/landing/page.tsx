'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

function V({ src, className = 'w-12 h-12' }: { src: string; className?: string }) {
  return (
    <div className={`rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ maskImage: 'radial-gradient(circle, black 55%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 80%)' }}>
      <video src={src} autoPlay loop muted playsInline preload="none" className="w-full h-full object-cover" />
    </div>
  )
}

export default function LandingPage() {
  const heroVideoRef = useRef<HTMLDivElement>(null)
  const blob1Ref = useRef<HTMLDivElement>(null)
  const blob2Ref = useRef<HTMLDivElement>(null)
  const blob3Ref = useRef<HTMLDivElement>(null)
  const ctaVideoRef = useRef<HTMLDivElement>(null)

  // ── 패럴럭스 스크롤 ──
  useEffect(() => {
    const container = document.getElementById('landing-scroll')
    if (!container) return

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const sy = container.scrollTop
        if (heroVideoRef.current)
          heroVideoRef.current.style.transform = `translateY(${sy * 0.22}px)`
        if (blob1Ref.current)
          blob1Ref.current.style.transform = `translateY(${sy * 0.12}px) translateX(${sy * 0.04}px)`
        if (blob2Ref.current)
          blob2Ref.current.style.transform = `translateY(${sy * 0.07}px) translateX(-${sy * 0.03}px)`
        if (blob3Ref.current)
          blob3Ref.current.style.transform = `translateY(${sy * 0.05}px)`
        if (ctaVideoRef.current)
          ctaVideoRef.current.style.transform = `translateY(-${sy * 0.04}px)`
        ticking = false
      })
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // ── 스크롤 리빌 (IntersectionObserver) ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible') }),
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    )
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale')
      .forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="w-full min-h-[100dvh]">

      {/* ━━━ 히어로 ━━━ */}
      <section className="relative overflow-hidden text-center"
        style={{ background: 'linear-gradient(180deg, #FFF8F3 0%, #FFE8D8 50%, #FFD4C4 100%)' }}>

        {/* 배경 블롭 */}
        <div ref={blob1Ref}
          className="blob-1 parallax-layer pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #FFB8A0 0%, transparent 70%)' }} />
        <div ref={blob2Ref}
          className="blob-2 parallax-layer pointer-events-none absolute top-1/3 -left-20 w-64 h-64 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #FFDBB5 0%, transparent 70%)' }} />
        <div ref={blob3Ref}
          className="blob-3 parallax-layer pointer-events-none absolute bottom-10 right-10 w-40 h-40 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #FFD4C4 0%, transparent 70%)' }} />

        {/* 히어로 뱃지 */}
        <div className="hero-badge pt-10 lg:pt-14 flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold text-[#D47B62] bg-white/70 backdrop-blur-sm border border-[#FFD4C4]">
            ✨ AI 육아 파트너
          </span>
        </div>

        {/* 히어로 영상 */}
        <div ref={heroVideoRef} className="hero-video parallax-layer w-full max-w-md lg:max-w-2xl mx-auto px-6 pt-6 lg:pt-10">
          <div className="rounded-3xl lg:rounded-[32px] overflow-hidden shadow-[0_12px_48px_rgba(232,147,122,0.30)]">
            <video src="/images/illustrations/hero1.webm" autoPlay loop muted playsInline className="w-full object-cover" />
          </div>
        </div>

        <div className="max-w-3xl mx-auto relative px-6 pt-10 lg:pt-14 pb-16 lg:pb-28">
          <h1 className="hero-title text-[26px] sm:text-[40px] lg:text-[52px] font-bold text-[#1A1918] mb-4 lg:mb-6 leading-[1.3]">
            기록만 해도,<br />
            <span className="text-[#D47B62]">AI가 먼저 챙겨줘요.</span>
          </h1>
          <p className="hero-sub text-[15px] sm:text-[17px] lg:text-[20px] text-[#6B6966] mb-8 lg:mb-10 leading-relaxed">
            임신 준비부터 육아까지<br />
            아침마다 오늘 할 일을 알려주는 AI 파트너
          </p>
          <div className="hero-cta">
            <Link href="/onboarding"
              className="cta-glow inline-block px-9 py-4 lg:px-12 lg:py-5 rounded-full font-semibold text-white text-[16px] lg:text-[18px] active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #E8937A, #D47B62)' }}>
              무료로 시작하기
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ 기본기 ━━━ */}
      <section className="px-6 py-16 sm:py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="reveal text-center text-[20px] sm:text-[28px] lg:text-[36px] font-bold text-[#1A1918] mb-3">
            다른 앱에서 하던 것, 당연히 다 돼요
          </h2>
          <p className="reveal reveal-d1 text-center text-[14px] lg:text-[16px] text-[#6B6966] mb-12 lg:mb-16">
            수유 · 수면 · 성장 · 이유식 — 기본은 확실하게
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { video: '/images/illustrations/t3.webm', title: '수유·수면 기록', desc: 'FAB 한 번으로 바로 기록', delay: '' },
              { video: '/images/illustrations/h3.webm', title: '성장 차트', desc: '표준 백분위 비교', delay: 'reveal-d1' },
              { video: '/images/illustrations/e2.webm', title: '발달 마일스톤', desc: '월령별 첫 순간 체크', delay: 'reveal-d2' },
              { video: '/images/illustrations/f4.webm', title: '이유식 가이드', desc: '단계별 식재료·알레르기', delay: 'reveal-d3' },
            ].map(f => (
              <div key={f.title} className={`reveal-scale ${f.delay} p-5 lg:p-7 rounded-2xl bg-[#FAFAFA] border border-[#F0EDE8] text-center`}>
                <V src={f.video} className="w-14 h-14 lg:w-18 lg:h-18 mx-auto mb-3 lg:mb-4" />
                <h3 className="text-[15px] lg:text-[18px] font-bold text-[#1A1918] mb-1">{f.title}</h3>
                <p className="text-[13px] lg:text-[15px] text-[#9E9A95]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ AI 차별점 ━━━ */}
      <section className="px-6 py-16 sm:py-20 lg:py-28" style={{ background: 'linear-gradient(180deg, #FFF8F3 0%, #FFF0E8 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-[20px] sm:text-[28px] lg:text-[36px] font-bold text-[#1A1918] mb-3">
            앱 열면 <span className="text-[#D47B62]">AI가 먼저</span> 알려줘요
          </h2>
          <p className="reveal reveal-d1 text-center text-[14px] lg:text-[16px] text-[#6B6966] mb-12 lg:mb-16">
            뭘 해야 할지 고민할 필요 없어요. 도담이 먼저 챙겨줄게요.
          </p>
          <div className="space-y-4 lg:space-y-5">
            {[
              { video: '/images/illustrations/t3.webm', before: '"오늘 뭘 해야 하지?" 앱을 켜도 막막함', after: '아침마다 AI 브리핑으로 오늘의 수유·수면·예방접종 일정을 먼저 알려줘요', dir: 'left' },
              { video: '/images/illustrations/t3.webm', before: '"다음 수유 언제지?" 매번 시간 계산', after: 'AI가 패턴을 분석해서 다음 수유·수면 타이밍을 미리 알려줘요', dir: 'right' },
              { video: '/images/illustrations/f2.webm', before: '"오늘 뭐 해먹이지?" 매일 검색', after: '월령·알레르기·어제 먹은 것까지 고려해 오늘 이유식을 제안해요', dir: 'left' },
              { video: '/images/illustrations/e1.webm', before: '"갑자기 열이 나는데..." 새벽에 물어볼 곳 없음', after: '24시간 AI 육아 SOS — 증상 체크리스트와 대응법을 바로 알려줘요', dir: 'right' },
              { video: '/images/illustrations/h3.webm', before: '"잘 크고 있는 건지..." 수치만 보고 불안', after: '검진표를 찍으면 AI가 해석해주고, 성장 급등기·둔화기를 알려줘요', dir: 'left' },
            ].map((item, i) => (
              <div key={item.before}
                className={`${item.dir === 'left' ? 'reveal-left' : 'reveal-right'} bg-white rounded-2xl p-5 lg:p-7 border border-[#F0EDE8]`}
                style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="flex items-start gap-4 lg:gap-5">
                  <V src={item.video} className="w-12 h-12 lg:w-16 lg:h-16 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[13px] lg:text-[15px] text-[#B5B0AB] line-through mb-2">{item.before}</p>
                    <p className="text-[15px] lg:text-[18px] font-medium text-[#1A1918] leading-relaxed">{item.after}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 3모드 ━━━ */}
      <section className="px-6 py-16 sm:py-20 lg:py-28 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-[20px] sm:text-[28px] lg:text-[36px] font-bold text-[#1A1918] mb-3">지금 어떤 단계에 계세요?</h2>
          <p className="reveal reveal-d1 text-center text-[14px] lg:text-[16px] text-[#6B6966] mb-12 lg:mb-16">단계마다 딱 필요한 것만, AI가 먼저 챙겨줘요</p>
          <div className="space-y-3 lg:space-y-4">
            {[
              { bg: 'from-[#FFE0EC] to-[#FFF0F5]', video: '/images/illustrations/onboarding-preparing.webm', label: '아기를 기다리고 있어요', desc: '배란일 · 가임기 알림 · 마음 체크 · AI 건강 코치', delay: '' },
              { bg: 'from-[#FFE8D0] to-[#FFF8F0]', video: '/images/illustrations/onboarding-pregnant.webm', label: '배 속에 아기가 자라고 있어요', desc: '주차별 태아 성장 · 검진 일정 관리 · AI 맞춤 가이드', delay: 'reveal-d1' },
              { bg: 'from-[#D5F0E0] to-[#F0FAF4]', video: '/images/illustrations/onboarding-parenting.webm', label: '우리 아이를 키우고 있어요', desc: '수유·수면 기록 · AI 아침 브리핑 · 성장 리포트 · 육아 SOS', delay: 'reveal-d2' },
            ].map(m => (
              <div key={m.label} className={`reveal-scale ${m.delay} bg-gradient-to-r ${m.bg} p-5 lg:p-7 rounded-2xl flex items-center gap-4 lg:gap-6`}>
                <V src={m.video} className="w-16 h-16 lg:w-20 lg:h-20" />
                <div>
                  <h3 className="text-[15px] lg:text-[18px] font-bold text-[#1A1918] mb-1">{m.label}</h3>
                  <p className="text-[13px] lg:text-[15px] text-[#6B6966] leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 이런 것도 돼요 ━━━ */}
      <section className="px-6 py-16 sm:py-20 lg:py-28 bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-[20px] sm:text-[28px] lg:text-[36px] font-bold text-[#1A1918] mb-3">이런 것도 돼요</h2>
          <p className="reveal reveal-d1 text-center text-[14px] lg:text-[16px] text-[#6B6966] mb-12 lg:mb-16">육아의 크고 작은 순간들을 함께해요</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            {[
              { video: '/images/illustrations/f2.webm', title: '"검진 결과가 무슨 뜻이야?"', desc: '검진결과표 사진 한 장, AI가 쉽게 풀어줘요', delay: '' },
              { video: '/images/illustrations/t5.webm', title: '"이 이름, 괜찮을까?"', desc: 'AI 추천 · 음양오행 · 한자 획수 분석', delay: 'reveal-d1' },
              { video: '/images/illustrations/t4.webm', title: '"받을 수 있는 지원금이 있대"', desc: '부모급여·아동수당·보육료 혜택 한눈에', delay: 'reveal-d2' },
              { video: '/images/illustrations/e1.webm', title: '"예방접종 언제 맞혀야 하지?"', desc: '스케줄 알림 · 완료 체크 · 부작용 안내', delay: 'reveal-d3' },
            ].map(h => (
              <div key={h.title} className={`reveal ${h.delay} flex items-center gap-4 lg:gap-5 p-5 lg:p-6 rounded-2xl border border-[#F0EDE8] bg-white`}>
                <V src={h.video} className="w-13 h-13 lg:w-16 lg:h-16" />
                <div>
                  <h3 className="text-[15px] lg:text-[18px] font-bold text-[#1A1918] mb-1">{h.title}</h3>
                  <p className="text-[13px] lg:text-[15px] text-[#6B6966] leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 정부 지원 ━━━ */}
      <section className="px-6 py-16 sm:py-20 lg:py-28" style={{ background: 'linear-gradient(180deg, #F0FAF4, #E8F5EE)' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-[20px] sm:text-[28px] lg:text-[36px] font-bold text-[#1A1918] mb-3">
            몰라서 못 받는 돈, 여기 다 있어요
          </h2>
          <p className="reveal reveal-d1 text-center text-[14px] lg:text-[16px] text-[#6B6966] mb-12 lg:mb-16">받을 수 있는 혜택을 한눈에</p>
          <div className="reveal mb-6 lg:mb-8 p-5 lg:p-7 rounded-2xl text-center"
            style={{ background: 'linear-gradient(135deg, #FFE8D8, #FFDBB5)' }}>
            <V src="/images/illustrations/celebration-hero.webm" className="w-14 h-14 lg:w-18 lg:h-18 mx-auto mb-3" />
            <h3 className="text-[16px] lg:text-[20px] font-bold text-[#1A1918] mb-1">출산축하 혜택, 챙기셨나요?</h3>
            <p className="text-[13px] lg:text-[15px] text-[#6B6966] leading-relaxed">
              지자체별 출산축하금 · 산후조리비 · 축하박스까지<br />
              도담에서 내가 받을 수 있는 혜택을 알려드려요
            </p>
          </div>
          <div className="space-y-3 lg:space-y-4">
            {[
              { video: '/images/illustrations/t4.webm', title: '부모급여', highlight: '월 최대 100만원', desc: '0세 월 100만원 · 1세 월 50만원' },
              { video: '/images/illustrations/h1.webm', title: '첫만남이용권', highlight: '200만원', desc: '출생아 1인당 바우처 지급' },
              { video: '/images/illustrations/e2.webm', title: '아동수당', highlight: '월 10만원', desc: '만 8세 미만 매월 지급' },
              { video: '/images/illustrations/celebration-hero.webm', title: '출산축하박스', highlight: '지자체별', desc: '서울·경기 등 지역별 축하 선물 패키지' },
              { video: '/images/illustrations/e1.webm', title: '산후조리비', highlight: '최대 200만원', desc: '건강보험 산후조리원 이용 지원' },
            ].map((b, i) => (
              <div key={b.title}
                className="reveal-left bg-white p-5 lg:p-7 rounded-2xl flex items-center gap-4 lg:gap-5 shadow-sm"
                style={{ transitionDelay: `${i * 70}ms` }}>
                <V src={b.video} className="w-12 h-12 lg:w-16 lg:h-16" />
                <div className="flex-1">
                  <h3 className="text-[15px] lg:text-[18px] font-bold text-[#1A1918]">{b.title}</h3>
                  <p className="text-[13px] lg:text-[15px] text-[#6B6966]">{b.desc}</p>
                </div>
                <span className="text-[15px] lg:text-[18px] font-bold text-[#4CAF50] shrink-0">{b.highlight}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section className="relative overflow-hidden px-6 py-16 sm:py-24 lg:py-32 text-center"
        style={{ background: 'linear-gradient(180deg, #FFE8D8, #FFD4C4)' }}>

        {/* CTA 배경 블롭 */}
        <div className="blob-1 pointer-events-none absolute -top-10 -left-10 w-56 h-56 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #FFB8A0 0%, transparent 70%)' }} />
        <div className="blob-2 pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #FFDBB5 0%, transparent 70%)' }} />

        <div className="max-w-xl mx-auto relative">
          <div ref={ctaVideoRef} className="parallax-layer reveal-scale rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(232,147,122,0.2)] max-w-[280px] lg:max-w-[360px] mx-auto mb-8 lg:mb-12">
            <video src="/images/illustrations/hero2.webm" autoPlay loop muted playsInline className="w-full object-cover" />
          </div>
          <h2 className="reveal text-[22px] sm:text-[28px] lg:text-[36px] font-bold text-[#1A1918] mb-3 lg:mb-5 leading-tight">
            오늘도 잘 하고 있어요.<br />도담이 옆에 있을게요.
          </h2>
          <p className="reveal reveal-d1 text-[14px] lg:text-[17px] text-[#6B6966] mb-8 lg:mb-10">가입도, 사용도 무료예요</p>
          <div className="reveal reveal-d2 flex flex-col items-center gap-3">
            <Link href="/onboarding"
              className="cta-glow w-full max-w-xs lg:max-w-sm px-9 py-4 lg:py-5 rounded-full font-semibold text-white text-center text-[16px] lg:text-[18px] active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #E8937A, #D47B62)' }}>
              무료로 시작하기
            </Link>
            <Link href="/" className="text-[14px] lg:text-[16px] text-[#6B6966] active:text-[#1A1918]">이미 사용 중이에요</Link>
          </div>
        </div>
      </section>

      {/* ━━━ 앱 다운로드 ━━━ */}
      <section className="px-6 py-12 lg:py-16 bg-[#1A1918] text-center">
        <div className="max-w-xl mx-auto">
          <p className="reveal text-[13px] lg:text-[15px] text-[#9E9A95] mb-3">앱으로 더 편하게</p>
          <h3 className="reveal reveal-d1 text-[18px] lg:text-[24px] font-bold text-white mb-6 lg:mb-8">도담 앱 다운로드</h3>
          <div className="reveal reveal-d2 flex items-center justify-center gap-4">
            <a href="#" className="inline-flex items-center gap-2.5 px-5 py-3 lg:px-6 lg:py-3.5 rounded-xl bg-white text-[#1A1918] active:scale-95 transition-transform">
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="lg:w-6 lg:h-7">
                <path d="M16.52 12.88c-.02-2.56 2.08-3.8 2.18-3.86-1.18-1.74-3.02-1.98-3.68-2-1.56-.16-3.06.92-3.86.92-.8 0-2.04-.9-3.36-.88-1.72.02-3.32 1.02-4.2 2.56-1.8 3.12-.46 7.74 1.28 10.28.86 1.24 1.88 2.62 3.22 2.58 1.28-.06 1.78-.84 3.34-.84 1.56 0 2 .84 3.38.82 1.4-.02 2.28-1.26 3.12-2.5.98-1.44 1.38-2.84 1.4-2.9-.02-.02-2.7-1.04-2.72-4.12h-.1zM13.98 4.82c.7-.88 1.18-2.08 1.04-3.3-1.02.04-2.26.68-2.98 1.54-.66.76-1.24 2-1.08 3.16 1.12.08 2.28-.58 3.02-1.4z" fill="currentColor"/>
              </svg>
              <div className="text-left">
                <p className="text-[10px] lg:text-[11px] leading-none text-[#6B6966]">Download on the</p>
                <p className="text-[14px] lg:text-[16px] font-semibold leading-tight">App Store</p>
              </div>
            </a>
            <a href="#" className="inline-flex items-center gap-2.5 px-5 py-3 lg:px-6 lg:py-3.5 rounded-xl bg-white text-[#1A1918] active:scale-95 transition-transform">
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none" className="lg:w-6 lg:h-7">
                <path d="M1.22.96L11.53 11 1.22 21.04c-.14-.2-.22-.44-.22-.7V1.66c0-.26.08-.5.22-.7z" fill="#4285F4"/>
                <path d="M14.97 7.56L11.53 11l3.44 3.44 3.88-2.18c.44-.24.7-.68.7-1.14 0-.48-.26-.92-.7-1.16l-3.88-2.18-.02-.02.02.02v-.02z" fill="#FBBC04"/>
                <path d="M1.22 21.04c.14.2.34.36.58.44l10.18-5.74L11.53 11 1.22 21.04z" fill="#EA4335"/>
                <path d="M11.98 5.26L1.8.52C1.56.64 1.36.8 1.22.96L11.53 11l.45-.44v-.02l-.02.02.02-5.3z" fill="#34A853"/>
              </svg>
              <div className="text-left">
                <p className="text-[10px] lg:text-[11px] leading-none text-[#6B6966]">GET IT ON</p>
                <p className="text-[14px] lg:text-[16px] font-semibold leading-tight">Google Play</p>
              </div>
            </a>
          </div>
          <p className="mt-4 text-[12px] lg:text-[13px] text-[#6B6966]">곧 출시 예정이에요</p>
        </div>
      </section>

      {/* ━━━ 푸터 ━━━ */}
      <footer className="px-6 py-8 bg-[#1A1918] border-t border-[#2E2D2B] text-center">
        <div className="flex items-center justify-center gap-4 mb-3 text-[13px] text-[#6B6966]">
          <Link href="/privacy" className="hover:text-[#9E9A95]">개인정보처리방침</Link>
          <span className="text-[#3A3836]">|</span>
          <Link href="/terms" className="hover:text-[#9E9A95]">이용약관</Link>
        </div>
        <p className="text-[12px] text-[#3A3836]">&copy; 2026 도담</p>
      </footer>
    </div>
  )
}
