"use client";

import { useEffect, useCallback, useId, useRef } from "react";
import { createPortal } from "react-dom";

/* ==========================================================================
   Modal Component — Cellromax Design System

   접근성 준수 모달 다이얼로그 컴포넌트.
   - open / onClose 제어 패턴
   - createPortal로 body에 렌더링 (z-index 스택 오버플로 방지)
   - ESC 키보드 + backdrop 클릭으로 닫기
   - 4종 size: sm / md / lg / full (max-width 제어)
   - scaleIn 키프레임 진입 애니메이션 (globals.css 정의)
   - role="dialog", aria-modal, aria-labelledby 접근성 속성
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModalSize = "sm" | "md" | "lg" | "full";

interface ModalProps {
  /** 모달 열림 상태 */
  open: boolean;
  /** 닫기 콜백 — ESC, backdrop 클릭, X 버튼 클릭 시 호출 */
  onClose: () => void;
  /** 모달 상단 제목 (선택) — aria-labelledby에 연결 */
  title?: string;
  /** 모달 너비 (기본: "md") */
  size?: ModalSize;
  /** 모달 내부 콘텐츠 */
  children: React.ReactNode;
  /** 외부에서 추가 클래스 전달 (패널에 적용) */
  className?: string;
}

// ---------------------------------------------------------------------------
// Style Maps
// ---------------------------------------------------------------------------

/**
 * Size별 max-width 클래스 맵
 */
const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",          /* 24rem */
  md: "max-w-lg",          /* 32rem */
  lg: "max-w-2xl",         /* 42rem */
  full: "max-w-[calc(100vw-2rem)]",
};

// ---------------------------------------------------------------------------
// Close Icon Component
// ---------------------------------------------------------------------------

/** 닫기(X) 아이콘 SVG */
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
      width="1.25em"
      height="1.25em"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Modal Component
// ---------------------------------------------------------------------------

/**
 * 모달 다이얼로그
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <Modal open={open} onClose={() => setOpen(false)} title="확인">
 *   <p>모달 내용이 여기에 표시됩니다.</p>
 * </Modal>
 * ```
 */
export function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
  className,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  /* ---- ESC 키로 닫기 ---- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    document.addEventListener("keydown", handleKeyDown);
    /* 모달 열림 시 body 스크롤 잠금 */
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, handleKeyDown]);

  /* ---- 모달 열릴 때 패널에 포커스 이동 ---- */
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  /* ---- backdrop 클릭 시 닫기 ---- */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      /* 패널 내부 클릭은 무시 — 이벤트 타겟이 backdrop 자체인 경우만 닫기 */
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  /* ---- 조건부 렌더링: open=false이면 DOM에서 완전 제거 ---- */
  if (!open) return null;

  /* ---- 패널 클래스 조합 ---- */
  const panelClasses = [
    "relative w-full mx-4",
    "squircle-xl",
    "bg-surface-raised",
    "shadow-2xl",
    sizeClasses[size],
    /* scaleIn 진입 애니메이션 — globals.css @keyframes scaleIn 참조 */
    "animate-[scaleIn_250ms_var(--ease-spring)_both]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  /* ---- Portal 렌더링 ---- */
  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-surface-overlay backdrop-blur-md animate-[fadeIn_150ms_var(--ease-out)_both]"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      {/* Modal Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={panelClasses}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---- Header: 제목 + 닫기 버튼 ---- */}
        <div className="flex items-center justify-between p-6 pb-0">
          {title ? (
            <h2
              id={titleId}
              className="text-lg font-bold text-primary leading-snug"
            >
              {title}
            </h2>
          ) : (
            /* 제목이 없어도 닫기 버튼을 우측에 배치하기 위한 spacer */
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 flex items-center justify-center size-9 squircle-sm text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors duration-[150ms] ease-[var(--ease-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="닫기"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ---- Content ---- */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { ModalProps, ModalSize };
