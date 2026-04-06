"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/Skeleton";
import { loadKakaoMap } from "@/lib/kakaomap";

/* ==========================================================================
   PharmacyFinder — 회원약국찾기 전용 페이지 컴포넌트

   NearbyPharmacyModal의 검색/지도/리스트 로직을 풀페이지 레이아웃으로 재구성.
   - GPS 기반 주변 약국 검색
   - 텍스트(지역명/약국명) 검색
   - 카카오맵 마커 표시
   - 약국 리스트 (전화번호 링크 포함)
   ========================================================================== */

interface NearbyPharmacy {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  distance_km?: number;
}

type MapStatus = "idle" | "locating" | "loading" | "success" | "error";

export function PharmacyFinder() {
  const t = useTranslations("pharmacy");
  const tCommon = useTranslations("common");

  const [status, setStatus] = useState<MapStatus>("idle");
  const [pharmacies, setPharmacies] = useState<NearbyPharmacy[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---- GPS 기반 주변 약국 검색 ----
  const handleLocate = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMessage(t("geoNotSupported"));
      return;
    }

    setIsSearchMode(false);
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
          setErrorMessage(t("fetchFailed"));
        }
      },
      (err) => {
        setStatus("error");
        if (err.code === 1) {
          setErrorMessage(t("geoDenied"));
        } else {
          setErrorMessage(t("geoFailed"));
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [t]);

  // ---- 텍스트 기반 약국 검색 ----
  const handleTextSearch = useCallback(async () => {
    const keyword = searchInput.trim();
    if (!keyword) return;

    setIsSearchMode(true);
    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/pharmacies/search?q=${encodeURIComponent(keyword)}`
      );
      if (!res.ok) throw new Error("API request failed");
      const json = await res.json();
      const results: NearbyPharmacy[] = json.pharmacies ?? [];

      setPharmacies(results);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(t("searchFailed"));
    }
  }, [searchInput, t]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleTextSearch();
      }
    },
    [handleTextSearch]
  );

  // 약국 데이터 로드 완료 시 카카오맵 초기화
  useEffect(() => {
    if (status !== "success" || !mapContainerRef.current || pharmacies.length === 0) return;

    const container = mapContainerRef.current;
    let isMounted = true;

    loadKakaoMap()
      .then((kakao) => {
        if (!isMounted || !container) return;

        const mappable = pharmacies.filter(
          (p) => p.latitude != null && p.longitude != null
        );
        if (mappable.length === 0) return;

        const center = new kakao.maps.LatLng(
          mappable[0].latitude,
          mappable[0].longitude
        );
        const map = new kakao.maps.Map(container, { center, level: 5 });
        const bounds = new kakao.maps.LatLngBounds();

        mappable.forEach((pharmacy) => {
          const position = new kakao.maps.LatLng(pharmacy.latitude, pharmacy.longitude);
          bounds.extend(position);
          const marker = new kakao.maps.Marker({ map, position });

          const distanceHtml = pharmacy.distance_km != null
            ? `<br/><span style="color:#c5a55a;font-size:11px;">${pharmacy.distance_km.toFixed(1)}km</span>`
            : "";

          const infoContent = `
            <div style="padding:8px 12px;font-size:13px;line-height:1.5;font-family:Pretendard,sans-serif;min-width:160px;">
              <strong style="color:#0a1628;">${pharmacy.name}</strong><br/>
              <span style="color:#6b7280;font-size:12px;">${pharmacy.address}</span>${distanceHtml}
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

        if (mappable.length > 1) {
          map.setBounds(bounds);
        }
      })
      .catch(() => {
        // 맵 로드 실패 — 리스트는 계속 표시
      });

    return () => {
      isMounted = false;
    };
  }, [status, pharmacies]);

  return (
    <div className="space-y-6">
      {/* ---- 검색 입력 영역 ---- */}
      <div className="flex items-center gap-2 max-w-xl mx-auto">
        <input
          ref={searchInputRef}
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={t("searchPlaceholder")}
          className={[
            "flex-1 min-w-0 px-4 py-3 text-sm",
            "bg-white border border-gray-200 rounded-full",
            "text-gray-900 placeholder-gray-400",
            "outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            "transition-all duration-200",
          ].join(" ")}
        />
        <button
          type="button"
          onClick={handleTextSearch}
          disabled={!searchInput.trim() || status === "loading"}
          className={[
            "shrink-0 px-5 py-3 text-sm font-semibold whitespace-nowrap squircle-md",
            "bg-primary text-white",
            "hover:bg-primary/90 transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {t("searchButton")}
        </button>
        {/* GPS 버튼 */}
        <button
          type="button"
          onClick={handleLocate}
          disabled={status === "locating" || status === "loading"}
          title={t("gpsButton")}
          className={[
            "shrink-0 flex items-center justify-center size-11",
            "squircle-md border border-gray-200 text-gray-600",
            "hover:bg-gray-50 transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          </svg>
        </button>
      </div>

      {/* ---- idle 상태: 안내 문구 ---- */}
      {status === "idle" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-16 text-gray-300"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p className="text-sm text-gray-500 max-w-sm">
            {t("subtitle")}
          </p>
        </div>
      )}

      {/* ---- locating / loading 상태 ---- */}
      {(status === "locating" || status === "loading") && (
        <div className="space-y-4">
          <Skeleton variant="rectangular" height="400px" />
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg
              className="size-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>
              {status === "locating" ? t("locating") : t("searching")}
            </span>
          </div>
        </div>
      )}

      {/* ---- error 상태 ---- */}
      {status === "error" && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <svg
            className="size-12 text-gray-300"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <p className="text-sm text-gray-600">{errorMessage}</p>
          <button
            onClick={isSearchMode ? handleTextSearch : handleLocate}
            type="button"
            className="px-4 py-2 squircle-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            {tCommon("retry")}
          </button>
        </div>
      )}

      {/* ---- success 상태 ---- */}
      {status === "success" && (
        <>
          {pharmacies.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              {isSearchMode
                ? t("noResultsSearch", { keyword: searchInput.trim() })
                : t("noResultsNearby")}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 카카오맵 */}
              <div
                ref={mapContainerRef}
                className="w-full h-[300px] sm:h-[400px] lg:h-[480px] squircle-xl overflow-hidden bg-gray-100 border border-gray-200"
                style={{ touchAction: "none" }}
                aria-label="약국 지도"
              />

              {/* 검색 결과 개수 */}
              <p className="text-sm text-gray-500 text-center">
                {isSearchMode
                  ? t("resultCountSearch", {
                      keyword: searchInput.trim(),
                      count: pharmacies.length,
                    })
                  : t("resultCountNearby", { count: pharmacies.length })}
              </p>

              {/* 약국 리스트 */}
              <ul
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto"
                role="list"
              >
                {pharmacies.map((pharmacy) => (
                  <li
                    key={pharmacy.id}
                    className="flex items-start gap-3 p-4 squircle-lg bg-gray-50 border border-gray-100"
                  >
                    <svg
                      className="size-5 text-secondary mt-0.5 shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                      />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-primary">
                        {pharmacy.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pharmacy.address}
                      </p>
                      {pharmacy.phone && (
                        <a
                          href={`tel:${pharmacy.phone}`}
                          className="text-xs text-secondary hover:underline mt-0.5 inline-block"
                        >
                          {pharmacy.phone}
                        </a>
                      )}
                    </div>
                    {pharmacy.distance_km != null && (
                      <span className="text-xs text-secondary font-semibold whitespace-nowrap">
                        {pharmacy.distance_km.toFixed(1)}km
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
