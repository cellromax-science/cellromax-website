"use client";

import { useState, useEffect, useCallback } from "react";

import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

import type { SubcategoryWithCount } from "@/types/product";

/* ==========================================================================
   SubcategoryFormModal — 하위카테고리 등록/수정 모달

   - mode: "create" | "edit"
   - 등록 시: POST /api/subcategories
   - 수정 시: PUT /api/subcategories/[id]
   - 상위 카테고리는 수정 모드에서 변경 불가 (연관 제품 정합성 보호)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubcategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initialData?: SubcategoryWithCount;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = [
  { value: "health_functional", label: "건강기능식품" },
  { value: "general_food", label: "일반식품" },
  { value: "cosmetic", label: "화장품" },
  { value: "medicine", label: "의약품" },
  { value: "nutra_pet", label: "뉴트라펫" },
  { value: "other", label: "기타" },
];

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubcategoryFormModal({
  open,
  onClose,
  mode,
  initialData,
  onSuccess,
}: SubcategoryFormModalProps) {
  // --- Form State ---
  const [parentCategory, setParentCategory] = useState("");
  const [nameKo, setNameKo] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [nameVi, setNameVi] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [sortOrder, setSortOrder] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- Pre-fill on edit / reset on create ---
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialData) {
      setParentCategory(initialData.parent_category);
      setNameKo(initialData.name_ko);
      setNameEn(initialData.name_en ?? "");
      setNameZh(initialData.name_zh ?? "");
      setNameVi(initialData.name_vi ?? "");
      setSlug(initialData.slug);
      setIsSlugManual(true);
      setSortOrder(String(initialData.sort_order));
      setIsActive(initialData.is_active);
    } else {
      setParentCategory("");
      setNameKo("");
      setNameEn("");
      setNameZh("");
      setNameVi("");
      setSlug("");
      setIsSlugManual(false);
      setSortOrder("");
      setIsActive(true);
      setShowAdvanced(false);
    }
    setErrors({});
  }, [open, mode, initialData]);

  // --- Slug auto-generation from English name ---
  useEffect(() => {
    if (!isSlugManual && nameEn) {
      setSlug(generateSlug(nameEn));
    }
  }, [nameEn, isSlugManual]);

  // --- Validation ---
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!parentCategory) {
      newErrors.parentCategory = "상위 카테고리를 선택해주세요.";
    }
    if (!nameKo.trim()) {
      newErrors.nameKo = "이름(한국어)은 필수 항목입니다.";
    }
    if (slug.trim() && !SLUG_REGEX.test(slug)) {
      newErrors.slug =
        "슬러그는 영문 소문자, 숫자, 하이픈만 사용 가능합니다.";
    }
    if (sortOrder && !Number.isInteger(Number(sortOrder))) {
      newErrors.sortOrder = "정렬순서는 정수만 입력 가능합니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [parentCategory, nameKo, slug, sortOrder]);

  // --- Submit ---
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // slug가 비어있으면 영어 이름 기반 자동 생성, 없으면 한국어 이름 기반
      let finalSlug = slug.trim();
      if (!finalSlug) {
        finalSlug = nameEn.trim()
          ? generateSlug(nameEn.trim())
          : generateSlug(nameKo.trim());
      }
      if (!finalSlug) {
        toast.error("슬러그를 자동 생성할 수 없습니다. 영어 이름을 입력하거나 고급 설정에서 직접 입력해주세요.");
        setIsSubmitting(false);
        return;
      }

      const payload: Record<string, unknown> = {
        parent_category: parentCategory,
        slug: finalSlug,
        name_ko: nameKo.trim(),
        name_en: nameEn.trim() || null,
        name_zh: nameZh.trim() || null,
        name_vi: nameVi.trim() || null,
        is_active: isActive,
      };

      if (sortOrder) {
        payload.sort_order = parseInt(sortOrder, 10);
      }

      const isEdit = mode === "edit" && initialData;
      const url = isEdit
        ? `/api/subcategories/${initialData.id}`
        : "/api/subcategories";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || "요청 처리에 실패했습니다."
        );
      }

      toast.success(
        isEdit
          ? "하위카테고리가 수정되었습니다."
          : "하위카테고리가 등록되었습니다."
      );
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof TypeError) {
        toast.error("네트워크 연결을 확인해주세요.");
      } else {
        const message =
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validate,
    mode,
    initialData,
    parentCategory,
    slug,
    nameKo,
    nameEn,
    nameZh,
    nameVi,
    sortOrder,
    isActive,
    onSuccess,
    onClose,
  ]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "하위카테고리 수정" : "새 하위카테고리 등록"}
      size="lg"
    >
      {/* 골드 디바이더 */}
      <div className="mb-6 h-px bg-gradient-to-r from-secondary via-secondary-light to-transparent" />

      <div className="space-y-5">
        {/* 상위 카테고리 */}
        <Select
          label="상위 카테고리"
          required
          value={parentCategory}
          onChange={(e) => setParentCategory(e.target.value)}
          options={CATEGORY_OPTIONS}
          placeholder="카테고리를 선택하세요"
          disabled={mode === "edit"}
          error={errors.parentCategory}
        />

        {/* 다국어 이름 - 2열 그리드 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="이름 (한국어)"
            required
            value={nameKo}
            onChange={(e) => setNameKo(e.target.value)}
            placeholder="예: 간건강"
            error={errors.nameKo}
          />
          <Input
            label="이름 (영어)"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="예: Liver Health"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="이름 (중국어)"
            value={nameZh}
            onChange={(e) => setNameZh(e.target.value)}
            placeholder="예: 肝脏健康"
          />
          <Input
            label="이름 (베트남어)"
            value={nameVi}
            onChange={(e) => setNameVi(e.target.value)}
            placeholder="예: Sức khỏe gan"
          />
        </div>

        {/* 고급 설정 토글 */}
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform duration-200 ${showAdvanced ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          고급 설정 (URL 슬러그)
        </button>

        {showAdvanced && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                URL 슬러그
              </label>
              <button
                type="button"
                onClick={() => setIsSlugManual((prev) => !prev)}
                className="text-xs text-primary hover:underline"
              >
                {isSlugManual ? "자동 생성" : "수동 입력"}
              </button>
            </div>
            <Input
              value={slug}
              onChange={(e) => {
                setIsSlugManual(true);
                setSlug(e.target.value);
              }}
              placeholder="예: liver-health"
              disabled={!isSlugManual && !nameEn}
              error={errors.slug}
              helperText="영어 이름 입력 시 자동 생성됩니다. 미입력 시 영어 이름 기반으로 자동 설정됩니다."
            />
          </div>
        )}

        {/* 정렬순서 + 활성여부 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="정렬순서"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="미입력 시 자동 설정"
            error={errors.sortOrder}
          />
          <div className="flex flex-col">
            <span className="mb-1.5 text-sm font-medium text-gray-700">
              활성여부
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((prev) => !prev)}
              className={`relative mt-1 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                isActive ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="mt-1 text-xs text-gray-500">
              {isActive ? "활성 (공개)" : "비활성 (숨김)"}
            </span>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="mt-8 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          취소
        </Button>
        <Button onClick={handleSubmit} loading={isSubmitting}>
          {mode === "edit" ? "수정하기" : "등록하기"}
        </Button>
      </div>
    </Modal>
  );
}
