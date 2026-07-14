"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import type { EventEntry } from "@/types/event";

/* ==========================================================================
   EventEntryListClient — 관리자 이벤트 참여자 목록 클라이언트 컴포넌트

   서버 컴포넌트(page.tsx)에서 전체 참여자를 받아 렌더링합니다.
   이벤트 규모가 작아(수백 건) 검색·CSV 다운로드는 메모리에서 처리합니다.

   기능:
   - 검색 (이벤트명/성함/면허번호/연락처/약국명)
   - 참여자 테이블 (이벤트, 성함, 면허번호, 연락처, 약국명, 참여일시)
   - CSV 다운로드 (Excel 호환 UTF-8 BOM)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventEntryListClientProps {
  initialItems: EventEntry[];
  total: number;
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
}: EventEntryListClientProps) {
  const [search, setSearch] = useState("");

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
    </div>
  );
}
