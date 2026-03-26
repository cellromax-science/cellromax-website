"use client";

import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";
import { loadKakaoMap } from "@/lib/kakaomap";

/* ==========================================================================
   LocationSection -- 오시는 길 섹션

   구성:
   1. 섹션 헤더 (배지 + 제목 + 골드 디바이더)
   2. 카카오맵 영역 (회사 위치 마커 + 인포윈도우)
   3. 회사 정보 카드 (주소, 전화, 팩스, 이메일)

   레이아웃:
   - 모바일: 세로 스택 (지도 → 정보)
   - md 이상: 좌측 지도(col-span-3) + 우측 정보(col-span-2) 2컬럼

   GSAP 애니메이션:
   - useScrollFadeIn 훅으로 헤더, 지도, 정보 카드 스크롤 기반 순차 등장
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 회사 연락처 항목 타입 */
interface ContactInfoItem {
  /** 번역 키 (location.*) */
  labelKey: "address" | "phone" | "fax" | "email";
  /** 표시 값 */
  value: string;
  /** 링크 href (전화/이메일용) */
  href?: string;
  /** 아이콘 컴포넌트 */
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 회사 주소 — Geocoder로 좌표 변환 */
const COMPANY_ADDRESS = "경기도 용인시 기흥구 구성로 357";

/** Geocoder 실패 시 폴백 좌표 */
const FALLBACK_LAT = 37.2822;
const FALLBACK_LNG = 127.1175;

/** 카카오맵 줌 레벨 (1: 가장 가까움, 14: 가장 멀리) */
const MAP_ZOOM_LEVEL = 3;

/** 회사 연락처 정보 */
const CONTACT_INFO: ContactInfoItem[] = [
  {
    labelKey: "address",
    value: "경기도 용인시 기흥구 구성로 357, 용인테크노밸리 D동 710호",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    labelKey: "phone",
    value: "031-662-1395",
    href: "tel:031-662-1395",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    labelKey: "fax",
    value: "031-662-1396",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect width="12" height="8" x="6" y="14" />
      </svg>
    ),
  },
  {
    labelKey: "email",
    value: "cellromax@naver.com",
    href: "mailto:cellromax@naver.com",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LocationSection() {
  const t = useTranslations("location");

  // ----- useScrollFadeIn refs -----
  const headerRef = useScrollFadeIn({ direction: "up" });
  const mapRef = useScrollFadeIn({ direction: "up" });
  const infoRef = useScrollFadeIn({ direction: "up", stagger: 0.1 });

  // ----- 카카오맵 컨테이너 ref -----
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // ----- 카카오맵 로딩 상태 -----
  const [mapError, setMapError] = useState<string | null>(null);

  // ----- 카카오맵 초기화 -----
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let isMounted = true;

    loadKakaoMap()
      .then((kakao) => {
        if (!isMounted) return;

        // 폴백 좌표로 먼저 지도 생성
        const fallbackCenter = new kakao.maps.LatLng(FALLBACK_LAT, FALLBACK_LNG);
        const map = new kakao.maps.Map(container, {
          center: fallbackCenter,
          level: MAP_ZOOM_LEVEL,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const setupMarker = (position: any) => {
          const marker = new kakao.maps.Marker({ map, position });
          const infoWindow = new kakao.maps.InfoWindow({
            content: `
              <div style="padding:8px 12px;font-size:13px;line-height:1.5;font-family:Pretendard,sans-serif;">
                <strong style="color:#0a1628;">셀로맥스사이언스</strong><br/>
                <span style="color:#6b7280;font-size:12px;">경기도 용인시 기흥구 구성로 357<br/>용인테크노밸리 D동 710호</span>
              </div>
            `,
            removable: true,
          });
          kakao.maps.event.addListener(marker, "click", () => {
            infoWindow.open(map, marker);
          });
          map.setCenter(position);
        };

        // Geocoder로 주소 → 좌표 변환
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(COMPANY_ADDRESS, (result, status) => {
          if (!isMounted) return;
          if (status === kakao.maps.services.Status.OK && result.length > 0) {
            const coords = new kakao.maps.LatLng(
              parseFloat(result[0].y),
              parseFloat(result[0].x)
            );
            setupMarker(coords);
          } else {
            // Geocoder 실패 시 폴백 좌표 사용
            setupMarker(fallbackCenter);
          }
        });
      })
      .catch((error) => {
        if (!isMounted) return;
        // eslint-disable-next-line no-console
        console.error("카카오맵 초기화 실패:", error);
        setMapError(
          error instanceof Error ? error.message : "지도를 불러올 수 없습니다."
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section
      id="location"
      className="section bg-surface"
      aria-label={t("title")}
    >
      <div className="container-site">
        {/* ================================================================
            1. 섹션 헤더
            ================================================================ */}
        <div ref={headerRef} className="text-center mb-12 md:mb-16">
          {/* 서브타이틀 배지 */}
          <span className="badge badge-gold mb-4 inline-flex">
            {t("subtitle")}
          </span>

          {/* 섹션 제목 */}
          <h2 className="text-heading text-primary mt-3">
            {t("title")}
          </h2>

          {/* 골드 디바이더 */}
          <div className="divider-gold mx-auto mt-6" />
        </div>

        {/* ================================================================
            2. 메인 콘텐츠 — 지도 + 정보/교통편
            ================================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-5 items-stretch gap-6 md:gap-8">
          {/* ---- 좌측: 카카오맵 (md 이상에서 3/5 너비) ---- */}
          <div ref={mapRef} className="md:col-span-3">
            <div className="relative w-full h-[300px] md:h-full md:min-h-[400px] squircle-lg overflow-hidden bg-gray-100 border border-gray-200">
              <div
                ref={mapContainerRef}
                className="w-full h-full"
                role="img"
                aria-label="셀로맥스사이언스 위치 지도"
              />

              {/* 카카오맵 로딩 실패 시 폴백 UI */}
              {mapError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <p className="mt-3 text-sm font-medium">{mapError}</p>
                  <p className="mt-1 text-xs text-gray-300">
                    .env.local에 NEXT_PUBLIC_KAKAO_MAP_KEY를 설정해 주세요.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ---- 우측: 회사 정보 (md 이상에서 2/5 너비, 지도와 높이 정렬) ---- */}
          <div className="md:col-span-2">
            <div ref={infoRef} className="card p-0 overflow-hidden h-full flex flex-col">
              {/* 상단 accent bar — 골드 그라데이션 */}
              <div
                className="h-1 bg-gradient-gold"
                aria-hidden="true"
              />

              <div className="p-6 md:p-8 space-y-5 flex-1 flex flex-col justify-center">
                {CONTACT_INFO.map((info) => (
                  <div
                    key={info.labelKey}
                    className="flex items-start gap-3"
                  >
                    {/* 아이콘 */}
                    <span className="text-secondary flex-shrink-0 mt-0.5">
                      {info.icon}
                    </span>

                    {/* 레이블 + 값 */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                        {t(info.labelKey)}
                      </p>
                      {info.href ? (
                        <a
                          href={info.href}
                          className="text-sm text-primary font-medium hover:text-secondary transition-colors duration-fast"
                        >
                          {info.value}
                        </a>
                      ) : (
                        <p className="text-sm text-primary font-medium leading-snug">
                          {info.value}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LocationSection;
