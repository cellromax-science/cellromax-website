import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export const metadata: Metadata = {
  title: "비밀번호 변경",
};

export default function ChangePasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          비밀번호 변경
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.
        </p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
