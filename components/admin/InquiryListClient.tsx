"use client";

import { useState, useCallback, useEffect } from "react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "@/components/ui/Toast";

import type { BadgeVariant } from "@/components/ui/Badge";
import type { Inquiry, InquiryType, InquiryStatus } from "@/types/contact";

/* ==========================================================================
   InquiryListClient — 관리자 문의 목록 클라이언트 컴포넌트

   서버 컴포넌트(page.tsx)에서 초기 데이터를 받아 렌더링하고,
   검색/필터/상세보기 등 인터랙션은 클라이언트에서 처리합니다.

   기능:
   - 검색 (이름/제목 기준)
   - 문의유형 필터, 상태 필터
   - 문의 테이블 (유형, 이름, 제목, 상태, 접수일, 액션)
   - 상세 모달 (문의 내용, 상태 변경, 관리자 메모)
   - 페이지네이션
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InquiryListClientProps {
  initialItems: Inquiry[];
  initialTotal: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INQUIRY_TYPE_BADGE: Record<InquiryType, { variant: BadgeVariant; label: string }> = {
  consumer: { variant: "info", label: "소비자" },
  pharmacist: { variant: "success", label: "약사" },
  business: { variant: "warning", label: "비즈니스" },
};

const INQUIRY_STATUS_BADGE: Record<InquiryStatus, { variant: BadgeVariant; label: string }> = {
  pending: { variant: "error", label: "미확인" },
  reviewing: { variant: "warning", label: "검토중" },
  replied: { variant: "success", label: "답변완료" },
  closed: { variant: "outline", label: "종료" },
};

const INQUIRY_TYPE_FILTER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "consumer", label: "소비자" },
  { value: "pharmacist", label: "약사" },
  { value: "business", label: "비즈니스" },
];

const INQUIRY_STATUS_FILTER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "pending", label: "미확인" },
  { value: "reviewing", label: "검토중" },
  { value: "replied", label: "답변완료" },
  { value: "closed", label: "종료" },
];

const INQUIRY_STATUS_OPTIONS = [
  { value: "pending", label: "미확인" },
  { value: "reviewing", label: "검토중" },
  { value: "replied", label: "답변완료" },
  { value: "closed", label: "종료" },
];

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

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${h}:${min}`;
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
              <path
                d="M5 5H23C23.5523 5 24 5.44772 24 6V18C24 18.5523 23.5523 19 23 19H9L4 24V6C4 5.44772 4.44772 5 5 5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="10.5" cy="12" r="1" fill="currentColor" />
              <circle cx="14" cy="12" r="1" fill="currentColor" />
              <circle cx="17.5" cy="12" r="1" fill="currentColor" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">
            접수된 문의가 없습니다
          </p>
          <p className="text-xs text-gray-400">
            고객 문의가 접수되면 여기에 표시됩니다
          </p>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Inquiry Detail Modal
// ---------------------------------------------------------------------------

interface DetailModalProps {
  inquiry: Inquiry;
  onClose: () => void;
  onSave: (id: string, status: InquiryStatus, adminMemo: string) => Promise<void>;
}

function DetailModal({ inquiry, onClose, onSave }: DetailModalProps) {
  const [status, setStatus] = useState<InquiryStatus>(inquiry.status);
  const [adminMemo, setAdminMemo] = useState(inquiry.admin_memo ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // ESC 키로 모달 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSaving) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSaving]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(inquiry.id, status, adminMemo);
      onClose();
    } catch {
      // 에러는 onSave에서 처리
    } finally {
      setIsSaving(false);
    }
  }, [inquiry.id, status, adminMemo, onSave, onClose]);

  const typeBadge = INQUIRY_TYPE_BADGE[inquiry.inquiry_type];
  const statusBadge = INQUIRY_STATUS_BADGE[inquiry.status];

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={!isSaving ? onClose : undefined}
        aria-hidden="true"
      />

      {/* 모달 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white squircle-xl p-6 shadow-xl max-w-2xl w-full animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 id="detail-modal-title" className="text-lg font-semibold text-gray-900">
              문의 상세
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={typeBadge.variant} size="sm">{typeBadge.label}</Badge>
              <Badge variant={statusBadge.variant} size="sm">{statusBadge.label}</Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 문의자 정보 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">문의자 정보</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 squircle-md">
            <InfoField label="이름" value={inquiry.name} />
            {inquiry.email && <InfoField label="이메일" value={inquiry.email} />}
            {inquiry.phone && <InfoField label="전화번호" value={inquiry.phone} />}
            {inquiry.company && <InfoField label="회사" value={inquiry.company} />}
            {inquiry.country && <InfoField label="국가" value={inquiry.country} />}
            {inquiry.department_position && <InfoField label="부서/직위" value={inquiry.department_position} />}
            {inquiry.pharmacy_name && <InfoField label="약국명" value={inquiry.pharmacy_name} />}
            {inquiry.pharmacy_address && <InfoField label="약국 주소" value={inquiry.pharmacy_address} />}
          </div>
        </div>

        {/* 문의 내용 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">문의 내용</h4>
          {inquiry.subject && (
            <p className="text-sm font-medium text-gray-900 mb-2">{inquiry.subject}</p>
          )}
          <div className="p-4 bg-gray-50 squircle-md text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
            {inquiry.message}
          </div>
        </div>

        {/* 접수일/답변일 */}
        <div className="flex items-center gap-4 mb-6 text-xs text-gray-400">
          <span>접수일: {formatDateTime(inquiry.created_at)}</span>
          {inquiry.replied_at && (
            <span>답변일: {formatDateTime(inquiry.replied_at)}</span>
          )}
        </div>

        {/* 상태 변경 */}
        <div className="mb-4">
          <Select
            label="상태 변경"
            value={status}
            onChange={(e) => setStatus(e.target.value as InquiryStatus)}
            options={INQUIRY_STATUS_OPTIONS}
          />
        </div>

        {/* 관리자 메모 */}
        <div className="mb-6">
          <Textarea
            label="관리자 메모"
            placeholder="내부 메모를 입력하세요 (고객에게 표시되지 않음)"
            value={adminMemo}
            onChange={(e) => setAdminMemo(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </div>

        {/* 버튼 */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline" size="md" onClick={onClose} disabled={isSaving} className="flex-1">
            취소
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} loading={isSaving} disabled={isSaving} className="flex-1">
            저장
          </Button>
        </div>
      </div>
    </>
  );
}

