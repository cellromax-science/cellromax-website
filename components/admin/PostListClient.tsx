"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";

import type { BadgeVariant } from "@/components/ui/Badge";
import type { Post, PostType } from "@/types/newsroom";

/* ==========================================================================
   PostListClient — 관리자 게시판(뉴스룸) 목록 클라이언트 컴포넌트

   서버 컴포넌트(page.tsx)에서 초기 데이터를 받아 렌더링하고,
   검색/필터/삭제 등 인터랙션은 클라이언트에서 처리합니다.

   기능:
   - 검색 (제목 기준)
   - 게시 유형 필터
   - 게시글 테이블 (유형, 제목, 고정, 노출, 게시일, 액션)
   - 삭제 확인 모달
   - 페이지네이션 (이전/다음 + 페이지 번호)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostListClientProps {
  /** 서버에서 패칭한 초기 게시글 목록 */
  initialPosts: Post[];
  /** 서버에서 패칭한 전체 게시글 수 */
  initialTotal: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 게시 유형별 Badge 변형 매핑 */
const POST_TYPE_BADGE: Record<PostType, { variant: BadgeVariant; label: string }> = {
  notice: { variant: "info", label: "공지사항" },
  news: { variant: "success", label: "회사소식" },
  video: { variant: "warning", label: "홍보영상" },
};

/** 게시 유형 필터 Select 옵션 */
const POST_TYPE_FILTER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "notice", label: "공지사항" },
  { value: "news", label: "회사소식" },
  { value: "video", label: "홍보영상" },
];

/** 페이지당 항목 수 */
const PAGE_LIMIT = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 날짜 문자열 -> YYYY.MM.DD 형식 */
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

/** 활성/비활성 상태 도트 */
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

/** 고정 게시글 핀 아이콘 */
function PinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="고정됨"
      className="text-primary"
    >
      <path
        d="M9.828 2.172L13.828 6.172C14.016 6.36 14.016 6.668 13.828 6.856L10.5 10.184L10.5 12.5C10.5 12.632 10.448 12.758 10.354 12.854L9.354 13.854C9.166 14.042 8.858 14.042 8.67 13.854L5.5 10.684L2.854 13.33C2.666 13.518 2.358 13.518 2.17 13.33C1.982 13.142 1.982 12.834 2.17 12.646L4.816 10L1.646 6.83C1.458 6.642 1.458 6.334 1.646 6.146L2.646 5.146C2.74 5.052 2.868 5 3 5H5.316L8.644 1.672C8.832 1.484 9.14 1.484 9.328 1.672L9.828 2.172Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** 빈 상태 표시 */
