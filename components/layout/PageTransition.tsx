'use client';

import { usePathname } from 'next/navigation';
import { useRef, useEffect, useCallback } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/**
 * PageTransition -- 페이지 전환 시 fade 애니메이션 래퍼
 *
 * pathname이 변경될 때마다 children에 fade-out -> fade-in 효과를 적용한다.
 * 최초 마운트 시에도 부드러운 fade-in으로 진입한다.
 * prefers-reduced-motion 설정 시 애니메이션을 건너뛴다.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPathname = useRef(pathname);
  const isFirstRender = useRef(true);

  const animateIn = useCallback(() => {
    const el = containerRef.current;
    if (!el || prefersReducedMotion()) {
      if (el) gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      el,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
      }
    );
  }, []);

  // 최초 마운트 시 fade-in
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      animateIn();
    }
  }, [animateIn]);

  // pathname 변경 감지 시 fade-in
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      animateIn();
    }
  }, [pathname, animateIn]);

  return (
    <div ref={containerRef} className="will-change-[opacity,transform]">
      {children}
    </div>
  );
}

export default PageTransition;
