"use client";

import { useState, useCallback, useEffect } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

import { PharmacyCsvUploader } from "@/components/admin/PharmacyCsvUploader";
import type { Pharmacy } from "@/types/pharmacy";

/* ==========================================================================
   PharmacyListClient — 관리자 약국 목록 클라이언트 컴포넌트

   서버 컴포넌트(page.tsx)에서 초기 데이터를 받아 렌더링하고,
   검색/삭제/CSV 업로드 등 인터랙션은 클라이언트에서 처리합니다.

   기능:
   - 검색 (약국명/주소 기준)
   - 약국 테이블 (약국명, 주소, 전화번호, 등록일, 액션)
   - CSV 업로드 모달
   - 삭제 확인 모달
   - 페이지네이션
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PharmacyListClientProps {
  initialItems: Pharmacy[];
  initialTotal: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

// ---------------------------------------------------------------------------
// Sub Components
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <tr>
      <td colSpan={100} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center squircle-lg bg-gray-100">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="text-gray-400"
            >
              <rect x="4" y="6" width="20" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 11H24" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 14V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M11 17H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">
            등록된 약국이 없습니다
          </p>
          <p className="text-xs text-gray-400">
            CSV 파일을 업로드하여 약국을 등록하세요
          </p>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------------------

interface DeleteModalProps {
  pharmacyName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ pharmacyName, isDeleting, onConfirm, onCancel }: DeleteModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isDeleting) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isDeleting]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={!isDeleting ? onCancel : undefined}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white squircle-xl p-6 shadow-xl max-w-sm w-full animate-slide-up"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center squircle-md bg-error-light">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-error"
            aria-hidden="true"
          >
            <path
              d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 id="delete-modal-title" className="text-center text-lg font-semibold text-gray-900 mb-2">
          이 약국을 삭제하시겠습니까?
        </h3>
        <p id="delete-modal-desc" className="text-center text-sm text-gray-500 mb-1">
          <span className="font-medium text-gray-700">{pharmacyName}</span>
        </p>
        <p className="text-center text-xs text-gray-400 mb-6">
          삭제된 약국은 복구할 수 없습니다.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" onClick={onCancel} disabled={isDeleting} className="flex-1">
            취소
          </Button>
          <Button variant="danger" size="md" onClick={onConfirm} loading={isDeleting} disabled={isDeleting} className="flex-1">
            삭제
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// PharmacyListClient Component
// ---------------------------------------------------------------------------

export function PharmacyListClient({ initialItems, initialTotal }: PharmacyListClientProps) {
  // State
  const [items, setItems] = useState<Pharmacy[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<Pharmacy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);

  // --------------------------------------------------------------------------
  // Fetch Items
  // --------------------------------------------------------------------------

  const fetchItems = useCallback(
    async (searchQuery: string, pageNum: number) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        params.set("page", String(pageNum));
        params.set("limit", String(PAGE_LIMIT));

        const res = await fetch(`/api/pharmacies?${params.toString()}`);
        if (!res.ok) {
          throw new Error("약국 목록을 불러오지 못했습니다.");
        }

        const data = await res.json();
        setItems(data.pharmacies ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        const message = err instanceof Error ? err.message : "목록 조회 중 오류가 발생했습니다.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchItems(search, 1);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // --------------------------------------------------------------------------
  // Pagination
  // --------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const goToPage = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchItems(search, newPage);
    },
    [fetchItems, search],
  );

  // --------------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------------

  const handleDeleteClick = useCallback((item: Pharmacy) => {
    setDeleteTarget(item);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    if (!isDeleting) {
      setDeleteTarget(null);
    }
  }, [isDeleting]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/pharmacies/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "약국 삭제에 실패했습니다.");
      }

      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success("약국이 삭제되었습니다.");
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "약국 삭제에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

  // --------------------------------------------------------------------------
  // CSV 업로드 성공 후 목록 새로고침
  // --------------------------------------------------------------------------

  const handleCsvSuccess = useCallback(() => {
    fetchItems(search, 1);
    setPage(1);
  }, [fetchItems, search]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ================================================================
          페이지 헤더
          ================================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            약국 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            총 {total.toLocaleString("ko-KR")}개의 약국
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsCsvOpen(true)}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          CSV 업로드
        </Button>
      </div>

      {/* ================================================================
          검색 바
          ================================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="약국명 또는 주소로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ================================================================
          약국 테이블
          ================================================================ */}
      <div className="bg-white shadow-sm border border-gray-100 squircle-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  약국명
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  주소
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  전화번호
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  등록일
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="px-5 py-3">
                      <div className="h-4 w-24 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-48 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="h-4 w-28 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="h-4 w-20 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-12 bg-gray-100 squircle-xs animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <EmptyState />
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/50">
                    {/* 약국명 */}
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap max-w-[200px] truncate">
                      {item.name}
                    </td>

                    {/* 주소 */}
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap max-w-[300px] truncate">
                      {item.address}
                    </td>

                    {/* 전화번호 */}
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap hidden md:table-cell">
                      {item.phone ?? <span className="text-gray-300">-</span>}
                    </td>

                    {/* 등록일 */}
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap tabular-nums hidden md:table-cell">
                      {formatDate(item.created_at)}
                    </td>

                    {/* 액션 */}
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteClick(item)}
                        className="!text-error hover:!bg-error/8"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 4H11L10.3 12.1C10.2724 12.3813 10.1382 12.6409 9.92483 12.8274C9.71146 13.0139 9.43523 13.113 9.15 13.1H4.85C4.56477 13.113 4.28854 13.0139 4.07517 12.8274C3.8618 12.6409 3.72764 12.3813 3.7 12.1L3 4Z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path d="M2 4H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          <path d="M5.5 1.5H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          <path d="M5.5 7V10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          <path d="M8.5 7V10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        삭제
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ================================================================
            페이지네이션
            ================================================================ */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">
              {total.toLocaleString("ko-KR")}개 중{" "}
              {((page - 1) * PAGE_LIMIT + 1).toLocaleString("ko-KR")}-
              {Math.min(page * PAGE_LIMIT, total).toLocaleString("ko-KR")}
            </p>
            <div className="inline-flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center squircle-xs text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="이전 페이지"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - page) <= 1) return true;
                  return false;
                })
                .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                  if (i > 0) {
                    const prev = arr[i - 1];
                    if (p - prev > 1) {
                      acc.push("ellipsis");
                    }
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "ellipsis" ? (
                    <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goToPage(item)}
                      className={`flex h-8 w-8 items-center justify-center squircle-xs text-xs font-medium transition-colors ${
                        item === page
                          ? "bg-primary text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                      aria-label={`${item}페이지`}
                      aria-current={item === page ? "page" : undefined}
                    >
                      {item}
                    </button>
                  ),
                )}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center squircle-xs text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="다음 페이지"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          삭제 확인 모달
          ================================================================ */}
      {deleteTarget && (
        <DeleteModal
          pharmacyName={deleteTarget.name}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* ================================================================
          CSV 업로드 모달
          ================================================================ */}
      <PharmacyCsvUploader
        isOpen={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
        onSuccess={handleCsvSuccess}
      />
    </div>
  );
}
