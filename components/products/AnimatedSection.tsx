"use client";

import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

interface AnimatedSectionProps {
  direction?: "up" | "left" | "right" | "none";
  duration?: number;
  className?: string;
  children: React.ReactNode;
}

export function AnimatedSection({
  direction = "up",
  duration = 0.8,
  className,
  children,
}: AnimatedSectionProps) {
  const ref = useScrollFadeIn<HTMLDivElement>({ direction, duration });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
