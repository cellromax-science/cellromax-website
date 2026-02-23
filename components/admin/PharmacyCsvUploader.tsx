"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { geocodeAddress } from "@/lib/kakaomap";

/* ==========================================================================
   PharmacyCsvUploader — CSV 파일 업로드 + 카카오 지오코딩 + 일괄 등록

   기능 흐름:
   1. CSV 파일 선택 (드래그앤드롭 또는 클릭)
   2. 브라우저에서 직접 CSV 파싱 (순수 JS, BOM 처리)
   3. 카카오 지오코딩으로 주소 → 좌표 변환
   4. 미리보기 테이블 (성공/실패 표시)
   5. 성공한 행만 서버에 일괄 등록
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PharmacyCsvUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  index: number;
  name: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodeFailed: boolean;
}

type UploaderStep = "select" | "geocoding" | "preview" | "uploading";

// ---------------------------------------------------------------------------
// CSV Parser — 순수 JS 구현
// ---------------------------------------------------------------------------

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // UTF-8 BOM 제거
  const cleaned = text.replace(/^\uFEFF/, "");

  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// PharmacyCsvUploader Component
// ---------------------------------------------------------------------------

export function PharmacyCsvUploader({ isOpen, onClose, onSuccess }: PharmacyCsvUploaderProps) {
  const [step, setStep] = useState<UploaderStep>("select");
  const [isDragOver, setIsDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // 지오코딩 진행 상태
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [geocodeProgress, setGeocodeProgress] = useState({ current: 0, total: 0 });

  // 업로드 상태
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  // 성공/실패 집계
  const successCount = parsedRows.filter((r) => !r.geocodeFailed).length;
  const failCount = parsedRows.filter((r) => r.geocodeFailed).length;

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && step !== "geocoding" && step !== "uploading") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, step]);

  // 모달 닫을 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setIsDragOver(false);
      setParseError(null);
      setParsedRows([]);
      setGeocodeProgress({ current: 0, total: 0 });
      setIsUploading(false);
      abortRef.current = true;
    } else {
      abortRef.current = false;
    }
  }, [isOpen]);

  // --------------------------------------------------------------------------
  // CSV 처리 + 지오코딩
  // --------------------------------------------------------------------------

  const processFile = useCallback(async (file: File) => {
    setParseError(null);

    // 파일 형식 검증
    if (!file.name.endsWith(".csv")) {
      setParseError("CSV 파일만 업로드할 수 있습니다.");
      return;
    }

    // 파일 읽기
    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    // 헤더 검증
    const normalizedHeaders = headers.map((h) => h.replace(/\s/g, ""));
    const nameIdx = normalizedHeaders.findIndex(
      (h) => h === "상호명" || h === "이름" || h === "약국명" || h === "name"
    );
    const addressIdx = normalizedHeaders.findIndex(
      (h) => h === "주소" || h === "address"
    );
    const phoneIdx = normalizedHeaders.findIndex(
      (h) => h === "전화번호" || h === "전화" || h === "phone"
    );

    if (nameIdx === -1 || addressIdx === -1) {
      setParseError("CSV 파일에 '상호명'과 '주소' 헤더가 필요합니다.");
      return;
    }

    if (rows.length === 0) {
      setParseError("CSV 파일에 데이터가 없습니다.");
      return;
    }

    // 파싱된 행 생성
    const initialRows: ParsedRow[] = rows.map((row, i) => ({
      index: i + 1,
      name: row[nameIdx] ?? "",
      address: row[addressIdx] ?? "",
      phone: phoneIdx !== -1 ? row[phoneIdx] || null : null,
      latitude: null,
      longitude: null,
      geocodeFailed: false,
    })).filter((row) => row.name && row.address);

    if (initialRows.length === 0) {
      setParseError("유효한 데이터 행이 없습니다. 상호명과 주소가 비어있지 않은지 확인하세요.");
      return;
    }

    // 지오코딩 시작
    setStep("geocoding");
    setGeocodeProgress({ current: 0, total: initialRows.length });
    setParsedRows(initialRows);

    const geocodedRows = [...initialRows];

    for (let i = 0; i < geocodedRows.length; i++) {
      if (abortRef.current) return;

      try {
        const result = await geocodeAddress(geocodedRows[i].address);
        if (result) {
          geocodedRows[i] = {
            ...geocodedRows[i],
            latitude: result.lat,
            longitude: result.lng,
            geocodeFailed: false,
          };
        } else {
          geocodedRows[i] = {
            ...geocodedRows[i],
            geocodeFailed: true,
          };
        }
      } catch {
        geocodedRows[i] = {
          ...geocodedRows[i],
          geocodeFailed: true,
        };
      }

      setGeocodeProgress({ current: i + 1, total: initialRows.length });
      setParsedRows([...geocodedRows]);
    }

    setStep("preview");
  }, []);

  // --------------------------------------------------------------------------
  // 파일 선택 핸들러
  // --------------------------------------------------------------------------

  const handleFile = useCallback((file: File) => {
    processFile(file);
  }, [processFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentTarget = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = "";
  }, [handleFile]);

  // --------------------------------------------------------------------------
  // 서버 업로드
  // --------------------------------------------------------------------------

  const handleUpload = useCallback(async () => {
    const successRows = parsedRows.filter((r) => !r.geocodeFailed);
    if (successRows.length === 0) {
      toast.error("업로드할 데이터가 없습니다.");
      return;
    }

    setStep("uploading");
    setIsUploading(true);

    try {
      const pharmacies = successRows.map((row) => ({
        name: row.name,
        address: row.address,
        phone: row.phone,
        latitude: row.latitude!,
        longitude: row.longitude!,
      }));

      const res = await fetch("/api/pharmacies/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacies }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "약국 등록에 실패했습니다.");
      }

      toast.success(`${successRows.length}개의 약국이 등록되었습니다.`);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "약국 등록에 실패했습니다.";
      toast.error(message);
      setStep("preview");
    } finally {
      setIsUploading(false);
    }
  }, [parsedRows, onSuccess, onClose]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={step !== "geocoding" && step !== "uploading" ? onClose : undefined}
        aria-hidden="true"
      />

      {/* 모달 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-modal-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white squircle-xl p-6 shadow-xl max-w-3xl w-full animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        <h3 id="csv-modal-title" className="text-lg font-semibold text-gray-900 mb-6">
          CSV 약국 업로드
        </h3>

        {/* ============================================================
            Step 1: 파일 선택
            ============================================================ */}
        {step === "select" && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleInputChange}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />

            <div
              className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed squircle-lg cursor-pointer transition-all ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="CSV 파일을 드래그하거나 클릭하여 선택"
            >
              <svg
                className={isDragOver ? "text-primary" : "text-gray-400"}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                width="40"
                height="40"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
              <div className="text-center">
                <p className={`text-sm font-medium ${isDragOver ? "text-primary" : "text-gray-600"}`}>
                  CSV 파일을 드래그하거나 클릭하여 선택
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  CSV 형식: 상호명, 주소, 전화번호 (첫 줄 헤더)
                </p>
              </div>
            </div>

            {parseError && (
              <p className="mt-3 text-sm text-error" role="alert">{parseError}</p>
            )}

            {/* CSV 형식 안내 */}
            <div className="mt-4 p-3 bg-gray-50 squircle-md">
              <p className="text-xs font-medium text-gray-600 mb-1">CSV 파일 형식 안내</p>
              <p className="text-xs text-gray-400">
                첫 줄에 헤더가 있어야 합니다. 필수: <span className="font-medium text-gray-600">상호명</span>, <span className="font-medium text-gray-600">주소</span> / 선택: <span className="font-medium text-gray-600">전화번호</span>
              </p>
              <div className="mt-2 p-2 bg-white squircle-sm text-xs font-mono text-gray-500">
                상호명,주소,전화번호<br />
                세이프약국,서울특별시 강남구 테헤란로 123,02-1234-5678<br />
                건강약국,서울특별시 서초구 반포대로 456,02-9876-5432
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="outline" size="md" onClick={onClose}>
                닫기
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================
            Step 2: 지오코딩 진행 중
            ============================================================ */}
        {step === "geocoding" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <svg className="animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              주소 변환 중... {geocodeProgress.current}/{geocodeProgress.total}
            </p>
            <div className="w-full max-w-sm h-2 bg-gray-200 squircle-xs overflow-hidden">
              <div
                className="h-full bg-primary squircle-xs transition-all duration-200"
                style={{
                  width: geocodeProgress.total > 0
                    ? `${Math.round((geocodeProgress.current / geocodeProgress.total) * 100)}%`
                    : "0%",
                }}
                role="progressbar"
                aria-valuenow={geocodeProgress.current}
                aria-valuemin={0}
                aria-valuemax={geocodeProgress.total}
              />
            </div>
            <p className="text-xs text-gray-400">
              카카오맵 API로 주소를 좌표로 변환하고 있습니다.
            </p>
          </div>
        )}

        {/* ============================================================
            Step 3: 미리보기
            ============================================================ */}
        {step === "preview" && (
          <div>
            {/* 요약 */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 squircle-md">
              <p className="text-sm text-gray-700">
                전체 <span className="font-semibold">{parsedRows.length}</span>건 중{" "}
                <span className="font-semibold text-success">{successCount}</span>건 성공,{" "}
                <span className="font-semibold text-error">{failCount}</span>건 실패
              </p>
            </div>

            {/* 미리보기 테이블 */}
            <div className="border border-gray-100 squircle-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="border-b border-gray-100 bg-gray-50/90">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">상호명</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">주소</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 hidden sm:table-cell">전화번호</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 hidden md:table-cell w-20">위도</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 hidden md:table-cell w-20">경도</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-20">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={row.geocodeFailed ? "bg-error/5" : ""}
                    >
                      <td className="px-3 py-2 text-xs text-gray-400 tabular-nums">
                        {row.index}
                      </td>
                      <td className="px-3 py-2 text-gray-900 font-medium whitespace-nowrap max-w-[120px] truncate">
                        {row.name}
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap max-w-[200px] truncate">
                        {row.address}
                      </td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap hidden sm:table-cell">
                        {row.phone ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-400 tabular-nums text-xs hidden md:table-cell">
                        {row.latitude?.toFixed(4) ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-400 tabular-nums text-xs hidden md:table-cell">
                        {row.longitude?.toFixed(4) ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        {row.geocodeFailed ? (
                          <Badge variant="error" size="sm">실패</Badge>
                        ) : (
                          <Badge variant="success" size="sm">성공</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {failCount > 0 && (
              <p className="mt-3 text-xs text-gray-400">
                주소 변환에 실패한 행은 업로드에서 제외됩니다.
              </p>
            )}

            {/* 버튼 */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <Button variant="outline" size="md" onClick={onClose} className="flex-1">
                취소
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleUpload}
                disabled={successCount === 0}
                className="flex-1"
              >
                {successCount}건 업로드
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================
            Step 4: 업로드 중
            ============================================================ */}
        {step === "uploading" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <svg className="animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              서버에 등록 중...
            </p>
            <p className="text-xs text-gray-400">
              {successCount}개의 약국 데이터를 서버에 저장하고 있습니다.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
