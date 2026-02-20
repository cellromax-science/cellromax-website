/**
 * Kakao Map SDK Loader
 *
 * 카카오맵 JavaScript SDK를 동적으로 로드하는 유틸리티.
 * Script 태그를 <head>에 삽입하고, 로드 완료 후 Promise를 resolve한다.
 *
 * - 중복 로드 방지: 이미 로드 중이면 기존 Promise를 반환
 * - SSR 안전: typeof window 체크로 서버 환경에서는 reject
 * - 에러 처리: SDK 로드 실패 시 명확한 에러 메시지 제공
 */

// ---------------------------------------------------------------------------
// Global Type Declaration — window.kakao 타입 확장
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => kakao.maps.LatLng;
        Map: new (
          container: HTMLElement,
          options: { center: kakao.maps.LatLng; level: number }
        ) => kakao.maps.Map;
        Marker: new (options: {
          map: kakao.maps.Map;
          position: kakao.maps.LatLng;
        }) => kakao.maps.Marker;
        InfoWindow: new (options: {
          content: string;
          removable?: boolean;
        }) => kakao.maps.InfoWindow;
        event: {
          addListener: (
            target: kakao.maps.Marker | kakao.maps.Map,
            type: string,
            handler: () => void
          ) => void;
        };
      };
    };
  }
}

declare namespace kakao.maps {
  interface LatLng {
    getLat(): number;
    getLng(): number;
  }
  interface Map {
    setCenter(latlng: LatLng): void;
    setLevel(level: number): void;
  }
  interface Marker {
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }
  interface InfoWindow {
    open(map: Map, marker: Marker): void;
    close(): void;
  }
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/** 로드 중인 Promise 캐시 — 중복 로드 방지 */
let kakaoMapPromise: Promise<typeof window.kakao> | null = null;

/**
 * 카카오맵 JavaScript SDK를 동적으로 로드한다.
 *
 * - 이미 로드 중이면 기존 Promise를 반환 (중복 방지)
 * - autoload=false로 로드 후 kakao.maps.load()로 초기화
 * - SSR 환경에서는 즉시 reject
 *
 * @returns 로드 완료된 window.kakao 객체
 *
 * @example
 * ```ts
 * const kakao = await loadKakaoMap();
 * const map = new kakao.maps.Map(container, options);
 * ```
 */
export function loadKakaoMap(): Promise<typeof window.kakao> {
  // SSR 안전 — 서버 환경에서는 즉시 reject
  if (typeof window === "undefined") {
    return Promise.reject(new Error("카카오맵 SDK는 브라우저 환경에서만 사용할 수 있습니다."));
  }

  // 이미 로드 완료된 경우
  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }

  // 이미 로드 중인 경우 — 기존 Promise 반환
  if (kakaoMapPromise) {
    return kakaoMapPromise;
  }

  // 환경변수에서 API 키 가져오기
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수가 설정되지 않았습니다.")
    );
  }

  // 새로운 로드 Promise 생성
  kakaoMapPromise = new Promise<typeof window.kakao>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      // autoload=false이므로 수동 초기화
      window.kakao.maps.load(() => {
        resolve(window.kakao);
      });
    };

    script.onerror = () => {
      // 실패 시 캐시 초기화하여 재시도 가능하게
      kakaoMapPromise = null;
      reject(new Error("카카오맵 SDK 로드에 실패했습니다."));
    };

    document.head.appendChild(script);
  });

  return kakaoMapPromise;
}
