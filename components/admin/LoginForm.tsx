"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/[locale]/admin/actions";
import type { AuthResult } from "@/lib/auth/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/* --------------------------------------------------------------------------
   LoginForm — 관리자 로그인 폼 (Client Component)

   React 19 useActionState 훅을 사용하여 Server Action과 연동합니다.
   - 이메일 / 비밀번호 입력
   - 로딩 상태 표시 (isPending)
   - 서버에서 반환된 에러 메시지 표시
   -------------------------------------------------------------------------- */

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<AuthResult | null, FormData>(
    loginAction,
    null
  );

  const errorMessage =
    state && !state.success && state.error ? state.error : null;

  return (
    <div className="w-full max-w-md">
      {/* ----------------------------------------------------------------
          Brand Header
          ---------------------------------------------------------------- */}
      <div className="mb-8 text-center">
        {/* 브랜드 로고 텍스트 */}
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="text-2xl font-extrabold tracking-widest text-primary">
            CELLROMAX
          </span>
        </div>

        {/* 골드 디바이더 */}
        <div className="mx-auto mb-6 divider-gold" />

        <h1 className="text-xl font-bold text-gray-900">관리자 로그인</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          관리자 계정으로 로그인해주세요
        </p>
      </div>

      {/* ----------------------------------------------------------------
          Login Card
          ---------------------------------------------------------------- */}
      <div className="bg-white shadow-lg squircle-lg border border-gray-100 p-8">
        <form action={formAction} className="flex flex-col gap-5">
          {/* 에러 메시지 표시 영역 */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 bg-error/10 text-error-dark squircle-sm px-4 py-3 text-sm font-medium"
            >
              {/* 경고 아이콘 */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 이메일 입력 */}
          <Input
            label="이메일"
            name="email"
            type="email"
            placeholder="admin@cellromax.com"
            required
            autoComplete="email"
            disabled={isPending}
          />

          {/* 비밀번호 입력 */}
          <Input
            label="비밀번호"
            name="password"
            type="password"
            placeholder="비밀번호를 입력하세요"
            required
            autoComplete="current-password"
            disabled={isPending}
          />

          {/* 로그인 버튼 */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isPending}
            className="mt-2 w-full"
          >
            {isPending ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </div>

      {/* ----------------------------------------------------------------
          Footer Notice
          ---------------------------------------------------------------- */}
      <p className="mt-6 text-center text-xs text-gray-400">
        이 페이지는 관리자 전용입니다.
        <br />
        접근 권한이 없는 경우 담당자에게 문의해주세요.
      </p>
    </div>
  );
}
