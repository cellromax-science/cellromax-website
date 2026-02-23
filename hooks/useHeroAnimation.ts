'use client';

import { useRef, useEffect } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * 히어로 섹션 진입 애니메이션 훅.
 *
 * 페이지 로드 시 다음 순서로 타임라인 애니메이션을 실행한다:
 * 1. 배경 오버레이 (.hero-overlay): opacity 0 -> 적정값 (1.2s)
 * 2. 헤드라인 단어 (.hero-headline .word): y:60, opacity:0 -> 0, stagger 0.08 (0.7s, -=0.6)
 * 3. 서브헤드라인 (.hero-subheadline): y:30, opacity:0 -> 0 (0.6s, -=0.3)
 * 4. CTA 버튼 (.hero-cta): y:20, opacity:0 -> 0, stagger 0.15 (0.5s, -=0.2)
 * 5. 스크롤 힌트 (.hero-scroll-hint): opacity:0 -> 1 (0.5s, +=0.3)
 * 6. 스크롤 힌트 반복 바운스: y:10, repeat:-1, yoyo:true (1.2s, delay:2.5)
 *
 * containerRef를 반환하므로 히어로 섹션의 루트 요소에 연결한다.
 * 언마운트 시 gsap.context().revert()로 모든 애니메이션과 ScrollTrigger를 정리한다.
 * prefers-reduced-motion 설정 시 모든 요소를 즉시 표시한다.
 *
 * @example
 * ```tsx
 * function HeroSection() {
 *   const containerRef = useHeroAnimation();
 *   return (
 *     <section ref={containerRef} className="hero">
 *       <div className="hero-overlay" />
 *       <div className="hero-content">
 *         <h1 className="hero-headline">
 *           <span className="word">Welcome</span>
 *           <span className="word">to</span>
 *           <span className="word">Cellromax</span>
 *         </h1>
 *         <p className="hero-subheadline">Science for Life</p>
 *         <div className="hero-cta">
 *           <button>Learn More</button>
 *           <button>Contact Us</button>
 *         </div>
 *         <div className="hero-scroll-hint">Scroll Down</div>
 *       </div>
 *     </section>
 *   );
 * }
 * ```
 */
export function useHeroAnimation() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 접근성: 모션 감소 설정 시 모든 요소를 즉시 표시
    if (prefersReducedMotion()) {
      const targets = container.querySelectorAll(
        '.hero-overlay, .hero-headline .word, .hero-subheadline, .hero-cta, .hero-scroll-hint'
      );
      targets.forEach((el) => {
        gsap.set(el, { opacity: 1, y: 0, x: 0 });
      });
      return;
    }

    // gsap.context로 컨테이너 스코프 내 모든 애니메이션을 관리
    const ctx = gsap.context(() => {
      // 초기 상태 설정 — 애니메이션 시작 전 모든 요소를 숨김
      gsap.set('.hero-overlay', { opacity: 0 });
      gsap.set('.hero-headline .word', { y: 60, opacity: 0 });
      gsap.set('.hero-subheadline', { y: 30, opacity: 0 });
      gsap.set('.hero-cta', { y: 20, opacity: 0 });
      gsap.set('.hero-scroll-hint', { opacity: 0 });

      // 메인 타임라인 생성
      const tl = gsap.timeline({
        defaults: {
          ease: 'power3.out',
        },
      });

      // 1. 배경 오버레이 페이드인
      tl.to('.hero-overlay', {
        opacity: 1,
        duration: 1.2,
        ease: 'power2.inOut',
      });

      // 2. 헤드라인 단어별 순차 등장
      tl.to(
        '.hero-headline .word',
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
        },
        '-=0.6'
      );

      // 3. 서브헤드라인 등장
      tl.to(
        '.hero-subheadline',
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power3.out',
        },
        '-=0.3'
      );

      // 4. CTA 버튼 순차 등장
      tl.to(
        '.hero-cta',
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.15,
          ease: 'power3.out',
        },
        '-=0.2'
      );

      // 5. 스크롤 힌트 페이드인
      tl.to(
        '.hero-scroll-hint',
        {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        },
        '+=0.3'
      );

      // 6. 스크롤 힌트 반복 바운스 (독립 트윈)
      gsap.to('.hero-scroll-hint', {
        y: 10,
        repeat: -1,
        yoyo: true,
        duration: 1.2,
        ease: 'sine.inOut',
        delay: 2.5,
      });
    }, container); // scope: container 내부의 셀렉터만 대상으로 한다

    return () => {
      ctx.revert();
    };
  }, []);

  return containerRef;
}

export default useHeroAnimation;
