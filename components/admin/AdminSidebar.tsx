"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useCallback } from "react";
import type { AdminProfile, AdminRole } from "@/types/admin";

/* ==========================================================================
   AdminSidebar — 관리자 사이드바 내비게이션 (Client Component)

   - 역할(role)별 메뉴 필터링
   - usePathname()으로 현재 경로 기반 active 메뉴 표시
   - 데스크톱(lg+): 왼쪽 고정 사이드바 (w-64)
   - 모바일(<lg): 오버레이 슬라이드인 메뉴 (isOpen/onClose props)
   - 로케일 prefix를 감안한 경로 매칭
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminSidebarProps {
  /** 서버에서 조회한 관리자 프로필 */
  profile: AdminProfile;
  /** 모바일 사이드바 열림 상태 */
  isOpen: boolean;
  /** 모바일 사이드바 닫기 콜백 */
  onClose: () => void;
}

/** 개별 메뉴 아이템 정의 */
interface MenuItem {
  /** 메뉴 레이블 */
  label: string;
  /** /admin/ 이하 경로 (예: "dashboard", "products") */
  path: string;
  /** 메뉴 아이콘 SVG path(s) */
  icon: React.ReactNode;
  /** 접근 가능한 역할 목록 */
  roles: AdminRole[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 역할별 한글 레이블 */
const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "총괄 관리자",
  marketing: "마케팅 담당",
  ir: "IR 담당",
  inquiry: "문의 담당",
};

/** 전체 메뉴 정의 — 역할 기반 필터링에 사용 */
const MENU_ITEMS: MenuItem[] = [
  {
    label: "대시보드",
    path: "dashboard",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 10.5L10 4L17 10.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 9V16H8.5V12.5C8.5 12.2239 8.72386 12 9 12H11C11.2761 12 11.5 12.2239 11.5 12.5V16H15V9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    roles: ["super_admin", "marketing", "ir", "inquiry"],
  },
  {
    label: "제품 관리",
    path: "products",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="5"
          width="14"
          height="11"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3 8.5H17"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7 5V3.5C7 2.67157 7.67157 2 8.5 2H11.5C12.3284 2 13 2.67157 13 3.5V5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    roles: ["super_admin", "marketing"],
  },
  {
    label: "카테고리 관리",
    path: "subcategories",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 5.5C3 4.67157 3.67157 4 4.5 4H8L10 6H15.5C16.3284 6 17 6.67157 17 7.5V14.5C17 15.3284 16.3284 16 15.5 16H4.5C3.67157 16 3 15.3284 3 14.5V5.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M7 10.5H13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M7 13H11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    roles: ["super_admin", "marketing"],
  },
  {
    label: "게시판 관리",
    path: "posts",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="14"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M6.5 7.5H13.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M6.5 10.5H13.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M6.5 13.5H10.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    roles: ["super_admin", "marketing"],
  },
  {
    label: "IR 파일 관리",
    path: "ir-files",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M5 3C5 2.44772 5.44772 2 6 2H11L15 6V17C15 17.5523 14.5523 18 14 18H6C5.44772 18 5 17.5523 5 17V3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M11 2V6H15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8 11H12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8 14H12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    roles: ["super_admin", "ir"],
  },
  {
    label: "문의 관리",
    path: "inquiries",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M4 4H16C16.5523 4 17 4.44772 17 5V13C17 13.5523 16.5523 14 16 14H6L3 17V5C3 4.44772 3.44772 4 4 4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="7.5" cy="9" r="0.75" fill="currentColor" />
        <circle cx="10" cy="9" r="0.75" fill="currentColor" />
        <circle cx="12.5" cy="9" r="0.75" fill="currentColor" />
      </svg>
    ),
    roles: ["super_admin", "inquiry"],
  },
  {
    label: "약국 관리",
    path: "pharmacies",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="6"
          width="14"
          height="12"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3 9.5H17"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M6 6V4C6 3.44772 6.44772 3 7 3H13C13.5523 3 14 3.44772 14 4V6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M10 12V15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8.5 13.5H11.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    roles: ["super_admin", "marketing"],
  },
  {
    label: "이벤트 관리",
    path: "events",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M16.5 10V16.5H3.5V10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect
          x="2"
          y="6.5"
          width="16"
          height="3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M10 16.5V6.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 6.5H6.75C5.7835 6.5 5 5.7165 5 4.75C5 3.7835 5.7835 3 6.75 3C9.2 3 10 6.5 10 6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M10 6.5H13.25C14.2165 6.5 15 5.7165 15 4.75C15 3.7835 14.2165 3 13.25 3C10.8 3 10 6.5 10 6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
    roles: ["super_admin", "marketing"],
  },
  {
    label: "계정 관리",
    path: "accounts",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="7"
          r="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M4 17C4 14.2386 6.23858 12 9 12H11C13.7614 12 16 14.2386 16 17"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    roles: ["super_admin"],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * pathname에서 로케일 prefix를 제거하고 /admin/ 이하 경로 세그먼트를 추출합니다.
 *
 * 예: "/ko/admin/dashboard" -> "dashboard"
 *     "/en/admin/products"  -> "products"
 *     "/ko/admin"           -> ""
 */
function extractAdminPath(pathname: string): string {
  // pathname을 슬래시로 분할하여 /[locale]/admin/[...rest] 형태 파싱
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] = locale, segments[1] = "admin", segments[2+] = 나머지
  const adminIndex = segments.indexOf("admin");
  if (adminIndex === -1 || adminIndex + 1 >= segments.length) {
    return "";
  }
  return segments[adminIndex + 1];
}

/**
 * 현재 로케일을 pathname에서 추출합니다.
 *
 * 예: "/ko/admin/dashboard" -> "ko"
 */
function extractLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] || "ko";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminSidebar({ profile, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const currentPath = extractAdminPath(pathname);
  const locale = extractLocale(pathname);

  /** 역할 기반 필터링된 메뉴 목록 */
  const filteredMenuItems = MENU_ITEMS.filter((item) =>
    item.roles.includes(profile.role)
  );

  /** ESC 키로 모바일 사이드바 닫기 */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /** 모바일 열림 시 body 스크롤 잠금 */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* ---- 사이드바 내부 콘텐츠 (데스크톱/모바일 공용) ---- */
  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* ================================================================
          상단: 브랜드 로고 + 골드 디바이더
          ================================================================ */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-extrabold tracking-widest text-white">
            CELLROMAX
          </span>
        </div>
        <p className="mt-1 text-xs text-white/50">Admin Console</p>
        {/* 골드 디바이더 */}
        <div className="mt-4 h-px bg-gradient-to-r from-secondary via-secondary-light to-transparent" />
      </div>

      {/* ================================================================
          메뉴 리스트
          ================================================================ */}
      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="관리자 내비게이션">
        <ul className="flex flex-col gap-1">
          {filteredMenuItems.map((item) => {
            const isActive = currentPath === item.path;
            const href = `/${locale}/admin/${item.path}`;

            return (
              <li key={item.path}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={[
                    "group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium",
                    "squircle-sm transition-colors duration-150",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white/90",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* 활성 메뉴 좌측 골드 바 */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-secondary"
                      aria-hidden="true"
                    />
                  )}

                  {/* 아이콘 */}
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center",
                      isActive ? "text-secondary" : "text-white/50 group-hover:text-white/80",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>

                  {/* 텍스트 */}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ================================================================
          하단: 사용자 정보 + 역할 배지
          ================================================================ */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          {/* 아바타 아이콘 */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M3 14C3 11.7909 4.79086 10 7 10H9C11.2091 10 13 11.7909 13 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {profile.name}
            </p>
            <span className="mt-0.5 inline-block rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-secondary-light">
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ==================================================================
          데스크톱 사이드바 — lg 이상에서 고정 표시
          ================================================================== */}
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sticky)] hidden w-64 bg-primary lg:block">
        {sidebarContent}
      </aside>

      {/* ==================================================================
          모바일 오버레이 + 슬라이드인 사이드바 — lg 미만
          ================================================================== */}
      {/* 배경 오버레이 */}
      <div
        className={[
          "fixed inset-0 z-[var(--z-overlay)] bg-black/50 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 슬라이드인 패널 */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-[var(--z-modal)] w-64 bg-primary transition-transform duration-300 ease-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-label="모바일 관리자 메뉴"
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="메뉴 닫기"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {sidebarContent}
      </aside>
    </>
  );
}
