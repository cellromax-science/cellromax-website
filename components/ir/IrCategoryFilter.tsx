"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";

type IrTab = "notice" | "annual_report" | "announcement" | "ethics";

const IR_TABS: IrTab[] = ["notice", "annual_report", "announcement", "ethics"];

interface IrCategoryFilterProps {
  activeCategory: string | null;
}

export function IrCategoryFilter({ activeCategory }: IrCategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("ir");

  const currentTab = activeCategory || "notice";

  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams();
      if (tab !== "notice") {
        params.set("category", tab);
      }
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(url);
    },
    [router, pathname],
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {IR_TABS.map((tab) => {
        const isActive = currentTab === tab;

        return (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
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
            {t(`categories.${tab}`)}
          </button>
        );
      })}
    </div>
  );
}
