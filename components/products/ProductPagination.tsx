"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Pagination } from "@/components/ui/Pagination";

/* ==========================================================================
   ProductPagination Component

   Pagination UI와 URL searchParams를 연동하는 래퍼 컴포넌트.
   - ?page= 파라미터 업데이트
   - 기존 searchParams(category 등)를 유지
   ========================================================================== */

interface ProductPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function ProductPagination({
  currentPage,
  totalPages,
}: ProductPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.push(url);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </p>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        className="justify-center"
      />
    </div>
  );
}
