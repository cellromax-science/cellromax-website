"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { geocodePharmacyAddress } from "@/lib/kakaomap";

/* ==========================================================================
   PharmacyCoordAuditModal — 약국 좌표 전수 검증 + 일괄 정정

   DB에 저장된 약국 좌표가 실제 주소 위치와 일치하는지 카카오 지오코딩으로
   재검증하고, 어긋난 약국의 좌표를 일괄 정정한다.

   배경: 2026-10 전수 검증에서 외부 임포트 데이터의 좌표 오류 707건 발견.
   외부에서 데이터를 다시 들여오거나 좌표가 의심될 때 이 도구로 점검한다.

   흐름:
   1. /api/pharmacies/audit 에서 활성 약국 전체 조회
   2. 브라우저에서 주소별 카카오 지오코딩 (동시 3건)
   3. 저장 좌표와 300m 이상 어긋난 약국 목록 표시
   4. "일괄 정정" 클릭 시 /api/pharmacies/audit PATCH (100건씩 분할)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface PharmacyCoordAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 좌표 정정 완료 후 호출 — 목록 새로고침용 */
  onSuccess: () => void;
}

interface AuditRow {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface Mismatch {
  id: string;
  name: string;
  address: string;
  matchedAddress: string;
  newLat: number;
  newLng: number;
  km: number;
}

type AuditStep = "idle" | "scanning" | "done" | "fixing";

/** 이 거리(km) 이상 어긋나면 불일치로 판정 */
const MISMATCH_THRESHOLD_KM = 0.3;

/** 동시 지오코딩 요청 수 */
const CONCURRENCY = 3;

/** 일괄 정정 요청당 건수 (API 제한과 동일) */
const FIX_CHUNK_SIZE = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 두 좌표 사이 거리 (km, Haversine) */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PharmacyCoordAuditModal({ isOpen, onClose, onSuccess }: PharmacyCoordAuditModalProps) {
  const [step, setStep] = useState<AuditStep>("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [mismatches, setMismatches] = useState<Mismatch[]>([]);
  const [unresolved, setUnresolved] = useState<AuditRow[]>([]);
  const [fixProgress, setFixProgress] = useState({ current: 0, total: 0 });

  const abortRef = useRef(false);

  // ESC로 닫기 (검증/정정 중에는 비활성)
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && step !== "scanning" && step !== "fixing") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, step]);

  // 모달 닫을 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      abortRef.current = true;
      setStep("idle");
      setProgress({ current: 0, total: 0 });
      setMismatches([]);
      setUnresolved([]);
      setFixProgress({ current: 0, total: 0 });
    } else {
      abortRef.current = false;
    }
  }, [isOpen]);

  // --------------------------------------------------------------------------
  // 검증 실행
  // --------------------------------------------------------------------------

  const handleScan = useCallback(async () => {
    setStep("scanning");
    setMismatches([]);
    setUnresolved([]);

    try {
      const res = await fetch("/api/pharmacies/audit");
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "약국 목록을 불러오지 못했습니다.");
      }
      const { pharmacies } = (await res.json()) as { pharmacies: AuditRow[] };

      setProgress({ current: 0, total: pharmacies.length });

      const foundMismatches: Mismatch[] = [];
      const foundUnresolved: AuditRow[] = [];
      let done = 0;
      let cursor = 0;

      const worker = async () => {
        while (cursor < pharmacies.length) {
          if (abortRef.current) return;
          const row = pharmacies[cursor++];

          try {
            const result = await geocodePharmacyAddress(row.address);
            if (!result) {
              foundUnresolved.push(row);
            } else {
              const km = distanceKm(row.latitude, row.longitude, result.lat, result.lng);
              if (km > MISMATCH_THRESHOLD_KM) {
                foundMismatches.push({
                  id: row.id,
                  name: row.name,
                  address: row.address,
                  matchedAddress: result.matchedAddress,
                  newLat: result.lat,
                  newLng: result.lng,
                  km: Math.round(km * 100) / 100,
                });
              }
            }
          } catch {
            foundUnresolved.push(row);
          }

          done++;
          if (done % 10 === 0 || done === pharmacies.length) {
            setProgress({ current: done, total: pharmacies.length });
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      if (abortRef.current) return;

      foundMismatches.sort((a, b) => b.km - a.km);
      setMismatches(foundMismatches);
      setUnresolved(foundUnresolved);
      setStep("done");
    } catch (err) {
      if (abortRef.current) return;
      const message = err instanceof Error ? err.message : "좌표 검증 중 오류가 발생했습니다.";
      toast.error(message);
      setStep("idle");
    }
  }, []);

  // --------------------------------------------------------------------------
  // 일괄 정정
  // --------------------------------------------------------------------------

  const handleFix = useCallback(async () => {
    if (mismatches.length === 0) return;

    setStep("fixing");
    setFixProgress({ current: 0, total: mismatches.length });

    try {
      for (let i = 0; i < mismatches.length; i += FIX_CHUNK_SIZE) {
        const chunk = mismatches.slice(i, i + FIX_CHUNK_SIZE);
        const res = await fetch("/api/pharmacies/audit", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates: chunk.map((m) => ({
              id: m.id,
              latitude: m.newLat,
              longitude: m.newLng,
            })),
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || "좌표 정정에 실패했습니다.");
        }

        setFixProgress({
          current: Math.min(i + FIX_CHUNK_SIZE, mismatches.length),
          total: mismatches.length,
        });
      }

      toast.success(`${mismatches.length}개 약국의 좌표를 정정했습니다.`);
      setMismatches([]);
      setStep("done");
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "좌표 정정에 실패했습니다.";
      toast.error(message);
      setStep("done");
    }
  }, [mismatches, onSuccess]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (!isOpen) return null;

  const isBusy = step === "scanning" || step === "fixing";

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={!isBusy ? onClose : undefined}
        aria-hidden="true"
      />

      {/* 모달 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coord-audit-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white squircle-xl p-6 shadow-xl max-w-3xl w-full animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        <h3 id="coord-audit-title" className="text-lg font-semibold text-gray-900 mb-2">
          약국 좌표 검증
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          등록된 모든 약국의 좌표가 실제 주소 위치와 일치하는지 카카오 지오코딩으로 재검증합니다.
        </p>

        {/* ============================================================
            Step: 시작 전
            ============================================================ */}
        {step === "idle" && (
          <div>
            <div className="p-3 bg-gray-50 squircle-md text-xs text-gray-500 leading-relaxed">
              전체 약국 수에 따라 수십 분이 걸릴 수 있습니다. 검증 중에는 이 창을
              닫지 마세요. 주소 위치와 300m 이상 어긋난 약국이 목록으로 표시되며,
              확인 후 일괄 정정할 수 있습니다.
            </div>
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <Button variant="outline" size="md" onClick={onClose} className="flex-1">
                닫기
              </Button>
              <Button variant="primary" size="md" onClick={handleScan} className="flex-1">
                검증 시작
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================
            Step: 검증 중
            ============================================================ */}
        {step === "scanning" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <svg className="animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              좌표 검증 중... {progress.current.toLocaleString("ko-KR")}/{progress.total.toLocaleString("ko-KR")}
            </p>
            <div className="w-full max-w-sm h-2 bg-gray-200 squircle-xs overflow-hidden">
              <div
                className="h-full bg-primary squircle-xs transition-all duration-200"
                style={{
                  width: progress.total > 0
                    ? `${Math.round((progress.current / progress.total) * 100)}%`
                    : "0%",
                }}
                role="progressbar"
                aria-valuenow={progress.current}
                aria-valuemin={0}
                aria-valuemax={progress.total}
              />
            </div>
            <p className="text-xs text-gray-400">
              창을 닫으면 검증이 중단됩니다.
            </p>
          </div>
        )}

        {/* ============================================================
            Step: 결과 / 정정 중
            ============================================================ */}
        {(step === "done" || step === "fixing") && (
          <div>
            {/* 요약 */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 squircle-md">
              <p className="text-sm text-gray-700">
                전체 <span className="font-semibold">{progress.total.toLocaleString("ko-KR")}</span>건 중{" "}
                <span className="font-semibold text-error">{mismatches.length.toLocaleString("ko-KR")}</span>건 위치 불일치
                {unresolved.length > 0 && (
                  <>
                    , <span className="font-semibold text-warning">{unresolved.length.toLocaleString("ko-KR")}</span>건 변환 불가
                  </>
                )}
              </p>
            </div>

            {/* 불일치 목록 */}
            {mismatches.length > 0 ? (
              <div className="border border-gray-100 squircle-lg overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="border-b border-gray-100 bg-gray-50/90">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">약국명</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">주소</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 w-20">오차</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 hidden md:table-cell">변환 주소</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mismatches.map((m) => (
                      <tr key={m.id}>
                        <td className="px-3 py-2 text-gray-900 font-medium whitespace-nowrap max-w-[120px] truncate">
                          {m.name}
                        </td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap max-w-[200px] truncate">
                          {m.address}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Badge variant={m.km >= 3 ? "error" : "warning"} size="sm">
                            {m.km >= 10 ? `${Math.round(m.km)}km` : `${m.km}km`}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap max-w-[180px] truncate hidden md:table-cell">
                          {m.matchedAddress}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-gray-500 border border-gray-100 squircle-lg">
                위치가 어긋난 약국이 없습니다.
              </div>
            )}

            {unresolved.length > 0 && (
              <p className="mt-3 text-xs text-gray-400">
                변환 불가 {unresolved.length}건은 주소가 불완전해 자동 검증할 수 없습니다. 주소를 수정하거나 수동으로 확인해 주세요.
              </p>
            )}

            {/* 정정 진행 바 */}
            {step === "fixing" && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  좌표 정정 중... {fixProgress.current}/{fixProgress.total}
                </p>
                <div className="w-full h-2 bg-gray-200 squircle-xs overflow-hidden">
                  <div
                    className="h-full bg-primary squircle-xs transition-all duration-200"
                    style={{
                      width: fixProgress.total > 0
                        ? `${Math.round((fixProgress.current / fixProgress.total) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                size="md"
                onClick={onClose}
                disabled={step === "fixing"}
                className="flex-1"
              >
                닫기
              </Button>
              {mismatches.length > 0 && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleFix}
                  disabled={step === "fixing"}
                  className="flex-1"
                >
                  {mismatches.length}건 일괄 정정
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
