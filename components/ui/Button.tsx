import { forwardRef } from "react";

/* ==========================================================================
   Button Component — Cellromax Design System

   다형성(Polymorphic) 버튼 컴포넌트.
   - href prop 전달 시 <a> 태그로 렌더링 (링크 버튼)
   - 그 외에는 <button> 태그로 렌더링
   - 5종 variant + 4종 size 조합 지원
   - loading / disabled 상태 처리 포함
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "xs" | "sm" | "md" | "lg";

/** <button> 으로 렌더링될 때의 Props */
type ButtonAsButton = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: undefined;
};

/** <a> 로 렌더링될 때의 Props */
type ButtonAsAnchor = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

type ButtonProps = (ButtonAsButton | ButtonAsAnchor) & {
  /** 버튼 색상 변형 (기본: "primary") */
  variant?: ButtonVariant;
  /** 버튼 크기 (기본: "md") */
  size?: ButtonSize;
  /** 로딩 상태 — 스피너 표시 + 인터랙션 비활성화 */
  loading?: boolean;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 버튼 내부 콘텐츠 */
  children: React.ReactNode;
  /** 외부에서 추가 클래스 전달 */
  className?: string;
};

// ---------------------------------------------------------------------------
// Style Maps
// ---------------------------------------------------------------------------

/**
 * Variant별 Tailwind 클래스 맵
 *
 * 각 variant는 기본 상태, hover 상태, focus-visible 링 색상을 포함한다.
 * hover 시 translateY(-1px) 효과는 공통 클래스에서 처리.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "bg-primary text-white",
    "hover:bg-primary-light hover:shadow-primary",
    "focus-visible:ring-primary",
  ].join(" "),

  secondary: [
    "bg-secondary text-primary",
    "hover:bg-secondary-dark hover:shadow-gold",
    "focus-visible:ring-secondary",
  ].join(" "),

  outline: [
    "border-2 border-primary text-primary bg-transparent",
    "hover:bg-primary hover:text-white hover:border-primary",
    "focus-visible:ring-primary",
  ].join(" "),

  ghost: [
    "bg-transparent text-primary",
    "hover:bg-gray-100",
    "focus-visible:ring-primary",
  ].join(" "),

  danger: [
    "bg-error text-white",
    "hover:bg-error-dark",
    "focus-visible:ring-error",
  ].join(" "),
};

/**
 * Size별 Tailwind + squircle 유틸리티 클래스 맵
 *
 * squircle-* 클래스는 globals.css @layer utilities에 정의된 커스텀 유틸리티.
 */
const sizeClasses: Record<ButtonSize, string> = {
  xs: "text-xs py-1.5 px-3 squircle-xs",
  sm: "text-sm py-2 px-4 squircle-sm",
  md: "text-sm py-2.5 px-5 squircle-md",
  lg: "text-base py-3 px-6 squircle-lg",
};

// ---------------------------------------------------------------------------
// Spinner Component
// ---------------------------------------------------------------------------

/** 로딩 스피너 SVG — 버튼 내부에 인라인으로 표시 */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={["animate-spin", className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Button Component
// ---------------------------------------------------------------------------

/**
 * 범용 버튼 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 Primary 버튼
 * <Button>문의하기</Button>
 *
 * // Secondary + Large 크기
 * <Button variant="secondary" size="lg">자세히 보기</Button>
 *
 * // 링크 버튼 (<a> 태그 렌더링)
 * <Button href="/contact" variant="outline">Contact Us</Button>
 *
 * // 로딩 상태
 * <Button loading>제출 중...</Button>
 * ```
 */
const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    children,
    className,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  /* 클래스 조합: 공통 기반 + variant + size + 상태 + 외부 className */
  const classes = [
    // 공통 기반 스타일
    "inline-flex items-center justify-center gap-2",
    "font-semibold leading-none tracking-wide",
    "whitespace-nowrap select-none",
    "transition-all duration-[150ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
    // hover 시 살짝 위로 올라가는 효과
    "hover:-translate-y-px",
    // active 시 원위치
    "active:translate-y-0",
    // focus-visible 접근성 링
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    // variant + size
    variantClasses[variant],
    sizeClasses[size],
    // disabled / loading 상태
    isDisabled && "pointer-events-none opacity-50 cursor-not-allowed",
    // 외부 className
    className,
  ]
    .filter(Boolean)
    .join(" ");

  /* ---- <a> 태그 렌더링 (href가 존재할 때) ---- */
  if ("href" in rest && rest.href !== undefined) {
    const {
      href,
      ...anchorProps
    } = rest as ButtonAsAnchor;

    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        {...anchorProps}
      >
        {loading && <Spinner />}
        {children}
      </a>
    );
  }

  /* ---- <button> 태그 렌더링 (기본) ---- */
  const buttonProps = rest as ButtonAsButton;

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={buttonProps.type ?? "button"}
      disabled={isDisabled}
      className={classes}
      aria-busy={loading || undefined}
      {...buttonProps}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
