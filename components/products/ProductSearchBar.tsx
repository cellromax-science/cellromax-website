"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/* ==========================================================================
   ProductSearchBar — 제품 검색 입력 컴포넌트

   - 디바운스 300ms 실시간 검색
   - 검색 시 카테고리/서브카테고리 필터 해제 (독립형)
   - 검색어 초기화 버튼 (X)
   - URL ?search= 파라미터 동기화
   ========================================================================== */

interface ProductSearchBarProps {
  initialSearch?: string;
}

export function ProductSearchBar({ initialSearch = "" }: ProductSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("products");

  const [inputValue, setInputValue] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  // URL 변경 시 input 동기화
  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    setInputValue(urlSearch);
  }, [searchParams]);

  const navigateWithSearch = useCallback(
    (search: string) => {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
        // 검색 시 카테고리/서브카테고리/페이지 초기화 (독립형)
      } else {
        // 검색어 비우면 기본 카테고리로 복귀
        params.set("category", "health_functional");
      }
      const queryString = params.toString();
      // replace로 히스토리 쌓임 방지 + 부드러운 업데이트
      router.replace(`${pathname}?${queryString}`);
    },
    [router, pathname],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // 한글 조합 중이면 네비게이션 지연 (IME 조합 끊김 방지)
        if (composingRef.current) return;
        navigateWithSearch(value);
      }, 500);
    },
    [navigateWithSearch],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    navigateWithSearch("");
    inputRef.current?.focus();
  }, [navigateWithSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        navigateWithSearch(inputValue);
      }
      if (e.key === "Escape") {
        handleClear();
      }
    },
    [inputValue, navigateWithSearch, handleClear],
  );

  // cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-xs mx-auto mb-8">
      <div className="relative">
        {/* 검색 아이콘 */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 입력 필드 */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={(e) => {
            composingRef.current = false;
            // 조합 완료 후 디바운스 검색 트리거
            const value = (e.target as HTMLInputElement).value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              navigateWithSearch(value);
            }, 500);
          }}
          placeholder={t("searchPlaceholder")}
          className={[
            "w-full pl-12 pr-10 py-3 text-sm",
            "bg-white border border-gray-200 rounded-full",
            "text-gray-900 placeholder-gray-400",
            "outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            "transition-all duration-200",
          ].join(" ")}
          aria-label={t("searchPlaceholder")}
        />

        {/* 초기화 버튼 */}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className={[
              "absolute inset-y-0 right-0 flex items-center pr-4",
              "text-gray-400 hover:text-gray-600 transition-colors cursor-pointer",
            ].join(" ")}
            aria-label={t("searchClear")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
