'use client';

import { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScrollFadeOptions {
  /** 등장 방향. 'up' | 'left' | 'right' | 'none' */
  direction?: 'up' | 'left' | 'right' | 'none';
  /** 이동 거리 (px). 기본 40 */
  distance?: number;
  /** 자식 요소 stagger 간격 (초). 0이면 컨테이너 단일 애니메이션. 기본 0 */
  stagger?: number;
  /** ScrollTrigger 시작 시점. 기본 "top 85%" */
  threshold?: string;
  /** 애니메이션 지속 시간 (초). 기본 0.8 */
  duration?: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * 스크롤 시 요소가 페이드인하며 등장하는 애니메이션 훅.
 *
 * - `stagger > 0` 이면 ref 하위의 직접 자식 요소들이 순차적으로 등장한다.
 * - `stagger === 0` (기본) 이면 ref 요소 자체가 하나의 단위로 애니메이션된다.
 * - ScrollTrigger `once: true`로 한 번만 실행된다.
 * - 언마운트 시 GSAP context를 revert하여 메모리 누수를 방지한다.
 * - prefers-reduced-motion 설정 시 애니메이션 없이 즉시 표시한다.
 *
 * @example
 * ```tsx
 * function MySection() {
 *   const ref = useScrollFadeIn<HTMLDivElement>({ direction: 'up', stagger: 0.1 });
 *   return (
 *     <div ref={ref}>
 *       <div>Item 1</div>
 *       <div>Item 2</div>
 *       <div>Item 3</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useScrollFadeIn<T extends HTMLElement = HTMLDivElement>(
  options: ScrollFadeOptions = {}
) {
  const {
    direction = 'up',
    distance = 40,
    stagger = 0,
    threshold = 'top 85%',
    duration = 0.8,
  } = options;

  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 접근성: 모션 감소 설정 시 즉시 표시하고 종료
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, x: 0, y: 0 });
      if (stagger > 0) {
        gsap.set(el.children, { opacity: 1, x: 0, y: 0 });
      }
      return;
    }

    // gsap.context로 스코프 관리 — revert 시 내부 애니메이션 일괄 정리
    const ctx = gsap.context(() => {
      // 방향별 시작 속성 계산
      const fromVars: gsap.TweenVars = { opacity: 0 };

      switch (direction) {
        case 'up':
          fromVars.y = distance;
          break;
        case 'left':
          fromVars.x = -distance;
          break;
        case 'right':
          fromVars.x = distance;
          break;
        case 'none':
          // 방향 이동 없이 opacity만 변경
          break;
      }

      // 애니메이션 대상 결정
      const target = stagger > 0 ? el.children : el;

      gsap.from(target, {
        ...fromVars,
        duration,
        stagger: stagger > 0 ? stagger : undefined,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: threshold,
          once: true,
        },
      });
    }, el); // scope을 el로 지정

    return () => {
      ctx.revert();
    };
  }, [direction, distance, stagger, threshold, duration]);

  return ref;
}

export default useScrollFadeIn;
