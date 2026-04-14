import { Skeleton } from "@/components/ui/Skeleton";

export default function ProductDetailLoading() {
  return (
    <section className="section bg-surface">
      <div className="container-site">
        <div className="container-product-detail">
          {/* Breadcrumb skeleton */}
          <div className="mb-8">
            <Skeleton variant="text" width="240px" height="16px" />
          </div>

          {/* 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left: Image skeleton */}
            <div className="space-y-3">
              <Skeleton variant="rectangular" height="0" className="!h-0 !pb-[100%] w-full squircle-xl" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" width="64px" height="64px" className="squircle-md" />
                ))}
              </div>
            </div>

            {/* Right: Info skeleton */}
            <div className="space-y-6">
              {/* Badges */}
              <div className="flex gap-2">
                <Skeleton variant="text" width="80px" height="24px" />
                <Skeleton variant="text" width="60px" height="24px" />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Skeleton variant="text" width="80%" height="32px" />
                <Skeleton variant="text" width="50%" height="32px" />
              </div>

              {/* Divider */}
              <Skeleton variant="text" width="60px" height="3px" />

              {/* Section content */}
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={i === 0 ? "" : "border-t border-gray-200 pt-6"}>
                    <Skeleton variant="text" width="120px" height="24px" />
                    <div className="space-y-2 pt-3">
                      <Skeleton variant="text" width="100%" />
                      <Skeleton variant="text" width="90%" />
                      <Skeleton variant="text" width="95%" />
                      <Skeleton variant="text" width="70%" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pharmacy button skeleton */}
          <div className="mt-16 flex justify-center">
            <Skeleton variant="rectangular" width="180px" height="44px" className="squircle-md" />
          </div>

          {/* Detail image skeleton */}
          <div className="mt-8">
            <Skeleton variant="rectangular" height="400px" className="squircle-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
