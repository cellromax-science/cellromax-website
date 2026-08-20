"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

import type { EventEntry, EventDestructionLog } from "@/types/event";

/* ==========================================================================
   EventEntryListClient — 관리자 이벤트 참여자 목록 클라이언트 컴포넌트

   서버 컴포넌트(page.tsx)에서 전체 참여자를 받아 렌더링합니다.
   이벤트 규모가 작아(수백 건) 검색·CSV 다운로드는 메모리에서 처리합니다.

   기능:
   - 검색 (이벤트명/성함/면허번호/연락처/약국명)
   - 참여자 테이블 (이벤트, 성함, 면허번호, 연락처, 약국명, 참여일시)
   - CSV 다운로드 (Excel 호환 UTF-8 BOM)
   - 개인정보 파기 (총괄 관리자 전용) — 이벤트 명을 정확히 입력해야 실행,
     파기와 동시에 이력(event_destruction_logs)이 기록되고 하단에 표시됨
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventEntryListClientProps {
  initialItems: EventEntry[];
  total: number;
  /** 파기 이력 (최신순) */
  destructionLogs: EventDestructionLog[];
  /** 개인정보 파기 버튼 노출 여부 (총괄 관리자만 true) */
  canDestroy: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

/** CSV 필드 이스케이프 (쉼표·따옴표·줄바꿈 포함 시 따옴표로 감쌈) */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventEntryListClient({
  initialItems,
  total,
  destructionLogs,
  canDestroy,
}: EventEntryListClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // ---- 개인정보 파기 모달 상태 ----
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [destroyInput, setDestroyInput] = useState("");
  const [isDestroying, setIsDestroying] = useState(false);

  /** 현재 데이터에 존재하는 이벤트별 참여 건수 */
  const eventCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of initialItems) {
      map.set(item.event_title, (map.get(item.event_title) ?? 0) + 1);
    }
    return [...map.entries()];
  }, [initialItems]);

  /** 입력한 이벤트 명이 실제 데이터와 정확히 일치할 때만 파기 가능 */
  const destroyTarget = eventCounts.find(
    ([title]) => title === destroyInput.trim(),
  );

  /** ESC 키로 파기 모달 닫기 */
  useEffect(() => {
    if (!destroyOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isDestroying) {
        setDestroyOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [destroyOpen, isDestroying]);

  /** 파기 실행 */
  async function handleDestroy() {
    if (!destroyTarget || isDestroying) return;

    setIsDestroying(true);
    try {
      const res = await fetch("/api/events/destroy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventTitle: destroyTarget[0] }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "파기 처리 중 오류가 발생했습니다.");
      }

      toast.success(
        `'${destroyTarget[0]}' 참여 개인정보 ${Number(data.destroyedCount).toLocaleString("ko-KR")}건이 파기되었습니다. 파기 이력이 기록되었습니다.`,
      );
      setDestroyOpen(false);
      setDestroyInput("");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "파기 처리 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setIsDestroying(false);
    }
  }

  /** 검색 필터링 (이벤트명/성함/면허번호/연락처/약국명) */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialItems;
    return initialItems.filter(
      (item) =>
        item.event_title.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.license_number.includes(q) ||
        item.phone.includes(q) ||
        item.pharmacy_name.toLowerCase().includes(q),
    );
  }, [initialItems, search]);

  /** CSV 다운로드 — Excel에서 한글이 깨지지 않도록 UTF-8 BOM 추가 */
  function handleDownloadCsv() {
    const header = [
      "이벤트",
      "성함",
      "약사면허번호",
      "연락처",
      "약국명",
      "참여일시",
    ];
    const rows = filtered.map((item) => [
      item.event_title,
      item.name,
      item.license_number,
      item.phone,
      item.pharmacy_name,
      formatDateTime(item.created_at),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(csvField).join(","))
      .join("\r\n");

    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date();
    const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    a.href = url;
    a.download = `event-entries-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* ================================================================
          페이지 헤더
          ================================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            이벤트 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            총 {total.toLocaleString("ko-KR")}명 참여
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canDestroy && (
            <Button
              variant="danger"
              size="md"
              onClick={() => setDestroyOpen(true)}
              disabled={initialItems.length === 0}
            >
              개인정보 파기
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={handleDownloadCsv}
            disabled={filtered.length === 0}
          >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M8 2V11M8 11L4.5 7.5M8 11L11.5 7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2.5 13.5H13.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
            CSV 다운로드
          </Button>
        </div>
      </div>

      {/* ================================================================
          검색 바
          ================================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="이벤트명, 성함, 면허번호, 연락처, 약국명으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ================================================================
          참여자 테이블
          ================================================================ */}
      <div className="bg-white shadow-sm border border-gray-100 squircle-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  이벤트
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  성함
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  약사면허번호
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  연락처
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  약국명
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  참여일시
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
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
                            d="M23 14V23H5V14"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M3 9H25V14H3V9Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 23V9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M14 9H9.5C8.11929 9 7 7.88071 7 6.5C7 5.11929 8.11929 4 9.5 4C13 4 14 9 14 9Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 9H18.5C19.8807 9 21 7.88071 21 6.5C21 5.11929 19.8807 4 18.5 4C15 4 14 9 14 9Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        {search
                          ? "검색 결과가 없습니다"
                          : "아직 참여자가 없습니다"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap max-w-[200px] truncate hidden lg:table-cell">
                      {item.event_title}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {item.license_number}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">
                      {item.phone}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap max-w-[220px] truncate">
                      {item.pharmacy_name}
                    </td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap hidden md:table-cell">
                      {formatDateTime(item.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================
          개인정보 파기 이력
          ================================================================ */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          개인정보 파기 이력
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">
          파기 실행 시 자동으로 기록됩니다. 파기 관리대장 작성 시 이 값을
          사용하세요.
        </p>
        <div className="mt-3 bg-white shadow-sm border border-gray-100 squircle-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    파기 일시
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    이벤트
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    파기 건수
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    수집 기간
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    처리자
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {destructionLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-sm text-gray-400"
                    >
                      파기 이력이 없습니다
                    </td>
                  </tr>
                ) : (
                  destructionLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-5 py-3 text-gray-900 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap max-w-[220px] truncate">
                        {log.event_title}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {log.destroyed_count.toLocaleString("ko-KR")}건
                      </td>
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap hidden md:table-cell">
                        {log.entries_from && log.entries_to
                          ? `${formatDateTime(log.entries_from).slice(0, 10)} ~ ${formatDateTime(log.entries_to).slice(0, 10)}`
                          : "-"}
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {log.destroyed_by_name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================================================================
          개인정보 파기 확인 모달
          ================================================================ */}
      {destroyOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
            onClick={!isDestroying ? () => setDestroyOpen(false) : undefined}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="destroy-modal-title"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white squircle-xl p-6 shadow-xl max-w-md w-full animate-slide-up"
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
            <h3
              id="destroy-modal-title"
              className="text-center text-lg font-semibold text-gray-900 mb-2"
            >
              개인정보 파기
            </h3>
            <p className="text-center text-sm text-gray-500 mb-4">
              해당 이벤트의 참여자 개인정보(성함·면허번호·연락처·약국명)가{" "}
              <span className="font-semibold text-error">
                복구 불가능하게 영구 삭제
              </span>
              되며, 파기 이력이 자동 기록됩니다.
              <br />
              당첨자 발표·경품 발송이 끝난 뒤에 실행하세요.
            </p>

            {/* 현재 파기 가능한 이벤트 목록 */}
            <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              {eventCounts.map(([title, cnt]) => (
                <div key={title} className="flex justify-between py-0.5">
                  <span className="truncate">{title}</span>
                  <span className="ml-2 shrink-0 font-medium">
                    {cnt.toLocaleString("ko-KR")}건
                  </span>
                </div>
              ))}
            </div>

            <label
              htmlFor="destroy-input"
              className="block text-xs font-medium text-gray-500 mb-1.5"
            >
              파기할 이벤트 명을 정확히 입력하세요
            </label>
            <Input
              id="destroy-input"
              placeholder="예: 베베락스액 퀴즈 이벤트"
              value={destroyInput}
              onChange={(e) => setDestroyInput(e.target.value)}
              disabled={isDestroying}
            />
            {destroyInput.trim() && !destroyTarget && (
              <p className="mt-1.5 text-xs text-error">
                일치하는 이벤트가 없습니다. 위 목록의 이벤트 명과 정확히
                일치해야 합니다.
              </p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setDestroyOpen(false)}
                disabled={isDestroying}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDestroy}
                loading={isDestroying}
                disabled={!destroyTarget || isDestroying}
                className="flex-1"
              >
                {destroyTarget
                  ? `${destroyTarget[1].toLocaleString("ko-KR")}건 파기`
                  : "파기"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
