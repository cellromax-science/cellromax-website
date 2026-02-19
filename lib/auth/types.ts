// ============================================================
// 관리자 인증 관련 타입 정의
// admin_profiles 테이블 스키마 기반
// ============================================================

/** 관리자 역할 유니온 타입 */
export type AdminRole = 'super_admin' | 'marketing' | 'ir' | 'inquiry'

/** admin_profiles 테이블 Row 타입 */
export interface AdminProfile {
  id: string
  email: string
  name: string
  role: AdminRole
  department: string | null
  is_active: boolean
  last_login_at: string | null
  totp_secret: string | null
  totp_enabled: boolean
  created_at: string
  updated_at: string
}

/** 인증 결과 타입 (성공/실패 공용) */
export type AuthResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string }

/** 로그인 폼 데이터 */
export interface LoginFormData {
  email: string
  password: string
  /** TOTP 인증 코드 (2FA 활성화 시) */
  totpCode?: string
}
