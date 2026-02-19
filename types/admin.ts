export type AdminRole = 'super_admin' | 'marketing' | 'ir' | 'inquiry';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  department: string | null;
  is_active: boolean;
  last_login_at: string | null;
  totp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminProfileInsert {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  department?: string | null;
  is_active?: boolean;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  is_success: boolean;
  attempted_at: string;
}