/** 정보 필드 (라벨 + 값) */
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InquiryListClient Component
// ---------------------------------------------------------------------------

export function InquiryListClient({ initialItems, initialTotal }: InquiryListClientProps) {
  // State
  const [items, setItems] = useState<Inquiry[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 상세 모달 상태
  const [detailTarget, setDetailTarget] = useState<Inquiry | null>(null);

  // --------------------------------------------------------------------------
  // Fetch Items
  // --------------------------------------------------------------------------

  const fetchItems = useCallback(
    async (
      searchQuery: string,
      typeFilter: string,
      stFilter: string,
      pageNum: number,
    ) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (typeFilter) params.set("inquiry_type", typeFilter);
        if (stFilter) params.set("status", stFilter);
        params.set("page", String(pageNum));
        params.set("limit", String(PAGE_LIMIT));

        const res = await fetch(`/api/inquiries?${params.toString()}`);
        if (!res.ok) {
          throw new Error("문의 목록을 불러오지 못했습니다.");
        }

        const data = await res.json();
        setItems(data.inquiries ?? []);
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
  // Search & Filter
  // --------------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchItems(search, inquiryType, statusFilter, 1);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, inquiryType, statusFilter]);

  const handleInquiryTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setInquiryType(e.target.value);
    },
    [],
  );

  const handleStatusFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(e.target.value);
    },
    [],
  );

  // --------------------------------------------------------------------------
  // Pagination
  // --------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const goToPage = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchItems(search, inquiryType, statusFilter, newPage);
    },
    [fetchItems, search, inquiryType, statusFilter],
  );

  // --------------------------------------------------------------------------
  // Detail & Save
  // --------------------------------------------------------------------------

  const handleDetailClick = useCallback((item: Inquiry) => {
    setDetailTarget(item);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailTarget(null);
  }, []);

  const handleDetailSave = useCallback(
    async (id: string, newStatus: InquiryStatus, newAdminMemo: string) => {
      try {
        const body: Record<string, unknown> = {
          status: newStatus,
          admin_memo: newAdminMemo || null,
        };

        // 답변완료로 변경 시 replied_at 설정
        if (newStatus === "replied") {
          body.replied_at = new Date().toISOString();
        }

        const res = await fetch(`/api/inquiries/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || "문의 수정에 실패했습니다.");
        }

        // 클라이언트 state 업데이트
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: newStatus,
                  admin_memo: newAdminMemo || null,
                  ...(newStatus === "replied" ? { replied_at: new Date().toISOString() } : {}),
                }
              : item,
          ),
        );

        toast.success("문의 정보가 수정되었습니다.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "문의 수정에 실패했습니다.";
        toast.error(message);
        throw err;
      }
    },
    [],
  );

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
            문의 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            총 {total.toLocaleString("ko-KR")}개의 문의
          </p>
        </div>
      </div>

      {/* ================================================================
          검색 + 필터 바
          ================================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="이름 또는 제목으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            value={inquiryType}
            onChange={handleInquiryTypeChange}
            options={INQUIRY_TYPE_FILTER_OPTIONS}
            placeholder="문의유형"
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={INQUIRY_STATUS_FILTER_OPTIONS}
            placeholder="상태"
          />
        </div>
      </div>

      {/* ================================================================
          문의 테이블
          ================================================================ */}
      <div className="bg-white shadow-sm border border-gray-100 squircle-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  제목
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  접수일
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
                      <div className="h-5 w-16 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-20 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="h-4 w-40 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-5 w-16 bg-gray-100 squircle-xs animate-pulse" />
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
                items.map((item) => {
                  const typeBadge = INQUIRY_TYPE_BADGE[item.inquiry_type];
                  const stBadge = INQUIRY_STATUS_BADGE[item.status];

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => handleDetailClick(item)}
                    >
                      {/* 유형 */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant={typeBadge.variant} size="sm">
                          {typeBadge.label}
                        </Badge>
                      </td>

                      {/* 이름 */}
                      <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap max-w-[120px] truncate">
                        {item.name}
                      </td>

                      {/* 제목 */}
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap max-w-[250px] truncate hidden md:table-cell">
                        {item.subject ?? <span className="text-gray-300">-</span>}
                      </td>

                      {/* 상태 */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant={stBadge.variant} size="sm">
                          {stBadge.label}
                        </Badge>
                      </td>

                      {/* 접수일 */}
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap tabular-nums hidden md:table-cell">
                        {formatDate(item.created_at)}
                      </td>

                      {/* 액션 */}
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDetailClick(item);
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                          >
                            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M7 4.5V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
                          </svg>
                          보기
                        </Button>
                      </td>
                    </tr>
                  );
                })
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
          상세 모달
          ================================================================ */}
      {detailTarget && (
        <DetailModal
          inquiry={detailTarget}
          onClose={handleDetailClose}
          onSave={handleDetailSave}
        />
      )}
    </div>
  );
}
