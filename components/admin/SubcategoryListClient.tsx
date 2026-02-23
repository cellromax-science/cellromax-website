"use client";

import { useState, useCallback } from "react";

import { Button } from "@/components/ui/Button";
import { Badge, getCategoryBadgeVariant, getCategoryLabel } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { SubcategoryFormModal } from "@/components/admin/SubcategoryFormModal";

import type { SubcategoryWithCount, ProductCategory } from "@/types/product";

/* ==========================================================================
   SubcategoryListClient — 관리자 하위카테고리 목록 클라이언트 컴포넌트

   서버 컴포넌트(page.tsx)에서 초기 데이터를 받아 렌더링.
   - 카테고리별 필터링 (클라이언트 사이드)
   - 등록/수정 모달
   - 삭제 확인 모달 (연관 제품 경고)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubcategoryListClientProps {
  initialSubcategories: SubcategoryWithCount[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "health_functional", label: "건강기능식품" },
  { value: "general_food", label: "일반식품" },
  { value: "cosmetic", label: "화장품" },
  { value: "medicine", label: "의약품" },
  { value: "nutra_pet", label: "뉴트라펫" },
  { value: "other", label: "기타" },
];

// ---------------------------------------------------------------------------
// Sub Components
// ---------------------------------------------------------------------------

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          active ? "bg-success" : "bg-gray-300"
        }`}
        aria-hidden="true"
      />
      {active ? "활성" : "비활성"}
    </span>
  );
}

function EmptyState({ filter }: { filter: string }) {
  const label = CATEGORY_FILTERS.find((f) => f.value === filter)?.label ?? "";
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="mb-4 text-gray-300"
      >
        <path
          d="M8 14C8 12.3431 9.34315 11 11 11H20L24 15H37C38.6569 15 40 16.3431 40 18V34C40 35.6569 38.6569 37 37 37H11C9.34315 37 8 35.6569 8 34V14Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-sm font-medium">
        {filter
          ? `"${label}" 카테고리에 하위카테고리가 없습니다.`
          : "등록된 하위카테고리가 없습니다."}
      </p>
      <p className="mt-1 text-xs">
        상단의 버튼을 눌러 새 하위카테고리를 등록하세요.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SubcategoryListClient({
  initialSubcategories,
}: SubcategoryListClientProps) {
  // --- State ---
  const [subcategories, setSubcategories] = useState(initialSubcategories);
  const [activeFilter, setActiveFilter] = useState("");
  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data?: SubcategoryWithCount;
  }>({ open: false, mode: "create" });
  const [deleteTarget, setDeleteTarget] = useState<SubcategoryWithCount | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Filtered list ---
  const filteredList = activeFilter
    ? subcategories.filter((sc) => sc.parent_category === activeFilter)
    : subcategories;

  // --- Category counts ---
  const categoryCounts = CATEGORY_FILTERS.map((f) => ({
    ...f,
    count: f.value
      ? subcategories.filter((sc) => sc.parent_category === f.value).length
      : subcategories.length,
  }));

  // --- Refetch ---
  const fetchSubcategories = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/subcategories?include_inactive=true&include_count=true"
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubcategories(data.subcategories ?? []);
    } catch {
      toast.error("목록을 불러오는데 실패했습니다.");
    }
  }, []);

  // --- Handlers ---
  const handleCreate = useCallback(() => {
    setFormModal({ open: true, mode: "create" });
  }, []);

  const handleEdit = useCallback((sc: SubcategoryWithCount) => {
    setFormModal({ open: true, mode: "edit", data: sc });
  }, []);

  const handleFormClose = useCallback(() => {
    setFormModal({ open: false, mode: "create" });
  }, []);

  const handleFormSuccess = useCallback(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/subcategories/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "삭제에 실패했습니다.");
      }

      toast.success("하위카테고리가 삭제되었습니다.");
      // 낙관적 업데이트
      setSubcategories((prev) =>
        prev.filter((sc) => sc.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

  return (
    <>
      {/* ================================================================
          페이지 헤더
          ================================================================ */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">카테고리 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            총 {subcategories.length}개의 하위카테고리
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          + 새 하위카테고리
        </Button>
      </div>

      {/* ================================================================
          카테고리 필터 탭
          ================================================================ */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categoryCounts.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setActiveFilter(f.value)}
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium squircle-sm transition-colors duration-150",
              activeFilter === f.value
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            ].join(" ")}
          >
            {f.label}
            <span
              className={[
                "text-xs",
                activeFilter === f.value ? "text-white/70" : "text-gray-400",
              ].join(" ")}
            >
              ({f.count})
            </span>
          </button>
        ))}
      </div>

      {/* ================================================================
          테이블
          ================================================================ */}
      {filteredList.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="w-12 px-4 py-3 text-xs font-semibold text-gray-500">
                  #
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                  이름
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                  상위 카테고리
                </th>
                <th className="hidden px-4 py-3 text-xs font-semibold text-gray-500 lg:table-cell">
                  정렬
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                  상태
                </th>
                <th className="hidden px-4 py-3 text-xs font-semibold text-gray-500 lg:table-cell">
                  연관 제품
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.map((sc, idx) => (
                <tr
                  key={sc.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {sc.name_ko}
                    {sc.name_en && (
                      <span className="ml-2 text-xs text-gray-400">
                        {sc.name_en}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={getCategoryBadgeVariant(
                        sc.parent_category as ProductCategory
                      )}
                      size="sm"
                    >
                      {getCategoryLabel(sc.parent_category as ProductCategory)}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                    {sc.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <ActiveDot active={sc.is_active} />
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                    {sc.product_count}개
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(sc)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(sc)}
                        className="text-xs font-medium text-error hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================
          등록/수정 모달
          ================================================================ */}
      <SubcategoryFormModal
        open={formModal.open}
        onClose={handleFormClose}
        mode={formModal.mode}
        initialData={formModal.data}
        onSuccess={handleFormSuccess}
      />

      {/* ================================================================
          삭제 확인 모달
          ================================================================ */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="하위카테고리 삭제"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              <strong>&ldquo;{deleteTarget.name_ko}&rdquo;</strong>{" "}
              <span className="text-gray-400">({deleteTarget.slug})</span>
              을(를) 삭제하시겠습니까?
            </p>

            {/* 연관 제품 경고 */}
            {deleteTarget.product_count > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
                <p className="text-sm font-medium text-warning-dark">
                  이 하위카테고리에 연결된 제품이{" "}
                  <strong>{deleteTarget.product_count}개</strong> 있습니다.
                </p>
                <p className="mt-1 text-xs text-warning-dark/80">
                  삭제 시 해당 제품들의 하위카테고리가 &lsquo;미지정&rsquo;으로
                  변경됩니다.
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400">
              삭제된 하위카테고리는 복구할 수 없습니다.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                loading={isDeleting}
              >
                삭제
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
