"use client";

import { useEffect, useRef, useCallback } from "react";
import { create } from "zustand";

/* ==========================================================================
   Toast Component — Cellromax Design System

   전역 토스트 알림 시스템.
   - Zustand 스토어로 전역 상태 관리 (useToastStore)
   - 4종 variant: success / error / warning / info
   - 자동 사라짐 (기본 4초) + progress bar 시각화
   - 우측 상단 고정 위치 (fixed, top-6 right-6)
   - 최대 5개 동시 표시 (초과 시 가장 오래된 것부터 제거)
   - toast() 헬퍼 함수로 간편한 호출 API 제공
   - ToastContainer를 layout.tsx에 한 번만 배치하면 전역에서 사용 가능

   키프레임 의존성:
   - slideInRight, shrinkWidth → globals.css에 정의됨
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  /** 고유 식별자 (자동 생성) */
  id: string;
  /** 토스트 변형 */
  variant: ToastVariant;
  /** 표시 메시지 */
  message: string;
  /** 자동 사라짐 시간 (ms, 기본 4000) */
  duration: number;
}

interface ToastInput {
  variant: ToastVariant;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (input: ToastInput) => string;
  removeToast: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DURATION = 4000;
const MAX_TOASTS = 5;

// ---------------------------------------------------------------------------
// Zustand Store
// ---------------------------------------------------------------------------

let idCounter = 0;

/**
 * 전역 토스트 상태 스토어
 *
 * @example
 * ```tsx
 * const { addToast, removeToast } = useToastStore();
 * addToast({ variant: "success", message: "저장되었습니다." });
 * ```
 */
const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (input) => {
    const id = `toast-${++idCounter}-${Date.now()}`;
    const newToast: ToastItem = {
      id,
      variant: input.variant,
      message: input.message,
      duration: input.duration ?? DEFAULT_DURATION,
    };

    set((state) => {
      const next = [...state.toasts, newToast];
      /* 최대 5개 제한 — 초과 시 가장 오래된 것부터 제거 */
      if (next.length > MAX_TOASTS) {
        return { toasts: next.slice(next.length - MAX_TOASTS) };
      }
      return { toasts: next };
    });

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// ---------------------------------------------------------------------------
// toast() Helper — 간편 호출 API
// ---------------------------------------------------------------------------

/**
 * 토스트 간편 호출 헬퍼 함수
 *
 * @example
 * ```tsx
 * import { toast } from "@/components/ui/Toast";
 *
 * toast.success("저장되었습니다.");
 * toast.error("오류가 발생했습니다.");
 * toast.warning("주의가 필요합니다.");
 * toast.info("새로운 업데이트가 있습니다.");
 * ```
 */
const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ variant: "success", message, duration }),

  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ variant: "error", message, duration }),

  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ variant: "warning", message, duration }),

  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ variant: "info", message, duration }),
};

// ---------------------------------------------------------------------------
// Style Maps
// ---------------------------------------------------------------------------

/**
 * Variant별 컨테이너 스타일 맵
 */
const variantContainerClasses: Record<ToastVariant, string> = {
  success: "bg-success/12 text-success-dark",
  error: "bg-error/12 text-error-dark",
  warning: "bg-warning/12 text-warning-dark",
  info: "bg-info/12 text-info-dark",
};

/**
 * Variant별 progress bar 색상 맵
 */
const variantProgressClasses: Record<ToastVariant, string> = {
  success: "bg-success",
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-info",
};

// ---------------------------------------------------------------------------
// Icon Components — variant별 SVG 아이콘
// ---------------------------------------------------------------------------

/** 체크 원형 — success */
function SuccessIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1.25em"
      height="1.25em"
      aria-hidden="true"
      className="shrink-0 text-success"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** X 원형 — error */
function ErrorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1.25em"
      height="1.25em"
      aria-hidden="true"
      className="shrink-0 text-error"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

/** 느낌표 삼각형 — warning */
function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1.25em"
      height="1.25em"
      aria-hidden="true"
      className="shrink-0 text-warning"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/** i 원형 — info */
function InfoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1.25em"
      height="1.25em"
      aria-hidden="true"
      className="shrink-0 text-info"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/** Variant -> 아이콘 컴포넌트 맵 */
const variantIcons: Record<ToastVariant, () => React.JSX.Element> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

/** 닫기(X) 아이콘 */
function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ToastItem Component — 개별 토스트 아이템
// ---------------------------------------------------------------------------

function ToastItemComponent({ item }: { item: ToastItem }) {
  const { removeToast } = useToastStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const Icon = variantIcons[item.variant];

  /* ---- 퇴장 애니메이션 후 제거 ---- */
  const handleRemove = useCallback(() => {
    /* 퇴장 애니메이션: opacity 0 + 우측으로 슬라이드 */
    if (containerRef.current) {
      containerRef.current.style.opacity = "0";
      containerRef.current.style.transform = "translateX(100%)";
    }
    /* 애니메이션 완료 후 스토어에서 제거 */
    setTimeout(() => {
      removeToast(item.id);
    }, 200);
  }, [item.id, removeToast]);

  /* ---- 자동 사라짐 타이머 ---- */
  useEffect(() => {
    timerRef.current = setTimeout(handleRemove, item.duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [item.duration, handleRemove]);

  /* ---- 개별 토스트 클래스 조합 ---- */
  const containerClasses = [
    "relative overflow-hidden",
    "squircle-md",
    "w-80 max-w-[calc(100vw-3rem)]",
    "shadow-lg",
    "border border-white/20",
    variantContainerClasses[item.variant],
    /* 진입 애니메이션: 우측에서 슬라이드 인 (globals.css @keyframes slideInRight) */
    "animate-[slideInRight_300ms_var(--ease-spring)_both]",
    /* 퇴장 트랜지션 */
    "transition-[opacity,transform] duration-[200ms] ease-[var(--ease-default)]",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={containerRef}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={containerClasses}
    >
      {/* ---- 메인 콘텐츠 영역 ---- */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* 아이콘 */}
        <div className="mt-0.5">
          <Icon />
        </div>

        {/* 메시지 */}
        <p className="flex-1 text-sm font-medium leading-snug">
          {item.message}
        </p>

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 flex items-center justify-center size-6 squircle-xs opacity-60 hover:opacity-100 transition-opacity duration-[150ms] ease-[var(--ease-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1"
          aria-label="토스트 닫기"
        >
          <CloseIcon />
        </button>
      </div>

      {/* ---- 자동 사라짐 progress bar ---- */}
      <div className="h-1 w-full bg-black/5">
        <div
          className={`h-full ${variantProgressClasses[item.variant]} origin-left`}
          style={{
            animation: `shrinkWidth ${item.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToastContainer Component — 전역 토스트 렌더링 컨테이너
// ---------------------------------------------------------------------------

/**
 * 전역 토스트 컨테이너
 * layout.tsx에 한 번만 배치하면 모든 페이지에서 토스트가 표시됩니다.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { ToastContainer } from "@/components/ui/Toast";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <ToastContainer />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-6 right-6 z-[600] flex flex-col gap-3 pointer-events-none"
      aria-label="알림 영역"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItemComponent item={item} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { useToastStore, toast };
export type { ToastVariant, ToastItem, ToastInput, ToastStore };
