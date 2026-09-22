import { extractDetailText } from "@/lib/detail-text";

interface DetailTextSectionProps {
  /** 상세 HTML 원본 (detail_html_*) */
  html: string;
  /** 접기 버튼 라벨 (로케일별 번역) */
  label: string;
}

/**
 * 상세 HTML에서 추출한 텍스트를 하단 접이식 섹션으로 렌더링한다.
 * - 서버에서 추출해 초기 HTML에 포함되므로 검색엔진·AI가 접힌 상태로도 수집한다.
 * - 추출 결과가 기준 미만(이미지 위주 상세)이면 아무것도 렌더링하지 않는다.
 * - 삽입되는 HTML은 extractDetailText가 화이트리스트 태그만 남긴 소독된 조각이다.
 */
export function DetailTextSection({ html, label }: DetailTextSectionProps) {
  const extracted = extractDetailText(html);
  if (!extracted) return null;

  return (
    <details className="detail-text-section group">
      <summary className="inline-flex cursor-pointer select-none list-none items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600 [&::-webkit-details-marker]:hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-3 transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
        {label}
      </summary>
      <div
        className="detail-text-body mt-4 text-sm text-gray-600"
        // extractDetailText 산출물 — 화이트리스트 태그만 존재 (속성 없음)
        dangerouslySetInnerHTML={{ __html: extracted.html }}
      />
    </details>
  );
}
