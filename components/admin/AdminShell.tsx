"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { AdminProfile } from "@/types/admin";

/* ==========================================================================
   AdminShell — 인증된 관리자 페이지의 전체 레이아웃 래퍼 (Client Component)

   서버 컴포넌트(layout.tsx)에서 profile을 전달받아
   사이드바 + 헤더 + 콘텐츠 영역을 조합합니다.
   모바일 사이드바 토글 상태를 관리합니다.
   ========================================================================== */

interface AdminShellProps {
  profile: AdminProfile;
  children: React.ReactNode;
}

export function AdminShell({ profile, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar
        profile={profile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-64">
        <AdminHeader
          profile={profile}
          onMenuToggle={() => setSidebarOpen(true)}
        />

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
