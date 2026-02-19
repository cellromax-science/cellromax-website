/* ==========================================================================
   Skeleton Component — Cellromax Design System

   콘텐츠 로딩 중 표시하는 플레이스홀더 컴포넌트.
   - 서버 컴포넌트 (상태 불필요) — 'use client' 불필요
   - 4종 variant: text, circular, rectangular, card
   - globals.css의 @keyframes shimmer 활용한 그래디언트 애니메이션
   - squircle 디자인 토큰 적용
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SkeletonVariant = "text" | "circular" | "rectangular" | "card";

interface SkeletonProps {
  /** 스켈레톤 형태 (기본: "rectangular") */
  variant?: SkeletonVariant;
  /** 너비 — CSS 값 문자열 (예: "100%", "200px") */
  width?: string;
  /** 높이 — CSS 값 문자열 (예: "1rem", "200px") */
  height?: string;
  /** 외부에서 추가 클래스 전달 */
  className?: string;
}

// ---------------------------------------------------------------------------
// Style Maps
// ---------------------------------------------------------------------------

/**
 * Variant별 기본 Tailwind + squircle 유틸리티 클래스 맵
 *
 * 각 variant는 기본 크기와 border-radius를 포함한다.
 * width/height props가 전달되면 인라인 스타일로 오버라이드된다.
 */
const variantClasses: Record<SkeletonVariant, string> = {
  text: "h-4 w-full squircle-xs",
  circular: "size-10 rounded-full",
  rectangular: "h-32 w-full squircle-md",
  card: "h-64 w-full squircle-lg shadow-sm",
};

// ---------------------------------------------------------------------------
// Shimmer Style
// ---------------------------------------------------------------------------

/**
 * Shimmer 효과 인라인 스타일
 *
 * globals.css에 정의된 @keyframes shimmer를 활용하여
 * 좌에서 우로 반복 이동하는 하이라이트 그래디언트를 표현한다.
 */
const shimmerStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, transparent 33%, rgba(255,255,255,0.4) 50%, transparent 66%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
};

// ---------------------------------------------------------------------------
// Skeleton Component
// ---------------------------------------------------------------------------

/**
 * 콘텐츠 로딩 플레이스홀더
 *
 * @example
 * ```tsx
 * // 텍스트 줄 스켈레톤
 * <Skeleton variant="text" />
 * <Skeleton variant="text" width="60%" />
 *
 * // 원형 아바타 스켈레톤
 * <Skeleton variant="circular" width="48px" height="48px" />
 *
 * // 이미지 영역 스켈레톤
 * <Skeleton variant="rectangular" height="200px" />
 *
 * // 카드 스켈레톤 (그림자 포함)
 * <Skeleton variant="card" />
 * ```
 */
export function Skeleton({
  variant = "rectangular",
  width,
  height,
  className,
}: SkeletonProps) {
  /* ---- 인라인 스타일 조합: shimmer + width/height 오버라이드 ---- */
  const inlineStyle: React.CSSProperties = {
    ...shimmerStyle,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  /* ---- 클래스 조합: 공통 기반 + variant + 외부 className ---- */
  const classes = [
    "bg-gray-200",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={inlineStyle}
      aria-hidden="true"
      role="presentation"
    />
  );
}

export type { SkeletonProps, SkeletonVariant };
