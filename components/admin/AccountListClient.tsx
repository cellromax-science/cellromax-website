"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";

import type { BadgeVariant } from "@/components/ui/Badge";
import type { AdminProfile, AdminRole } from "@/types/admin";

/* ==========================================================================
   AccountListClient — Super Admin 전용 계정 관리 클라이언트 컴포넌트

   서버 컴포넌트(page.tsx)에서 초기 데이터를 받아 렌더링하고,
   검색/필터/생성/수정/비활성화 등 인터랙션은 클라이언트에서 처리합니다.

   기능:
   - 검색 (이름/이메일 기준)
   - 역할 필터
   - 계정 테이블 (이름, 이메일, 역할, 부서, 활성 상태, 최근 로그인, 액션)
   - 새 계정 생성 모달
   - 계정 수정 모달
   - 비활성화/활성화 확인 모달
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountListClientProps {
  /** 서버에서 패칭한 초기 계정 목록 */
  initialAccounts: AdminProfile[];
  /** 서버에서 패칭한 전체 계정 수 */
  initialTotal: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 역할 레이블 매핑 */
const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "총괄 관리자",
  marketing: "마케팅 담당",
  ir: "IR 담당",
  inquiry: "문의 담당",
};

/** 역할별 Badge 변형 매핑 */
const ROLE_BADGE: Record<AdminRole, { variant: BadgeVariant; label: string }> = {
  super_admin: { variant: "error", label: "총괄 관리자" },
  marketing: { variant: "info", label: "마케팅 담당" },
  ir: { variant: "warning", label: "IR 담당" },
  inquiry: { variant: "success", label: "문의 담당" },
};

/** 새 계정 생성 시 역할 Select 옵션 (super_admin 제외) */
const ROLE_OPTIONS = [
  { value: "marketing", label: "마케팅 담당" },
  { value: "ir", label: "IR 담당" },
  { value: "inquiry", label: "문의 담당" },
];

