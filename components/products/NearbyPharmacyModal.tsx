"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { loadKakaoMap } from "@/lib/kakaomap";

interface NearbyPharmacy {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
}

type MapStatus = "idle" | "locating" | "loading" | "success" | "error";

export function NearbyPharmacyModal() {
  const t = useTranslations("products.detail");
  const tCommon = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<MapStatus>("idle");
  const [pharmacies, setPharmacies] = useState<NearbyPharmacy[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleLocate = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMessage("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return;
    }

    setStatus("locating");
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setStatus("loading");

        try {
          const res = await fetch(
            `/api/pharmacies/nearby?lat=${latitude}&lng=${longitude}&radius=3`
          );
          if (!res.ok) throw new Error("API request failed");
          const json = await res.json();
          setPharmacies(json.pharmacies ?? []);
          setStatus("success");
        } catch {
          setStatus("error");
          setErrorMessage("주변 약국을 불러오는 데 실패했습니다.");
        }
      },
      (err) => {
        setStatus("error");
        if (err.code === 1) {
          setErrorMessage("위치 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.");
        } else {
          setErrorMessage("위치를 가져올 수 없습니다. 다시 시도해 주세요.");
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // 모달 오픈 시 자동으로 위치 요청 시작
  const handleOpen = useCallback(() => {
    setOpen(true);
    // idle 상태일 때만 자동 시작
    if (status === "idle") {
      // 약간의 딜레이를 줘서 모달이 먼저 렌더링되도록
      setTimeout(() => handleLocate(), 300);
    }
  }, [status, handleLocate]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // 약국 데이터 로드 완료 시 카카오맵 초기화
  useEffect(() => {
    if (status !== "success" || !mapContainerRef.current || pharmacies.length === 0) return;

    const container = mapContainerRef.current;
    let isMounted = true;

    loadKakaoMap()
      .then((kakao) => {
        if (!isMounted || !container) return;

        const center = new kakao.maps.LatLng(
          pharmacies[0].latitude,
          pharmacies[0].longitude
        );
        const map = new kakao.maps.Map(container, { center, level: 5 });

        pharmacies.forEach((pharmacy) => {
          const position = new kakao.maps.LatLng(pharmacy.latitude, pharmacy.longitude);
          const marker = new kakao.maps.Marker({ map, position });

          const infoContent = `
            <div style="padding:8px 12px;font-size:13px;line-height:1.5;font-family:Pretendard,sans-serif;min-width:160px;">
              <strong style="color:#0a1628;">${pharmacy.name}</strong><br/>
              <span style="color:#6b7280;font-size:12px;">${pharmacy.address}</span><br/>
              <span style="color:#c5a55a;font-size:11px;">${pharmacy.distance_km.toFixed(1)}km</span>
            </div>
          `;

          const infoWindow = new kakao.maps.InfoWindow({
            content: infoContent,
            removable: true,
          });

          kakao.maps.event.addListener(marker, "click", () => {
            infoWindow.open(map, marker);
          });
        });
      })
      .catch(() => {
        // 맵 로드 실패 — 리스트는 계속 표시
      });

    return () => {
      isMounted = false;
    };
  }, [status, pharmacies]);

  return (
    <>
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-5 py-2.5 squircle-md bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors duration-150"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {t("findPharmacy")}
      </button>

      {/* 모달 */}
      <Modal open={open} onClose={handleClose} title={t("pharmacyModalTitle")} size="lg">
        <div className="space-y-4">
          {/* locating / loading 상태 */}
          {(status === "locating" || status === "loading") && (
            <div className="space-y-4">
              <Skeleton variant="rectangular" height="360px" />
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{status === "locating" ? "위치 확인 중..." : "약국 불러오는 중..."}</span>
              </div>
            </div>
          )}

          {/* error 상태 */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <svg className="size-12 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="text-sm text-gray-600">{errorMessage}</p>
              <button
                onClick={handleLocate}
                type="button"
                className="px-4 py-2 squircle-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                {tCommon("retry")}
              </button>
            </div>
          )}

          {/* success 상태 */}
          {status === "success" && (
            <>
              {pharmacies.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                  주변 3km 내 약국이 없습니다.
                </div>
              ) : (
                <>
                  {/* 카카오맵 */}
                  <div
                    ref={mapContainerRef}
                    className="w-full h-[360px] squircle-lg overflow-hidden bg-gray-100 border border-gray-200"
                    aria-label="주변 약국 지도"
                  />

                  {/* 약국 리스트 */}
                  <ul className="space-y-2 max-h-48 overflow-y-auto" role="list">
                    {pharmacies.map((pharmacy) => (
                      <li
                        key={pharmacy.id}
                        className="flex items-start gap-3 p-3 squircle-md bg-gray-50 border border-gray-100"
                      >
                        <svg className="size-4 text-secondary mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-primary">{pharmacy.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{pharmacy.address}</p>
                          {pharmacy.phone && (
                            <a
                              href={`tel:${pharmacy.phone}`}
                              className="text-xs text-secondary hover:underline mt-0.5 inline-block"
                            >
                              {pharmacy.phone}
                            </a>
                          )}
                        </div>
                        <span className="text-xs text-secondary font-semibold whitespace-nowrap">
                          {pharmacy.distance_km.toFixed(1)}km
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
