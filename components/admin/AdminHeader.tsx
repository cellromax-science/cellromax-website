"use client";

import { useState } from "react";
import type { AdminProfile, AdminRole } from "@/types/admin";

/* ==========================================================================
   AdminHeader — 관리자 상단 헤더 (Client Component)

   - 상단 고정 헤더 (h-16), 흰색 배경 + 하단 보더
   - 왼쪽: 모바일 햄버거 버튼 (lg 이상에서 숨김)
   - 오른쪽: 사용자명 + 역할 배지 + 로그아웃 버튼
   - logoutAction 서버 액션으로 로그아웃 처리
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminHeaderProps {
  /** 서버에서 조회한 관리자 프로필 */
  profile: AdminProfile;
  /** 모바일 사이드바 토글 콜백 */
  onMenuToggle: () => void;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminHeader({ profile, onMenuToggle }: AdminHeaderProps) {
  const [isPending, setIsPending] = useState(false);

  /** 로그아웃 처리 — API 라우트로 POST 후 리다이렉트 */
  async function handleLogout() {
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        redirect: "follow",
      });
      // API가 로그인 페이지로 리다이렉트하므로 브라우저에서 이동
      window.location.href = res.url || "/ko/admin/login";
    } catch {
      // 네트워크 에러 시에도 강제 이동
      window.location.href = "/ko/admin/login";
    }
  }

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-16 items-center border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* ================================================================
          왼쪽: 모바일 햄버거 메뉴 버튼 (lg 이상에서 숨김)
          ================================================================ */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
        aria-label="메뉴 열기"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 5H17M3 10H17M3 15H17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* 왼쪽 여백 확보 (데스크톱) */}
      <div className="flex-1" />

      {/* ================================================================
          오른쪽: 사용자 정보 + 로그아웃
          ================================================================ */}
      <div className="flex items-center gap-3">
        {/* 사용자명 + 역할 배지 */}
        <div className="hidden items-center gap-2.5 sm:flex">
          {/* 아바타 */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
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

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {profile.name}
            </span>
            <span className="text-[10px] font-semibold tracking-wide text-secondary-dark">
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        </div>

        {/* 구분선 */}
        <div className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />

        {/* 로그아웃 버튼 */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className={[
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
            "text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            isPending && "pointer-events-none opacity-50",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="로그아웃"
        >
          {/* 로그아웃 아이콘 */}
          {isPending ? (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M6 2H4C3.44772 2 3 2.44772 3 3V13C3 13.5523 3.44772 14 4 14H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M10.5 11.5L14 8L10.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 8H6.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}

          <span className="hidden sm:inline">
            {isPending ? "로그아웃 중..." : "로그아웃"}
          </span>
        </button>
      </div>
    </header>
  );
}
