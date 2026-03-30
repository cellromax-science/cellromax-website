'use client';

import { usePathname } from 'next/navigation';
import { useRef, useEffect } from 'react';

/**
 * PageTransition -- 페이지 전환 시 fade 애니메이션 래퍼
 *
 * pathname이 변경될 때마다 children에 CSS fade-in 효과를 적용한다.
 * 최초 마운트 시에도 부드러운 fade-in으로 진입한다.
 * prefers-reduced-motion 설정 시 CSS가 자동으로 애니메이션을 건너뛴다.
 *
 * 순수 CSS 구현 — GSAP 미사용으로 초기 번들 크기 절감.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPathname = useRef(pathname);

  // pathname 변경 감지 시 fade-in 재트리거
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      const el = containerRef.current;
      if (!el) return;
      // CSS 애니메이션 재실행: 클래스 제거 → 리플로우 → 클래스 추가
      el.classList.remove('animate-fadeIn');
      void el.offsetWidth;
      el.classList.add('animate-fadeIn');
    }
  }, [pathname]);

  return (
    <div ref={containerRef} className="animate-fadeIn">
      {children}
    </div>
  );
}

export default PageTransition;
