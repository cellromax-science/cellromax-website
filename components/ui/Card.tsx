/* ==========================================================================
   Card Component — Cellromax Design System

   다목적 카드 컨테이너 컴포넌트.
   - 5종 variant: default / primary / gold / outline / glass
   - 3종 size: sm / md / lg (내부 패딩 제어)
   - interactive prop으로 hover 효과 on/off 제어
   - CardHeader, CardBody, CardFooter 서브 컴포넌트 제공
   - 서버 컴포넌트 — 'use client' 불필요
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CardVariant = "default" | "primary" | "gold" | "outline" | "glass";
type CardSize = "sm" | "md" | "lg";

interface CardProps {
  /** 카드 색상 변형 (기본: "default") */
  variant?: CardVariant;
  /** 카드 크기 — 내부 패딩 제어 (기본: "md") */
  size?: CardSize;
  /** hover 효과 활성화 여부 (기본: false) */
  interactive?: boolean;
  /** 카드 내부 콘텐츠 */
  children: React.ReactNode;
  /** 외부에서 추가 클래스 전달 */
  className?: string;
}

interface CardSlotProps {
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Style Maps
// ---------------------------------------------------------------------------

/**
 * Variant별 Tailwind 클래스 맵
 *
 * 각 variant는 배경, 텍스트 색상, 테두리, 그림자를 포함한다.
 * glass variant는 globals.css @layer utilities에 정의된 .glass 유틸리티 클래스를 활용.
 */
const variantClasses: Record<CardVariant, string> = {
  default: [
    "bg-surface-raised border border-gray-100",
    "shadow-sm",
  ].join(" "),

  primary: [
    "bg-primary text-white",
    "border border-primary-light",
    "shadow-primary",
  ].join(" "),

  gold: [
    "bg-secondary text-primary-dark",
    "border border-secondary-dark",
    "shadow-gold",
  ].join(" "),

  outline: [
    "bg-transparent",
    "border-2 border-gray-200",
  ].join(" "),

  glass: "glass",
};

/**
 * Size별 패딩 클래스 맵
 */
const sizeClasses: Record<CardSize, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

/**
 * Interactive(hover) 상태 클래스
 * shadow 증가 + translateY(-2px) 효과
 */
const interactiveClasses =
  "transition-all duration-[250ms] ease-[var(--ease-default)] hover:shadow-md hover:-translate-y-0.5 cursor-pointer";

/**
 * 비인터랙티브 카드에도 부드러운 트랜지션 제공
 */
const staticClasses =
  "transition-shadow duration-[250ms] ease-[var(--ease-default)]";

// ---------------------------------------------------------------------------
// Card Component
// ---------------------------------------------------------------------------

/**
 * 범용 카드 컨테이너
 *
 * @example
 * ```tsx
 * // 기본 카드
 * <Card>
 *   <CardHeader>제목</CardHeader>
 *   <CardBody>본문 내용</CardBody>
 *   <CardFooter>푸터 액션</CardFooter>
 * </Card>
 *
 * // Gold 인터랙티브 카드
 * <Card variant="gold" interactive>
 *   <CardBody>골드 카드 콘텐츠</CardBody>
 * </Card>
 *
 * // Glass 소형 카드
 * <Card variant="glass" size="sm">
 *   <CardBody>유리 효과 카드</CardBody>
 * </Card>
 * ```
 */
export function Card({
  variant = "default",
  size = "md",
  interactive = false,
  children,
  className,
}: CardProps) {
  const classes = [
    "squircle-xl overflow-hidden",
    variantClasses[variant],
    sizeClasses[size],
    interactive ? interactiveClasses : staticClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      {children}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components — CardHeader, CardBody, CardFooter
// ---------------------------------------------------------------------------

/**
 * 카드 상단 영역 — 제목, 뱃지, 액션 버튼 등 배치
 * 하단에 미세한 구분선을 포함하여 시각적 분리
 */
export function CardHeader({ children, className }: CardSlotProps) {
  return (
    <div
      className={`pb-4 mb-4 border-b border-gray-200/60 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/**
 * 카드 본문 영역 — 주요 콘텐츠 배치
 */
export function CardBody({ children, className }: CardSlotProps) {
  return (
    <div className={className ?? ""}>
      {children}
    </div>
  );
}

/**
 * 카드 하단 영역 — CTA 버튼, 링크, 부가 정보 배치
 * 상단에 미세한 구분선을 포함하여 시각적 분리
 */
export function CardFooter({ children, className }: CardSlotProps) {
  return (
    <div
      className={`pt-4 mt-4 border-t border-gray-200/60 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { CardProps, CardVariant, CardSize, CardSlotProps };
