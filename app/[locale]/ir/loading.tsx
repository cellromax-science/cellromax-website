/* ==========================================================================
   IR Loading — IR 자료실 로딩 스켈레톤

   서버 컴포넌트가 데이터를 가져오는 동안 즉시 표시되는 스켈레톤 UI.
   ========================================================================== */

export default function IrLoading() {
  return (
    <section className="section bg-surface">
      <div className="container-site">
        {/* Page Header Skeleton */}
        <div className="text-center mb-12">
          <div className="h-9 w-40 bg-gray-200 rounded-lg mx-auto animate-pulse" />
          <div className="divider-gold mx-auto mt-4 mb-4" />
          <div className="h-5 w-80 bg-gray-100 rounded mx-auto animate-pulse" />
        </div>

        {/* Tab Filter Skeleton */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-24 bg-gray-100 rounded-full animate-pulse"
              />
            ))}
          </div>
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
        </div>

        {/* Card Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="squircle-xl overflow-hidden bg-surface-raised border border-gray-100"
            >
              <div className="aspect-card bg-gray-100 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-5 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
