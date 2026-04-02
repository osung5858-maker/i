'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Magnetic from '@/components/effects/Magnetic'
import ScrollProgress from '@/components/effects/ScrollProgress'

// 카드 리스트 전용 stagger: 섹션 진입 시 delay ms 간격으로 순차 is-visible 추가
function useStaggerCards(ref: React.RefObject<HTMLDivElement | null>, delay: number) {
  useEffect(() => {
    const section = ref.current
    if (!section) return
    const cards = Array.from(section.children) as HTMLElement[]
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cards.forEach((card, i) => setTimeout(() => card.classList.add('is-visible'), i * delay))
          obs.disconnect()
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -60px 0px' }
    )
    obs.observe(section)
    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function V({ src, className = 'w-12 h-12' }: { src: string; className?: string }) {
  return (
    <div className={`rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ maskImage: 'radial-gradient(circle, black 55%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 80%)' }}>
      <video src={src} autoPlay loop muted playsInline preload="none" className="w-full h-full object-cover" />
    </div>
  )
}

export default function LandingPage() {
  // 패럴럭스 대상 refs
  const heroCardRef  = useRef<HTMLDivElement>(null)
  const blobARef     = useRef<HTMLDivElement>(null)  // 바깥 wrapper (JS parallax)
  const blobBRef     = useRef<HTMLDivElement>(null)
  const blobCRef     = useRef<HTMLDivElement>(null)
  const ctaCardRef    = useRef<HTMLDivElement>(null)
  const ctaSectionRef = useRef<HTMLElement>(null)
  // AI 비교 카드 stagger
  const aiCardsRef   = useRef<HTMLDivElement>(null)
  // 정부지원 카드 stagger
  const govCardsRef  = useRef<HTMLDivElement>(null)

  // ── 패럴럭스 ──
  useEffect(() => {
    const container = document.getElementById('landing-scroll')
    if (!container) return

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const sy = container.scrollTop
        // hero 영상: 스크롤 22% 속도 → 배경보다 천천히 올라가는 느낌
        if (heroCardRef.current)
          heroCardRef.current.style.transform = `translateY(${sy * 0.22}px)`
        // blobs: 각기 다른 속도 (CSS 부유 애니메이션은 inner div에 있어서 충돌 없음)
        if (blobARef.current)
          blobARef.current.style.transform = `translateY(${sy * 0.14}px)`
        if (blobBRef.current)
          blobBRef.current.style.transform = `translateY(${sy * 0.08}px)`
        if (blobCRef.current)
          blobCRef.current.style.transform = `translateY(${sy * 0.05}px)`
        // CTA 영상: 섹션 기준 상대 스크롤로 계산 (절대 scrollTop 쓰면 하단에서 과도하게 밀림)
        if (ctaCardRef.current && ctaSectionRef.current) {
          const relY = Math.max(0, sy - ctaSectionRef.current.offsetTop)
          ctaCardRef.current.style.transform = `translateY(-${relY * 0.06}px)`
        }
        ticking = false
      })
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // ── 스크롤 리빌 ──
  // threshold 0.22 + rootMargin -100px: 요소가 뷰포트 안에 충분히 들어왔을 때만 트리거
  useEffect(() => {
    const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale')
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible')
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.22, rootMargin: '0px 0px -100px 0px' }
    )
    targets.forEach(el => observer.observe(el))

    // 폴백: 5초 후 현재 화면 안에 있는 요소만 강제 표시 (화면 밖 요소는 건드리지 않음)
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

  useStaggerCards(aiCardsRef, 130)
  useStaggerCards(govCardsRef, 110)

  return (
    <div className="w-full min-h-[100dvh]">
      <ScrollProgress />

      {/* ━━━ 히어로 ━━━ */}
      {/* overflow: clip — JS clip과 달리 scroll container를 만들지 않으면서 클리핑 */}
      <section className="relative text-center" style={{
        background: 'linear-gradient(180deg, #FFF8F3 0%, #FFE8D8 50%, #FFD4C4 100%)',
        overflow: 'clip',
      }}>

        {/* 배경 블롭 — outer div: JS parallax / inner div: CSS 부유 애니메이션 (분리!) */}
        <div ref={blobARef} className="parallax-layer pointer-events-none absolute -top-16 -right-16 w-72 h-72">
          <div className="blob-1 w-full h-full rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, #FFB8A0 0%, transparent 70%)' }} />
        </div>
        <div ref={blobBRef} className="parallax-layer pointer-events-none absolute top-1/3 -left-20 w-64 h-64">
          <div className="blob-2 w-full h-full rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #FFDBB5 0%, transparent 70%)' }} />
        </div>
        <div ref={blobCRef} className="parallax-layer pointer-events-none absolute bottom-10 right-10 w-40 h-40">
          <div className="blob-3 w-full h-full rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #FFD4C4 0%, transparent 70%)' }} />
        </div>

        {/* 뱃지 */}
        <div className="hero-badge pt-10 lg:pt-14 flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-caption font-semibold text-[#D47B62] bg-white/70 backdrop-blur-sm border border-[#FFD4C4]">
            ✨ AI 육아 파트너
          </span>
        </div>

        {/* 히어로 영상 — parallax-layer는 패럴럭스 전용, 카드는 그 안에 */}
        <div ref={heroCardRef} className="parallax-layer w-full max-w-md lg:max-w-2xl mx-auto px-6 pt-6 lg:pt-10">
          <div className="hero-video rounded-3xl lg:rounded-[32px] overflow-hidden shadow-[0_12px_48px_rgba(232,147,122,0.30)]">
            <video src="/images/illustrations/hero1.webm" autoPlay loop muted playsInline className="w-full object-cover" />
          </div>
        </div>

        <div className="max-w-3xl mx-auto relative px-6 pt-10 lg:pt-14 pb-16 lg:pb-32">
          <h1 className="hero-title text-[26px] sm:text-[40px] lg:text-[52px] font-bold text-primary mb-4 lg:mb-6 leading-[1.3]" style={{ fontFamily: 'var(--font-display)' }}>
            기록만 해도,<br />
            <span className="text-[#D47B62]">AI가 먼저 챙겨줘요.</span>
          </h1>
          <p className="hero-sub text-subtitle sm:text-[17px] lg:text-heading-2 text-secondary mb-8 lg:mb-10 leading-relaxed">
            임신 준비부터 육아까지<br />
            아침마다 오늘 할 일을 알려주는 AI 파트너
          </p>
          <div className="hero-cta">
            <Magnetic strength={0.15}>
              <Link
                href="/onboarding"
                className="cta-glow inline-block px-9 py-4 lg:px-12 lg:py-5 rounded-full font-semibold text-white text-subtitle lg:text-heading-3 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #E8937A, #D47B62)' }}
                aria-label="도담 앱 무료로 시작하기">
                무료로 시작하기
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* ━━━ 기본기 ━━━ */}
      <section className="px-6 py-16 sm:py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="reveal text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            다른 앱에서 하던 것, 당연히 다 돼요
          </h2>
          <p className="reveal reveal-d1 text-center text-body-emphasis lg:text-subtitle text-secondary mb-12 lg:mb-16">
            수유 · 수면 · 성장 · 이유식 — 기본은 확실하게
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { video: '/images/illustrations/t3.webm', title: '수유·수면 기록', desc: 'FAB 한 번으로 바로 기록', d: '' },
              { video: '/images/illustrations/h3.webm', title: '성장 차트', desc: '표준 백분위 비교', d: 'reveal-d1' },
              { video: '/images/illustrations/e2.webm', title: '발달 마일스톤', desc: '월령별 첫 순간 체크', d: 'reveal-d2' },
              { video: '/images/illustrations/f4.webm', title: '이유식 가이드', desc: '단계별 식재료·알레르기', d: 'reveal-d3' },
            ].map(f => (
              <div key={f.title} className={`reveal-scale ${f.d} p-5 lg:p-7 rounded-2xl bg-[#FAFAFA] border border-[#F0EDE8] text-center`}>
                <V src={f.video} className="w-14 h-14 lg:w-18 lg:h-18 mx-auto mb-3 lg:mb-4" />
                <h3 className="text-subtitle lg:text-heading-3 text-primary mb-1">{f.title}</h3>
                <p className="text-body lg:text-subtitle text-tertiary">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ AI 차별점 ━━━ */}
      <section className="px-6 py-16 sm:py-20 lg:py-28" style={{ background: 'linear-gradient(180deg, #FFF8F3 0%, #FFF0E8 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            앱 열면 <span className="text-[#D47B62]">AI가 먼저</span> 알려줘요
          </h2>
          <p className="reveal reveal-d1 text-center text-body-emphasis lg:text-subtitle text-secondary mb-12 lg:mb-16">
            뭘 해야 할지 고민할 필요 없어요. 도담이 먼저 챙겨줄게요.
          </p>
          <div ref={aiCardsRef} className="space-y-4 lg:space-y-5">
            {[
              { video: '/images/illustrations/t3.webm', before: '"오늘 뭘 해야 하지?" 앱을 켜도 막막함', after: '아침마다 AI 브리핑으로 오늘의 수유·수면·예방접종 일정을 먼저 알려줘요', dir: 'left' },
              { video: '/images/illustrations/t3.webm', before: '"다음 수유 언제지?" 매번 시간 계산', after: 'AI가 패턴을 분석해서 다음 수유·수면 타이밍을 미리 알려줘요', dir: 'right' },
              { video: '/images/illustrations/f2.webm', before: '"오늘 뭐 해먹이지?" 매일 검색', after: '월령·알레르기·어제 먹은 것까지 고려해 오늘 이유식을 제안해요', dir: 'left' },
              { video: '/images/illustrations/e1.webm', before: '"갑자기 열이 나는데..." 새벽에 물어볼 곳 없음', after: '24시간 AI 육아 SOS — 증상 체크리스트와 대응법을 바로 알려줘요', dir: 'right' },
              { video: '/images/illustrations/h3.webm', before: '"잘 크고 있는 건지..." 수치만 보고 불안', after: '검진표를 찍으면 AI가 해석해주고, 성장 급등기·둔화기를 알려줘요', dir: 'left' },
            ].map((item, i) => (
              <div key={item.before}
                className={`${item.dir === 'left' ? 'stagger-l' : 'stagger-r'} bg-white rounded-2xl p-5 lg:p-7 border border-[#F0EDE8]`}>
                <div className="flex items-start gap-4 lg:gap-5">
                  <V src={item.video} className="w-12 h-12 lg:w-16 lg:h-16 mt-0.5" />
                  <div className="flex-1">
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
      <section className="px-6 py-16 sm:py-20 lg:py-28 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3" style={{ fontFamily: 'var(--font-display)' }}>지금 어떤 단계에 계세요?</h2>
          <p className="reveal reveal-d1 text-center text-body-emphasis lg:text-subtitle text-secondary mb-12 lg:mb-16">단계마다 딱 필요한 것만, AI가 먼저 챙겨줘요</p>
          <div className="space-y-3 lg:space-y-4">
            {[
              { bg: 'from-[#FFE0EC] to-[#FFF0F5]', video: '/images/illustrations/onboarding-preparing.webm', label: '아기를 기다리고 있어요', desc: '배란일 · 가임기 알림 · 마음 체크 · AI 건강 코치', d: '' },
              { bg: 'from-[#FFE8D0] to-[#FFF8F0]', video: '/images/illustrations/onboarding-pregnant.webm', label: '배 속에 아기가 자라고 있어요', desc: '주차별 태아 성장 · 검진 일정 관리 · AI 맞춤 가이드', d: 'reveal-d1' },
              { bg: 'from-[#D5F0E0] to-[#F0FAF4]', video: '/images/illustrations/onboarding-parenting.webm', label: '우리 아이를 키우고 있어요', desc: '수유·수면 기록 · AI 아침 브리핑 · 성장 리포트 · 육아 SOS', d: 'reveal-d2' },
            ].map(m => (
              <div key={m.label} className={`reveal-scale ${m.d} bg-gradient-to-r ${m.bg} p-5 lg:p-7 rounded-2xl flex items-center gap-4 lg:gap-6`}>
                <V src={m.video} className="w-16 h-16 lg:w-20 lg:h-20" />
                <div>
                  <h3 className="text-subtitle lg:text-heading-3 text-primary mb-1">{m.label}</h3>
                  <p className="text-body lg:text-subtitle text-secondary leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 이런 것도 돼요 ━━━ */}
      <section className="px-6 py-16 sm:py-20 lg:py-28 bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3" style={{ fontFamily: 'var(--font-display)' }}>이런 것도 돼요</h2>
          <p className="reveal reveal-d1 text-center text-body-emphasis lg:text-subtitle text-secondary mb-12 lg:mb-16">육아의 크고 작은 순간들을 함께해요</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            {[
              { video: '/images/illustrations/f2.webm', title: '"검진 결과가 무슨 뜻이야?"', desc: '검진결과표 사진 한 장, AI가 쉽게 풀어줘요', d: '' },
              { video: '/images/illustrations/t5.webm', title: '"이 이름, 괜찮을까?"', desc: 'AI 추천 · 음양오행 · 한자 획수 분석', d: 'reveal-d1' },
              { video: '/images/illustrations/t4.webm', title: '"받을 수 있는 지원금이 있대"', desc: '부모급여·아동수당·보육료 혜택 한눈에', d: 'reveal-d2' },
              { video: '/images/illustrations/e1.webm', title: '"예방접종 언제 맞혀야 하지?"', desc: '스케줄 알림 · 완료 체크 · 부작용 안내', d: 'reveal-d3' },
            ].map(h => (
              <div key={h.title} className={`reveal ${h.d} flex items-center gap-4 lg:gap-5 p-5 lg:p-6 rounded-2xl border border-[#F0EDE8] bg-white`}>
                <V src={h.video} className="w-12 h-12 lg:w-16 lg:h-16" />
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
      <section className="px-6 py-16 sm:py-20 lg:py-28" style={{ background: 'linear-gradient(180deg, #F0FAF4, #E8F5EE)' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="reveal text-center text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            몰라서 못 받는 돈, 여기 다 있어요
          </h2>
          <p className="reveal reveal-d1 text-center text-body-emphasis lg:text-subtitle text-secondary mb-12 lg:mb-16">받을 수 있는 혜택을 한눈에</p>
          <div className="reveal mb-6 lg:mb-8 p-5 lg:p-7 rounded-2xl text-center"
            style={{ background: 'linear-gradient(135deg, #FFE8D8, #FFDBB5)' }}>
            <V src="/images/illustrations/celebration-hero.webm" className="w-14 h-14 lg:w-18 lg:h-18 mx-auto mb-3" />
            <h3 className="text-subtitle lg:text-heading-2 text-primary mb-1">출산축하 혜택, 챙기셨나요?</h3>
            <p className="text-body lg:text-subtitle text-secondary leading-relaxed">
              지자체별 출산축하금 · 산후조리비 · 축하박스까지<br />
              도담에서 내가 받을 수 있는 혜택을 알려드려요
            </p>
          </div>
          <div ref={govCardsRef} className="space-y-3 lg:space-y-4">
            {[
              { video: '/images/illustrations/t4.webm', title: '부모급여', highlight: '월 최대 100만원', desc: '0세 월 100만원 · 1세 월 50만원' },
              { video: '/images/illustrations/h1.webm', title: '첫만남이용권', highlight: '200만원', desc: '출생아 1인당 바우처 지급' },
              { video: '/images/illustrations/e2.webm', title: '아동수당', highlight: '월 10만원', desc: '만 8세 미만 매월 지급' },
              { video: '/images/illustrations/celebration-hero.webm', title: '출산축하박스', highlight: '무료 지원', desc: '지자체별 출산 선물 꾸러미 · 지역마다 상이' },
              { video: '/images/illustrations/e1.webm', title: '산후조리비', highlight: '최대 200만원', desc: '건강보험 산후조리원 이용 지원' },
            ].map((b) => (
              <div key={b.title}
                className="stagger-l bg-white p-5 lg:p-7 rounded-2xl flex items-center gap-4 lg:gap-5 shadow-sm">
                <V src={b.video} className="w-12 h-12 lg:w-16 lg:h-16" />
                <div className="flex-1">
                  <h3 className="text-subtitle lg:text-heading-3 text-primary">{b.title}</h3>
                  <p className="text-body lg:text-subtitle text-secondary">{b.desc}</p>
                </div>
                <span className="text-subtitle lg:text-heading-3 text-[#4CAF50] shrink-0">{b.highlight}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section ref={ctaSectionRef} className="relative px-6 py-16 sm:py-24 lg:py-32 text-center" style={{
        background: 'linear-gradient(180deg, #FFE8D8, #FFD4C4)',
        overflow: 'clip',
      }}>
        <div className="blob-1 pointer-events-none absolute -top-10 -left-10 w-56 h-56 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #FFB8A0 0%, transparent 70%)' }} />
        <div className="blob-2 pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #FFDBB5 0%, transparent 70%)' }} />

        <div className="max-w-xl mx-auto relative">
          {/* outer: parallax ref만 / inner: reveal 애니메이션 (분리 — JS transform 충돌 방지) */}
          <div ref={ctaCardRef} className="parallax-layer max-w-[280px] lg:max-w-[360px] mx-auto mb-8 lg:mb-12">
            <div className="reveal-scale rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(232,147,122,0.2)]">
              <video src="/images/illustrations/hero2.webm" autoPlay loop muted playsInline className="w-full object-cover" />
            </div>
          </div>
          <h2 className="reveal text-heading-2 sm:text-heading-1 lg:text-display font-bold text-primary mb-3 lg:mb-5 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            오늘도 잘 하고 있어요.<br />도담이 옆에 있을게요.
          </h2>
          <p className="reveal reveal-d1 text-body-emphasis lg:text-[17px] text-secondary mb-8 lg:mb-10">가입도, 사용도 무료예요</p>
          <div className="flex flex-col items-center gap-3">
            <Magnetic strength={0.15}>
              <Link
                href="/onboarding"
                className="cta-glow w-full max-w-xs lg:max-w-sm px-9 py-4 lg:py-5 rounded-full font-semibold text-white text-center text-subtitle lg:text-heading-3 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #E8937A, #D47B62)' }}
                aria-label="도담 앱 무료로 시작하기 - CTA">
                무료로 시작하기
              </Link>
            </Magnetic>
            <Link href="/" className="text-body-emphasis lg:text-subtitle text-secondary active:text-primary">이미 사용 중이에요</Link>
          </div>
        </div>
      </section>

      {/* ━━━ 앱 다운로드 ━━━ */}
      <section className="px-6 py-12 lg:py-16 bg-[#1A1918] text-center">
        <div className="max-w-xl mx-auto">
          <p className="reveal text-body lg:text-subtitle text-tertiary mb-3">앱으로 더 편하게</p>
          <h3 className="reveal reveal-d1 text-heading-3 lg:text-heading-1 text-white mb-6 lg:mb-8">도담 앱 다운로드</h3>
          <div className="flex items-center justify-center gap-4">
            <a href="#" className="inline-flex items-center gap-2.5 px-5 py-3 lg:px-6 lg:py-3.5 rounded-xl bg-white text-primary active:scale-95 transition-transform">
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="lg:w-6 lg:h-7">
                <path d="M16.52 12.88c-.02-2.56 2.08-3.8 2.18-3.86-1.18-1.74-3.02-1.98-3.68-2-1.56-.16-3.06.92-3.86.92-.8 0-2.04-.9-3.36-.88-1.72.02-3.32 1.02-4.2 2.56-1.8 3.12-.46 7.74 1.28 10.28.86 1.24 1.88 2.62 3.22 2.58 1.28-.06 1.78-.84 3.34-.84 1.56 0 2 .84 3.38.82 1.4-.02 2.28-1.26 3.12-2.5.98-1.44 1.38-2.84 1.4-2.9-.02-.02-2.7-1.04-2.72-4.12h-.1zM13.98 4.82c.7-.88 1.18-2.08 1.04-3.3-1.02.04-2.26.68-2.98 1.54-.66.76-1.24 2-1.08 3.16 1.12.08 2.28-.58 3.02-1.4z" fill="currentColor"/>
              </svg>
              <div className="text-left">
                <p className="text-label lg:text-label leading-none text-secondary">Download on the</p>
                <p className="text-body-emphasis lg:text-subtitle font-semibold leading-tight">App Store</p>
              </div>
            </a>
            <a href="#" className="inline-flex items-center gap-2.5 px-5 py-3 lg:px-6 lg:py-3.5 rounded-xl bg-white text-primary active:scale-95 transition-transform">
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none" className="lg:w-6 lg:h-7">
                <path d="M1.22.96L11.53 11 1.22 21.04c-.14-.2-.22-.44-.22-.7V1.66c0-.26.08-.5.22-.7z" fill="#4285F4"/>
                <path d="M14.97 7.56L11.53 11l3.44 3.44 3.88-2.18c.44-.24.7-.68.7-1.14 0-.48-.26-.92-.7-1.16l-3.88-2.18-.02-.02.02.02v-.02z" fill="#FBBC04"/>
                <path d="M1.22 21.04c.14.2.34.36.58.44l10.18-5.74L11.53 11 1.22 21.04z" fill="#EA4335"/>
                <path d="M11.98 5.26L1.8.52C1.56.64 1.36.8 1.22.96L11.53 11l.45-.44v-.02l-.02.02.02-5.3z" fill="#34A853"/>
              </svg>
              <div className="text-left">
                <p className="text-label lg:text-label leading-none text-secondary">GET IT ON</p>
                <p className="text-body-emphasis lg:text-subtitle font-semibold leading-tight">Google Play</p>
              </div>
            </a>
          </div>
          <p className="mt-4 text-caption lg:text-body text-secondary">곧 출시 예정이에요</p>
        </div>
      </section>

      {/* ━━━ 푸터 ━━━ */}
      <footer className="px-6 py-8 bg-[#1A1918] border-t border-[#2E2D2B] text-center">
        <div className="flex items-center justify-center gap-4 mb-3 text-body text-secondary">
          <Link href="/privacy" className="hover:text-tertiary">개인정보처리방침</Link>
          <span className="text-[#3A3836]">|</span>
          <Link href="/terms" className="hover:text-tertiary">이용약관</Link>
        </div>
        <p className="text-caption text-[#3A3836]">&copy; 2026 도담</p>
      </footer>
    </div>
  )
}
