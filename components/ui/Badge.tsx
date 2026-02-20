import type { ProductCategory } from "@/types/product";

/* --------------------------------------------------------------------------
   Badge Variant Types
   -------------------------------------------------------------------------- */

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "gold"
  | "accent"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "outline";

type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

/* --------------------------------------------------------------------------
   Variant Style Map
   globals.css의 디자인 토큰 색상을 Tailwind 유틸리티로 직접 매핑
   -------------------------------------------------------------------------- */

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-primary/8 text-primary",
  gold: "bg-secondary/15 text-secondary-dark border border-secondary/30",
  accent: "bg-accent text-primary",
  success: "bg-success/12 text-success-dark",
  error: "bg-error/12 text-error-dark",
  warning: "bg-warning/12 text-warning-dark",
  info: "bg-info/12 text-info-dark",
  outline: "bg-transparent border border-gray-300 text-gray-600",
};

/* --------------------------------------------------------------------------
   Dot Color Map
   각 variant에 맞는 도트 색상 (시맨틱 컬러 기반)
   -------------------------------------------------------------------------- */

const dotStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary",
  secondary: "bg-primary/60",
  gold: "bg-secondary",
  accent: "bg-secondary-dark",
  success: "bg-success",
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-info",
  outline: "bg-gray-400",
};

/* --------------------------------------------------------------------------
   Size Style Map
   -------------------------------------------------------------------------- */

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] py-0.5 px-2",
  md: "text-xs py-1 px-2.5",
};

/* --------------------------------------------------------------------------
   Badge Component
   서버 컴포넌트 — 'use client' 불필요
   기존 globals.css의 .badge CSS 클래스를 사용하지 않고 Tailwind 유틸리티로 직접 구성
   -------------------------------------------------------------------------- */

export function Badge({
  variant = "primary",
  size = "md",
  dot = false,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold leading-none tracking-wide uppercase whitespace-nowrap squircle-xs ${variantStyles[variant]} ${sizeStyles[size]}${className ? ` ${className}` : ""}`}
    >
      {dot && (
        <span
          className={`shrink-0 size-1.5 rounded-full ${dotStyles[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Category → Badge Variant Mapping
   ProductCategory에 따라 적절한 Badge variant를 자동 반환
   -------------------------------------------------------------------------- */

const categoryVariantMap: Record<ProductCategory, BadgeVariant> = {
  health_functional: "gold",
  general_food: "success",
  cosmetic: "accent",
  medicine: "info",
  nutra_pet: "primary",
  other: "secondary",
};

export function getCategoryBadgeVariant(
  category: ProductCategory,
): BadgeVariant {
  return categoryVariantMap[category];
}

/* --------------------------------------------------------------------------
   Category → Korean Label Mapping
   ProductCategory에 대한 한국어 표시 라벨 반환
   -------------------------------------------------------------------------- */

const categoryLabelMap: Record<ProductCategory, string> = {
  health_functional: "건강기능식품",
  general_food: "일반식품",
  cosmetic: "화장품",
  medicine: "의약품",
  nutra_pet: "반려동물 영양제",
  other: "기타",
};

export function getCategoryLabel(category: ProductCategory): string {
  return categoryLabelMap[category];
}
