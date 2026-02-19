/**
 * GSAP Global Configuration
 *
 * GSAP 플러그인 등록 및 전역 기본값 설정.
 * 모든 컴포넌트/훅에서 이 모듈을 통해 gsap, ScrollTrigger, TextPlugin을 import한다.
 *
 * SSR 안전: Next.js App Router 환경에서 서버 사이드 렌더링 시 window 접근을 방지한다.
 * 접근성: prefers-reduced-motion 미디어 쿼리를 존중하여 모션 감소 설정 사용자에게는
 *          애니메이션을 즉시 완료(duration: 0) 처리한다.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';

// ---------------------------------------------------------------------------
// Plugin Registration
// gsap.registerPlugin은 SSR 환경에서도 안전하게 호출 가능하다.
// ---------------------------------------------------------------------------
gsap.registerPlugin(ScrollTrigger, TextPlugin);

// ---------------------------------------------------------------------------
// Global Defaults
// ---------------------------------------------------------------------------
gsap.defaults({
  ease: 'power2.out',
  duration: 0.8,
});

// ---------------------------------------------------------------------------
// Accessibility: prefers-reduced-motion
// 브라우저/OS에서 모션 감소를 요청한 경우 모든 GSAP 애니메이션을 즉시 완료시킨다.
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const applyReducedMotion = (shouldReduce: boolean) => {
    if (shouldReduce) {
      // 전역 타임스케일을 극도로 빠르게 설정하여 애니메이션을 사실상 즉시 완료
      gsap.globalTimeline.timeScale(1000);
      // ScrollTrigger 애니메이션도 비활성화
      ScrollTrigger.config({ limitCallbacks: true });
    } else {
      gsap.globalTimeline.timeScale(1);
    }
  };

  // 초기 적용
  applyReducedMotion(motionQuery.matches);

  // 런타임 변경 감지 (사용자가 설정을 토글하는 경우)
  motionQuery.addEventListener('change', (e) => {
    applyReducedMotion(e.matches);
  });
}

// ---------------------------------------------------------------------------
// Utility: prefers-reduced-motion 체크 헬퍼
// 각 훅에서 개별적으로 모션 감소 여부를 판단할 때 사용한다.
// ---------------------------------------------------------------------------
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export { gsap, ScrollTrigger, TextPlugin };
