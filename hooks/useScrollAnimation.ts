'use client';

import { useEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScrollAnimationOptions {
  /** ScrollTrigger 시작 시점. 기본 "top 80%" */
  start?: string;
  /** ScrollTrigger 종료 시점. 기본 "bottom 20%" */
  end?: string;
  /** scrub 활성화 여부 또는 scrub 값. 기본 false */
  scrub?: boolean | number;
  /** 한 번만 실행. 기본 true */
  once?: boolean;
  /** 마커 표시 (개발용). 기본 false */
  markers?: boolean;
  /** 트리거 요소. 미지정 시 ref 요소 자체가 트리거 */
  trigger?: RefObject<HTMLElement | null>;
  /** pin 활성화. 기본 false */
  pin?: boolean;
  /** 커스텀 ID (ScrollTrigger 디버깅용) */
  id?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * 범용 스크롤 애니메이션 훅.
 *
 * gsap.TweenVars를 직접 전달받아 유연한 스크롤 기반 `from` 애니메이션을 구현한다.
 * ScrollTrigger 옵션도 자유롭게 커스터마이즈할 수 있다.
 *
 * - `gsap.from()` 기반: fromVars에 지정한 상태에서 원래 상태로 애니메이션
 * - 언마운트 시 gsap.context를 revert하여 메모리 누수 방지
 * - prefers-reduced-motion 존중
 *
 * @example
 * ```tsx
 * function ParallaxCard() {
 *   const ref = useRef<HTMLDivElement>(null);
 *   useScrollAnimation(ref, { y: 50, opacity: 0, scale: 0.95 }, { start: 'top 80%', scrub: true });
 *   return <div ref={ref}>Parallax Content</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // scrub 스크롤 연동 (스크롤 위치에 따라 진행률 변화)
 * useScrollAnimation(
 *   ref,
 *   { x: -100, rotation: 15 },
 *   { start: 'top bottom', end: 'bottom top', scrub: 1 }
 * );
 * ```
 */
export function useScrollAnimation(
  ref: RefObject<HTMLElement | null>,
  fromVars: gsap.TweenVars,
  options: ScrollAnimationOptions = {}
) {
  const {
    start = 'top 80%',
    end = 'bottom 20%',
    scrub = false,
    once = true,
    markers = false,
    trigger,
    pin = false,
    id,
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 접근성: 모션 감소 설정 시 최종 상태를 즉시 적용
    if (prefersReducedMotion()) {
      gsap.set(el, { clearProps: 'all' });
      return;
    }

    const triggerEl = trigger?.current ?? el;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        ...fromVars,
        scrollTrigger: {
          trigger: triggerEl,
          start,
          end,
          scrub,
          once: scrub ? false : once, // scrub 모드에서는 once 무시
          markers,
          pin,
          id,
        },
      });
    }, el);

    return () => {
      ctx.revert();
    };
  }, [ref, fromVars, start, end, scrub, once, markers, trigger, pin, id]);
}

export default useScrollAnimation;