/** 역할 필터 Select 옵션 */
const ROLE_FILTER_OPTIONS = [
  { value: "", label: "전체 역할" },
  { value: "super_admin", label: "총괄 관리자" },
  { value: "marketing", label: "마케팅 담당" },
  { value: "ir", label: "IR 담당" },
  { value: "inquiry", label: "문의 담당" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 날짜 문자열 -> YYYY.MM.DD HH:mm 형식 */
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${h}:${min}`;
}

// ---------------------------------------------------------------------------
// Sub Components
// ---------------------------------------------------------------------------

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

/** 빈 상태 표시 */
function EmptyState() {
  return (
    <tr>
      <td colSpan={100} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          {/* 빈 상태 아이콘 -- 사용자 */}
          <div className="flex h-14 w-14 items-center justify-center squircle-lg bg-gray-100">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="text-gray-400"
            >
              <circle
                cx="14"
                cy="10"
                r="4"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M6 24C6 24 6 19 14 19C22 19 22 24 22 24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">
            등록된 계정이 없습니다
          </p>
          <p className="text-xs text-gray-400">
            새 계정을 생성하여 시작하세요
          </p>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Create Account Modal
// ---------------------------------------------------------------------------

interface CreateModalProps {
  isCreating: boolean;
  onConfirm: (data: {
    email: string;
    password: string;
    name: string;
    role: AdminRole;
    department: string;
  }) => void;
  onCancel: () => void;
}

function CreateModal({ isCreating, onConfirm, onCancel }: CreateModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AdminRole>("marketing");
  const [department, setDepartment] = useState("");

  // 유효성 검사 상태
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ESC 키로 모달 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isCreating) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isCreating]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "이름을 입력해 주세요.";
    }
    if (!email.trim()) {
      newErrors.email = "이메일을 입력해 주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "올바른 이메일 형식이 아닙니다.";
    }
    if (!password) {
      newErrors.password = "비밀번호를 입력해 주세요.";
    } else if (password.length < 8) {
      newErrors.password = "비밀번호는 최소 8자 이상이어야 합니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, password]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    onConfirm({
      email: email.trim(),
      password,
      name: name.trim(),
      role,
      department: department.trim(),
    });
  }, [validate, onConfirm, email, password, name, role, department]);

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={!isCreating ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* 모달 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white squircle-xl p-6 shadow-xl max-w-md w-full animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3
              id="create-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              새 계정 생성
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              관리자 계정을 생성합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 필드 */}
        <div className="space-y-4">
          <Input
            label="이름"
            placeholder="관리자 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
            disabled={isCreating}
          />

          <Input
            label="이메일"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
            disabled={isCreating}
          />

          <Input
            label="임시 비밀번호"
            type="password"
            placeholder="8자 이상 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            helperText="최소 8자 이상의 비밀번호를 입력하세요."
            required
            disabled={isCreating}
          />

          <Select
            label="역할"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            options={ROLE_OPTIONS}
            required
            disabled={isCreating}
          />

          <Input
            label="부서"
            placeholder="부서명 (선택)"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={isCreating}
          />
        </div>

        {/* 버튼 */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isCreating}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={isCreating}
            disabled={isCreating}
            className="flex-1"
          >
            생성
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Edit Account Modal
// ---------------------------------------------------------------------------

interface EditModalProps {
  account: AdminProfile;
  isSaving: boolean;
  onConfirm: (data: {
    name: string;
    role: AdminRole;
    department: string;
  }) => void;
  onCancel: () => void;
}

function EditModal({ account, isSaving, onConfirm, onCancel }: EditModalProps) {
  const [name, setName] = useState(account.name);
  const [role, setRole] = useState<AdminRole>(account.role);
  const [department, setDepartment] = useState(account.department ?? "");

  // 유효성 검사 상태
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ESC 키로 모달 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSaving) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isSaving]);

  /** super_admin 계정은 역할 변경 불가 (자기 자신 포함) */
  const isRoleLocked = account.role === "super_admin";

  /** 수정 시 역할 옵션 (기존이 super_admin이면 목록에 포함) */
  const editRoleOptions = isRoleLocked
    ? [{ value: "super_admin", label: "총괄 관리자" }]
    : ROLE_OPTIONS;

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "이름을 입력해 주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    onConfirm({
      name: name.trim(),
      role,
      department: department.trim(),
    });
  }, [validate, onConfirm, name, role, department]);

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={!isSaving ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* 모달 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white squircle-xl p-6 shadow-xl max-w-md w-full animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3
              id="edit-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              계정 수정
            </h3>
            <p className="mt-1 text-sm text-gray-500">{account.email}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 필드 */}
        <div className="space-y-4">
          <Input
            label="이름"
            placeholder="관리자 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
            disabled={isSaving}
          />

          <Select
            label="역할"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            options={editRoleOptions}
            required
            disabled={isSaving || isRoleLocked}
          />

          <Input
            label="부서"
            placeholder="부서명 (선택)"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={isSaving}
          />
        </div>

        {/* 버튼 */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={isSaving}
            disabled={isSaving}
            className="flex-1"
          >
            저장
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Toggle Active Confirmation Modal
// ---------------------------------------------------------------------------

interface ToggleActiveModalProps {
  account: AdminProfile;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ToggleActiveModal({
  account,
  isProcessing,
  onConfirm,
  onCancel,
}: ToggleActiveModalProps) {
  const willDeactivate = account.is_active;

  // ESC 키로 모달 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isProcessing) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isProcessing]);

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={!isProcessing ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* 모달 */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="toggle-modal-title"
        aria-describedby="toggle-modal-desc"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white squircle-xl p-6 shadow-xl max-w-sm w-full animate-slide-up"
      >
        {/* 아이콘 */}
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center squircle-md ${
            willDeactivate ? "bg-error-light" : "bg-success/12"
          }`}
        >
          {willDeactivate ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-error"
              aria-hidden="true"
            >
              <path
                d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-success"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M9 12L11 14L15 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* 텍스트 */}
        <h3
          id="toggle-modal-title"
          className="text-center text-lg font-semibold text-gray-900 mb-2"
        >
          {willDeactivate
            ? "이 계정을 비활성화하시겠습니까?"
            : "이 계정을 활성화하시겠습니까?"}
        </h3>
        <p
          id="toggle-modal-desc"
          className="text-center text-sm text-gray-500 mb-1"
        >
          <span className="font-medium text-gray-700">{account.name}</span>
          <span className="text-gray-400"> ({account.email})</span>
        </p>
        <p className="text-center text-xs text-gray-400 mb-6">
          {willDeactivate
            ? "비활성화된 계정은 로그인할 수 없습니다."
            : "활성화하면 해당 계정으로 다시 로그인할 수 있습니다."}
        </p>

        {/* 버튼 */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            variant={willDeactivate ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
            loading={isProcessing}
            disabled={isProcessing}
            className="flex-1"
          >
            {willDeactivate ? "비활성화" : "활성화"}
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// AccountListClient Component
// ---------------------------------------------------------------------------

export function AccountListClient({
  initialAccounts,
  initialTotal,
}: AccountListClientProps) {
  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------

  const [accounts, setAccounts] = useState<AdminProfile[]>(initialAccounts);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<AdminProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [toggleTarget, setToggleTarget] = useState<AdminProfile | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // --------------------------------------------------------------------------
  // Client-Side Filtering
  // --------------------------------------------------------------------------

  /** 클라이언트 사이드 필터링 (accounts 수가 적으므로 서버 재호출 불필요) */
  const filteredAccounts = useMemo(() => {
    let result = accounts;

    // 검색어 필터 (이름 또는 이메일)
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter(
        (acc) =>
          acc.name.toLowerCase().includes(query) ||
          acc.email.toLowerCase().includes(query),
      );
    }

    // 역할 필터
    if (roleFilter) {
      result = result.filter((acc) => acc.role === roleFilter);
    }

    return result;
  }, [accounts, search, roleFilter]);

  // --------------------------------------------------------------------------
  // Fetch Accounts (목록 갱신용)
  // --------------------------------------------------------------------------

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) {
        throw new Error("계정 목록을 불러오지 못했습니다.");
      }

      const data = await res.json();
      setAccounts(data.accounts ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "목록 조회 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Create Account
  // --------------------------------------------------------------------------

  const handleCreateClick = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleCreateCancel = useCallback(() => {
    if (!isCreating) {
      setShowCreateModal(false);
    }
  }, [isCreating]);

  const handleCreateConfirm = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      role: AdminRole;
      department: string;
    }) => {
      setIsCreating(true);
      try {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            errorData?.error || "계정 생성에 실패했습니다.",
          );
        }

        toast.success("새 계정이 생성되었습니다.");
        setShowCreateModal(false);

        // 목록 갱신
        await fetchAccounts();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "계정 생성에 실패했습니다.";
        toast.error(message);
      } finally {
        setIsCreating(false);
      }
    },
    [fetchAccounts],
  );

  // --------------------------------------------------------------------------
  // Edit Account
  // --------------------------------------------------------------------------

  const handleEditClick = useCallback((account: AdminProfile) => {
    setEditTarget(account);
  }, []);

  const handleEditCancel = useCallback(() => {
    if (!isSaving) {
      setEditTarget(null);
    }
  }, [isSaving]);

  const handleEditConfirm = useCallback(
    async (data: {
      name: string;
      role: AdminRole;
      department: string;
    }) => {
      if (!editTarget) return;

      setIsSaving(true);
      try {
        const res = await fetch(`/api/accounts/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            errorData?.error || "계정 수정에 실패했습니다.",
          );
        }

        // 클라이언트 state 즉시 업데이트
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === editTarget.id
              ? {
                  ...acc,
                  name: data.name,
                  role: data.role,
                  department: data.department || null,
                }
              : acc,
          ),
        );

        toast.success("계정 정보가 수정되었습니다.");
        setEditTarget(null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "계정 수정에 실패했습니다.";
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [editTarget],
  );

  // --------------------------------------------------------------------------
  // Toggle Active
  // --------------------------------------------------------------------------

  const handleToggleClick = useCallback((account: AdminProfile) => {
    setToggleTarget(account);
  }, []);

  const handleToggleCancel = useCallback(() => {
    if (!isToggling) {
      setToggleTarget(null);
    }
  }, [isToggling]);

  const handleToggleConfirm = useCallback(async () => {
    if (!toggleTarget) return;

    setIsToggling(true);
    try {
      const newActiveState = !toggleTarget.is_active;

      const res = await fetch(`/api/accounts/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActiveState }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || "상태 변경에 실패했습니다.",
        );
      }

      // 클라이언트 state 즉시 업데이트
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === toggleTarget.id
            ? { ...acc, is_active: newActiveState }
            : acc,
        ),
      );

      toast.success(
        newActiveState
          ? "계정이 활성화되었습니다."
          : "계정이 비활성화되었습니다.",
      );
      setToggleTarget(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "상태 변경에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsToggling(false);
    }
  }, [toggleTarget]);

  // --------------------------------------------------------------------------
  // Filter Handlers
  // --------------------------------------------------------------------------

  const handleRoleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRoleFilter(e.target.value);
    },
    [],
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ================================================================
          페이지 헤더
          ================================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            계정 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            총 {total.toLocaleString("ko-KR")}개의 계정
          </p>
        </div>

        <Button variant="primary" size="md" onClick={handleCreateClick}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          새 계정 생성
        </Button>
      </div>

      {/* ================================================================
          검색 + 필터 바
          ================================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="이름 또는 이메일로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={roleFilter}
            onChange={handleRoleFilterChange}
            options={ROLE_FILTER_OPTIONS}
            placeholder="역할"
          />
        </div>
      </div>

      {/* ================================================================
          계정 테이블
          ================================================================ */}
      <div className="bg-white shadow-sm border border-gray-100 squircle-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  이메일
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  역할
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  부서
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  최근 로그인
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                /* 로딩 스켈레톤 -- 5행 x 7열 */
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="px-5 py-3">
                      <div className="h-4 w-20 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="h-4 w-40 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-5 w-20 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <div className="h-4 w-16 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-12 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <div className="h-4 w-28 bg-gray-100 squircle-xs animate-pulse" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-24 bg-gray-100 squircle-xs animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredAccounts.length === 0 ? (
                <EmptyState />
              ) : (
                filteredAccounts.map((account) => {
                  const badge = ROLE_BADGE[account.role];

                  return (
                    <tr
                      key={account.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      {/* 이름 */}
                      <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {account.name}
                      </td>

                      {/* 이메일 */}
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap max-w-[250px] truncate hidden md:table-cell">
                        {account.email}
                      </td>

                      {/* 역할 */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant={badge.variant} size="sm">
                          {badge.label}
                        </Badge>
                      </td>

                      {/* 부서 */}
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden lg:table-cell">
                        {account.department ?? (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* 활성 상태 */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <ActiveDot active={account.is_active} />
                      </td>

                      {/* 최근 로그인 */}
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap tabular-nums hidden lg:table-cell">
                        {account.last_login_at ? (
                          formatDateTime(account.last_login_at)
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* 액션 */}
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* 수정 버튼 */}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleEditClick(account)}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden="true"
                            >
                              <path
                                d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M8 4L10 6"
                                stroke="currentColor"
                                strokeWidth="1.2"
                              />
                            </svg>
                            수정
                          </Button>

                          {/* 비활성화/활성화 토글 버튼 */}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleToggleClick(account)}
                            className={
                              account.is_active
                                ? "!text-error hover:!bg-error/8"
                                : "!text-success hover:!bg-success/8"
                            }
                          >
                            {account.is_active ? (
                              <>
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 14 14"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-hidden="true"
                                >
                                  <circle
                                    cx="7"
                                    cy="7"
                                    r="5.5"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                  />
                                  <path
                                    d="M5 5L9 9M9 5L5 9"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                비활성화
                              </>
                            ) : (
                              <>
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 14 14"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-hidden="true"
                                >
                                  <circle
                                    cx="7"
                                    cy="7"
                                    r="5.5"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                  />
                                  <path
                                    d="M5 7L6.5 8.5L9 5.5"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                활성화
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================
          새 계정 생성 모달
          ================================================================ */}
      {showCreateModal && (
        <CreateModal
          isCreating={isCreating}
          onConfirm={handleCreateConfirm}
          onCancel={handleCreateCancel}
        />
      )}

      {/* ================================================================
          계정 수정 모달
          ================================================================ */}
      {editTarget && (
        <EditModal
          account={editTarget}
          isSaving={isSaving}
          onConfirm={handleEditConfirm}
          onCancel={handleEditCancel}
        />
      )}

      {/* ================================================================
          비활성화/활성화 확인 모달
          ================================================================ */}
      {toggleTarget && (
        <ToggleActiveModal
          account={toggleTarget}
          isProcessing={isToggling}
          onConfirm={handleToggleConfirm}
          onCancel={handleToggleCancel}
        />
      )}
    </div>
  );
}
