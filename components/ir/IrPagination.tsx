"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Pagination } from "@/components/ui/Pagination";

/* ==========================================================================
   IrPagination — URL searchParams 연동 페이지네이션
   ProductPagination.tsx 패턴 기반
   기존 category/year 파라미터를 유지하면서 page만 업데이트
   ========================================================================== */

interface IrPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function IrPagination({ currentPage, totalPages }: IrPaginationProps) {
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
      router.push(url);
    },
    [router, pathname, searchParams],
  );

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      className="justify-center"
    />
  );
}
