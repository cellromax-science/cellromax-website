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
        LatLngBounds: new () => kakao.maps.LatLngBounds;
        event: {
          addListener: (
            target: kakao.maps.Marker | kakao.maps.Map,
            type: string,
            handler: () => void
          ) => void;
        };
        services: {
          Geocoder: new () => kakao.maps.services.Geocoder;
          Status: {
            OK: string;
            ZERO_RESULT: string;
            ERROR: string;
          };
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
    setBounds(bounds: LatLngBounds): void;
  }
  interface LatLngBounds {
    extend(latlng: LatLng): void;
  }
  interface Marker {
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }
  interface InfoWindow {
    open(map: Map, marker: Marker): void;
    close(): void;
  }
  namespace services {
    interface GeocodeResult {
      x: string;
      y: string;
      address_name: string;
    }
    interface Geocoder {
      addressSearch(
        address: string,
        callback: (result: GeocodeResult[], status: string) => void
      ): void;
    }
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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
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

/**
 * 주소 문자열을 위도/경도 좌표로 변환한다.
 *
 * - 카카오맵 SDK의 Geocoder 서비스를 사용
 * - SDK가 아직 로드되지 않은 경우 자동으로 로드
 * - 변환 실패 시 null 반환
 *
 * @param address 변환할 주소 문자열
 * @returns { lat, lng } 좌표 또는 null (변환 실패 시)
 *
 * @example
 * ```ts
 * const coords = await geocodeAddress("서울특별시 강남구 테헤란로 123");
 * if (coords) {
 *   console.log(coords.lat, coords.lng);
 * }
 * ```
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  await loadKakaoMap();

  return new Promise((resolve) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result, status) => {
      if (
        status === window.kakao.maps.services.Status.OK &&
        result.length > 0
      ) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
        });
      } else {
        resolve(null);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// 약국 주소 전용 지오코딩 — 정제 + 결과 검증
// ---------------------------------------------------------------------------

/**
 * 지오코딩 전 주소 문자열을 정제한다.
 *
 * 약국 주소에는 "경기 용인시 수지구 고기로 80 105호 유진하나로약국 (동천동)"처럼
 * 호수·상호명·법정동 괄호가 섞여 있어, 그대로 지오코딩하면 카카오가 엉뚱한
 * 위치로 유사 매칭하는 사례가 있다 (2026-10 전수 검증에서 707건 발견).
 *
 * - 괄호와 그 내용 제거
 * - 도로명("…로/길 + 건물번호") 또는 지번("…동/리/가 + 번지")까지만 잘라
 *   그 뒤의 상세주소·상호를 버림
 */
export function cleanAddressForGeocoding(address: string): string {
  const stripped = address.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const roadMatch = stripped.match(/^(.*?(?:로|길)\s?\d+(?:-\d+)?)(?=\s|$|,)/);
  if (roadMatch) return roadMatch[1];
  const jibunMatch = stripped.match(/^(.*?(?:동|리|가)\s\d+(?:-\d+)?)(?=\s|$|,)/);
  return jibunMatch ? jibunMatch[1] : stripped;
}

/** 검증을 통과한 지오코딩 결과 */
export interface GeocodeMatch {
  lat: number;
  lng: number;
  /** 카카오가 실제로 매칭한 주소 — 관리자 확인용 */
  matchedAddress: string;
}

/**
 * 약국 주소를 정제 후 지오코딩하고, 결과가 입력 주소와 일치하는지 검증한다.
 *
 * 카카오 Geocoder는 주소가 지저분하면 다른 도로·번지로 유사 매칭할 수 있으므로,
 * 매칭된 주소의 시군구·도로명·건물번호 토큰이 입력 주소에 그대로 존재하는지
 * 확인하고, 하나라도 다르면 실패(null)로 처리한다.
 *
 * @returns 좌표 + 매칭 주소, 또는 null (지오코딩 실패/검증 불일치 시)
 */
export async function geocodePharmacyAddress(
  address: string
): Promise<GeocodeMatch | null> {
  await loadKakaoMap();

  const query = cleanAddressForGeocoding(address);

  return new Promise((resolve) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(query, (result, status) => {
      if (
        status !== window.kakao.maps.services.Status.OK ||
        result.length === 0
      ) {
        resolve(null);
        return;
      }

      const matched = result[0];
      const matchedTokens = matched.address_name.split(/\s+/);
      const queryTokens = query.replace(/,/g, " ").split(/\s+/);

      // 매칭 주소의 시군구(2번째 토큰)·도로명·건물번호(마지막 2개 토큰)가
      // 입력 주소에 토큰 단위로 그대로 존재해야 한다.
      const required = [
        matchedTokens[1],
        matchedTokens[matchedTokens.length - 2],
        matchedTokens[matchedTokens.length - 1],
      ].filter(Boolean);

      const isConsistent = required.every((token) =>
        queryTokens.includes(token)
      );

      if (!isConsistent) {
        resolve(null);
        return;
      }

      resolve({
        lat: parseFloat(matched.y),
        lng: parseFloat(matched.x),
        matchedAddress: matched.address_name,
      });
    });
  });
}
