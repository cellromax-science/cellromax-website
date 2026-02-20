"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import type { PostType } from "@/types/newsroom";

/* ==========================================================================
   NewsroomTabs — 뉴스룸 카테고리 탭 전환
   IrCategoryFilter.tsx 패턴 기반, URL searchParams 연동
   pill 스타일 버튼으로 notice / news / video 탭 전환
   탭 변경 시 page 파라미터 초기화
   ========================================================================== */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POST_TYPES: PostType[] = ["notice", "news", "video"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NewsroomTabsProps {
  /** 현재 활성 탭 (URL에서 파싱) */
  activeTab: PostType;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewsroomTabs({ activeTab }: NewsroomTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("newsroom");

  const handleTabChange = useCallback(
    (tab: PostType) => {
      /* 탭 변경 시 page 파라미터 초기화 — tab만 설정 */
      const params = new URLSearchParams();
      params.set("tab", tab);
      const queryString = params.toString();
      const url = `${pathname}?${queryString}`;
      router.push(url);
    },
    [router, pathname],
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {POST_TYPES.map((type) => {
        const isActive = activeTab === type;

        return (
          <button
            key={type}
            type="button"
            onClick={() => handleTabChange(type)}
            className={[
              "px-5 py-2.5 text-sm font-semibold squircle-sm cursor-pointer",
              "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-white shadow-sm hover:bg-primary-light"
                : "bg-transparent text-gray-600 hover:bg-primary/10 hover:text-primary",
            ].join(" ")}
            aria-pressed={isActive}
          >
            {t(`tabs.${type}`)}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type { NewsroomTabsProps };
