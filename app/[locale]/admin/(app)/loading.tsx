/* ==========================================================================
   Admin (app) Loading Skeleton

   관리자 페이지 간 이동 시 서버 렌더링이 끝나기 전에 즉시 표시되는
   스켈레톤. 사이드바/헤더(AdminShell)는 유지되고 콘텐츠 영역만 교체된다.
   목록 페이지들의 공통 구조(제목 + 검색 바 + 테이블 카드)를 본뜬 형태.
   ========================================================================== */

export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="불러오는 중">
      {/* 페이지 헤더 스켈레톤 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-gray-200 squircle-sm animate-pulse" />
          <div className="h-4 w-56 bg-gray-100 squircle-xs animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 squircle-sm animate-pulse" />
      </div>

      {/* 검색 바 스켈레톤 */}
      <div className="h-11 w-full max-w-md bg-gray-100 squircle-sm animate-pulse" />

      {/* 테이블 카드 스켈레톤 */}
      <div className="bg-white shadow-sm border border-gray-100 squircle-lg overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-3">
          <div className="h-4 w-full max-w-lg bg-gray-200 squircle-xs animate-pulse" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-5 py-4">
              <div className="h-4 w-32 bg-gray-100 squircle-xs animate-pulse" />
              <div className="h-4 w-48 bg-gray-100 squircle-xs animate-pulse hidden md:block" />
              <div className="h-4 w-24 bg-gray-100 squircle-xs animate-pulse hidden lg:block" />
              <div className="ml-auto h-4 w-16 bg-gray-100 squircle-xs animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
