import 'server-only'

import { createAdminClient } from './admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardStats {
  /** is_active=true 인 제품 수 */
  activeProducts: number
  /** status='pending' 인 미확인 문의 수 */
  pendingInquiries: number
  /** 최근 7일간 생성된 게시글 수 */
  recentPostsCount: number
  /** is_active=true 인 IR 파일 수 */
  activeIrFiles: number
  /** is_active=true 인 약국 수 */
  activePharmacies: number
}

export interface RecentProduct {
  id: string
  name_ko: string
  slug: string
  category: string
  thumbnail_url: string | null
  is_active: boolean
  created_at: string
}

export interface RecentInquiry {
  id: string
  name: string
  email: string
  inquiry_type: string
  subject: string | null
  status: string
  created_at: string
}

export interface RecentPost {
  id: string
  title_ko: string
  post_type: string
  is_active: boolean
  published_at: string
  created_at: string
}

export interface RecentItems {
  products: RecentProduct[]
  inquiries: RecentInquiry[]
  posts: RecentPost[]
}

// ---------------------------------------------------------------------------
// 1. getDashboardStats
// ---------------------------------------------------------------------------

/**
 * 관리자 대시보드에 표시할 전체 통계를 조회합니다.
 * RLS를 우회하는 admin 클라이언트를 사용합니다.
 * 에러 발생 시 모든 값이 0인 기본 객체를 반환합니다.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const defaults: DashboardStats = {
    activeProducts: 0,
    pendingInquiries: 0,
    recentPostsCount: 0,
    activeIrFiles: 0,
    activePharmacies: 0,
  }

  try {
    const supabase = createAdminClient()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    // 병렬로 모든 카운트 쿼리 실행
    const [
      productsResult,
      inquiriesResult,
      postsResult,
      irFilesResult,
      pharmaciesResult,
    ] = await Promise.all([
      // 활성 제품 수
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),

      // 미확인(pending) 문의 수
      supabase
        .from('inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // 최근 7일간 게시글 수
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoISO),

      // 활성 IR 파일 수
      supabase
        .from('ir_files')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),

      // 활성 약국 수
      supabase
        .from('pharmacies')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
    ])

    return {
      activeProducts: productsResult.count ?? 0,
      pendingInquiries: inquiriesResult.count ?? 0,
      recentPostsCount: postsResult.count ?? 0,
      activeIrFiles: irFilesResult.count ?? 0,
      activePharmacies: pharmaciesResult.count ?? 0,
    }
  } catch (error) {
    console.error('[getDashboardStats] 통계 조회 실패:', error)
    return defaults
  }
}

// ---------------------------------------------------------------------------
// 2. getRecentItems
// ---------------------------------------------------------------------------

/**
 * 대시보드에 표시할 최근 등록 항목들을 조회합니다.
 * @param limit - 각 항목별 조회 수 (기본 5)
 */
export async function getRecentItems(limit: number = 5): Promise<RecentItems> {
  const defaults: RecentItems = {
    products: [],
    inquiries: [],
    posts: [],
  }

  try {
    const supabase = createAdminClient()

    const [productsResult, inquiriesResult, postsResult] = await Promise.all([
      // 최근 등록 제품
      supabase
        .from('products')
        .select('id, name_ko, slug, category, thumbnail_url, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),

      // 최근 문의
      supabase
        .from('inquiries')
        .select('id, name, email, inquiry_type, subject, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),

      // 최근 게시글
      supabase
        .from('posts')
        .select('id, title_ko, post_type, is_active, published_at, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
    ])

    return {
      products: (productsResult.data as RecentProduct[]) ?? [],
      inquiries: (inquiriesResult.data as RecentInquiry[]) ?? [],
      posts: (postsResult.data as RecentPost[]) ?? [],
    }
  } catch (error) {
    console.error('[getRecentItems] 최근 항목 조회 실패:', error)
    return defaults
  }
}
