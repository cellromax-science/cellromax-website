"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

const PASSWORD_MIN = 8;

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!currentPassword || !newPassword) {
        toast.error("현재 비밀번호와 새 비밀번호를 입력해주세요.");
        return;
      }

      if (newPassword.length < PASSWORD_MIN) {
        toast.error(`새 비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("새 비밀번호 확인이 일치하지 않습니다.");
        return;
      }

      if (newPassword === currentPassword) {
        toast.error("새 비밀번호가 현재 비밀번호와 동일합니다.");
        return;
      }

      setIsSaving(true);
      try {
        const response = await fetch("/api/account/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error ?? "비밀번호 변경에 실패했습니다.");
        }

        toast.success("비밀번호가 변경되었습니다.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "비밀번호 변경에 실패했습니다.",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [currentPassword, newPassword, confirmPassword],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <Input
        label="현재 비밀번호"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        disabled={isSaving}
      />
      <Input
        label="새 비밀번호"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        helperText={`${PASSWORD_MIN}자 이상`}
        disabled={isSaving}
      />
      <Input
        label="새 비밀번호 확인"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        disabled={isSaving}
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={isSaving}
        disabled={isSaving}
        className="w-full"
      >
        비밀번호 변경
      </Button>
    </form>
  );
}
