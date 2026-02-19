"use client";

import { useCallback, useMemo } from "react";

/* ==========================================================================
   Pagination Component — Cellromax Design System

   페이지네이션 네비게이션 컴포넌트.
   - Controlled 모드: currentPage + onPageChange
   - 이전/다음 화살표 버튼 + 페이지 번호 + 말줄임(...) 표시
   - squircle-sm 디자인 토큰 적용
   - 접근성: nav role="navigation", aria-label, aria-current
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaginationProps {
  /** 현재 활성 페이지 (1부터 시작) */
  currentPage: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 페이지 변경 시 호출되는 콜백 */
  onPageChange: (page: number) => void;
  /** 현재 페이지 좌우로 표시할 이웃 페이지 수 (기본: 1) */
  siblingCount?: number;
  /** 외부에서 추가 클래스 전달 */
  className?: string;
}

/** 페이지 번호 배열의 아이템 타입 — 숫자 또는 ellipsis */
type PageItem = number | "ellipsis";

// ---------------------------------------------------------------------------
// Page Range Generator
// ---------------------------------------------------------------------------

/**
 * 페이지 번호 배열을 생성한다.
 *
 * 항상 첫 페이지와 마지막 페이지를 포함하며,
 * 현재 페이지 기준 siblingCount만큼 좌우로 표시하고,
 * 건너뛴 구간에 "ellipsis"를 삽입한다.
 *
 * @example
 * generatePageRange(5, 10, 1) → [1, "ellipsis", 4, 5, 6, "ellipsis", 10]
 * generatePageRange(1, 5, 1)  → [1, 2, 3, 4, 5]
 */
function generatePageRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
): PageItem[] {
  /* 전체 페이지가 표시 가능 슬롯 이하면 모두 표시 */
  const totalSlots = siblingCount * 2 + 5; // siblings + first + last + 2 ellipsis + current
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  const items: PageItem[] = [];

  /* 첫 페이지 */
  items.push(1);

  /* 좌측 ellipsis 또는 2번 페이지 */
  if (showLeftEllipsis) {
    items.push("ellipsis");
  } else {
    /* 1과 leftSibling 사이의 페이지 채우기 */
    for (let i = 2; i < leftSibling; i++) {
      items.push(i);
    }
  }

  /* 현재 페이지 주변 (siblings 포함) */
  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i !== 1 && i !== totalPages) {
      items.push(i);
    }
  }

  /* 우측 ellipsis 또는 마지막-1 페이지 */
  if (showRightEllipsis) {
    items.push("ellipsis");
  } else {
    /* rightSibling과 totalPages 사이의 페이지 채우기 */
    for (let i = rightSibling + 1; i < totalPages; i++) {
      items.push(i);
    }
  }

  /* 마지막 페이지 */
  if (totalPages > 1) {
    items.push(totalPages);
  }

  return items;
}

// ---------------------------------------------------------------------------
// Chevron Icons
// ---------------------------------------------------------------------------

/** 좌측 화살표 SVG (chevron-left) */
function ChevronLeft() {
  return (
    <svg
      className="size-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** 우측 화살표 SVG (chevron-right) */
function ChevronRight() {
  return (
    <svg
      className="size-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Pagination Component
// ---------------------------------------------------------------------------

/**
 * 페이지네이션 네비게이션
 *
 * @example
 * ```tsx
 * const [page, setPage] = useState(1);
 *
 * <Pagination
 *   currentPage={page}
 *   totalPages={20}
 *   onPageChange={setPage}
 *   siblingCount={1}
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  /* ---- 페이지 범위 생성 (메모이제이션) ---- */
  const pages = useMemo(
    () => generatePageRange(currentPage, totalPages, siblingCount),
    [currentPage, totalPages, siblingCount],
  );

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  /* ---- 이전/다음 페이지 핸들러 ---- */
  const handlePrev = useCallback(() => {
    if (!isFirstPage) onPageChange(currentPage - 1);
  }, [currentPage, isFirstPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (!isLastPage) onPageChange(currentPage + 1);
  }, [currentPage, isLastPage, onPageChange]);

  /* ---- 페이지 번호 클릭 핸들러 ---- */
  const handlePageClick = useCallback(
    (page: number) => {
      if (page !== currentPage) onPageChange(page);
    },
    [currentPage, onPageChange],
  );

  /* 총 페이지가 1 이하면 렌더링하지 않음 */
  if (totalPages <= 1) return null;

  /* ---- 공통 버튼 스타일 ---- */
  const baseButtonClass = [
    "inline-flex items-center justify-center",
    "size-9 text-sm squircle-sm",
    "transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  ].join(" ");

  const navClasses = [
    "flex items-center gap-1",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav role="navigation" aria-label="Pagination" className={navClasses}>
      {/* ---- 이전 페이지 버튼 ---- */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={isFirstPage}
        aria-label="이전 페이지"
        className={`${baseButtonClass} ${
          isFirstPage
            ? "text-gray-300 opacity-40 cursor-not-allowed"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <ChevronLeft />
      </button>

      {/* ---- 페이지 번호 목록 ---- */}
      {pages.map((item, index) => {
        /* Ellipsis (클릭 불가) */
        if (item === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex items-center justify-center size-9 text-sm text-gray-400 select-none"
              aria-hidden="true"
            >
              &hellip;
            </span>
          );
        }

        /* 페이지 번호 버튼 */
        const isActive = item === currentPage;

        return (
          <button
            key={item}
            type="button"
            onClick={() => handlePageClick(item)}
            aria-label={`${item} 페이지`}
            aria-current={isActive ? "page" : undefined}
            className={`${baseButtonClass} ${
              isActive
                ? "bg-primary text-white font-semibold shadow-sm"
                : "bg-transparent text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            {item}
          </button>
        );
      })}

      {/* ---- 다음 페이지 버튼 ---- */}
      <button
        type="button"
        onClick={handleNext}
        disabled={isLastPage}
        aria-label="다음 페이지"
        className={`${baseButtonClass} ${
          isLastPage
            ? "text-gray-300 opacity-40 cursor-not-allowed"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <ChevronRight />
      </button>
    </nav>
  );
}

export type { PaginationProps };
