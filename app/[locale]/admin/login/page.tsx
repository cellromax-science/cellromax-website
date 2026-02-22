import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

/* --------------------------------------------------------------------------
   Admin Login Page — Server Component
   관리자 로그인 페이지. LoginForm 클라이언트 컴포넌트를 렌더링합니다.
   -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <LoginForm />
    </div>
  );
}