function EmptyState() {
  return (
    <tr>
      <td colSpan={100} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          {/* 빈 상태 아이콘 — 게시글(문서) */}
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
                d="M7 4C7 3.44772 7.44772 3 8 3H16L22 9V24C22 24.5523 21.5523 25 21 25H8C7.44772 25 7 24.5523 7 24V4Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M16 3V9H22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M11 14H18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M11 18H18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">
            등록된 게시글이 없습니다
          </p>
          <p className="text-xs text-gray-400">
            새 게시글을 작성하여 시작하세요
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
  postTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({
  postTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  // ESC 키로 모달 닫기
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
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={!isDeleting ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* 모달 */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white squircle-xl p-6 shadow-xl max-w-sm w-full animate-slide-up"
      >
        {/* 경고 아이콘 */}
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

        {/* 텍스트 */}
        <h3
          id="delete-modal-title"
          className="text-center text-lg font-semibold text-gray-900 mb-2"
        >
          이 게시글을 삭제하시겠습니까?
        </h3>
        <p
          id="delete-modal-desc"
          className="text-center text-sm text-gray-500 mb-1"
        >
          <span className="font-medium text-gray-700">{postTitle}</span>
        </p>
        <p className="text-center text-xs text-gray-400 mb-6">
          삭제된 게시글은 복구할 수 없습니다.
        </p>

        {/* 버튼 */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={onConfirm}
            loading={isDeleting}
            disabled={isDeleting}
            className="flex-1"
          >
            삭제
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// PostListClient Component
// ---------------------------------------------------------------------------

export function PostListClient({
  initialPosts,
  initialTotal,
}: PostListClientProps) {
  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [postType, setPostType] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 삭제 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --------------------------------------------------------------------------
  // Fetch Posts
  // --------------------------------------------------------------------------

  const fetchPosts = useCallback(
    async (
      searchQuery: string,
      typeFilter: string,
      pageNum: number,
    ) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (typeFilter) params.set("post_type", typeFilter);
        params.set("page", String(pageNum));
        params.set("limit", String(PAGE_LIMIT));

        const res = await fetch(`/api/posts?${params.toString()}`);
        if (!res.ok) {
          throw new Error("게시글 목록을 불러오지 못했습니다.");
        }

        const data = await res.json();
        setPosts(data.posts ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "목록 조회 중 오류가 발생했습니다.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // --------------------------------------------------------------------------
  // Search & Filter Handlers
  // --------------------------------------------------------------------------

  /** 검색어 변경 시 디바운스 타이머 */
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPosts(search, postType, 1);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, postType]);

  /** 게시 유형 필터 변경 */
  const handlePostTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPostType(e.target.value);
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
      fetchPosts(search, postType, newPage);
    },
    [fetchPosts, search, postType],
  );

  // --------------------------------------------------------------------------
  // Delete Handlers
  // --------------------------------------------------------------------------

  const handleDeleteClick = useCallback((post: Post) => {
    setDeleteTarget(post);
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
      const res = await fetch(`/api/posts/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || "게시글 삭제에 실패했습니다.",
        );
      }

      // 클라이언트 state에서 즉시 제거
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success("게시글이 삭제되었습니다.");
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "게시글 삭제에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

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
            게시판 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            총 {total.toLocaleString("ko-KR")}개의 게시글
          </p>
        </div>

        <Link href="posts/new">
          <Button variant="primary" size="md">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            새 게시글 작성
          </Button>
        </Link>
      </div>

      {/* ================================================================
          검색 + 필터 바
          ================================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="제목으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={postType}
            onChange={handlePostTypeChange}
            options={POST_TYPE_FILTER_OPTIONS}
            placeholder="게시 유형"
          />
        </div>
      </div>

      {/* ================================================================
          게시글 테이블
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
                  제목
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  고정
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  노출
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  게시일
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                /* 로딩 스켈레톤 — 5행 x 6열 */
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="px-5 py-3">
                      <div className="h-5 w-16 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-48 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="h-4 w-8 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-12 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="h-4 w-20 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-16 bg-gray-100 squircle-xs animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : posts.length === 0 ? (
                <EmptyState />
              ) : (
                posts.map((post) => {
                  const badge = POST_TYPE_BADGE[post.post_type];

                  return (
                    <tr
                      key={post.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      {/* 유형 */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant={badge.variant} size="sm">
                          {badge.label}
                        </Badge>
                      </td>

                      {/* 제목 */}
                      <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap max-w-[300px] truncate">
                        {post.title_ko}
                      </td>

                      {/* 고정 */}
                      <td className="px-5 py-3 whitespace-nowrap hidden md:table-cell">
                        {post.is_pinned ? (
                          <PinIcon />
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* 노출 상태 */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <ActiveDot active={post.is_active} />
                      </td>

                      {/* 게시일 */}
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap tabular-nums hidden md:table-cell">
                        {formatDate(post.published_at)}
                      </td>

                      {/* 액션 */}
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* 수정 버튼 */}
                          <Link href={`posts/${post.id}`}>
                            <Button variant="ghost" size="xs">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                              >
                                <path
                                  d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M8 4L10 6"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                />
                              </svg>
                              수정
                            </Button>
                          </Link>

                          {/* 삭제 버튼 */}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDeleteClick(post)}
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
                              <path
                                d="M2 4H12"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M5.5 1.5H8.5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M5.5 7V10.5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M8.5 7V10.5"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                            </svg>
                            삭제
                          </Button>
                        </div>
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M9 3L5 7L9 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* 페이지 번호들 */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  // 현재 페이지 전후 2페이지 + 첫/마지막 표시
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
                    <span
                      key={`ellipsis-${i}`}
                      className="flex h-8 w-8 items-center justify-center text-xs text-gray-400"
                    >
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5 3L9 7L5 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
          postTitle={deleteTarget.title_ko}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}
