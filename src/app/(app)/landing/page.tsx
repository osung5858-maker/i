'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Magnetic from '@/components/effects/Magnetic'

/* ── 유틸 ── */
function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max) }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

/* ── 비디오 컴포넌트 ── */
function V({ src, className = 'w-12 h-12' }: { src: string; className?: string }) {
  return (
    <div className={`rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ maskImage: 'radial-gradient(circle, black 55%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 80%)' }}>
      <video src={src} autoPlay loop muted playsInline preload="none" className="w-full h-full object-cover" />
    </div>
  )
}

/* ── IntersectionObserver 리빌 훅 ── */
function useRevealObserver() {
  useEffect(() => {
    const scrollRoot = document.getElementById('landing-scroll')
    const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale')
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible')
          observer.unobserve(e.target)
        }
      }),
      { root: scrollRoot, threshold: 0.18, rootMargin: '0px 0px -80px 0px' }
    )
    targets.forEach(el => observer.observe(el))
    const fallback = setTimeout(() => {
      targets.forEach(el => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-visible')
        }
      })
    }, 5000)
    return () => { observer.disconnect(); clearTimeout(fallback) }
  }, [])
}

/* ── stagger 카드 훅 ── */
function useStaggerCards(ref: React.RefObject<HTMLDivElement | null>, delay: number) {
  useEffect(() => {
    const section = ref.current
    if (!section) return
    const scrollRoot = document.getElementById('landing-scroll')
    const cards = Array.from(section.children) as HTMLElement[]
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cards.forEach((card, i) => setTimeout(() => card.classList.add('is-visible'), i * delay))
          obs.disconnect()
        }
      },
      { root: scrollRoot, threshold: 0.18, rootMargin: '0px 0px -60px 0px' }
    )
    obs.observe(section)
    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/* ── 카운터 애니메이션 훅 ── */
function useCountUp(ref: React.RefObject<HTMLElement | null>, target: number, suffix = '') {
  const [value, setValue] = useState('0')
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const scrollRoot = document.getElementById('landing-scroll')
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const duration = 1200
        const startTime = performance.now()
        const step = (now: number) => {
          const elapsed = now - startTime
          const p = clamp(elapsed / duration, 0, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          const current = Math.round(lerp(0, target, eased))
          setValue(current.toLocaleString() + suffix)
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
        obs.disconnect()
      }
    }, { root: scrollRoot, threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, suffix])
  return value
}

/* ── 메인 ── */
export default function LandingPage() {
  const heroVideoRef = useRef<HTMLDivElement>(null)
  const ctaSectionRef = useRef<HTMLElement>(null)
  const ctaVideoRef = useRef<HTMLDivElement>(null)
  const aiCardsRef = useRef<HTMLDivElement>(null)
  const govCardsRef = useRef<HTMLDivElement>(null)

  // 히어로 카운터 (AI 분석 건수 — 자체 서비스 지표)
  const heroCounterRef = useRef<HTMLSpanElement>(null)
  const heroCounter = useCountUp(heroCounterRef, 38247, '건+')

  // 정부지원 카운터 refs
  const counter1Ref = useRef<HTMLSpanElement>(null)
  const counter2Ref = useRef<HTMLSpanElement>(null)
  const counter3Ref = useRef<HTMLSpanElement>(null)
  const counter4Ref = useRef<HTMLSpanElement>(null)

  const counter1 = useCountUp(counter1Ref, 100, '만원')
  const counter2 = useCountUp(counter2Ref, 200, '만원')
  const counter3 = useCountUp(counter3Ref, 10, '만원')
  const counter4 = useCountUp(counter4Ref, 200, '만원')

  useRevealObserver()
  useStaggerCards(aiCardsRef, 130)
  useStaggerCards(govCardsRef, 110)

  /* ── 히어로 비디오 스케일 + CTA 패럴럭스 ── */
  useEffect(() => {
    const container = document.getElementById('landing-scroll')
    if (!container) return

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const sy = container.scrollTop
        const vh = container.clientHeight

        // 히어로 비디오: 스크롤 → scale 0.92→1, border-radius 줄어듦
        if (heroVideoRef.current) {
          const p = clamp(sy / (vh * 0.45), 0, 1)
          const scale = lerp(0.92, 1, p)
          const radius = lerp(32, 16, p)
          heroVideoRef.current.style.transform = `scale(${scale})`
          heroVideoRef.current.style.borderRadius = `${radius}px`
        }

        // CTA 비디오: 부드러운 패럴럭스
        if (ctaVideoRef.current && ctaSectionRef.current) {
          const relY = Math.max(0, sy - ctaSectionRef.current.offsetTop + vh)
          ctaVideoRef.current.style.transform = `translateY(-${relY * 0.05}px)`
        }

        ticking = false
      })
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="w-full min-h-[100dvh]">
      {/* 스크롤 진행 바 */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none">
        <ProgressBar />
      </div>

      {/* ━━━ 히어로 ━━━ */}
      <section className="relative text-center overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #FFF8F3 0%, #FFE8D8 50%, #FFD4C4 100%)' }}>

        {/* 배경 블롭 */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-72 h-72">
          <div className="blob-1 w-full h-full rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, #FFB8A0 0%, transparent 70%)' }} />
        </div>
        <div className="pointer-events-none absolute top-1/3 -left-20 w-64 h-64">
          <div className="blob-2 w-full h-full rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #FFDBB5 0%, transparent 70%)' }} />
        </div>

        {/* 뱃지 */}
        <div className="hero-badge pt-12 lg:pt-16 flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-caption font-semibold text-[#D47B62] bg-white/70 backdrop-blur-sm border border-[#FFD4C4]">
            ✨ AI 육아 파트너
          </span>
        </div>

        {/* 히어로 비디오 — 스크롤시 scale 0.92→1 */}
        <div ref={heroVideoRef} className="hero-video max-w-md lg:max-w-2xl mx-auto px-6 pt-6 lg:pt-10 overflow-hidden"
          style={{ transform: 'scale(0.92)', borderRadius: '32px', willChange: 'transform' }}>
          <div className="rounded-3xl lg:rounded-[32px] overflow-hidden shadow-[0_12px_48px_rgba(232,147,122,0.30)]">
            <video src="/images/illustrations/hero1.webm" autoPlay loop muted playsInline className="w-full object-cover" />
          </div>
        </div>

        {/* 텍스트 */}
        <div className="max-w-3xl mx-auto relative px-6 pt-10 lg:pt-14 pb-16 lg:pb-28">
          <h1 className="hero-title text-[28px] sm:text-[42px] lg:text-[56px] font-bold text-primary mb-4 lg:mb-6 leading-[1.25]"
            style={{ fontFamily: 'var(--font-display)' }}>
            기록만 해도,<br />
            <span className="gradient-text">AI가 먼저 챙겨줘요.</span>
          </h1>
          <p className="hero-sub text-body-emphasis sm:text-subtitle lg:text-heading-3 text-secondary mb-8 lg:mb-10 leading-relaxed">
            임신 준비부터 육아까지<br />
            아침마다 오늘 할 일을 알려주는 AI 파트너
          </p>
          <div className="hero-cta">
            <Magnetic strength={0.15}>
              <Link href="/onboarding"
                className="cta-glow inline-block px-9 py-4 lg:px-12 lg:py-5 rounded-full font-semibold text-white text-subtitle lg:text-heading-3 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #E8937A, #D47B62)' }}
                aria-label="도담 앱 무료로 시작하기">
                무료로 시작하기
              </Link>
            </Magnetic>
          </div>

          {/* AI 분석 카운터 */}
          <div className="mt-10 lg:mt-14 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-sm border border-[#FFD4C4]/50">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="text-[13px] sm:text-[14px] text-secondary">AI가 분석한 육아 기록</span>
            <span ref={heroCounterRef} className="text-[15px] sm:text-[16px] font-bold tabular-nums"
              style={{ color: '#D47B62' }}>
              {heroCounter}
            </span>
          </div>

          {/* 스크롤 힌트 */}
          <div className="mt-8 lg:mt-12 animate-bounce opacity-40">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ━━━ 기본기 ━━━ */}
      <section className="px-6 lg:px-10 py-20 sm:py-24 lg:py-32 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3"
            style={{ fontFamily: 'var(--font-display)' }}>
            다른 앱에서 하던 것, <span className="gradient-text">당연히 다 돼요</span>
          </h2>
          <p className="reveal reveal-d1 text-center text-body-emphasis lg:text-subtitle text-secondary mb-14 lg:mb-20">
            수유 · 수면 · 성장 · 이유식 — 기본은 확실하게
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { video: '/images/illustrations/t3.webm', title: '수유·수면 기록', desc: 'FAB 한 번으로 바로 기록', d: '' },
              { video: '/images/illustrations/h2.webm', title: '성장 차트', desc: '표준 백분위 비교', d: 'reveal-d1' },
              { video: '/images/illustrations/e3.webm', title: '발달 마일스톤', desc: '월령별 첫 순간 체크', d: 'reveal-d2' },
              { video: '/images/illustrations/f4.webm', title: '이유식 가이드', desc: '단계별 식재료·알레르기', d: 'reveal-d3' },
            ].map(f => (
              <div key={f.title} className={`reveal-scale ${f.d} p-5 lg:p-7 rounded-2xl bg-[#FAFAFA] border border-[#F0EDE8] text-center hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow duration-300`}>
                <V src={f.video} className="w-14 h-14 lg:w-18 lg:h-18 mx-auto mb-3 lg:mb-4" />
                <h3 className="text-subtitle lg:text-heading-3 text-primary mb-1">{f.title}</h3>
                <p className="text-body lg:text-subtitle text-tertiary">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ AI 차별점 ━━━ */}
      <section className="px-6 lg:px-10 py-20 sm:py-24 lg:py-32 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #FFF8F3 0%, #FFF0E8 100%)' }}>
        {/* 배경 그라디언트 오브 */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] opacity-15 pointer-events-none morph-bg"
          style={{ background: 'linear-gradient(135deg, #FFB8A0, #FFDBB5, #FFE8D8, #FFB8A0)', borderRadius: '50%', filter: 'blur(80px)' }} />

        <div className="max-w-3xl mx-auto relative">
          <div className="text-center mb-14 lg:mb-20">
            <span className="reveal inline-block px-4 py-1.5 rounded-full text-[11px] lg:text-[13px] font-bold tracking-wider text-[#D47B62] bg-[#FFF0E8] mb-4">
              AI POWERED
            </span>
            <h2 className="reveal text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3"
              style={{ fontFamily: 'var(--font-display)' }}>
              앱 열면 <span className="gradient-text">AI가 먼저</span> 알려줘요
            </h2>
            <p className="reveal reveal-d1 text-body-emphasis lg:text-subtitle text-secondary">
              뭘 해야 할지 고민할 필요 없어요. 도담이 먼저 챙겨줄게요.
            </p>
          </div>

          <div ref={aiCardsRef} className="space-y-4 lg:space-y-5">
            {[
              { video: '/images/illustrations/t1.webm', before: '"오늘 뭘 해야 하지?" 앱을 켜도 막막함', after: '아침마다 AI 브리핑으로 오늘의 수유·수면·예방접종 일정을 먼저 알려줘요', dir: 'left' },
              { video: '/images/illustrations/t2.webm', before: '"다음 수유 언제지?" 매번 시간 계산', after: 'AI가 패턴을 분석해서 다음 수유·수면 타이밍을 미리 알려줘요', dir: 'right' },
              { video: '/images/illustrations/f1.webm', before: '"오늘 뭐 해먹이지?" 매일 검색', after: '월령·알레르기·어제 먹은 것까지 고려해 오늘 이유식을 제안해요', dir: 'left' },
              { video: '/images/illustrations/e4.webm', before: '"갑자기 열이 나는데..." 새벽에 물어볼 곳 없음', after: '24시간 AI 육아 SOS — 증상 체크리스트와 대응법을 바로 알려줘요', dir: 'right' },
              { video: '/images/illustrations/h3.webm', before: '"잘 크고 있는 건지..." 수치만 보고 불안', after: '검진표를 찍으면 AI가 해석해주고, 성장 급등기·둔화기를 알려줘요', dir: 'left' },
            ].map((item) => (
              <div key={item.before}
                className={`${item.dir === 'left' ? 'stagger-l' : 'stagger-r'} relative bg-white/90 backdrop-blur-sm rounded-2xl p-5 lg:p-6 border border-[#F0EDE8] shadow-[0_2px_12px_rgba(232,147,122,0.08)] hover:shadow-[0_8px_28px_rgba(232,147,122,0.15)] transition-shadow duration-300`}>
                <span className="absolute top-3 right-3 lg:top-4 lg:right-4 px-2 py-0.5 rounded-full text-[10px] lg:text-[11px] font-bold tracking-wide text-[#D47B62] bg-[#FFF0E8]">AI</span>
                <div className="flex items-start gap-4 lg:gap-5">
                  <V src={item.video} className="w-12 h-12 lg:w-16 lg:h-16 mt-0.5" />
                  <div className="flex-1 pr-8">
                    <p className="text-body lg:text-subtitle text-[#B5B0AB] line-through mb-2">{item.before}</p>
                    <p className="text-subtitle lg:text-heading-3 font-medium text-primary leading-relaxed">{item.after}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 3모드 ━━━ */}
      <section className="px-6 lg:px-10 py-20 sm:py-24 lg:py-32 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3"
            style={{ fontFamily: 'var(--font-display)' }}>
            지금 어떤 단계에 계세요?
          </h2>
          <p className="reveal reveal-d1 text-center text-body-emphasis lg:text-subtitle text-secondary mb-14 lg:mb-20">
            단계마다 딱 필요한 것만, AI가 먼저 챙겨줘요
          </p>
          <div className="space-y-4 lg:space-y-5">
            {[
              { bg: 'from-[#FFE0EC] to-[#FFF0F5]', video: '/images/illustrations/onboarding-preparing.webm', label: '아기를 기다리고 있어요', desc: '배란일 · 가임기 알림 · 마음 체크 · AI 건강 코치', d: '' },
              { bg: 'from-[#FFE8D0] to-[#FFF8F0]', video: '/images/illustrations/onboarding-pregnant.webm', label: '배 속에 아기가 자라고 있어요', desc: '주차별 태아 성장 · 검진 일정 관리 · AI 맞춤 가이드', d: 'reveal-d1' },
              { bg: 'from-[#D5F0E0] to-[#F0FAF4]', video: '/images/illustrations/onboarding-parenting.webm', label: '우리 아이를 키우고 있어요', desc: '수유·수면 기록 · AI 아침 브리핑 · 성장 리포트 · 육아 SOS', d: 'reveal-d2' },
            ].map(m => (
              <div key={m.label} className={`reveal-scale ${m.d} bg-gradient-to-r ${m.bg} p-6 lg:p-8 rounded-3xl flex items-center gap-5 lg:gap-6 hover:scale-[1.01] transition-transform duration-300`}>
                <V src={m.video} className="w-18 h-18 lg:w-24 lg:h-24" />
                <div className="flex-1">
                  <h3 className="text-subtitle lg:text-heading-2 text-primary mb-1.5 font-semibold">{m.label}</h3>
                  <p className="text-body lg:text-subtitle text-secondary leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 이런 것도 돼요 ━━━ */}
      <section className="px-6 lg:px-10 py-20 sm:py-24 lg:py-32 bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3"
            style={{ fontFamily: 'var(--font-display)' }}>
            이런 것도 돼요
          </h2>
          <p className="reveal reveal-d1 text-center text-body-emphasis lg:text-subtitle text-secondary mb-14 lg:mb-20">
            육아의 크고 작은 순간들을 함께해요
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            {[
              { video: '/images/illustrations/f2.webm', title: '"검진 결과가 무슨 뜻이야?"', desc: '검진결과표 사진 한 장, AI가 쉽게 풀어줘요', color: '#FFF0E8', d: '' },
              { video: '/images/illustrations/t5.webm', title: '"이 이름, 괜찮을까?"', desc: 'AI 추천 · 음양오행 · 한자 획수 분석', color: '#EEF0FF', d: 'reveal-d1' },
              { video: '/images/illustrations/f3.webm', title: '"받을 수 있는 지원금이 있대"', desc: '부모급여·아동수당·보육료 혜택 한눈에', color: '#E8F5EE', d: 'reveal-d2' },
              { video: '/images/illustrations/e1.webm', title: '"예방접종 언제 맞혀야 하지?"', desc: '스케줄 알림 · 완료 체크 · 부작용 안내', color: '#FFF4E6', d: 'reveal-d3' },
            ].map(h => (
              <div key={h.title} className={`reveal ${h.d} flex items-center gap-4 lg:gap-6 p-5 lg:p-7 rounded-2xl border border-[#F0EDE8] bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow duration-300`}>
                <div className="shrink-0 w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center" style={{ background: h.color }}>
                  <V src={h.video} className="w-10 h-10 lg:w-12 lg:h-12" />
                </div>
                <div>
                  <h3 className="text-subtitle lg:text-heading-3 text-primary mb-1">{h.title}</h3>
                  <p className="text-body lg:text-subtitle text-secondary leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 정부 지원 ━━━ */}
      <section className="px-6 lg:px-10 py-20 sm:py-24 lg:py-32 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #F0FAF4 0%, #E8F5EE 50%, #D5F0E0 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14 lg:mb-20">
            <span className="reveal inline-block px-4 py-1.5 rounded-full text-[11px] lg:text-[13px] font-bold tracking-wider text-[#2E8B57] bg-[#E8F5EE] mb-4">
              BENEFITS
            </span>
            <h2 className="reveal text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3"
              style={{ fontFamily: 'var(--font-display)' }}>
              몰라서 못 받는 돈, <span className="text-[#2E8B57]">여기 다 있어요</span>
            </h2>
            <p className="reveal reveal-d1 text-body-emphasis lg:text-subtitle text-secondary">
              받을 수 있는 혜택을 한눈에
            </p>
          </div>

          {/* 히어로 카드 */}
          <div className="reveal mb-8 lg:mb-10 p-6 lg:p-8 rounded-3xl text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #FFE8D8, #FFDBB5)' }}>
            <div className="absolute inset-0 opacity-10 morph-bg"
              style={{ background: 'linear-gradient(135deg, #FFB8A0, #FFDBB5, #FFE8D8, #D5F0E0)' }} />
            <div className="relative">
              <V src="/images/illustrations/celebration-hero.webm" className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4" />
              <h3 className="text-subtitle lg:text-heading-2 text-primary mb-2 font-bold">출산축하 혜택, 챙기셨나요?</h3>
              <p className="text-body lg:text-subtitle text-secondary leading-relaxed">
                지자체별 출산축하금 · 산후조리비 · 축하박스까지<br />
                도담에서 내가 받을 수 있는 혜택을 알려드려요
              </p>
            </div>
          </div>

          {/* 혜택 카드 — 카운터 숫자 */}
          <div ref={govCardsRef} className="space-y-4 lg:space-y-6">
            {[
              { video: '/images/illustrations/t4.webm', title: '부모급여', ref: counter1Ref, value: counter1, desc: '0세 월 100만원 · 1세 월 50만원' },
              { video: '/images/illustrations/h1.webm', title: '첫만남이용권', ref: counter2Ref, value: counter2, desc: '출생아 1인당 바우처 지급' },
              { video: '/images/illustrations/e2.webm', title: '아동수당', ref: counter3Ref, value: counter3, desc: '만 8세 미만 매월 지급' },
              { video: '/images/illustrations/celebration-new-start.webm', title: '출산축하박스', ref: null, value: '무료 지원', desc: '지자체별 출산 선물 꾸러미 · 지역마다 상이' },
              { video: '/images/illustrations/f5.webm', title: '산후조리비', ref: counter4Ref, value: counter4, desc: '건강보험 산후조리원 이용 지원' },
            ].map((b) => (
              <div key={b.title}
                className="stagger-l bg-white/90 backdrop-blur-sm p-5 lg:p-7 rounded-2xl flex items-center gap-4 lg:gap-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                <V src={b.video} className="w-12 h-12 lg:w-16 lg:h-16" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-subtitle lg:text-heading-3 text-primary font-semibold">{b.title}</h3>
                  <p className="text-body lg:text-subtitle text-secondary truncate">{b.desc}</p>
                </div>
                <span ref={b.ref} className="text-subtitle lg:text-heading-3 text-[#2E8B57] font-bold shrink-0 tabular-nums">
                  {b.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 사용자 후기 ━━━ */}
      <section className="px-6 lg:px-10 py-20 sm:py-24 lg:py-32 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="reveal text-center text-[13px] lg:text-[15px] font-bold tracking-wider text-[#D47B62] mb-3">
            REAL REVIEWS
          </p>
          <h2 className="reveal reveal-d1 text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3"
            style={{ fontFamily: 'var(--font-display)' }}>
            부모님들의 솔직 후기
          </h2>
          <p className="reveal reveal-d2 text-center text-body-emphasis lg:text-subtitle text-secondary mb-14 lg:mb-20">
            &ldquo;진작 쓸 걸&rdquo; 이 말이 제일 많아요
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {[
              { name: '윤서맘', period: '육아 5개월차', text: '아침마다 AI 브리핑이 오니까 "오늘 뭐 해야 하지?" 고민이 사라졌어요. 예방접종 알림도 놓칠 뻔한 걸 챙겨줬어요.' },
              { name: '지우아빠', period: '임신 32주', text: '검진 일정 관리가 정말 편해요. 아내랑 같이 쓰는데 파트너 알림이 와서 검진 날 깜빡 안 해요.' },
              { name: '하은맘', period: '준비 중', text: '배란일 계산부터 영양제 체크까지 한 앱에서 다 돼요. 여러 앱 쓰다가 도담으로 정착했어요.' },
            ].map((review, i) => (
              <div key={review.name} className={`reveal ${i > 0 ? `reveal-d${i}` : ''} p-5 lg:p-7 rounded-2xl bg-[#FAFAFA] border border-[#F0EDE8] flex flex-col`}>
                <div className="text-[28px] leading-none text-[#E8937A] mb-2">&ldquo;</div>
                <p className="text-body lg:text-subtitle text-primary leading-relaxed mb-4 flex-1">{review.text}</p>
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-[#F0EDE8]">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFE8D8] to-[#FFD4C4] flex items-center justify-center text-caption font-bold text-[#D47B62]">
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="text-body-emphasis font-medium text-primary">{review.name}</p>
                    <p className="text-caption text-tertiary">{review.period}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section ref={ctaSectionRef} className="relative px-6 lg:px-10 py-20 sm:py-28 lg:py-36 text-center overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #FFE8D8, #FFD4C4, #FFC4B0)' }}>
        <div className="blob-1 pointer-events-none absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #FFB8A0 0%, transparent 70%)' }} />
        <div className="blob-2 pointer-events-none absolute -bottom-16 -right-16 w-64 h-64 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #FFDBB5 0%, transparent 70%)' }} />

        <div className="max-w-xl mx-auto relative">
          <div ref={ctaVideoRef} className="parallax-layer max-w-[260px] lg:max-w-[340px] mx-auto mb-10 lg:mb-14">
            <div className="reveal rounded-[32px] overflow-hidden shadow-[0_12px_48px_rgba(232,147,122,0.25)]">
              <video src="/images/illustrations/hero2.webm" autoPlay loop muted playsInline className="w-full object-cover" />
            </div>
          </div>
          <h2 className="reveal text-heading-2 sm:text-heading-1 lg:text-[44px] font-bold text-primary mb-4 lg:mb-6 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}>
            오늘도 잘 하고 있어요.<br />
            <span className="gradient-text">도담이 옆에 있을게요.</span>
          </h2>
          <p className="reveal reveal-d1 text-body-emphasis lg:text-subtitle text-secondary mb-10 lg:mb-12">가입도, 사용도 무료예요</p>
          <div className="flex flex-col items-center gap-5">
            <Magnetic strength={0.15}>
              <Link href="/onboarding"
                className="cta-glow w-full max-w-xs lg:max-w-sm px-9 py-4 lg:py-5 rounded-full font-semibold text-white text-center text-subtitle lg:text-heading-3 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #E8937A, #D47B62)' }}
                aria-label="도담 앱 무료로 시작하기 - CTA">
                무료로 시작하기
              </Link>
            </Magnetic>
            <Link href="/" className="text-body-emphasis lg:text-subtitle text-secondary hover:text-primary transition-colors">
              이미 사용 중이에요
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ 앱 다운로드 ━━━ */}
      <section className="px-6 py-14 lg:py-20 bg-[#1A1918] text-center">
        <div className="max-w-xl mx-auto">
          <p className="reveal text-body-emphasis lg:text-subtitle text-tertiary mb-3">앱으로 더 편하게</p>
          <h3 className="reveal reveal-d1 text-heading-3 lg:text-heading-2 text-white mb-6 lg:mb-8">도담 앱 다운로드</h3>
          <div className="flex items-center justify-center gap-4">
            <span className="inline-flex items-center gap-2.5 px-5 py-3 lg:px-6 lg:py-3.5 rounded-xl bg-white/10 text-white/60 cursor-default">
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="lg:w-6 lg:h-7">
                <path d="M16.52 12.88c-.02-2.56 2.08-3.8 2.18-3.86-1.18-1.74-3.02-1.98-3.68-2-1.56-.16-3.06.92-3.86.92-.8 0-2.04-.9-3.36-.88-1.72.02-3.32 1.02-4.2 2.56-1.8 3.12-.46 7.74 1.28 10.28.86 1.24 1.88 2.62 3.22 2.58 1.28-.06 1.78-.84 3.34-.84 1.56 0 2 .84 3.38.82 1.4-.02 2.28-1.26 3.12-2.5.98-1.44 1.38-2.84 1.4-2.9-.02-.02-2.7-1.04-2.72-4.12h-.1zM13.98 4.82c.7-.88 1.18-2.08 1.04-3.3-1.02.04-2.26.68-2.98 1.54-.66.76-1.24 2-1.08 3.16 1.12.08 2.28-.58 3.02-1.4z" fill="currentColor"/>
              </svg>
              <div className="text-left">
                <p className="text-label lg:text-label leading-none opacity-60">Coming Soon</p>
                <p className="text-body-emphasis lg:text-subtitle font-semibold leading-tight">App Store</p>
              </div>
            </span>
            <span className="inline-flex items-center gap-2.5 px-5 py-3 lg:px-6 lg:py-3.5 rounded-xl bg-white/10 text-white/60 cursor-default">
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none" className="lg:w-6 lg:h-7">
                <path d="M1.22.96L11.53 11 1.22 21.04c-.14-.2-.22-.44-.22-.7V1.66c0-.26.08-.5.22-.7z" fill="currentColor" opacity="0.6"/>
                <path d="M14.97 7.56L11.53 11l3.44 3.44 3.88-2.18c.44-.24.7-.68.7-1.14 0-.48-.26-.92-.7-1.16l-3.88-2.18-.02-.02.02.02v-.02z" fill="currentColor" opacity="0.6"/>
                <path d="M1.22 21.04c.14.2.34.36.58.44l10.18-5.74L11.53 11 1.22 21.04z" fill="currentColor" opacity="0.6"/>
                <path d="M11.98 5.26L1.8.52C1.56.64 1.36.8 1.22.96L11.53 11l.45-.44v-.02l-.02.02.02-5.3z" fill="currentColor" opacity="0.6"/>
              </svg>
              <div className="text-left">
                <p className="text-label lg:text-label leading-none opacity-60">Coming Soon</p>
                <p className="text-body-emphasis lg:text-subtitle font-semibold leading-tight">Google Play</p>
              </div>
            </span>
          </div>
          <p className="mt-5 text-body-emphasis lg:text-subtitle text-secondary">
            지금은 <Link href="/onboarding" className="text-[#E8937A] font-semibold underline underline-offset-2">웹에서 바로 사용</Link>할 수 있어요
          </p>
        </div>
      </section>

      {/* ━━━ 푸터 ━━━ */}
      <footer className="px-6 py-10 bg-[#1A1918] border-t border-[#2E2D2B] text-center">
        <p className="text-body-emphasis lg:text-subtitle font-medium text-white/40 mb-1">도담</p>
        <p className="text-caption lg:text-body text-white/20 mb-5">AI가 먼저 챙겨주는 스마트 육아 파트너</p>
        <div className="flex items-center justify-center gap-4 mb-4 text-body text-secondary">
          <Link href="/privacy" className="hover:text-tertiary transition-colors">개인정보처리방침</Link>
          <span className="text-[#3A3836]">|</span>
          <Link href="/terms" className="hover:text-tertiary transition-colors">이용약관</Link>
        </div>
        <p className="text-caption text-[#3A3836]">&copy; 2026 도담. All rights reserved.</p>
      </footer>
    </div>
  )
}

/* ── 스크롤 진행 바 (landing-scroll 전용) ── */
function ProgressBar() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = document.getElementById('landing-scroll')
    if (!el || !ref.current) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const p = el.scrollTop / (el.scrollHeight - el.clientHeight)
        if (ref.current) {
          ref.current.style.transform = `scaleX(${clamp(p, 0, 1)})`
          ref.current.style.opacity = (p > 0.01 && p < 0.98) ? '1' : '0'
        }
        ticking = false
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={ref} className="h-full origin-left bg-gradient-to-r from-[#E8937A] to-[#D47B62] transition-opacity duration-300"
      style={{ transform: 'scaleX(0)', opacity: 0 }} />
  )
}
