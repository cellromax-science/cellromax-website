import type { Metadata } from "next";
import Link from "next/link";
import {
  getDashboardStats,
  getRecentItems,
} from "@/lib/supabase/dashboard";
import type {
  RecentProduct,
  RecentInquiry,
  RecentPost,
} from "@/lib/supabase/dashboard";

/* ==========================================================================
   Admin Dashboard Page — Server Component

   관리자 대시보드 메인 페이지.
   - 통계 카드 3종 (활성 제품, 대기 문의, 최근 게시글)
   - 최근 등록 항목 테이블 3종 (제품, 문의, 게시글)
   - 빠른 바로가기 섹션
   - 모든 데이터는 서버에서 병렬 패칭
   ========================================================================== */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "대시보드",
};

// ---------------------------------------------------------------------------
// Constants — 한글 매핑
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  health_functional: "건강기능식품",
  general_food: "일반식품",
  cosmetic: "화장품",
  medicine: "의약품",
  nutra_pet: "뉴트라펫",
  other: "기타",
};

const POST_TYPE_LABELS: Record<string, string> = {
  notice: "공지사항",
  news: "뉴스",
  video: "홍보영상",
};

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  consumer: "소비자",
  pharmacist: "약사",
  business: "비즈니스",
};

const INQUIRY_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  pending: { label: "대기", bg: "bg-warning-light", text: "text-warning-dark" },
  reviewing: { label: "검토중", bg: "bg-info-light", text: "text-info-dark" },
  replied: { label: "답변완료", bg: "bg-success-light", text: "text-success-dark" },
  closed: { label: "종료", bg: "bg-gray-200", text: "text-gray-600" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 날짜 문자열 -> YYYY.MM.DD 한국어 형식 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

// ---------------------------------------------------------------------------
// Stat Card Config
// ---------------------------------------------------------------------------

interface StatCardConfig {
  key: string;
  label: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: "activeProducts",
    label: "활성 제품",
    iconBg: "bg-info-light",
    iconColor: "text-info-dark",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="5" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9H19" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5V3C8 2.44772 8.44772 2 9 2H13C13.5523 2 14 2.44772 14 3V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "pendingInquiries",
    label: "대기 문의",
    iconBg: "bg-warning-light",
    iconColor: "text-warning-dark",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 4H18C18.5523 4 19 4.44772 19 5V15C19 15.5523 18.5523 16 18 16H7L3 20V5C3 4.44772 3.44772 4 4 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="8" cy="10" r="0.75" fill="currentColor" />
        <circle cx="11" cy="10" r="0.75" fill="currentColor" />
        <circle cx="14" cy="10" r="0.75" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "recentPostsCount",
    label: "최근 게시글",
    iconBg: "bg-success-light",
    iconColor: "text-success-dark",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="3" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 11.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 15H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Quick Link Config
// ---------------------------------------------------------------------------

interface QuickLinkConfig {
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
}

const QUICK_LINKS: QuickLinkConfig[] = [
  {
    label: "제품 등록",
    href: "products/new",
    description: "새 제품을 등록합니다",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 7V13M7 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "게시글 작성",
    href: "posts/new",
    description: "새 게시글을 작성합니다",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13.5 3.5L16.5 6.5L7 16H4V13L13.5 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M11.5 5.5L14.5 8.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "문의 확인",
    href: "inquiries",
    description: "접수된 문의를 확인합니다",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 4H16C16.5523 4 17 4.44772 17 5V13C17 13.5523 16.5523 14 16 14H6L3 17V5C3 4.44772 3.44772 4 4 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "IR 파일 업로드",
    href: "ir-files/new",
    description: "새 IR 파일을 업로드합니다",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M10 13V4M10 4L7 7M10 4L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 13V15C4 15.5523 4.44772 16 5 16H15C15.5523 16 16 15.5523 16 15V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Sub-components (Server-side, inline)
// ---------------------------------------------------------------------------

/** 통계 카드 */
function StatCard({
  config,
  value,
}: {
  config: StatCardConfig;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 bg-white p-5 shadow-sm border border-gray-100 squircle-lg">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center squircle-md ${config.iconBg} ${config.iconColor}`}
      >
        {config.icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tracking-tight text-gray-900">
          {value.toLocaleString("ko-KR")}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">{config.label}</p>
      </div>
    </div>
  );
}

/** 빈 상태 표시 */
function EmptyState() {
  return (
    <tr>
      <td
        colSpan={100}
        className="py-10 text-center text-sm text-gray-400"
      >
        등록된 항목이 없습니다
      </td>
    </tr>
  );
}

/** 활성/비활성 상태 도트 */
function ActiveDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          active ? "bg-success" : "bg-gray-300"
        }`}
        aria-hidden="true"
      />
      {active ? "활성" : "비활성"}
    </span>
  );
}

/** 문의 상태 배지 */
function InquiryStatusBadge({ status }: { status: string }) {
  const config = INQUIRY_STATUS_CONFIG[status] ?? {
    label: status,
    bg: "bg-gray-200",
    text: "text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold squircle-xs ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Table Sections
// ---------------------------------------------------------------------------

/** 최근 등록 제품 테이블 */
function RecentProductsTable({ products }: { products: RecentProduct[] }) {
  return (
    <div className="bg-white shadow-sm border border-gray-100 squircle-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">최근 등록 제품</h2>
        <Link
          href="products"
          className="text-xs font-medium text-gray-400 transition-colors hover:text-primary hover:opacity-100"
        >
          전체보기
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                제품명
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                등록일
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.length === 0 ? (
              <EmptyState />
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {product.name_ko}
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {CATEGORY_LABELS[product.category] ?? product.category}
                  </td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap tabular-nums">
                    {formatDate(product.created_at)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <ActiveDot active={product.is_active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 최근 문의 테이블 */
function RecentInquiriesTable({ inquiries }: { inquiries: RecentInquiry[] }) {
  return (
    <div className="bg-white shadow-sm border border-gray-100 squircle-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">최근 문의</h2>
        <Link
          href="inquiries"
          className="text-xs font-medium text-gray-400 transition-colors hover:text-primary hover:opacity-100"
        >
          전체보기
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                유형
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                등록일
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {inquiries.length === 0 ? (
              <EmptyState />
            ) : (
              inquiries.map((inquiry) => (
                <tr
                  key={inquiry.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {inquiry.name}
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {INQUIRY_TYPE_LABELS[inquiry.inquiry_type] ?? inquiry.inquiry_type}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <InquiryStatusBadge status={inquiry.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap tabular-nums">
                    {formatDate(inquiry.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 최근 게시글 테이블 */
function RecentPostsTable({ posts }: { posts: RecentPost[] }) {
  return (
    <div className="bg-white shadow-sm border border-gray-100 squircle-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">최근 게시글</h2>
        <Link
          href="posts"
          className="text-xs font-medium text-gray-400 transition-colors hover:text-primary hover:opacity-100"
        >
          전체보기
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                제목
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                유형
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                등록일
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.length === 0 ? (
              <EmptyState />
            ) : (
              posts.map((post) => (
                <tr
                  key={post.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap max-w-[200px] truncate">
                    {post.title_ko}
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {POST_TYPE_LABELS[post.post_type] ?? post.post_type}
                  </td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap tabular-nums">
                    {formatDate(post.created_at)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <ActiveDot active={post.is_active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  // 병렬 데이터 패칭
  const [stats, recentItems] = await Promise.all([
    getDashboardStats(),
    getRecentItems(5),
  ]);

  /** 통계값 매핑 */
  const statValues: Record<string, number> = {
    activeProducts: stats.activeProducts,
    pendingInquiries: stats.pendingInquiries,
    recentPostsCount: stats.recentPostsCount,
  };

  return (
    <div className="space-y-6">
      {/* ================================================================
          페이지 헤더
          ================================================================ */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          대시보드
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          전체 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* ================================================================
          통계 카드 그리드
          ================================================================ */}
      <section aria-label="주요 통계">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STAT_CARDS.map((card) => (
            <StatCard
              key={card.key}
              config={card}
              value={statValues[card.key] ?? 0}
            />
          ))}
        </div>
      </section>

      {/* ================================================================
          빠른 바로가기
          ================================================================ */}
      <section aria-label="빠른 바로가기">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          빠른 바로가기
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 bg-white px-4 py-3.5 shadow-sm border border-gray-100 squircle-lg transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-200 hover:opacity-100"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center squircle-sm bg-primary/5 text-primary transition-colors group-hover:bg-primary/10">
                {link.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {link.label}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ================================================================
          최근 항목 테이블 그리드
          ================================================================ */}
      <section aria-label="최근 등록 항목">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 최근 등록 제품 — 전체 너비 */}
          <div className="lg:col-span-2">
            <RecentProductsTable products={recentItems.products} />
          </div>

          {/* 최근 문의 */}
          <RecentInquiriesTable inquiries={recentItems.inquiries} />

          {/* 최근 게시글 */}
          <RecentPostsTable posts={recentItems.posts} />
        </div>
      </section>
    </div>
  );
}
